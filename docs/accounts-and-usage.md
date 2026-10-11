# Cuentas, planes y control del gasto de GrietaPro

GrietaPro tiene cuentas con Better Auth, datos persistentes en PostgreSQL mediante Prisma y autorización en el backend de Next.js. El historial es privado. Cada generación reserva cuota y presupuesto antes de llamar a OpenRouter, para limitar el consumo individual y el gasto total.

La implementación incluye las cuentas, historial privado, planes, invitaciones y cuotas descritos aquí. La migración inicial está versionada en `prisma/migrations` y se aplica con `pnpm db:setup`. Requiere configurar PostgreSQL, Better Auth y Resend; sin configuración las llamadas privadas se rechazan. Los pagos y el acompañante de escritorio siguen siendo ampliaciones futuras.

## Permisos y planes

Los permisos y el acceso comercial son conceptos separados:

| Campo             | Valores iniciales               | Función                                                                            |
| ----------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| Rol de seguridad  | `USER`, `ADMIN`                 | Permite usar la app o administrar planes y accesos.                                |
| Plan              | `FREE`, `PRO`                   | Determina modelos, cuota, búsqueda web y presupuesto.                              |
| Origen del acceso | `COMPLIMENTARY`, `SUBSCRIPTION` | Distingue cortesía y suscripción futura. Sin una concesión vigente se aplica Free. |

Los amigos reciben acceso Pro de cortesía, con vencimiento opcional, sin permisos de administrador. Las cuotas pertenecen al plan y pueden ajustarse sin cambiar el rol ni editar cada usuario. Un administrador tampoco debe tener gasto ilimitado automáticamente.

El registro está abierto por defecto (`APP_REGISTRATION_MODE=open`). Sin código se crea una cuenta Free; la invitación es opcional y un código válido concede el plan incluido. Un código introducido que sea inválido, vencido, revocado o de otro correo rechaza el registro en lugar de ignorarse. Las invitaciones siguen vinculadas al destinatario y no conceden permisos de administrador. El modo `invite` sólo exige código cuando se configura explícitamente para una beta cerrada. Ambos modos conservan la verificación del correo antes de las consultas privadas.

Las semillas crean Free con 10 análisis y 5 lecturas de capturas al mes; Pro tiene 50 análisis, 20 lecturas y 10 búsquedas. Preguntar de nuevo genera otro análisis. El presupuesto monetario se aplica además de esos cupos, porque los modelos, imágenes y búsquedas cuestan distinto. Estos límites son editables; no constituyen todavía una oferta de suscripción de pago.

Cuando haya cobros, una suscripción concederá el mismo acceso Pro. Los eventos verificados del proveedor de pagos actualizarán el acceso desde el servidor; una redirección de pago exitosa no bastará para concederlo. El plan puede ampliar la cuota o permitir comprar más análisis; no ofrecer consumo de IA sin límite.

## Modelo de datos

