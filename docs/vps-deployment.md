# Desplegar Elociencia con Docker en un VPS

Elociencia utiliza Next.js, PostgreSQL, Better Auth y OpenRouter sin requerir servicios exclusivos de Vercel. Puedes alojar la aplicación en un VPS y seguir usando la base de tu propia cuenta de Prisma. Cambiar el servidor de la app no requiere trasladar cuentas, historial o planes. Consulta [Prisma Postgres y migraciones](database-deployment.md) si también quieres cambiar el proveedor de la base.

## 1. Preparar el servidor y sus variables

Necesitas Docker con Compose **2.30 o posterior**, el código de esta versión y un dominio que apunte al VPS para servir la aplicación con HTTPS. Los comandos siguientes se ejecutan desde la raíz del repositorio. `compose.yaml` conserva PostgreSQL para desarrollo; `compose.vps.yaml` despliega la web usando una base externa.

Crea un archivo privado `.env.production` a partir de `.env.example` sin sobrescribir uno existente:

```sh
if [ ! -f .env.production ]; then
  cp .env.example .env.production
fi
chmod 600 .env.production
```

Edita ese archivo en el servidor y configura los valores sin comillas alrededor: Compose utiliza `env_file` con `format: raw` para conservar caracteres como `$` sin interpolarlos. Por ejemplo, escribe `AUTH_EMAIL_FROM=Elociencia <coach@tu-dominio.com>`. Configura:

