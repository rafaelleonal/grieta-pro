# ADR 0005 · Build, hechizos y runas

- **Estado:** aceptada por instrucción expresa del propietario el 18 de octubre de 2026.
- **Decisión:** simplificar el producto y priorizar la rapidez de respuesta frente a la estrategia. Usar Opus 5.5 como modelo predeterminado donde el plan lo permita.

## Alcance

La respuesta nueva contiene únicamente la build recomendada (compra inicial, núcleo en orden y opciones situacionales), los dos hechizos de invocador y la página de runas con fragmentos. Los motivos y condiciones de compra son breves. No se generan valoraciones del matchup, estrategia, niveles, mecánicas, orden de habilidades ni mapa.

La reducción aplica al contrato y al contexto enviados a la IA, además de la interfaz, el progreso y el texto copiado. Una consulta sigue usando una sola generación admitida, sin llamadas adicionales para completar campos. El historial anterior muestra las elecciones que ya contiene, sin regenerarlas ni inventar elecciones ausentes.

Esta decisión sustituye las exigencias de estrategia de las directrices de diseño y los documentos históricos. Conserva Tailwind v4, componentes por pantalla, marca Elociencia, paleta Grafito, accesibilidad, entrada manual y foto/galería móvil. Las recomendaciones siguen siendo sugerencias del modelo, no estadísticas óptimas.

## Modelo y controles

El predeterminado es `anthropic/claude-opus-5.5`. La autorización efectiva depende de los modelos permitidos por cada plan; no se amplían permisos de Free ni presupuestos persistidos. Una selección explícita o una variable de entorno puede prevalecer sobre el valor predeterminado del código.

Se conservan sesión verificada, admisión, cuotas, reserva conservadora, idempotencia, validación de salida, aislamiento del historial y contabilidad de respuestas rechazadas o canceladas. La reducción de contenido busca disminuir trabajo y longitud; no constituye una medición de latencia del proveedor.

## Verificación

Validar el contrato reducido con proveedores simulados; comprobar historial antiguo y formato nuevo, replay, borrado y cancelación. Revisar la interfaz a 390, 834 y 1440 px. No consumir saldo real para afirmar una mejora de velocidad sin una evaluación autorizada.
