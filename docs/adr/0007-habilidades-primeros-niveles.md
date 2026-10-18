# ADR 0007 · Habilidades de los primeros niveles

- **Estado:** aceptada por instrucción del propietario el 18 de octubre de 2026.
- **Petición:** añadir qué habilidades subir en los primeros niveles, conservando la respuesta breve.

## Decisión

La respuesta incluye el orden de habilidades de los niveles **1 a 6**, junto con build, hechizos y runas. Esta es una ampliación puntual de la [ADR 0005](0005-build-hechizos-runas.md): no se recuperan consejos tácticos por nivel, estrategia, matchup narrado ni mapa.

Se muestran seis casillas numeradas con la tecla elegida, antes de las compras recomendadas. Se exporta el mismo orden al copiar la build. Los resultados antiguos sin una secuencia de seis niveles se muestran sin inventarla. Para Aphelios se conserva la representación explícita de mejoras de atributos, sin presentarlas como puntos Q/W/E/R.

## Contrato y validación

- El proveedor recibe `build-v2` con `skillOrder.first6` y `skillOrder.max`. La prioridad `max` mantiene la compatibilidad de validación y la representación de atributos; en campeones normales la vista se centra en los seis niveles.
- Se mantienen los lectores `build-v1` y `compact-v1`, y el formato persistido 4, que ya permite `skillOrder` opcional. No hay migración de datos ni regeneración del historial.
- Se reutilizan las reglas de rangos legales, disponibilidad de R y excepciones de Udyr, Jayce, Nidalee, Elise y Aphelios. Una sección inválida se omite y se señala; no se sustituye por habilidades inventadas.
- Se usa una sola consulta admitida, con los límites actuales de Flash, y se conserva el avance validado de hechizos, compra inicial y runas. No se añade otra llamada ni reintentos para completar habilidades.
- Gemini 3.8 Flash continúa como predeterminado; acceso beta, autenticación, cuotas, presupuestos y contabilidad permanecen vigentes.

La comparación pagada anterior midió el contrato sin habilidades. Sus tiempos no acreditan la latencia de esta ampliación y su autorización está agotada.
