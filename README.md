# Elociencia

Asistente de builds de League of Legends en español, con Next.js y OpenRouter. Eliges tu campeón y tu rival (el rol se sugiere y puedes cambiarlo) y recibes al momento hechizos, runas, compra inicial, build en orden, situacionales contra ese rival y habilidades de los niveles 1–6. Un matchup que ya se generó en el parche actual sale de la caché al instante.

Para retomar el desarrollo, empieza por [AGENTS.md](AGENTS.md) y [el contexto de continuidad](docs/agent-handoff.md): implementación actual, último diagnóstico de IA, pruebas, configuración y trabajo pendiente. Los recursos de la propuesta de marca **No Era el Jungla** están en [brand/](brand/README.md); su integración todavía está pendiente.

Los [términos de uso y la política de privacidad](docs/legal-and-riot.md) están disponibles en `/terminos` y `/privacidad`, con enlaces desde el coach y las pantallas de cuenta. Completa los datos públicos del responsable antes de publicar o solicitar acceso de producción a Riot.

Elige tu campeón y tu rival desde la cuadrícula del rol o con la búsqueda; ningún campeón queda bloqueado fuera de posición. Con una cuenta verificada puedes marcar hasta doce favoritos por rol. Consulta [favoritos](docs/accounts-and-usage.md#campeones-por-rol-y-favoritos).

**Flujo actual ([ADR 0009](docs/adr/0009-builds-simples.md)):** una sola consulta a Opus 5.5 por matchup nuevo ([ADR 0010](docs/adr/0010-opus-modelo-unico.md)), caché compartida por versión de Data Dragon y límites diarios simples. Si una consulta falla, se puede pedir otra vez de inmediato. Las referencias a planes, reservas, capturas o Riot en documentos anteriores son históricas.

## Iniciar

Se recomienda Node.js 24 y pnpm 10.33.2. También se admite la rama Node.js 22 desde la versión 22.12; consulta `engines` en `package.json`. Las comprobaciones automáticas utilizan Node.js 24. El proyecto fija la versión de pnpm en `packageManager` y utiliza `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
if [ ! -f .env ] && [ ! -f .env.local ]; then
  cp .env.example .env
fi
pnpm db:local
```

Mantén PostgreSQL abierto. En otra terminal, completa el archivo privado existente (`.env` o `.env.local`): genera `BETTER_AUTH_SECRET`, configura Resend y un remitente de tu dominio verificado. No crees `.env.local` para sustituir un `.env` ya configurado: tiene prioridad. Después:

```sh
pnpm db:setup
pnpm dev
```

La [guía de OpenRouter y Resend](docs/provider-setup.md) explica dónde obtener las claves, verificar el dominio de correo y probar tu cuenta con gasto acotado. Si ya existe `.env.local`, edítalo sin sobrescribir sus valores. Las fuentes están reunidas en [Recursos oficiales](docs/resources.md).

Abre [http://127.0.0.1:3000](http://127.0.0.1:3000). Next.js sirve la interfaz y las rutas API; PostgreSQL guarda cuentas, historial, la caché de builds y los contadores diarios mediante Prisma 7. Better Auth gestiona contraseñas, sesiones, verificación y recuperación por correo. El ejemplo local se puede explorar sin configurar cuentas; las builds requieren una sesión verificada.

La migración versionada está en `prisma/migrations`; `db:setup` genera el cliente, aplica migraciones y crea los planes conservando las políticas ya existentes. La arquitectura y sus límites están descritos en [Cuentas, planes y control del gasto](docs/accounts-and-usage.md). Si falta la base, el secreto, la URL o el correo, las consultas privadas se rechazan; no hay acceso anónimo alternativo.

Para probar registro y verificación sin Resend ni dominio, usa [el buzón local](docs/local-testing.md): `pnpm mail:local` recibe los mensajes en tu computadora y muestra los enlaces de confirmación en el navegador.

Para alojar la base en tu propia cuenta de Prisma y conectar Vercel sin depender de su integración de almacenamiento, sigue [Prisma Postgres, migraciones y portabilidad](docs/database-deployment.md). La misma conexión PostgreSQL puede usarse después desde un VPS.

### Crear tu cuenta de administrador

El registro está abierto por defecto (`APP_REGISTRATION_MODE=open`). Abre **Crear cuenta**, regístrate con tu propio correo y verifica el enlace recibido; no necesitas un código de invitación y empezarás con Free. Después:

```sh
pnpm access bootstrap-admin --email tu@correo.com
```

El bootstrap solo permite el primer administrador y exige una cuenta verificada. Las invitaciones se gestionan con `pnpm access`; sus claves se guardan como hash y se vinculan al correo.

En el registro abierto, la invitación es opcional. Si introduces un código inválido, vencido, revocado o de otro correo, el registro se rechaza. `APP_REGISTRATION_MODE=invite` queda disponible si eliges una beta cerrada con código obligatorio.

Cada cuenta puede generar `AI_USER_DAILY_BUILDS` builds nuevas al día (30 por defecto) y la app se detiene al llegar a `AI_DAILY_BUDGET_USD` de gasto informado en el día (USD 5 por defecto). Las ventanas se renuevan a las 00:00 UTC. Las builds que salen de la caché, leer el historial y explorar el ejemplo no cuentan.

### Abrirla en tu celular

Conecta el celular y la computadora a la misma red Wi-Fi. `pnpm dev` y `pnpm start` escuchan en la red local: abre `http://IP_LOCAL_DE_TU_COMPUTADORA:3000` desde el navegador del celular. `localhost` y `127.0.0.1` en el celular apuntan al propio celular. Mantén la computadora encendida y la aplicación en ejecución; si el sistema pregunta por acceso a la red local, permite la conexión de Node.js.

Puedes explorar el ejemplo sin credenciales. El ejemplo es contenido de demostración: no representa una consulta de IA ni una recomendación actualizada. Para pedir una build propia, entra con tu cuenta verificada; el servidor necesita `OPENROUTER_API_KEY`.

El modelo es siempre `anthropic/claude-opus-5.5`, sin selector ni variable de entorno ([ADR 0010](docs/adr/0010-opus-modelo-unico.md)). Las recomendaciones del modelo no son estadísticas óptimas ni una garantía de calidad. El historial anterior sigue siendo legible sin regeneración automática.

Al recibir el resultado se contrae el formulario; puedes abrirlo para editar tu selección. La entrada manual y foto/galería móvil permanecen disponibles. Recargar no recupera un resultado privado: ábrelo desde **Mis sesiones**. La fuente Inter se sirve localmente con su [licencia OFL](app/fonts/OFL.txt). Consulta la [decisión de producto](docs/adr/0005-build-hechizos-runas.md) y la [verificación local](docs/build-simplificada.md).

### Instalar como app (PWA)

Abre **Instalar app** desde el menú. En iPhone/iPad, abre la dirección en Safari y elige **Compartir → Añadir a pantalla de inicio → Añadir**. En Android o computadora, Chrome/Edge ofrecen **Instalar app** o **Añadir a pantalla de inicio**; el botón de instalación de Elociencia aparece cuando el navegador permite mostrar su diálogo. La app tiene iconos propios y se abre en una ventana independiente.

La instalación completa y el service worker necesitan **HTTPS** en el alojamiento. `localhost` y `127.0.0.1` son excepciones para desarrollo en esa computadora; una IP de la red local con HTTP permite usar la web en el celular, pero no verificar la PWA completa. No requiere nuevas variables de entorno. Referencia: [requisitos de instalación de una PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

El service worker se registra solo con una compilación de producción (`pnpm build` y `pnpm start`). Guarda únicamente una pantalla pública sin conexión y los cuatro iconos. La interfaz de la app se solicita a la red al abrirla; si esa carga falla, muestra el aviso y un enlace para volver a intentar manualmente. Si pierdes la conexión con la app abierta, puedes editar tu selección, pero el coach y Riot requieren internet.

No se guardan en esa caché páginas de la app, respuestas API, claves, planes, fotos ni texto enviado al modelo. No hay cola de solicitudes ni reintentos automáticos de análisis. El borrador local está separado por cuenta y se elimina al salir o cambiar de usuario. El historial persiste en PostgreSQL y solo se consulta con una sesión válida. Las actualizaciones del service worker esperan a que cierres todas las ventanas de la app. Recargar elimina la clave personal introducida en memoria.

Al cambiar los iconos o `offline.html`, incrementa la versión de `CACHE_NAME` en `public/sw.js` para actualizar esos archivos en las instalaciones existentes. Las pruebas PWA comprueban el manifiesto, el área segura del icono maskable y que el worker nunca almacene ni repita solicitudes privadas.

## Conexión y secretos

| Variable                            | Uso                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`                | Clave de OpenRouter del servidor. Ponle un límite de crédito en OpenRouter: es el tope duro de gasto.                      |
| `AI_USER_DAILY_BUILDS`              | Builds nuevas por cuenta y día (UTC). Predeterminado: 30.                                                                  |
| `AI_DAILY_BUDGET_USD`               | Tope diario de la app en USD con el coste que informa OpenRouter (USD 0.10 estimados si no lo informa). Predeterminado: 5. |
| `DATABASE_URL`                      | Conexión privada PostgreSQL del runtime. Local en desarrollo; en Prisma Postgres usa la conexión pooled con TLS.           |
| `DIRECT_URL`                        | Opcional para la CLI: conexión directa de migraciones y administración. Si está ausente se usa `DATABASE_URL`.             |
| `BETTER_AUTH_SECRET`                | Secreto aleatorio privado de al menos 32 caracteres.                                                                       |
| `BETTER_AUTH_URL`                   | Origen exacto de la app. HTTPS obligatorio en producción.                                                                  |
| `BETTER_AUTH_TRUSTED_ORIGINS`       | Opcional. Otros orígenes exactos separados por coma; no admite comodines.                                                  |
| `APP_REGISTRATION_MODE`             | `open` es el valor predeterminado: registro público e invitación opcional. `invite` exige código para una beta cerrada.    |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM` | Clave privada de Resend y remitente de un dominio verificado.                                                              |

Guarda las variables en `.env` o `.env.local` durante el desarrollo y en el gestor de secretos del alojamiento al desplegar. No uses el prefijo `NEXT_PUBLIC_` para claves. No las subas al repositorio.

La sesión verificada protege cada build. Antes de llamar a la IA, el servidor revisa la caché; si no hay build, comprueba el tope diario de la app y reclama una build del día de la cuenta con un incremento atómico. La llamada no tiene reintentos automáticos ni sigue redirecciones. El historial guarda sólo campeón, rival, rol y la build validada.

Una consulta que falla después de enviarse puede tener coste. Se registra el coste informado o el estimado, y el jugador puede volver a pedir el mismo matchup. La generación no depende de la conexión del navegador: si dejas de esperar, la build termina igualmente y queda en la caché y en tu historial. Los datos enviados a OpenRouter son nombres e IDs del catálogo de Riot; no se envía texto del usuario. Consulta sus [opciones de privacidad](https://openrouter.ai/support#privacy-and-data-logging).

## Cómo usarlo

1. Elige tu campeón. El rol se sugiere a partir de él; cámbialo si juegas otra posición.
2. Elige a tu rival de línea (o el jungla rival).
3. Pulsa **Ver build**. Recibes hechizos, runas con fragmentos, compra inicial, build en orden, situacionales y habilidades 1–6. **Copiar build** exporta lo mismo como texto.

## Datos de parche y builds

El catálogo de campeones e ítems procede de [Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon) y no necesita clave. La aplicación consulta su versión disponible y muestra la procedencia del catálogo; un catálogo de respaldo se identifica como tal. Data Dragon puede publicarse después del parche y su versión puede diferir del cliente de una región.

El catálogo permite comprobar nombres e ítems, pero no demuestra cuál es la build con mayor rendimiento. Esta versión no integra un proveedor de estadísticas de win rate ni una base de datos de matchups. Las builds son recomendaciones del modelo, validadas contra el catálogo, sin búsqueda web.

El modelo puede equivocarse en interacciones, runas o tiempos. El estilo de asesoría busca precisión y concisión; no acredita que el modelo tenga un rango real de Challenger.

## Verificar y compilar

El código de aplicación y las pruebas usan TypeScript con `strict: true`. Prettier mantiene un formato común; ESLint revisa Next.js, React, TypeScript y prácticas que pueden introducir errores. El linter no sustituye la validación de datos ni una revisión de seguridad.

```sh
pnpm format
pnpm lint:fix
```

Estos comandos modifican los archivos. Para revisar sin aplicar correcciones:

```sh
pnpm format:check
pnpm lint
pnpm check
pnpm test:accounts
pnpm build
pnpm start
```

`check` reúne la comprobación de formato, lint, TypeScript y pruebas unitarias. `test:accounts` levanta PostgreSQL real temporal y verifica autenticación, invitaciones, favoritos, caché compartida, reintento tras un fallo, límites diarios concurrentes, tope de la app e historial privado; simula IA, Data Dragon y correo. Las pruebas no consumen créditos ni usan claves reales. Una compilación correcta no demuestra que tus credenciales de OpenRouter o Resend funcionen; verifica esos servicios con tu configuración antes de compartir la aplicación. Para probar cuentas por HTTP local utiliza `pnpm dev`; en producción Better Auth requiere HTTPS.

### Dependencias y auditoría

```sh
pnpm audit --prod --audit-level=moderate
pnpm audit:security
```

La revisión local del 11 de noviembre de 2026 no encontró avisos en las dependencias de producción. Para corregir los avisos anteriores se actualizaron `next`, `@next/env` y `eslint-config-next` de 16.4.0 a 16.4.6 (dos críticos y uno alto, corregidos desde 16.4.1) y `zod` de 4.6.5 a 4.6.7 (uno alto, corregido desde 4.6.6). `pnpm-workspace.yaml` fija `deepmerge-ts` a 8.0.0, `mysql2` a 3.23.1 y `fast-uri` 3.x a 3.1.9 mediante overrides para resolver los avisos encontrados en esas cadenas transitivas. `fast-uri` llega por `prisma` → `@prisma/dev` → `@prisma/streams-local` → `ajv`; Prisma 7.10.1 conserva esa misma cadena, así que el override es lo que impide resolver una versión vulnerable.

La auditoría completa incluye herramientas de desarrollo y conserva un aviso moderado de `minimatch` 10.2.6, dependiente de `eslint-config-next` a través de `eslint-plugin-import` y `@typescript-eslint/typescript-estree`. El aviso [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) describe una posible denegación de servicio por amplificación de patrones y se corrige en `minimatch` 11.0.1. La versión estable actual de typescript-eslint (8.72.2) todavía exige `minimatch` `^10.2.2`; forzar el cambio de versión mayor con un override podría romper ESLint. Esa cadena se utiliza al ejecutar ESLint con patrones del repositorio; no procesa las solicitudes de la aplicación. El aviso no se silencia: `audit:security` y la auditoría completa semanal fallan y lo muestran hasta que pueda corregirse con una versión estable de typescript-eslint. El aviso anterior de `braces` 3.0.3 ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)) fue retirado por GitHub el 23 de octubre de 2026 y ya no aparece en la auditoría.

### Protección del coach y evaluación de respuestas

La app sólo prepara builds de League of Legends. La petición contiene únicamente campeón, rival y rol del catálogo: un esquema estricto rechaza cualquier otro campo, así que no hay texto del usuario que llegue al modelo. Catálogo y habilidades de Riot se envían como datos, no como instrucciones. No hay herramientas para ejecutar código, leer archivos ni consultar secretos del servidor.

La ruta de builds valida una sesión verificada y aplica un límite persistente antes de leer el JSON: 10 solicitudes por cuenta y 120 globales por minuto, incluidas las que salen de la caché.

Las páginas HTML se renderizan por solicitud y se sirven con `Cache-Control: private, no-store`. La política CSP utiliza un nonce nuevo para los scripts y no permite `unsafe-eval` en producción. Se conserva `unsafe-inline` únicamente para estilos, por compatibilidad con los atributos de estilo de React; no habilita scripts inline sin nonce. Los archivos públicos de la PWA mantienen su tratamiento separado descrito arriba.

Toda respuesta pasa por un esquema JSON estricto, la validación de IDs del catálogo, ramas y filas de runas, fragmentos, hechizos, oro inicial y orden de habilidades, y el análisis de cada texto en busca de enlaces, marcado, secretos e instrucciones. Una sección inválida se omite y se señala; un texto inseguro descarta la respuesta completa.

```sh
pnpm eval:security
```

La evaluación comprueba que la petición no tiene canal de texto libre, que una sesión ausente se detiene antes de la red y que respuestas JSON válidas con instrucciones, enlaces, marcado o secretos se descartan. Comprueba los límites deterministas de la aplicación con un proveedor simulado y no realiza consultas pagadas.

Estas defensas reducen riesgo y pueden tener falsos positivos o dejar pasar ataques nuevos. No garantizan inmunidad a prompt injection, corrección táctica, builds óptimas ni confidencialidad absoluta del texto del prompt. La seguridad no depende de que ese texto sea secreto: permisos, credenciales y validación se controlan en el servidor. Antes de publicar o cambiar de modelo, evalúa también su comportamiento real con ejemplos visuales y semánticos, registra los fallos y mantén límites de gasto y acceso. Referencia: [prevención de prompt injection de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).

## Contribuir y preparar la publicación

La [guía de contribución](CONTRIBUTING.md) explica el entorno, las comprobaciones y cómo presentar cambios. Para reportar vulnerabilidades, sigue la [política de seguridad](SECURITY.md) y utiliza un canal privado. Hay formularios de errores y mejoras y una plantilla de propuesta de cambios en `.github/`.

Los flujos de GitHub Actions están configurados; consulta su estado y resultados en la pestaña Actions del repositorio. El CI revisa formato, lint, tipos, pruebas, integración con PostgreSQL, compilación y dependencias de producción en cada push o propuesta. Otro flujo audita todas las dependencias semanalmente y permite ejecución manual. Las acciones están fijadas a commits comprobados, los permisos son de lectura y las comprobaciones no requieren secretos de producción. Dependabot está configurado para proponer actualizaciones semanales de dependencias y acciones.

La licencia aún no se ha elegido. Antes de presentar el proyecto como código abierto o distribuirlo públicamente, decide y añade la licencia, revisa los secretos y los archivos incluidos y habilita un canal privado para reportes de seguridad. Esta preparación no publica el repositorio ni despliega la aplicación.

## Desplegar en Vercel, Netlify o un VPS

La aplicación utiliza Next.js con servicios externos independientes del alojamiento: PostgreSQL, Better Auth, OpenRouter y, para el correo, Resend. La base de Prisma Postgres pertenece a tu propia cuenta y puede conservarse al cambiar el servidor de la app. Para Docker con Node.js 24, migraciones separadas y HTTPS en tu servidor, sigue [Despliegue en un VPS](docs/vps-deployment.md).

1. Sube el proyecto a un repositorio privado o público después de revisar los secretos y la licencia. Conserva `.env.local`, la base local y los datos privados fuera de Git.
2. Importa el repositorio en Vercel o Netlify con el preset de Next.js y la raíz de este proyecto.
3. Configura PostgreSQL, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` con HTTPS, Resend y los presupuestos para ese entorno. Aplica la migración y las semillas a la base correspondiente antes de habilitar registro. No reutilices credenciales locales en producción. Para Prisma Postgres propio, consulta la [guía de la base alojada](docs/database-deployment.md); las vistas previas usan una base separada de producción.
4. Configura la instalación con `pnpm install --frozen-lockfile` y la compilación con `pnpm build`. Usa el runtime de Next.js con rutas API; la aplicación necesita servidor y no es una exportación estática.
5. En una vista previa, verifica la carga del catálogo, la autenticación y una build nueva; después pide el mismo matchup y comprueba que sale de la caché sin contar.
6. Publica después de esa comprobación. Los cambios de variables requieren un nuevo despliegue.

[Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) detecta Next.js. Netlify ofrece OpenNext, pero sus funciones síncronas tienen un [límite de 60 segundos](https://docs.netlify.com/build/functions/configuration/): hay que adaptar y probar la espera del proveedor, de hasta 240 segundos con Haiku max antes de usarlo. La [guía portable](docs/vps-deployment.md) explica estas condiciones. Preparar Docker o publicar una compilación no demuestra el flujo completo de cuentas y proveedores; verifica cada entorno antes de darlo por listo.

Elociencia no está afiliado ni respaldado por Riot Games. League of Legends y las marcas asociadas pertenecen a Riot Games.
