# ADR 0006 · Acceso común durante la beta

- **Estado:** aceptada por instrucción del propietario el 18 de octubre de 2026.
- **Petición:** dejar de distinguir Free y Premium para priorizar el funcionamiento del proyecto; explorar también Gemini 3.8 Flash.

## Decisión

El modo predeterminado es `APP_ACCESS_MODE=beta`. Toda cuenta verificada tiene acceso a los mismos modelos compatibles, incluyendo Opus 5.5 y Gemini 3.8 Flash, con los mismos cupos, presupuestos y concurrencia. No hay etiquetas comerciales ni ofertas Pro. El rol de administrador sigue siendo independiente de este acceso.

El acceso común toma los límites numéricos exactos de la política base `FREE` ya administrada. No modifica sus filas, no convierte usuarios en Pro ni aumenta automáticamente presupuestos. El nombre interno se conserva por compatibilidad contable. La búsqueda web queda desactivada para todos durante esta etapa, favoreciendo rapidez y evitando gasto adicional. Un borrador anterior con búsqueda activada se envía sin búsqueda; solicitudes directas que la exijan se rechazan.

La decisión inicial mantuvo Opus como predeterminado. Tras la [comparación real del 18 de octubre](../flash-build-comparison.md), el propietario eligió Gemini 3.8 Flash como predeterminado. Opus sigue disponible para todas las cuentas. La muestra mide velocidad y coste; no acredita calidad óptima.

## Continuidad y límites

- Se conservan autenticación, autorización por propietario, admisión antes del cuerpo, validación, cuotas, concurrencia, idempotencia y reservas conservadoras.
- No se borran concesiones históricas, modelos guardados, historial ni contabilidad. `APP_ACCESS_MODE=plans` restaura el comportamiento anterior de planes si se necesita.
- El consumo del usuario no se reinicia. Una cuenta que ya consumió más que el cupo común puede quedar sin disponibilidad hasta su renovación. Sus límites anteriores no implican un cupo extra en beta.
- Las nuevas reservas usan el fondo base `AI_FREE_POOL_USD` y los topes globales existentes. Las anteriores se concilian contra los fondos guardados en cada solicitud, incluso si se generaron bajo Pro.
- Un reintento del propietario puede recuperar una respuesta anterior que usó búsqueda web, sin una nueva generación. La clave y la huella originales siguen impidiendo cambios de datos o modelo.
- Una reserva incierta sigue contando y un resultado rechazado puede ser facturable. No hay generación ilimitada ni pruebas reales automáticas.

## Evidencia

Pruebas aisladas con PostgreSQL temporal verifican el acceso equivalente de cuentas con y sin concesión Pro, disponibilidad de Opus/Flash, búsquedas rechazadas, límites y reservas intactos, conciliación de una solicitud Pro anterior y restauración del modo histórico sin modificar planes. La comprobación de interfaz usa cuentas sintéticas; las pruebas de proveedor simuladas no miden latencia real.