| Entidad                                      | Datos y restricciones principales                                                                                                                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`, `Session`, `Account`, `Verification` | Tablas generadas desde la configuración de Better Auth. Correo verificado antes de usar el saldo del servidor. Rol definido por el servidor.                                                                                                    |
| `Plan`                                       | Código único, versión, cupos de análisis y capturas, presupuesto en USD, modelos permitidos, cupo de búsquedas y concurrencia. Configuración administrada exclusivamente en el servidor.                                                        |
| `AccessGrant`                                | Usuario, plan, origen, inicio, vencimiento, revocación y administrador que lo concedió. Puede conservar distintas concesiones de cortesía y suscripción sin sobrescribirlas. Índice por usuario.                                                |
| `CoachRecord`                                | Usuario propietario, entrada de juego saneada, plan validado, metadatos, versión del formato y fecha. Índice compuesto por usuario y fecha. Relación con la generación que lo produjo.                                                          |
| `AiRequest`                                  | Usuario, operación `COACH` o `DRAFT`, clave de idempotencia, hash de la entrada, modelo, tarifas utilizadas, reserva, coste real nullable, tokens, identificador del proveedor y estado. Restricción única por usuario y clave de idempotencia. |
| `UsageBucket`                                | Periodo UTC y ámbito usuario, plan o global; cuotas y dinero reservados/consumidos. Restricción única por ámbito, identificador y periodo. Límites cortos para frecuencia y límites diarios/mensuales para gasto.                               |

El acceso efectivo se resuelve de forma determinista entre concesiones vigentes y no revocadas. Dos concesiones Pro no duplican la cuota. Una mejora de plan no reinicia el gasto ya realizado durante el periodo. Las ampliaciones de cuota, si se añaden, serán explícitas y auditables.

Los importes se almacenan como `Decimal` con precisión suficiente para fracciones de centavo, nunca como números de punto flotante para descontar saldo. Un coste ausente es desconocido, no cero. Las tarifas se conservan junto a la solicitud para interpretar cambios de precio posteriores.

`CoachInput` actualmente también incluye `apiKey` y `accessToken`. La persistencia selecciona explícitamente los campos de juego: campeón, rival, línea, rango, equipos, notas aceptadas y búsqueda solicitada. No se guarda el objeto completo. Tampoco se guardan capturas originales, credenciales, cookies, contraseñas de Riot ni prompts internos en el historial.

## Autorización e historial

Todas las rutas de generación, extracción, Riot e historial verifican la sesión en el servidor, incluso si el usuario utiliza su propia clave de OpenRouter. Las decisiones sobre cuota, rol y modelo no se toman a partir de campos enviados por el navegador.

El identificador del propietario se obtiene de la sesión. Listar, consultar y borrar un registro incluye siempre ese propietario en la consulta de base de datos. Un registro ajeno responde como no encontrado. El proxy puede redirigir al login, pero no sustituye esa comprobación junto a los datos.

Al cerrar sesión se limpian resultados, capturas y credenciales en memoria. El borrador local está separado por cuenta y se elimina al salir. Auth, historial y respuestas privadas mantienen `no-store` y quedan fuera de la caché de la PWA.

Referencia: [Better Auth con Next.js](https://better-auth.com/docs/integrations/next) y [adaptador Prisma](https://better-auth.com/docs/adapters/prisma). Se fijan Better Auth 1.7.7 y Prisma 7.10.0 con el adaptador PostgreSQL correspondiente.

## Reserva y conciliación de cada consulta

1. Verificar sesión, acceso efectivo y entrada. Rechazar contenido inválido antes de hacer una llamada pagada.
2. Resolver en el servidor el modelo permitido, límite de salida y herramientas. Acotar también la entrada, la visión, las búsquedas y las tarifas del proveedor. Un techo real requiere una reserva conservadora que cubra esos cargos, no una estimación promedio de tokens.
3. En una transacción corta, comprobar frecuencia, concurrencia, cuota del usuario y presupuesto del usuario, su plan y la app. Crear la solicitud y reservar consumo de forma atómica. Resolver conflictos de idempotencia sin volver a llamar al proveedor.
4. Confirmar la reserva antes de enviar. La llamada de red queda fuera de la transacción. Marcar el inicio del envío; un proceso que muera en ese punto se tratará conservadoramente como consumo incierto.
5. Guardar el identificador y el consumo real del proveedor aunque su contenido no supere la validación del coach. Finalizar una sola vez, descontar el coste real y liberar la diferencia de la reserva cuando se conozca.
6. Un timeout, cierre del navegador o cancelación después del envío conserva una reserva pendiente. Conciliarla con el proveedor; no devolver presupuesto automáticamente por el paso del tiempo.

Estados: `RESERVED`, `DISPATCHED`, `SETTLED`, `VOID`, `UNKNOWN`. `VOID` solo libera una operación que se sabe que no consumió saldo. Una respuesta rechazada por seguridad puede haber sido facturada. Si el coste real supera lo reservado, se registra completo, se detienen nuevas solicitudes del ámbito afectado y se corrige el cálculo de reserva.

Las transacciones serializables tienen reintentos acotados para conflictos de base de datos. Esos reintentos no repiten llamadas a OpenRouter. Una clave de idempotencia utilizada con otra entrada se rechazará. Una clave repetida con la misma entrada devolverá el estado o resultado existente.

El límite inicial de concurrencia es una generación activa por usuario. Los límites persistentes de autenticación complementan las cuentas verificadas para reducir abuso de registros. Las cabeceras de IP se confían solo en plataformas conocidas; en otros entornos se aplica un límite compartido. La cuota de IA sigue perteneciendo a cada usuario. Los presupuestos por plan permiten reservar capacidad para Pro. Un presupuesto global protege el saldo total, pero no garantiza disponibilidad si se agota: las cuotas ofrecidas deben dimensionarse según usuarios y saldo disponible. Configurar también un techo en la clave de OpenRouter como segunda protección.

Fuentes: [transacciones Prisma 7](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions), [contabilidad OpenRouter](https://openrouter.ai/docs/cookbook/administration/usage-accounting) y [consulta de generaciones](https://openrouter.ai/docs/api/api-reference/generations/get-generation).

## Coste orientativo de 50 análisis

Precios consultados el 10 de octubre de 2026, hora de México, para los identificadores exactos, servicio normal y contexto corto. Las tarifas pueden cambiar y tienen tramos distintos para contextos muy grandes.

| Modelo                        | Entrada por millón de tokens | Salida por millón de tokens | 50 análisis con 20 000 tokens de entrada y 2 500 de salida cada uno |
| ----------------------------- | ---------------------------: | --------------------------: | ------------------------------------------------------------------: |
| `openai/gpt-6-luna`           |                     USD 0.10 |                    USD 0.50 |                                                          USD 0.1625 |
| `anthropic/claude-haiku-5.5`  |                     USD 0.10 |                    USD 0.50 |                                                          USD 0.1625 |
| `anthropic/claude-sonnet-5.5` |                     USD 2.00 |                   USD 10.00 |                                                            USD 3.25 |

Cálculo: `50 × (20 000 × tarifaEntrada + 2 500 × tarifaSalida) / 1 000 000`.

Es un escenario ilustrativo, no consumo medido. Actualmente cada plan envía 254 objetos; solo sus datos suman aproximadamente 62 254 caracteres en el catálogo guardado. Las políticas, habilidades y esquema agregan contexto. Hace falta medir tokens reales antes de fijar cuotas comerciales.

La estimación excluye extracción de capturas, búsquedas, efectos de caché, razonamiento adicional, recargas, impuestos y alojamiento. Los 2 500 tokens de salida representan el total facturable; si hay más razonamiento, el cálculo aumenta. Una captura seguida de un plan puede hacer dos llamadas. El límite de archivo de 30 MB no define el precio de visión.

La herramienta Exa actualmente configurada cobra USD 0.007 por búsqueda en modo `auto`: 50 búsquedas efectivamente realizadas agregarían USD 0.35, más los tokens de resultados. El precio de búsqueda nativa del proveedor es diferente. Se limita a una búsqueda, tres resultados y 2000 caracteres por resultado; la reserva contempla el contenido extra y otra vuelta de generación. El límite de búsquedas es separado y la interfaz muestra cuántas quedan.

Luna y Haiku son candidatos para la primera versión. Elegir después de comparar consejos mecánicos y reconocimiento de capturas en casos reales. Sonnet queda como opción avanzada; su política de razonamiento requiere configuración específica y comprobación con los límites de salida actuales. Un modelo más caro no asegura consejos correctos ni actualizados.

Precios: [GPT 6 Luna en OpenRouter](https://openrouter.ai/openai/gpt-6-luna), [Haiku 5.5](https://openrouter.ai/anthropic/claude-haiku-5.5), [Sonnet 5.5](https://openrouter.ai/anthropic/claude-sonnet-5.5) y [catálogo público de tarifas](https://openrouter.ai/api/v1/models). Referencias adicionales: [OpenAI GPT 6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [búsqueda web](https://openrouter.ai/docs/guides/features/server-tools/web-search), [caché](https://openrouter.ai/docs/guides/best-practices/prompt-caching) y [razonamiento](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).

## Integración con Riot y Porofessor

Porofessor confirma que obtiene datos mediante APIs de Riot y ofrece una aplicación instalada en Overwolf o independiente. Los eventos locales permiten detectar selección de campeones; la documentación pública no revela toda su implementación interna. Fuentes: [FAQ](https://porofessor.gg/faq), [descarga](https://porofessor.gg/en/download) y [eventos de League Launcher en Overwolf](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/league-of-legends-launcher/).

La web y PWA seguirán aceptando foto y texto. El backend ya tiene una integración opcional Account V1 y Spectator V5 para composición de una partida activa; eso no cubre el draft y sigue pendiente de prueba con una clave y partida reales. Data Dragon proporciona catálogo y habilidades, pero no identifica por sí solo la build con mejor rendimiento estadístico.

Una futura detección automática necesita un acompañante en la computadora donde corre LoL. El servidor remoto y el celular no acceden al cliente local del PC. LCU no tiene garantía de soporte para terceros; Live Client Data es local para aplicaciones nativas. El acompañante se emparejará con la cuenta mediante autorización limitada y enviará solo datos visibles necesarios. No distribuirá claves de Riot/OpenRouter ni automatizará acciones del juego. Referencia: [APIs locales de Riot](https://developer.riotgames.com/docs/lol#league-client-api).

La política de Riot exige registrar productos que sirven a jugadores. Para monetizar exige estado Approved o Acknowledged, acceso gratuito y valor añadido. Antes de publicar, revisar el flujo de asesoría previa y análisis posterior con Riot y evitar información oculta, desanonimización o automatización de decisiones. La aprobación no se da por supuesta. Fuentes: [política LoL](https://developer.riotgames.com/docs/lol#monetization), [claves de API](https://developer.riotgames.com/docs/portal#api-keys) y [política general](https://developer.riotgames.com/policies/general).

## Estado y validación

La migración inicial, autenticación, historial privado, limpieza al salir, invitaciones, Pro de cortesía y contabilidad transaccional están implementados. Las versiones están fijadas en pnpm. El PostgreSQL local se puede iniciar con `pnpm db:local`; `pnpm db:setup` aplica migración y semillas sin reiniciar políticas personalizadas. El correo usa Resend, con un buzón local simulado exclusivamente en las pruebas.

`pnpm check` comprueba tipos y defensas deterministas. `pnpm test:accounts` crea un PostgreSQL real temporal y valida registro, verificación, sesiones, recuperación, invitaciones, aislamiento, concurrencia, idempotencia, presupuestos, costes inciertos, consumo del proveedor, capturas y límites de Riot. El proveedor de IA y el correo se simulan; estas pruebas no gastan créditos ni envían mensajes reales.

Antes de publicar falta configurar los servicios del entorno, probar la entrega real de Resend y una consulta de OpenRouter con presupuesto acotado. Las builds y pruebas locales no confirman el comportamiento de esos proveedores en producción. Las migraciones posteriores deben ser archivos versionados.

Los pasos están en la [guía de OpenRouter y Resend](provider-setup.md), con [referencias oficiales](resources.md). La configuración local conserva los nombres históricos de la base y su usuario; cambiar la marca no requiere migrar esos datos.

Los pagos y el acompañante de escritorio son ampliaciones futuras. No hace falta un backend separado de Next.js para esta etapa.