- `DATABASE_URL`: conexión PostgreSQL **pooled** de producción con verificación TLS; en Prisma Postgres usa `sslmode=verify-full`.
- `DIRECT_URL`: conexión **direct** para Prisma CLI; en Prisma Postgres usa `sslmode=require&sslaccept=strict`. La CLI utiliza `DATABASE_URL` si `DIRECT_URL` está ausente.
- `BETTER_AUTH_SECRET`: un secreto aleatorio exclusivo de este entorno, de al menos 32 caracteres.
- `BETTER_AUTH_URL`: el origen público exacto, por ejemplo `https://coach.tu-dominio.com`. Configura `BETTER_AUTH_TRUSTED_ORIGINS` sólo si necesitas otros orígenes exactos.
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` y los presupuestos `AI_*` que hayas elegido. `RIOT_API_KEY` sigue siendo opcional.
- `APP_REGISTRATION_MODE`: conserva la decisión actual de tu entorno. Copiar el valor de ejemplo no debe abrir el registro por accidente.
- Cuando actives las cuentas de producción: `RESEND_API_KEY` y `AUTH_EMAIL_FROM` de un dominio verificado. [Configuración de proveedores](provider-setup.md).

No copies las variables de detección `VERCEL` o `NETLIFY` al VPS. No copies conexiones locales con `127.0.0.1`: dentro del contenedor esa dirección corresponde al propio contenedor, no a una base de tu computadora.

La verificación por correo forma parte del flujo actual. Sin un proveedor de envío configurado, las cuentas de producción se consideran no configuradas y las rutas privadas permanecen cerradas. Cambiar a Docker o Netlify no modifica ese comportamiento. Para probar sin correo real utiliza el flujo de desarrollo con Mailpit; no cambies `NODE_ENV` del contenedor de producción para saltarte ese requisito.

El archivo privado se inyecta al arrancar los contenedores y queda fuera de Git y del contexto de compilación. No introduzcas claves mediante argumentos de compilación ni las publiques en una imagen. No compartas la salida completa de `docker compose config`, `docker inspect` o las variables del proceso: pueden mostrar secretos.

## 2. Construir, aplicar migraciones y arrancar

La imagen web usa Node.js 24 y el servidor standalone de Next.js. La imagen `tooling` contiene pnpm, Prisma CLI y los scripts administrativos. Las migraciones y semillas se ejecutan explícitamente: compilar o reiniciar la web no cambia el esquema de la base.

```sh
docker compose -f compose.vps.yaml build web migrations seed
```

Construye las imágenes en el VPS para utilizar su arquitectura de CPU. Una imagen construida en un Mac ARM no sirve directamente en un VPS x86 sin una compilación para esa plataforma.

Antes de ejecutar los pasos administrativos, confirma que las conexiones correspondan a la base y al entorno elegidos. Sobre una base existente, conserva una copia de seguridad verificable antes de aplicar una nueva migración. Después:

```sh
docker compose -f compose.vps.yaml run --rm migrations
docker compose -f compose.vps.yaml run --rm seed
docker compose -f compose.vps.yaml up -d web
docker compose -f compose.vps.yaml ps web
```

`migrations` ejecuta `pnpm db:migrate` con `DIRECT_URL`. `seed` ejecuta `pnpm db:seed` con la conexión pooled de `DATABASE_URL`; esta operación breve es compatible con ella. Crea Free/Pro cuando faltan y conserva las políticas existentes. No ejecuta un reinicio de la base ni concede Pro a cuentas existentes. Los planes y sus límites están explicados en [Cuentas y consumo](accounts-and-usage.md).

Sólo el servicio `web` permanece abierto; los servicios administrativos pertenecen al perfil `ops` y terminan después del comando. La web publica el puerto 3000 exclusivamente en `127.0.0.1` del VPS. Un proxy HTTPS en ese mismo servidor recibe el tráfico público.

## 3. Servir HTTPS con un proxy

Instala Caddy en el host y apunta el DNS de tu dominio al servidor. Permite los puertos públicos 80 y 443; mantén el puerto 3000 inaccesible desde internet. Este ejemplo de Caddyfile utiliza un dominio ficticio que debes sustituir:

```caddyfile
coach.tu-dominio.com {
  reverse_proxy 127.0.0.1:3000 {
    header_up Host {host}
    header_up X-Forwarded-Proto https
    transport http {
      response_header_timeout 150s
    }
  }
}
```

Caddy puede emitir y renovar el certificado cuando el dominio y la conectividad están preparados. El proxy conserva el host público y fija el protocolo HTTPS para las validaciones de origen. No añadas caché de HTML o API ni reintentos de solicitudes de IA. Referencias: [HTTPS en Caddy](https://caddyserver.com/docs/quick-starts/https) y [reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

Si usas Nginx u otro proxy, conserva esas mismas condiciones. Deja tiempo para que termine la consulta de IA, cuyo timeout del proveedor es de 90 segundos; la petición completa incluye validaciones y persistencia. Si limitas el cuerpo en el proxy, permite al menos los 3.6 MB de JSON que admite el servidor. Los 30 MB son el máximo del archivo original en el celular; la app lo optimiza antes de subirlo.

En VPS, Better Auth no confía actualmente en una cabecera IP del proxy: su limitación de intentos de registro e inicio de sesión puede compartir el contador entre usuarios. Antes de abrirlo a una comunidad, comprueba este comportamiento con varias cuentas y añade la protección por IP en un proxy confiable si la necesitas. Las cuotas de IA por usuario, plan y aplicación siguen en PostgreSQL.

## 4. Comprobar y actualizar

El healthcheck comprueba que `/api/status` responda; no confirma entrega de correo, conexión a la base ni una generación real. Valida por separado en la dirección HTTPS pública:

1. Interfaz, catálogo, carga de fotos y PWA desde escritorio y celular.
2. Registro conforme al modo elegido, verificación e inicio de sesión cuando configures el correo.
3. Historial aislado entre dos cuentas y planes Free/Pro.
4. Una consulta acotada de OpenRouter y su consumo cuando decidas probar el proveedor real.

Si cambias variables, recrea el servicio para que reciba los nuevos valores:

```sh
docker compose -f compose.vps.yaml up -d --force-recreate web
```

Para actualizar el código, vuelve a construir las imágenes, aplica las migraciones nuevas como paso separado y recrea la web. Conserva las versiones previas y un plan de recuperación de la base; volver a una imagen anterior no revierte sus migraciones.

El 11 de octubre de 2026 se comprobaron las dos imágenes en Docker local con Linux ARM64: compilación, migración y planes sobre PostgreSQL temporal, consulta de Prisma desde el servidor web, Sharp, usuario sin privilegios, disco de sólo lectura, archivos estáticos, PWA, nonce distinto por respuesta y rechazo de rutas privadas/orígenes ajenos. Se usaron datos ficticios, sin envío de correo ni consumo de IA. Esta evidencia no acredita un VPS publicado, HTTPS público, Linux x86 ni proveedores reales; comprueba el entorno que finalmente utilices.

## Comprobar consumo con la web cerrada

La app comprueba automáticamente el consumo mientras el usuario está en ella. Para conciliar también cuentas sin una pestaña abierta, la imagen de herramientas incluye una operación separada:

```sh
docker compose -f compose.vps.yaml run --rm reconcile
```

Un temporizador del VPS puede ejecutarla periódicamente, por ejemplo cada minuto. Usa el mismo `.env.production` privado y la base de la web. La operación sólo consulta generaciones existentes por GET; no vuelve a generar consejos. Comparte permisos persistentes de comprobación con la interfaz y la administración, de modo que dos ejecuciones concurrentes no repiten la consulta del mismo propietario. Los importes inciertos se conservan. El comando está preparado; el programador externo debe configurarse en el servidor elegido.

## Alternativa: Netlify

[Netlify admite App Router y rutas API mediante OpenNext](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). Puedes importar el repositorio con Node.js 24, `pnpm install --frozen-lockfile` y `pnpm build`, configurar las mismas variables privadas y mantener las migraciones fuera de la compilación.

Su [documentación de Functions](https://docs.netlify.com/build/functions/configuration/) indica 60 segundos para funciones síncronas y 6 MB de cuerpo buffered, con menos capacidad útil para binarios. El timeout actual de OpenRouter es de 90 segundos: antes de adoptar Netlify hay que ajustar o rediseñar esa espera y probar el adaptador con CSP, cookies, capturas y cuotas. `maxDuration = 120` no aumenta el límite de Netlify. No se ha desplegado ni validado Elociencia allí.
