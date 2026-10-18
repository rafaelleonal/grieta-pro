# Configurar OpenRouter y Resend en Elociencia

OpenRouter genera los consejos y reconoce capturas. Resend entrega los enlaces de verificación y recuperación de cuenta. Las pruebas automatizadas utilizan proveedores simulados; configurar estas cuentas habilita llamadas reales, que pueden consumir saldo o cupo de correo.

La configuración de Gemini de esta guía se revisó el 11 de octubre de 2026 con documentación oficial y metadatos públicos de OpenRouter. Los paneles, modelos y límites pueden cambiar. Aquí no se crean cuentas, compran créditos, envían correos ni prueban claves por ti.

**Modo vigente:** `APP_ACCESS_MODE=beta` da acceso común a los modelos compatibles, conserva cupos y presupuestos de la política base y desactiva la búsqueda web. Gemini 3.8 Flash es el predeterminado; Opus 5.5 sigue seleccionable sin un nivel comercial. Las habilitaciones de planes descritas debajo sólo son necesarias para el modo histórico `plans`; no deben ejecutarse para activar la beta. [Decisión y límites](adr/0006-acceso-beta-comun.md).

## 1. Preparar tu configuración local

Instala las dependencias con `pnpm install --frozen-lockfile`. Si todavía no tienes configuración privada, copia `.env.example` a `.env` o `.env.local`. Si ya usas `.env`, edita ese archivo y conserva los valores que funcionan: `.env.local` tiene prioridad y puede ocultarlos. No publiques esos archivos ni pegues claves en conversaciones, capturas o issues.

Si aún no tienes `BETTER_AUTH_SECRET`, genéralo con `openssl rand -base64 32` y guarda el resultado únicamente en el archivo privado elegido. Conserva el secreto existente y la conexión local de PostgreSQL que funciona. El cambio de marca mantiene los nombres históricos `cholo_local` y `cholo_coach`; no requiere renombrar la base.

```dotenv
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://127.0.0.1:3000
BETTER_AUTH_TRUSTED_ORIGINS=
APP_REGISTRATION_MODE=open
```

Rellena el secreto antes de continuar. Abre la app siempre desde el origen indicado: `localhost` y `127.0.0.1` son diferentes. Si prefieres `http://localhost:3000`, cambia `BETTER_AUTH_URL` y usa esa dirección también para abrir los enlaces del correo. Los orígenes adicionales deben ser exactos; no utilices comodines.

Las claves de esta guía son variables del servidor. No añadas `NEXT_PUBLIC_` ni las incluyas en código cliente. [Seguridad](../SECURITY.md) describe los cuidados del entorno.

## 2. Crear la conexión de OpenRouter

