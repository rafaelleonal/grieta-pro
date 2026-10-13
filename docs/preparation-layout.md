# Selección de campeón primero

Iteración local del 12 de octubre de 2026, solicitada por el propietario.

## Cambio

- Hechizos, compra inicial con coste y runas aparecen al inicio, con recursos del catálogo y nombres visibles.
- El plan de inicio, matchup, ventana y riesgo ocupan la segunda columna en escritorio/tablet. En móvil se conserva el orden de lectura en una columna.
- El contenido aprovecha el ancho del área principal. Las peleas de equipo y el mapa pasan a su sección desplegable inferior.
- Se reutiliza la misma presentación en generación y resultado. Los estados vacíos distinguen «preparando» de un dato ausente; no inventan elecciones.

## Entrega progresiva

El contrato compacto pide `build` antes de `brief`, empezando por `summoners`, `starting` y `runes`. El lector conserva compatibilidad con respuestas que empiezan por `brief`. La API emite eventos `preparation` al completar elecciones válidas; posteriormente entrega el resumen y el resultado persistido. No hay una segunda consulta ni reintentos automáticos.

Antes de mostrar elecciones se aplican protección de secretos, alcance, esquemas, pares de hechizos distintos, catálogo de objetos, coste inicial máximo de 500 de oro y ranuras de runas/fragmentos. Los campos incompletos no se renderizan; una elección inválida se retiene para que la recuperación final decida qué conservar. El lector rechaza claves duplicadas y profundidad excesiva. La cancelación, fallo y cambio de identidad retiran el avance.

Laminar sigue opcional y apagado. `first_preparation_ms` registra la primera elección validada; `first_useful_ms` toma el primer avance entre preparación y resumen, sin contenido del plan.

## Evidencia

La revisión visual usa una respuesta de Flash grabada en la ronda anterior (Darius–Jax), con los componentes reales y el shell. La ruta temporal se retiró antes de compilar. No demuestra tiempos actuales del proveedor ni calidad táctica nueva.

- 390, 834 y 1440 px: sin desbordamiento horizontal. Dos columnas a 834/1440, una a 390.
- Apertura de mapa con teclado; foco de 2 px con 2 px de separación y área del control superior a 44 px.
- Estados de espera, sólo hechizos, elecciones + inicio y plan final revisados.
- Pruebas de transporte: hechizos y preparación antes del resumen/EOF, una llamada, validación de elecciones, rechazo de secretos, interrupciones y contenido inmutable.
- `pnpm check`: formato, lint, tipos y 263 pruebas correctos.
- `pnpm eval:security`: 34 pruebas correctas.
- `pnpm test:accounts`: PostgreSQL temporal real y proveedor simulado; reserva, idempotencia, conciliación y guardado correctos.
- `pnpm build`: correcto con caché regenerada tras un fallo de permisos en Turbopack. Servidor de desarrollo restaurado.
- App local: demostración abierta desde Guía y nuevo layout verificado; Gemini Flash visible en el selector.

Capturas locales en `artifacts/qa/preparation-layout/`: `desktop-1440.jpg`, `tablet-834.jpg`, `mobile-390.jpg`, `stream-spells-834.jpg` y `stream-1440.jpg` (excluidas de Git).

No se hicieron llamadas pagadas en esta iteración. Los seis permisos de USD 1 de la ronda anterior ya se consumieron. Falta medir la latencia real con el nuevo orden; 3–5 segundos continúa siendo un objetivo. Cambios locales, sin publicación ni comprobación en producción.
