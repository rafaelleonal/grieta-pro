# Probar el flujo en local

Puedes crear una cuenta, confirmar su correo, iniciar sesión y consultar al coach sin configurar Resend ni un dominio. El buzón de pruebas captura los mensajes en tu computadora: no envía correo real y conserva los enlaces sólo en memoria. Los controles de sesión, verificación, cuotas y propietario del historial permanecen activos.

## Preparar el entorno

Usa Node.js 24 y pnpm. Conserva las claves privadas en `.env.local`; no publiques ese archivo.

```bash
pnpm install
pnpm db:local
```

Deja la terminal de la base abierta. El PostgreSQL local conserva sus datos en `.local/postgres` al detenerlo. En `.env.local`, usa la conexión local que muestra ese comando, tanto para `DATABASE_URL` como para `DIRECT_URL`, y prepara esta configuración:

```dotenv
BETTER_AUTH_URL=http://127.0.0.1:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://127.0.0.1:3000
# Genera un secreto privado de al menos 32 caracteres; conserva el que ya tengas.
BETTER_AUTH_SECRET=tu-secreto-local-de-al-menos-32-caracteres
APP_REGISTRATION_MODE=open
AUTH_EMAIL_FROM=GrietaPro local <no-reply@grietapro.test>
AUTH_MAILPIT_URL=http://127.0.0.1:55441
RESEND_API_KEY=
```

`RESEND_API_KEY` debe quedar vacía en este entorno: si tiene valor, la app prioriza Resend. Mantén tu clave de OpenRouter en `.env.local` para probar respuestas reales; el buzón no necesita esa clave. Abrir el registro local no cambia la configuración de producción ni exige un código de invitación.

Si aún no has preparado el esquema de **esta base local**, en otra terminal ejecuta:

```bash
pnpm db:setup
```

Comprueba antes que ambas conexiones apuntan a tu PostgreSQL local. Este paso aplica migraciones y los planes Free/Pro; no lo ejecutes sobre una conexión de producción para hacer pruebas.

## Levantar la app y el buzón

En una segunda terminal:

```bash
pnpm mail:local
```

En una tercera terminal:

```bash
pnpm dev
```

Conserva las tres terminales abiertas. Si cambias `.env.local`, reinicia la app para que use la nueva configuración.

1. Abre [GrietaPro local](http://127.0.0.1:3000/login?mode=signup) y crea tu cuenta. Puedes usar un correo ficticio como `prueba@grietapro.test`. El código de invitación es opcional.
2. Abre el [buzón local](http://127.0.0.1:55441/). Se actualiza cada cinco segundos y muestra el mensaje de confirmación.
3. Pulsa **Abrir enlace de GrietaPro**. Después inicia sesión si la app lo solicita.
4. Elige campeón, línea y rival y pide el plan. Una consulta real consume créditos de OpenRouter y cuenta para las cuotas de la app.
5. Revisa el historial, sal de tu cuenta y vuelve a entrar para comprobar que tus registros permanecen asociados a esa cuenta.

El buzón escucha exclusivamente en `127.0.0.1`, muestra texto escapado y sólo permite enlaces al origen local de la app. No muestra HTML recibido ni guarda mensajes en archivos. Al detenerlo, desaparecen los mensajes, pero tu cuenta y tu historial siguen en la base local. Para recibir otro enlace, usa la opción de reenviar la verificación en la app.

## Si no llega la confirmación

- Revisa que la terminal de `pnpm mail:local` siga activa, `AUTH_MAILPIT_URL` coincida con su dirección y `RESEND_API_KEY` esté vacía.
- Abre la app con `127.0.0.1`, igual que `BETTER_AUTH_URL`. Usa el mismo origen al registrarte y confirmar el correo.
- Si el puerto 55441 está ocupado, inicia el buzón con `LOCAL_MAIL_PORT=55442 pnpm mail:local`, cambia `AUTH_MAILPIT_URL` al mismo puerto y reinicia Next.js.
- Si las cuentas siguen sin configurarse, comprueba el secreto, las conexiones locales y el remitente. No pegues claves ni conexiones privadas en mensajes o reportes.

## Diagnosticar OpenRouter

La terminal donde ejecutas `pnpm dev` muestra un evento JSON `openrouter_failure` cuando falla una llamada al proveedor. Incluye operación, modelo permitido, estado HTTP, duración, etapa y categorías fijas; no contiene claves, prompts, notas, capturas ni el error original completo. Las categorías de parámetros se infieren de campos acotados del error; no permiten reconstruir una respuesta anterior que no se conservó.

Por ejemplo, este evento ficticio señala un rechazo de campos obligatorios del esquema:

```json
{
  "event": "openrouter_failure",
  "version": 1,
  "stage": "http_error",
  "category": "invalid_request",
  "parameterCategory": "schema_required",
  "validationCategory": null,
  "operation": "COACH",
  "model": "openai/gpt-5.6-luna",
  "httpStatus": 400,
  "durationMs": 250
}
```

`http_error` significa que el proveedor respondió con un fallo HTTP. `embedded_error` significa que devolvió un error dentro de una respuesta HTTP 200. `connection`, `timeout`, `body_invalid`, `invalid_json` e `incomplete` distinguen red, cancelación, respuesta ilegible, JSON inesperado y respuesta inconclusa. El código tipado de OpenRouter, cuando es uno de los valores permitidos, tiene prioridad sobre la clasificación por texto.

`output_rejected` con `category=output_validation` indica que llegó una respuesta que GrietaPro rechazó. `validationCategory`, cuando está disponible, identifica una regla fija, por ejemplo `alternative_runes` para un par de árbol y runa principal inválido, `skill_order` para niveles de habilidades o `phase_items` para compras por fase. Nunca incluye la respuesta, valores propuestos ni detalles crudos de validación. Un HTTP 200 del proveedor puede tener coste aunque la app rechace su contenido.

Un HTTP 429 de GrietaPro con el mensaje de consulta pendiente se produce antes de enviar al proveedor: no genera un nuevo `openrouter_failure`. Revisa **Mi cuenta** para distinguir ese bloqueo de un límite de OpenRouter. Conserva las reservas inciertas hasta conciliarlas; no las elimines para desbloquear pruebas.

Para revisar tus llamadas y su consumo, abre [Activity de OpenRouter](https://openrouter.ai/activity) en tu cuenta y filtra por modelo y hora. La comprobación de la clave mediante [GET /api/v1/key](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key) es de lectura y no genera tokens; informa límites y consumo de la clave, no el saldo total comprado. No actives `debug.echo_upstream_body` ni publiques el cuerpo de una petición para depurar, porque puede incluir el prompt y datos privados.

Ver una respuesta HTTP 200 del endpoint de la clave no confirma que una generación funcionará. Hace falta una prueba real para comprobar el formato y la ruta elegida; esa prueba puede consumir saldo y debe revisarse por separado. Los eventos seguros nuevos no recuperan el detalle de rechazos anteriores. Referencia: [errores y diagnóstico oficiales](https://openrouter.ai/docs/api_reference/errors-and-debugging).

Esta configuración sirve para probar desde tu computadora. El buzón de pruebas no está habilitado en producción ni se publica para otros dispositivos. Para un despliegue público necesitarás el servicio real de correo y HTTPS.
