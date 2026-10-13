# Elociencia

Coach de League of Legends en español construido con Next.js y OpenRouter. Recibe tu campeón, línea y rival; genera un plan breve de niveles 1 a 6, respuestas mecánicas, build situacional y objetivos de partida. Puedes añadir las composiciones completas, interpretar texto o una captura y, opcionalmente, importar una partida activa con Riot ID.

Para retomar el desarrollo, empieza por [AGENTS.md](AGENTS.md) y [el contexto de continuidad](docs/agent-handoff.md): implementación actual, último diagnóstico de IA, pruebas, configuración y trabajo pendiente. Los recursos de la propuesta de marca **No Era el Jungla** están en [brand/](brand/README.md); su integración todavía está pendiente.

Los [términos de uso y la política de privacidad](docs/legal-and-riot.md) están disponibles en `/terminos` y `/privacidad`, con enlaces desde el coach y las pantallas de cuenta. Completa los datos públicos del responsable antes de publicar o solicitar acceso de producción a Riot.

Elige primero tu rol para ver campeones habituales. **Todos** y la búsqueda permiten elegir cualquier campeón, incluso fuera de posición. Con una cuenta verificada puedes marcar hasta doce favoritos por rol y ordenar su prioridad; se guardan en tu cuenta. Consulta [favoritos y futura conexión con Riot](docs/accounts-and-usage.md#campeones-por-rol-y-favoritos).

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

Abre [http://127.0.0.1:3000](http://127.0.0.1:3000). Next.js sirve la interfaz y las rutas API; PostgreSQL guarda cuentas, historial y cuotas mediante Prisma 7. Better Auth gestiona contraseñas, sesiones, verificación y recuperación por correo. El ejemplo local se puede explorar sin configurar cuentas; las llamadas a IA y Riot requieren una sesión verificada.

La migración versionada está en `prisma/migrations`; `db:setup` genera el cliente, aplica migraciones y crea los planes conservando las políticas ya existentes. La arquitectura y sus límites están descritos en [Cuentas, planes y control del gasto](docs/accounts-and-usage.md). Si falta la base, el secreto, la URL o el correo, las consultas privadas se rechazan; no hay acceso anónimo alternativo.

Para probar registro y verificación sin Resend ni dominio, usa [el buzón local](docs/local-testing.md): `pnpm mail:local` recibe los mensajes en tu computadora y muestra los enlaces de confirmación en el navegador.

Para alojar la base en tu propia cuenta de Prisma y conectar Vercel sin depender de su integración de almacenamiento, sigue [Prisma Postgres, migraciones y portabilidad](docs/database-deployment.md). La misma conexión PostgreSQL puede usarse después desde un VPS.

### Crear tu cuenta de administrador

El registro está abierto por defecto (`APP_REGISTRATION_MODE=open`). Abre **Crear cuenta**, regístrate con tu propio correo y verifica el enlace recibido; no necesitas un código de invitación y empezarás con Free. Después:

```sh
pnpm access bootstrap-admin --email tu@correo.com
```

El bootstrap solo permite el primer administrador y exige una cuenta verificada. Desde **Mi cuenta → Administrar accesos** puedes crear invitaciones Free/Pro, conceder Pro de cortesía, retirar esa cortesía y consultar consumo pendiente. Las claves de invitación se guardan como hash y se vinculan al correo; comparte el código únicamente con su destinatario. El rol de administrador no aumenta automáticamente la cuota de IA.

En el registro abierto, la invitación es opcional: un código válido concede el plan incluido. Si introduces un código inválido, vencido, revocado o de otro correo, el registro se rechaza; no se ignora para crear una cuenta Free. `APP_REGISTRATION_MODE=invite` queda disponible únicamente si eliges una beta cerrada con código obligatorio. Si tu configuración anterior contiene `invite`, cámbiala a `open` y reinicia Next.js para abrir el registro.

Free incluye 10 análisis y 5 lecturas de capturas al mes; Pro incluye 50 análisis, 20 lecturas y 10 consultas con búsqueda. Son políticas iniciales editables en PostgreSQL, no una suscripción de pago activa. Las semillas nuevas establecen Free USD 1/mes y 1/día; Pro USD 5/mes y 2/día. Los presupuestos globales y los fondos Free/Pro no cambian al seleccionar Gemini. Las ventanas se renuevan en UTC. Leer el historial y explorar el ejemplo no consumen IA. Las cuotas también se aplican al usar una clave personal, pero su gasto monetario no se descuenta del saldo del servidor. `pnpm db:seed` conserva las políticas existentes; la [guía de proveedores](docs/provider-setup.md#2-crear-la-conexión-de-openrouter) explica la habilitación explícita del modelo y los límites diarios.

### Abrirla en tu celular

Conecta el celular y la computadora a la misma red Wi-Fi. `pnpm dev` y `pnpm start` escuchan en la red local: abre `http://IP_LOCAL_DE_TU_COMPUTADORA:3000` desde el navegador del celular. `localhost` y `127.0.0.1` en el celular apuntan al propio celular. Mantén la computadora encendida y la aplicación en ejecución; si el sistema pregunta por acceso a la red local, permite la conexión de Node.js.

En **Foto, captura o texto**, usa **Elegir foto o captura** para abrir tus fotos/archivos o **Tomar foto** para abrir la cámara trasera cuando el navegador lo admita. La aplicación conserva también la opción de arrastrar una imagen en escritorio. No requiere acceso directo a la cámara desde JavaScript.

Puedes explorar el ejemplo sin credenciales. El ejemplo es contenido de demostración: no representa una consulta de IA ni una recomendación actualizada. Para generar un plan propio, entra con tu cuenta verificada y configura OpenRouter en el servidor o introduce tu clave personal en **Conexión**.

El modelo predeterminado es `google/gemini-3.8-flash`, con razonamiento bajo y lectura progresiva para prepartida, por decisión del propietario. Pro sigue disponible. Consulta [la iteración y sus límites](docs/flash-prepartida.md); no equivale a una certificación táctica. Los controles de formato no acreditan precisión táctica: revisa [la rúbrica de calidad](docs/coaching-quality.md). La demostración local es contenido fijo; cambiar de modelo no modifica planes guardados ni reservas pendientes.

El resultado empieza por **Tu prioridad**, **Tu ventana** y **Qué evitar**. **Ver niveles, mecánicas y compras** despliega los detalles disponibles; un campo rechazado no elimina consejos independientes válidos. Los planes completos anteriores conservan las vistas de **Selección de campeones** y **En partida**, con fases de Línea, Mid y Late. Al recibir el resultado se contrae el formulario; puedes abrirlo para editar tu selección. Los atajos `S`, `P`, `1`–`3` y `/` funcionan fuera de los campos de texto. Las preguntas generan otro análisis y consumen la cuota correspondiente. El historial antiguo sigue siendo legible sin regeneración automática.

La navegación del plan se guarda en esta pestaña, separada por cuenta y análisis, sin guardar su contenido en `sessionStorage`. Recargar no recupera un resultado privado: ábrelo desde **Mis sesiones**. La referencia visual está en [el handoff](design_handoff_coach_pantallas/README.md); sus archivos exportados no se ejecutan en la aplicación. La fuente Inter se sirve localmente con su [licencia OFL](app/fonts/OFL.txt).

### Instalar como app (PWA)

Abre **Instalar app** desde el menú. En iPhone/iPad, abre la dirección en Safari y elige **Compartir → Añadir a pantalla de inicio → Añadir**. En Android o computadora, Chrome/Edge ofrecen **Instalar app** o **Añadir a pantalla de inicio**; el botón de instalación de Elociencia aparece cuando el navegador permite mostrar su diálogo. La app tiene iconos propios y se abre en una ventana independiente.

La instalación completa y el service worker necesitan **HTTPS** en el alojamiento. `localhost` y `127.0.0.1` son excepciones para desarrollo en esa computadora; una IP de la red local con HTTP permite usar la web en el celular, pero no verificar la PWA completa. No requiere nuevas variables de entorno. Referencia: [requisitos de instalación de una PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

El service worker se registra solo con una compilación de producción (`pnpm build` y `pnpm start`). Guarda únicamente una pantalla pública sin conexión y los cuatro iconos. La interfaz de la app se solicita a la red al abrirla; si esa carga falla, muestra el aviso y un enlace para volver a intentar manualmente. Si pierdes la conexión con la app abierta, puedes editar tu selección, pero el coach y Riot requieren internet.

No se guardan en esa caché páginas de la app, respuestas API, claves, planes, fotos ni texto enviado al modelo. No hay cola de solicitudes ni reintentos automáticos de análisis. El borrador local está separado por cuenta y se elimina al salir o cambiar de usuario. El historial persiste en PostgreSQL y solo se consulta con una sesión válida. Las actualizaciones del service worker esperan a que cierres todas las ventanas de la app. Recargar elimina la clave personal introducida en memoria.

Al cambiar los iconos o `offline.html`, incrementa la versión de `CACHE_NAME` en `public/sw.js` para actualizar esos archivos en las instalaciones existentes. Las pruebas PWA comprueban el manifiesto, el área segura del icono maskable y que el worker nunca almacene ni repita solicitudes privadas.

## Conexión y secretos

| Variable                                       | Uso                                                                                                                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`                           | Opcional. Clave de OpenRouter del servidor. Alternativamente, el usuario puede usar su propia clave durante la sesión.                                                                                         |
| `OPENROUTER_MODEL`                             | Opcional. Predeterminado: `google/gemini-3.1-pro-preview`. ID exacto entre los modelos permitidos por la política del servidor y el plan; consulta la guía de proveedores. No admite IDs arbitrarios ni alias. |
| `DATABASE_URL`                                 | Conexión privada PostgreSQL del runtime. Local en desarrollo; en Prisma Postgres usa la conexión pooled con TLS.                                                                                               |
| `DIRECT_URL`                                   | Opcional para la CLI: conexión directa de migraciones y administración. Si está ausente se usa `DATABASE_URL`; no es necesaria en Vercel para servir la app.                                                   |
| `BETTER_AUTH_SECRET`                           | Secreto aleatorio privado de al menos 32 caracteres.                                                                                                                                                           |
| `BETTER_AUTH_URL`                              | Origen exacto de la app. HTTPS obligatorio en producción.                                                                                                                                                      |
| `BETTER_AUTH_TRUSTED_ORIGINS`                  | Opcional. Otros orígenes exactos separados por coma; no admite comodines.                                                                                                                                      |
| `APP_REGISTRATION_MODE`                        | `open` es el valor predeterminado: registro público e invitación opcional. `invite` exige código para una beta cerrada elegida explícitamente.                                                                 |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM`            | Clave privada de Resend y remitente de un dominio verificado.                                                                                                                                                  |
| `AI_MONTHLY_BUDGET_USD`, `AI_DAILY_BUDGET_USD` | Techo global de saldo compartido; incluye consumo y reservas.                                                                                                                                                  |
| `AI_FREE_POOL_USD`, `AI_PRO_POOL_USD`          | Presupuestos mensuales separados para Free y Pro.                                                                                                                                                              |
| `RIOT_API_KEY`                                 | Opcional. Habilita la importación de una partida activa. Se configura exclusivamente en el servidor.                                                                                                           |

Guarda las variables en `.env` o `.env.local` durante el desarrollo y en el gestor de secretos del alojamiento al desplegar. Si ya usas `.env`, conserva ese archivo: `.env.local` tiene prioridad. No uses el prefijo `NEXT_PUBLIC_` para claves o códigos de acceso. No las subas al repositorio.

La sesión verificada protege las llamadas, incluyendo las que usan una clave personal. Cada generación reserva cuota y presupuesto en una transacción serializable antes de enviar a OpenRouter. La clave de idempotencia evita duplicar una operación; los reintentos de base de datos no repiten consultas de IA. Configura además un límite de saldo en la propia clave de OpenRouter. Las claves personales se mantienen en memoria y nunca se guardan con el historial.

Los modelos están restringidos por el plan y por una política de tarifas del servidor. Las capturas se vuelven a reducir en el servidor a un máximo de 1024×1024 para impedir que se omita la optimización del navegador. La búsqueda usa Exa con una sola búsqueda, hasta 3 resultados y 2000 caracteres por resultado. Las reservas cubren tarifas de contexto largo, escritura de caché, razonamiento y una vuelta adicional de búsqueda. No son una promesa de precio exacto: se guarda `usage.cost` real y se bloquea el presupuesto afectado si supera la reserva.

Los errores posteriores al envío pueden tener costo. Un timeout o importe desconocido conserva la cuota y el presupuesto reservados; la app comprueba automáticamente las generaciones existentes para conciliar el coste. Una reserva incierta se distingue de una generación activa y no ocupa su cupo de concurrencia. La misma intención pendiente no se vuelve a enviar, aunque se recargue la página o cambie la clave del intento. Si el proveedor no devuelve identificador, requiere investigación manual y la reserva no se libera automáticamente. Consulta [conciliación automática](docs/accounts-and-usage.md#conciliación-automática). El historial guarda únicamente contexto de juego y consejos validados. Borrarlo también elimina la copia de respuesta del registro de consumo, preservando los importes y la protección contra duplicados.

El modelo debe poder procesar imágenes para reconocer capturas. Los mensajes y las capturas se envían a OpenRouter y al proveedor del modelo elegido. Sube solo lo que quieras compartir con ellos. Consulta sus [opciones de privacidad](https://openrouter.ai/support#privacy-and-data-logging).

## Cómo usarlo

1. Elige tu campeón, línea y rival. Añade tu rango y contexto cuando sean relevantes.
2. Opcionalmente, pega una descripción o carga una captura de la selección. Revisa los campeones reconocidos antes de generar el plan; una captura no identifica siempre quién eres o quién ocupa cada línea.
3. Completa aliados y enemigos para obtener recomendaciones sobre la composición.
4. Genera el plan: primero verás tu prioridad, una ventana observable con reacción mecánica y qué evitar. Abre los detalles de niveles, reacciones, compras/runas o mapa cuando estén disponibles y los necesites. **Copiar plan** incluye siempre todo el contenido, las advertencias y las fuentes. El resumen usa los consejos originales del resultado; no hace otra consulta a la IA.

Las fotos y capturas originales admiten hasta **30 MB** (30,000,000 bytes). Se optimizan en el dispositivo antes de enviarlas al coach: la aplicación reduce resolución/peso cuando hace falta y envía una imagen de hasta 2.5 MB. Así evita subir archivos originales de 30 MB a las funciones del alojamiento. PNG, JPEG y WebP tienen soporte directo; otros formatos de foto dependen de que el navegador pueda abrirlos. Si el navegador no puede leer HEIC/HEIF, guarda la foto como JPG o usa el formato más compatible de la cámara. No hay captura automática de pantalla ni conexión local con el cliente de League of Legends.

## Datos de parche y builds

El catálogo de campeones e ítems procede de [Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon) y no necesita clave. La aplicación consulta su versión disponible y muestra la procedencia del catálogo; un catálogo de respaldo se identifica como tal. Data Dragon puede publicarse después del parche y su versión puede diferir del cliente de una región.

El catálogo permite comprobar nombres e ítems, pero no demuestra cuál es la build con mayor rendimiento. Esta versión no integra un proveedor de estadísticas de win rate ni una base de datos de matchups Challenger. Las builds son recomendaciones razonadas por el modelo. Cuando solicitas búsqueda web, las fuentes devueltas se muestran para poder revisarlas; pedir búsqueda no garantiza que se haya encontrado una fuente actual ni convierte la respuesta en una build estadísticamente óptima.

El modelo puede equivocarse en interacciones, runas o tiempos. El estilo de asesoría busca precisión y concisión; no acredita que el modelo tenga un rango real de Challenger.

## Importación opcional con Riot

Obtén una clave en el [Riot Developer Portal](https://developer.riotgames.com/). Las claves de desarrollo se desactivan cada 24 horas y deben renovarse; para un proyecto personal estable, revisa el proceso de clave personal en la [documentación de claves](https://developer.riotgames.com/docs/portal#web-apis_api-keys).

El importador recibe `nombre#TAG` y un servidor de la lista permitida: LAN (`LA1`), LAS (`LA2`), Norteamérica (`NA1`), Europa oeste (`EUW1`), Europa norte/este (`EUN1`), Brasil (`BR1`), Corea (`KR`), Japón (`JP1`) u Oceanía (`OC1`). Resuelve el PUUID con Account-V1 y consulta Spectator-V5 con la plataforma elegida. La clave solo viaja en la cabecera de la petición entre nuestro servidor y Riot.

La respuesta contiene campeones, equipos y tu campeón. No asigna líneas ni decide tu rival: confirma esos datos manualmente. Solo funciona cuando Riot informa una partida activa; no lee la selección de campeones. La API local del cliente no es accesible directamente desde una web alojada. Consulta la [referencia oficial de Riot](https://developer.riotgames.com/apis/) para los endpoints disponibles.

Riot exige registrar los productos dirigidos a jugadores y revisar su política para el uso público. Esta aplicación es una herramienta personal de preparación y aprendizaje, sin información oculta, automatización de juego ni instrucciones basadas en eventos capturados en tiempo real. Una integración pública y su aprobación son un paso independiente del despliegue técnico. Consulta la [política para League of Legends](https://developer.riotgames.com/docs/lol#developer-api-policy).

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

`check` reúne la comprobación de formato, lint, TypeScript y pruebas unitarias. `test:accounts` levanta PostgreSQL real temporal y verifica autenticación, cuotas concurrentes, idempotencia, historial privado y contabilidad; simula IA y correo. Las pruebas no consumen créditos ni usan claves reales. Una compilación correcta no demuestra que tus credenciales de OpenRouter, Riot o Resend funcionen; verifica esos servicios con tu configuración antes de compartir la aplicación. Para probar cuentas por HTTP local utiliza `pnpm dev`; en producción Better Auth requiere HTTPS.

### Dependencias y auditoría

```sh
pnpm audit --prod --audit-level=moderate
pnpm audit:security
```

La revisión local del 10 de octubre de 2026 no encontró avisos en las dependencias de producción. `pnpm-workspace.yaml` fija `deepmerge-ts` a 8.0.0 y `mysql2` a 3.23.1 mediante overrides para resolver los avisos encontrados en esas cadenas transitivas.

La auditoría completa incluye herramientas de desarrollo y conserva un aviso de `braces` 3.0.3, dependiente de `eslint-config-next` a través de `fast-glob` y `micromatch`. El aviso [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) describe una denegación de servicio por patrones profundamente anidados y todavía no indica una versión corregida. Esa cadena se utiliza al ejecutar ESLint con patrones del repositorio; no procesa las solicitudes de la aplicación. El aviso no se silencia: `audit:security` y la auditoría completa semanal fallan y lo muestran hasta que pueda corregirse. Esto requiere seguimiento aunque la auditoría de producción esté limpia.

### Protección del coach y evaluación de respuestas

El coach tiene alcance exclusivo de preparación de partidas de League of Legends. Texto, fotos, nombres del catálogo y páginas web se consideran datos no confiables; no pueden autorizar cambios de rol ni acceso a herramientas. Las claves de API y códigos de acceso no se incluyen en los mensajes enviados al modelo. No hay herramientas para ejecutar código, leer archivos ni consultar secretos del servidor.

Las rutas de coach y lectura de capturas validan una sesión verificada y aplican un límite persistente de admisión antes de leer el JSON: 6 solicitudes por usuario y 30 globales por minuto. Las entradas inválidas y los reintentos cuentan para ese límite, aunque no consuman una generación de IA. La reducción de imágenes con Sharp ocurre después de reservar cuota, presupuesto y concurrencia; si la imagen es inválida y no se ha enviado al proveedor, se libera la reserva.

Las páginas HTML se renderizan por solicitud y se sirven con `Cache-Control: private, no-store`. La política CSP utiliza un nonce nuevo para los scripts y no permite `unsafe-eval` en producción. Se conserva `unsafe-inline` únicamente para estilos, por compatibilidad con los atributos de estilo de React; no habilita scripts inline sin nonce. Los archivos públicos de la PWA mantienen su tratamiento separado descrito arriba.

La interfaz comprueba el texto antes de pedir una conexión, y el servidor repite la validación antes de contactar con Riot u OpenRouter. Campeones, línea y rango tienen opciones conocidas; los equipos deben ser coherentes. Se rechazan patrones reconocibles de cambio de instrucciones, extracción de prompts o claves, código, enlaces y tareas explícitas fuera de LoL. La normalización cubre formas Unicode, caracteres invisibles y patrones codificados habituales. Las notas rechazadas, incluidas claves pegadas por error, se conservan editables en memoria y se excluyen del borrador guardado en el navegador.

El modelo puede devolver una decisión de rechazo sin inventar un plan. Esa decisión es una capa adicional, no una evaluación independiente. Toda respuesta pasa después por un esquema estricto, controles de coherencia y validación de cada texto. Se descarta completamente cuando contiene contenido peligroso, secretos conocidos o fragmentos significativos de las instrucciones internas, incluso codificados en Base64 o hexadecimal. La respuesta del proveedor está limitada a 128 KB. Los títulos libres y nombres de modelo devueltos por el proveedor no se reflejan en la interfaz. Las citas aceptan únicamente páginas de LoL en los dominios permitidos, sin credenciales, consultas ni fragmentos en sus URLs.

```sh
pnpm eval:security
```

La evaluación usa ejemplos de instrucciones maliciosas, filtraciones, suplantación de roles, texto codificado, contenido ajeno al juego, respuestas JSON válidas pero peligrosas, capturas rechazadas y contexto legítimo de LoL. Comprueba los límites deterministas de la aplicación con un proveedor simulado y no realiza consultas pagadas. El caso de captura comprueba qué ocurre si el modelo rechaza una imagen; no demuestra que identifique todas las instrucciones escondidas en fotografías reales.

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
5. En una vista previa, verifica la carga del catálogo, la autenticación, una consulta de IA y una captura. Si activaste Riot, comprueba el importador durante una partida activa.
6. Publica después de esa comprobación. Los cambios de variables requieren un nuevo despliegue.

[Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) detecta Next.js. Netlify ofrece OpenNext, pero sus funciones síncronas tienen un [límite de 60 segundos](https://docs.netlify.com/build/functions/configuration/): hay que adaptar y probar la espera del proveedor, de hasta 240 segundos con Haiku max antes de usarlo. La [guía portable](docs/vps-deployment.md) explica estas condiciones. Preparar Docker o publicar una compilación no demuestra el flujo completo de cuentas y proveedores; verifica cada entorno antes de darlo por listo.

Elociencia no está afiliado ni respaldado por Riot Games. League of Legends y las marcas asociadas pertenecen a Riot Games.
