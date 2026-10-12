# Prisma Postgres, migraciones y portabilidad

Prisma ORM ya está instalado: no requiere una cuenta de Prisma. Para alojar una base persistente en **Prisma Postgres**, crea un proyecto y su base en tu propia cuenta de [Prisma Console](https://console.prisma.io/). Vercel recibirá una conexión privada PostgreSQL; no hace falta contratar la base mediante el Marketplace de Vercel. Podrás usarla desde un VPS o cambiar de proveedor PostgreSQL conservando el esquema y las migraciones del repositorio. [Documentación de Prisma Postgres](https://www.prisma.io/docs/postgres).

Conserva las credenciales en tu gestor privado de secretos. No las pegues en chats, capturas, issues ni archivos versionados.

## 1. Crear la base en tu cuenta

1. Entra en Prisma Console y selecciona tu workspace. Crea un proyecto para Elociencia y una base para producción, con un nombre que identifique ese entorno.
2. Elige el plan gratuito si está disponible y revisa los límites y controles de gasto actuales del panel. El plan de alojamiento de Prisma es independiente de los planes Free/Pro de los usuarios de Elociencia; no son cuotas ni pagos intercambiables.
3. Elige una región cercana al servidor de la app. Por ejemplo, `us-east-1` es razonable si las funciones de Vercel están en Washington (`iad1`); confirma las opciones de región que ofrece tu cuenta.
4. Abre **Connect to your database**, genera las conexiones y conserva los valores **pooled** y **direct** en tu gestor privado. Ambas corresponden a la misma base.

No uses una base anónima temporal como producción sin incorporarla antes a tu cuenta. No actives un plan de pago o una ampliación automática sin revisar sus condiciones y autorizar el gasto. Consulta la [Console](https://www.prisma.io/docs/console) y los [planes vigentes](https://www.prisma.io/pricing).

## 2. Separar las conexiones y los entornos

La aplicación utiliza PostgreSQL por TCP con `@prisma/adapter-pg`, no Accelerate. Copia las conexiones PostgreSQL del panel con protocolo `postgres://` o `postgresql://` y TLS; una URL `prisma+postgres://` no es compatible con esta configuración.

| Uso                                                | Conexión                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| API de la app en Vercel o un VPS                   | Pooled, en `DATABASE_URL`, con `sslmode=verify-full`                         |
| Migraciones e introspección con Prisma CLI 7       | Direct, en `DIRECT_URL`, con `sslmode=require&sslaccept=strict`              |
| Semillas y comandos `pnpm access` de este proyecto | Direct, como `DATABASE_URL` sólo para ese comando, con `sslmode=verify-full` |
| Desarrollo local                                   | La conexión local existente; `DIRECT_URL` puede quedar ausente               |

`prisma.config.ts` consulta `DIRECT_URL` y usa `DATABASE_URL` si aquella está ausente. Los scripts de semillas y accesos utilizan el cliente de `lib/db.ts`, que consulta `DATABASE_URL`; por eso deben recibir la conexión directa al ejecutarlos contra la base alojada. [Conexiones de Prisma Postgres](https://www.prisma.io/docs/postgres/database/connecting-to-your-database).

El driver `pg` del runtime y el motor de Prisma CLI 7 interpretan las opciones TLS por separado. Conserva dos variantes privadas de la conexión directa: `sslmode=verify-full` para los scripts de este proyecto y `sslmode=require&sslaccept=strict` para la CLI. Modifica sólo esos parámetros, conservando host, puerto, base y credenciales del proveedor. Así exiges conexión cifrada y verificación del servidor en ambos clientes. Consulta [PostgreSQL en Prisma 7](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql), [la opción strict del motor instalado](https://github.com/prisma/prisma-engines/blob/0edf323efd1d98336f3f0a68684b56f689b900d3/quaint/src/connector/postgres/url.rs#L326) y [TLS en node-postgres](https://node-postgres.com/features/ssl).

Conserva `.env.local` y la base local de desarrollo. No sobrescribas ese archivo al descargar variables de Vercel. Utiliza una base y credenciales separadas para Preview; una vista previa de una contribución no debe recibir la conexión de producción ni consultar sus usuarios. Aplica las mismas migraciones y semillas a esa base de pruebas.

## 3. Aplicar migraciones y crear los planes

Confirma en la consola el proyecto, la base y el entorno antes de ejecutar comandos. Esto crea el esquema en la base nueva; no copia cuentas ni historial desde tu base local.

En una terminal Bash, introduce ambas variantes de la conexión **direct** de forma privada. La entrada no se muestra ni se escribe como literal en el historial; no uses trazado de comandos (`set -x`) ni compartas registros que contengan credenciales.

```bash
read -r -s -p "Conexión directa para pg (sslmode=verify-full): " ELOCIENCIA_PG_DIRECT_URL
printf '\n'
read -r -s -p "Conexión directa para CLI (sslmode=require&sslaccept=strict): " ELOCIENCIA_CLI_DIRECT_URL
printf '\n'
pnpm db:generate
DATABASE_URL="$ELOCIENCIA_PG_DIRECT_URL" DIRECT_URL="$ELOCIENCIA_CLI_DIRECT_URL" pnpm db:migrate
DATABASE_URL="$ELOCIENCIA_PG_DIRECT_URL" DIRECT_URL="$ELOCIENCIA_CLI_DIRECT_URL" pnpm db:seed
DATABASE_URL="$ELOCIENCIA_PG_DIRECT_URL" DIRECT_URL="$ELOCIENCIA_CLI_DIRECT_URL" pnpm exec prisma migrate status
unset ELOCIENCIA_PG_DIRECT_URL ELOCIENCIA_CLI_DIRECT_URL
```

Los valores se aplican sólo a esos procesos, sin cambiar `.env.local`. `db:migrate` ejecuta `prisma migrate deploy` con los archivos versionados. No uses `db push`, `migrate reset` ni el inicio de una petición API para desplegar cambios del esquema. Las migraciones y semillas son un paso administrativo separado de `pnpm build`; una compilación sólo genera el cliente y construye Next.js.

La semilla crea estas políticas iniciales:

| Plan de Elociencia | Análisis/mes | Capturas/mes | Búsquedas/mes | Presupuesto por usuario | Solicitudes/minuto | Generaciones simultáneas |
| ------------------ | -----------: | -----------: | ------------: | ----------------------- | -----------------: | -----------------------: |
| Free               |           10 |            5 |             0 | USD 1/mes y 1/día       |                  2 |                        1 |
| Pro                |           50 |           20 |            10 | USD 5/mes y 2/día       |                  5 |                        1 |

La semilla conserva las políticas que ya existan si vuelves a ejecutarla. La cuota monetaria, las consultas y los fondos globales se aplican conjuntamente: ninguno promete IA ilimitada. Los registros nuevos sin invitación reciben Free. El primer administrador verificado puede conceder Pro de cortesía desde la app; no necesitas cambiar el rol a administrador para dar Pro a tus amigos. La facturación de suscripciones sigue pendiente. [Cuentas y consumo](accounts-and-usage.md).

## 4. Conectar Vercel y comprobar

1. En el proyecto correcto de Vercel, añade `DATABASE_URL` como variable privada de **Production**, con la conexión **pooled** y `sslmode=verify-full`. No uses el prefijo `NEXT_PUBLIC_` y no selecciones Preview o Development para esa credencial.
2. `DIRECT_URL` no es necesaria en Vercel para servir la aplicación si ejecutas las migraciones por separado. Conserva esa conexión en tu entorno privado de administración.
3. Configura un `BETTER_AUTH_SECRET` exclusivo de producción, `BETTER_AUTH_URL` con el origen HTTPS exacto, `APP_REGISTRATION_MODE=open`, los presupuestos `AI_*` y los proveedores que utilizarás. El registro público requiere `RESEND_API_KEY` y un remitente `AUTH_EMAIL_FROM` de un dominio verificado; la base sola no completa la verificación de correo. [OpenRouter y Resend](provider-setup.md).
4. Genera un nuevo despliegue después de guardar las variables. La configuración no se incorpora automáticamente a un despliegue anterior.
5. Confirma que `prisma migrate status` indique todas las migraciones aplicadas. En una herramienta PostgreSQL conectada de forma privada, revisa únicamente el esquema y las filas `FREE` y `PRO` de `Plan`, sin exportar cuentas, secretos ni historial.
6. En la app desplegada, prueba el registro sin código, la entrega y verificación del correo y que la cuenta comience con Free. Cuando exista un administrador verificado, comprueba una concesión Pro y su retirada con cuentas de prueba. Una prueba automatizada con correo simulado no demuestra entrega real de Resend.

Comprueba primero el esquema y las cuentas; una llamada de IA real necesita además saldo y clave válidos de OpenRouter y puede consumir créditos. Si pruebas una consulta, usa una sola solicitud acotada y revisa su consumo. La base y los planes pueden estar preparados aunque falte el dominio de correo; no desactives la verificación para abrir el acceso público.

## 5. Llevar la app a un VPS

Puedes desplegar el mismo backend de Next.js en un VPS y usar la conexión pooled de la base que administra tu cuenta de Prisma. Configura allí los secretos, HTTPS y el origen público de Better Auth. No necesitas mover los datos por cambiar el alojamiento de la app.

Si también decides cambiar el alojamiento de PostgreSQL, prepara una copia privada con herramientas estándar como `pg_dump` y `pg_restore`, valida su restauración en una base separada y comprueba la compatibilidad de versiones antes del cambio. Después actualiza las conexiones de runtime y administración. Planifica la escritura durante el traslado para no perder cambios de cuentas o consumo; conservar archivos de migración no sustituye trasladar los datos. [Migración de PostgreSQL](https://www.prisma.io/docs/postgres/import-from-existing-database).