1. Crea tu cuenta o inicia sesión en [OpenRouter](https://openrouter.ai/).
2. Abre [Settings → Credits](https://openrouter.ai/settings/credits) y revisa el saldo. Para utilizar modelos de pago, añade sólo el saldo que quieras destinar a la prueba. Revisa el total mostrado por el panel antes de pagar; deja la recarga automática desactivada durante las primeras pruebas. OpenRouter descuenta las consultas del saldo de créditos. [Créditos y facturación](https://openrouter.ai/docs/faq).
3. Abre [Settings → API keys](https://openrouter.ai/settings/keys), crea una clave normal para inferencia y ponle un nombre, por ejemplo `Elociencia desarrollo`. Configura un límite de crédito pequeño y explícito; si eliges reinicio diario, semanal o mensual, revisa esa ventana. Una clave de administración de claves no sirve para las consultas del coach. Copia la clave al crearla y guárdala en tu entorno privado. [Autenticación y límites por clave](https://openrouter.ai/docs/api_reference/authentication).
4. Completa estas variables en tu archivo de configuración privado:

```dotenv
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-3.8-flash
```

El campo de clave vacío debe contener tu clave real. El modelo es un ID exacto de la política del servidor, no un nombre libre. Las políticas iniciales permiten:

| Plan | Modelos                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Free | `google/gemini-3.8-flash`, `google/gemini-3.1-pro-preview`, `openai/gpt-5.6-luna`, `anthropic/claude-haiku-5.5`, `openai/gpt-6-luna` |
| Pro  | Los anteriores, `anthropic/claude-sonnet-5.5` y `anthropic/claude-opus-5.5`                                                          |

Gemini 3.8 Flash es el predeterminado para build, hechizos y runas. En el modo histórico `plans`, si no está permitido, la selección automática utiliza Gemini Pro u otro modelo permitido; solicitar explícitamente uno prohibido sigue siendo un error. Sobre Gemini Pro: Su ID, imágenes, salidas estructuradas y razonamiento se verificaron el 11 de octubre de 2026 mediante metadatos públicos; no se hizo una consulta pagada para validar esta configuración. GPT 5.6 Luna y los demás modelos permanecen disponibles según el plan. Eso no garantiza disponibilidad para toda cuenta, proveedor o momento. Confirma el ID y sus capacidades en el [catálogo de modelos](https://openrouter.ai/models) o en la [API pública de modelos](https://openrouter.ai/api/v1/models) antes de probarlo. La aplicación restringe también parámetros y tarifas del proveedor; no todos los modelos del catálogo son compatibles con su política.

La política de Gemini limita la entrada a USD 2 y la salida a USD 12 por millón de tokens, con razonamiento `medium` activado y excluido de la respuesta. El razonamiento también se factura y comparte el límite de salida: 14 000 tokens para el coach y 4 000 para extraer capturas o texto. Un análisis manual reserva USD 0.456; una extracción con imagen, USD 0.694146; un coach con búsqueda, USD 1.242. Son reservas conservadoras, no costes medidos ni garantías de calidad o de completar una respuesta. El coste final procede de OpenRouter. Se conserva la política explícita de Luna, con razonamiento desactivado y reserva manual de USD 0.0372. Las reservas anteriores conservan su modelo e importe. Consulta [cuentas y consumo](accounts-and-usage.md#coste-orientativo-de-50-análisis).

Las semillas nuevas incluyen Gemini y crean los presupuestos individuales Free de USD 1/día y 1/mes, y Pro de USD 2/día y 5/mes. En una base existente, `pnpm db:seed` conserva la política administrada. Después de revisar que la conexión corresponde al entorno elegido, este comando habilita explícitamente el modelo predeterminado y eleva los límites diarios inferiores a USD 1 en Free o USD 2 en Pro:

```sh
pnpm db:seed --enable-default-model --enable-gemini-daily-budgets
```

Los dos indicadores son independientes: `--enable-default-model` añade el predeterminado actual (Flash) a Free y Pro si falta; `--enable-gemini-daily-budgets` sólo eleva los límites diarios inferiores. Ninguno reduce un límite personalizado ni reinicia consumo o reservas. Conservan los límites mensuales, cupos, fondos por plan y presupuestos globales. No hace falta una migración de esquema. Reinicia Next.js después de cambiar `OPENROUTER_MODEL` para que use la nueva configuración.

Las semillas nuevas también permiten Sonnet 5.5 y Opus 5.5 en Pro. Para añadir Opus a un plan Pro existente, después de comprobar el destino de la conexión:

```sh
pnpm db:seed --enable-opus
```

Sólo añade `anthropic/claude-opus-5.5` a Pro si falta e incrementa la versión del plan; no toca Free, cupos ni presupuestos. Opus usa razonamiento `low` y hasta 4 096 tokens de salida para el coach reducido: un análisis manual reserva USD 0.65792 mientras está en curso y después se contabiliza el coste confirmado. La extracción conserva razonamiento `medium` y 4 000 tokens. La [comparación del contrato reducido](flash-build-comparison.md) incluye dos consultas por modelo; las comparaciones del 12 de octubre usaban un prompt anterior. Despliega primero el código con su política; un modelo permitido sin política se ignora.

Gemini Flash (`google/gemini-3.8-flash`) ofrece lectura progresiva con razonamiento bajo. Para habilitarlo en una base existente, comprueba primero el destino de conexión y ejecuta `pnpm db:seed --enable-flash`. Configura `OPENROUTER_MODEL=google/gemini-3.8-flash` para alinear el alojamiento con el predeterminado actual; reinicia el servidor. El seed sólo habilita el modelo, no cambia presupuestos. Una selección explícita del usuario se conserva. La [comparación real](fast-coach-evaluation.md) mide rapidez y formato; esa evaluación histórica conserva [límites tácticos aún abiertos](flash-prepartida.md). El streaming requiere que cualquier proxy intermedio respete `X-Accel-Buffering: no` y no acumule el cuerpo; compruébalo en el despliegue.

Para incorporar otro modelo hace falta revisar `lib/usage.ts`, las políticas de los planes y las pruebas de imágenes, salida y gasto. No sustituyas el ID por un alias o una variante `:free` esperando que evite esos controles.

Conserva además los presupuestos `AI_*` de `.env.example`, ajustados al gasto que quieras permitir. El límite de OpenRouter y los límites de Elociencia se complementan. Una clave personal introducida en **Conexión** sigue necesitando cuenta verificada y conserva las cuotas; no es un acceso anónimo.

## 3. Preparar el correo con Resend

1. Crea tu cuenta o inicia sesión en [Resend](https://resend.com/).
2. En [Domains](https://resend.com/domains), añade un dominio que controles. Puedes dedicar un subdominio al correo de cuentas, por ejemplo `cuentas.tu-dominio.com`. No uses `gmail.com`, `outlook.com` ni un dominio público que no sea tuyo. Resend recomienda subdominios para separar la reputación de envío. [Dominios verificados](https://resend.com/docs/dashboard/domains/introduction).
3. Abre los registros DNS del dominio en Resend. En el proveedor que administra tu DNS, copia exactamente los tipos, nombres y valores que muestra el panel para SPF y DKIM. El panel puede mostrar TXT/MX o CNAME; no copies registros genéricos de otra guía ni reemplaces los MX de tu correo existente. Vuelve a Resend, pulsa **Verify DNS Records** y espera a que el envío figure verificado. [Registros y estados de dominio](https://resend.com/docs/dashboard/domains/manage-domains).
4. En [API Keys](https://resend.com/api-keys), crea una clave para `Elociencia desarrollo`, con permiso **Sending access** y restringida al dominio verificado que usarás. Copia su valor cuando se cree; el panel no lo vuelve a mostrar. [Gestión de claves](https://resend.com/docs/dashboard/api-keys/introduction) y [permisos de envío](https://resend.com/docs/api-reference/api-keys/create-api-key).
5. Completa estas variables:

```dotenv
RESEND_API_KEY=
AUTH_EMAIL_FROM="Elociencia <coach@cuentas.tu-dominio.com>"
AUTH_MAILPIT_URL=
```

Sustituye el remitente por una dirección del dominio o subdominio que hayas verificado y autorizado para esa clave. Puedes recibir la verificación en tu Gmail; Gmail no puede ser el dominio remitente. Deja `AUTH_MAILPIT_URL` vacío para esta conexión real: un buzón de pruebas local es otro modo de desarrollo, no un reemplazo del correo público.

### Si todavía no tienes dominio

Puedes explorar la demostración y ejecutar `pnpm check` y `pnpm test:accounts` sin dominio ni claves reales. Las pruebas de cuentas crean PostgreSQL temporal y simulan los correos y la IA.

Para una prueba personal de entrega, Resend permite `onboarding@resend.dev` únicamente hacia el correo asociado a tu propia cuenta de Resend. En ese caso usa `AUTH_EMAIL_FROM="Elociencia <onboarding@resend.dev>"` y registra Elociencia con ese mismo correo. No sirve para verificar a tus amigos: necesitarás tu dominio para otros destinatarios. [Restricción de resend.dev](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

Utiliza una clave exclusiva de pruebas con **Sending access** que permita ese remitente; una clave restringida a otro dominio no corresponde a este modo. Cuando verifiques tu dominio, cambia al remitente propio y a una clave restringida a él.

## 4. Levantar la app y comprobar tu cuenta

En una terminal, inicia la base local y mantenla abierta:

```sh
pnpm db:local
```

En otra terminal, después de completar la configuración:

```sh
pnpm db:setup
pnpm dev
```

Si Next.js ya estaba abierto, detenlo y vuelve a iniciarlo después de cambiar las variables. Usa `pnpm dev` para cuentas sobre HTTP local; una compilación de producción requiere HTTPS para autenticar.

Abre **Crear cuenta** y regístrate con tu propio correo. El registro es abierto por defecto: deja el código de invitación vacío para empezar con Free. Abre el correo de verificación y luego inicia sesión. Comprueba una recuperación de contraseña dirigida a esa misma cuenta antes de compartir el acceso. Si estás configurando el primer administrador, sigue [Crear tu cuenta de administrador](../README.md#crear-tu-cuenta-de-administrador).

Una invitación es opcional en `open`: si tienes un código válido para tu correo, puedes usarlo para recibir el plan incluido. Si introduces un código inválido, vencido, revocado o destinado a otro correo, se rechaza el registro. Si conservas `APP_REGISTRATION_MODE=invite` de una configuración anterior, cambia el valor a `open` y reinicia Next.js para registrar cuentas sin código.

Sólo si decides operar una beta cerrada, configura `APP_REGISTRATION_MODE=invite`; en ese modo el código sí es obligatorio. Las invitaciones se crean desde administración. Para iniciar esa beta antes de tener el primer administrador, puedes crear una invitación Free para tu propio correo:

```sh
pnpm access invite --email tu@correo.com --plan FREE
```

Ese paso sólo es necesario para el arranque de una beta cerrada; no forma parte del registro abierto normal.

Para comprobar OpenRouter, genera un solo plan manual, con un modelo Free y sin búsqueda web. Revisa que aparezca en tu historial y consulta el consumo de esa llamada en [Activity](https://openrouter.ai/activity). Después prueba una sola captura sintética, si necesitas validar visión, y revisa su consumo por separado. No presupongas un coste por consulta: depende del modelo, contexto e imagen. Un resultado descartado también puede tener coste y un timeout mantiene una reserva pendiente.

Esto comprueba entrega y consultas reales únicamente cuando tú realices esos pasos con tus servicios. Las pruebas automatizadas y esta guía no acreditan que las claves estén activas.

## Resolver problemas frecuentes

| Síntoma                                           | Qué revisar                                                                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La app indica que faltan cuentas o correo         | Comprueba `DATABASE_URL`, un secreto de al menos 32 caracteres, `BETTER_AUTH_URL`, `RESEND_API_KEY` y `AUTH_EMAIL_FROM`. Reinicia Next.js. La presencia de una clave no demuestra que sea válida.                                             |
| El enlace o acceso falla por origen               | Usa exactamente el host, protocolo y puerto de `BETTER_AUTH_URL`. No alternes `localhost` y `127.0.0.1`; revisa los orígenes permitidos sin añadir comodines.                                                                                 |
| Resend muestra `pending` o el dominio no verifica | Compara los registros DNS actuales con los valores del panel y espera la propagación. Revisa si tu proveedor añade el dominio automáticamente al nombre del registro. No alteres los registros del correo existente para intentar resolverlo. |
| Resend rechaza un remitente o destinatario        | El remitente y el dominio autorizado de la clave deben coincidir. Con `resend.dev`, el destinatario sólo puede ser el correo de tu cuenta de Resend. Revisa los registros de Resend y spam sin publicar enlaces o tokens del correo.          |
| OpenRouter rechaza la clave, saldo o modelo       | Revisa que sea una clave de inferencia activa, el saldo y límite de la clave, el ID exacto y el plan. Comprueba la disponibilidad de proveedores y sus capacidades; no desactives la validación ni los techos para forzar una respuesta.      |
| Aparece límite de consultas o presupuesto         | Revisa el cupo del usuario, el fondo Free/Pro y los presupuestos globales; tienen ventanas separadas. Si existe consumo pendiente, concílialo desde administración. No liberes una reserva incierta sólo para seguir probando.                |

## Llevarlo a un despliegue

La [guía de Prisma Postgres y migraciones](database-deployment.md) explica cómo crear la base en tu propia cuenta, conectar Vercel y conservar la opción de un VPS. Distingue la conexión pooled de la aplicación y la directa de administración; no sustituye tu configuración local.

Usa base de datos, claves y secreto separados del desarrollo. Configura las variables privadas en Vercel o Netlify, `BETTER_AUTH_URL` con el origen público HTTPS y sólo los orígenes adicionales necesarios. Usa `APP_REGISTRATION_MODE=open` para el registro público; selecciona `invite` únicamente si quieres una beta cerrada. Ambos modos exigen verificar el correo y mantienen las cuotas. Aplica migraciones y semillas a la base de ese entorno y vuelve a desplegar después de cambiar variables. No uses Mailpit ni credenciales locales en producción.

Comprueba de nuevo el correo y una consulta acotada en ese entorno antes de compartir acceso. Sigue [Desplegar](../README.md#desplegar-en-vercel-netlify-o-un-vps); preparar estas variables no publica la aplicación. Las fuentes de esta guía están en [Recursos oficiales](resources.md).
