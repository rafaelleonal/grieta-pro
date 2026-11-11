# ADR 0009 · Builds simples: campeón, rival y caché

**Actualización:** la [ADR 0010](0010-opus-modelo-unico.md) sustituye el modelo: Opus 5.5 fijo, con el contrato en el prompt. El resto de esta decisión se conserva.

- **Estado:** aceptada por el propietario el 11 de noviembre de 2026.
- **Petición:** la app «nunca funcionó» de forma fiable: una solicitud quedaba «pendiente» y bloqueaba las siguientes, y la respuesta tardaba demasiado. Pidió una auditoría y simplificar: elegir tu campeón y el rival y recibir de inmediato la build contra ese matchup, con hechizos y runas.

## Diagnóstico

1. Una consulta cortada después de enviarse (cancelación, pestaña cerrada, timeout de la función o red) quedaba `UNKNOWN`. La conciliación sólo podía resolverla con un ID de OpenRouter y un `finish_reason` terminal; si no lo había, quedaba incierta para siempre.
2. Mientras existiera una incierta con la misma huella de entrada, `reserveGeneration` devolvía esa misma consulta. El matchup quedaba bloqueado indefinidamente («sigue en curso o pendiente de confirmar»), y el cliente lo bloqueaba también.
3. Cada incierta conservaba una reserva de peor caso (USD 0.134 con Flash, USD 0.66 con Opus) contra un presupuesto de USD 1 por día y por mes. Unas pocas bastaban para dejar la cuenta sin presupuesto el resto del mes, aunque el gasto real fuera de unos USD 0.01 por build.
4. Una función cortada dejaba la consulta `DISPATCHED` y bloqueaba toda generación durante cinco minutos.
5. Latencia: dos verificaciones de sesión, transacciones serializables, conciliación con hasta tres llamadas HTTP de 4 s, un prompt de unos 52 KB y streaming parcial. No había caché: cada matchup repetido volvía a pagar y a esperar.

## Decisión

- **Entrada:** tu campeón, tu rival y tu rol. El rol se sugiere a partir del campeón y se puede cambiar. Se retiran rango, aliados y enemigos, parejas de bot, notas, búsqueda web, foto o captura, importación de Riot, onboarding, selección de modelo y clave personal.
- **Respuesta:** hechizos, runas con fragmentos, compra inicial, núcleo en orden, 1–3 situacionales y habilidades de los niveles 1–6 ([ADR 0007](0007-habilidades-primeros-niveles.md)). Sigue siendo una sugerencia del modelo, no una estadística óptima.
- **Una sola llamada** a OpenRouter sin streaming, con esquema JSON estricto, timeout de 45 s y sin reintentos automáticos. Modelo: `google/gemini-3.8-flash` (o `google/gemini-3.1-pro-preview` por variable). El prompt se reduce a unos 27 KB más las habilidades de ambos campeones.
- **Caché compartida** por versión de Data Dragon, campeón, rival, rol, modelo y contrato (`BuildCache`). Sólo guarda builds completas, validadas y con catálogo vivo; no contiene datos de cuentas. Un matchup repetido responde al instante y no cuenta para los límites.
- **Límites simples** (`BuildUsage`): `AI_USER_DAILY_BUILDS` builds nuevas por cuenta y día (30 por defecto) y `AI_DAILY_BUDGET_USD` como tope diario de la app con el coste que informa OpenRouter, o USD 0.03 estimados si no lo informa. El tope duro es el límite de crédito de la clave en OpenRouter. Se conserva la admisión por minuto (10 por cuenta, 120 en total).
- **Sin reservas pendientes:** si una consulta falla, se puede volver a pedir de inmediato. La generación no depende de la conexión del navegador: si el jugador deja de esperar, la build termina igualmente en la caché y en su historial.

Esta ADR sustituye la ADR 0006 y la ADR 0008, y las partes de la ADR 0005 que exigían cuotas, reservas, idempotencia por intento, foto o galería y selección de modelo. Conserva Tailwind v4, componentes por pantalla, marca, paleta Grafito y accesibilidad.

## Lo que se conserva

- Cuentas con correo verificado, sesión del servidor, invitaciones opcionales y favoritos por rol.
- Historial privado por cuenta, con lectura, cursor y borrado filtrados por propietario. Los registros anteriores siguen siendo legibles. Borrar uno antiguo retira también su copia en el registro de reservas retirado.
- Validación estricta de la entrada y de la salida: IDs del catálogo, ramas y filas de runas, fragmentos, hechizos, oro inicial, orden de habilidades y análisis de texto inseguro. Una sección inválida se omite y se señala; no se repara ni se inventa.
- Las tablas `AiRequest`, `UsageBucket`, `Plan` y `AccessGrant` no se borran: guardan la contabilidad histórica y las invitaciones. La migración `202611110001_simple_builds` sólo añade tablas y hace opcional `CoachRecord.requestId`.

## Consecuencias

- Una build que falla después del envío puede costar dinero sin mostrarse. El límite diario, el tope de la app y el crédito de la clave acotan ese gasto; no se intenta conciliar cada cargo.
- Dos peticiones simultáneas del mismo matchup sin caché pueden generar dos veces. La primera build válida queda en la caché.
- La calidad táctica no se midió con llamadas pagadas en esta decisión. La reducción del prompt y la caché disminuyen el trabajo; no acreditan una latencia concreta del proveedor.
