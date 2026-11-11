# ADR 0010 · Opus 5.5 como modelo único

- **Estado:** aceptada por el propietario el 11 de noviembre de 2026.
- **Petición:** dejar Opus 5.5 como modelo predeterminado y no mostrar ningún selector de modelo; la app será de uso personal.

## Decisión

- Las builds usan siempre `anthropic/claude-opus-5.5` (`BUILD_MODEL` en `lib/build-ai.ts`). No hay selector, clave personal ni variable `OPENROUTER_MODEL`. Si queda configurada, se ignora.
- Política: esfuerzo de razonamiento `low`, que es el único control de Opus 5.5 porque no permite desactivar el razonamiento. Hasta 6 000 tokens de salida y tarifas máximas de USD 4 de entrada y USD 20 de salida por millón. Se mantienen la llamada única sin streaming, el timeout de 45 s y que no haya reintentos.
- El contrato viaja en el prompt y no se envía `response_format`. El decodificador estricto de Claude rechazó gramáticas anteriores (`schema_complexity`), y la comparación real del 18 de octubre validó este transporte con Opus. El servidor sigue validando forma, catálogo y seguridad. Sólo se acepta un bloque ` ```json ` alrededor del objeto; cualquier otro texto adicional es un fallo.
- `BUILD_CONTRACT` sube a `build-v4`. La caché también separa por modelo, así que las builds de Flash no se reutilizan.
- Si OpenRouter no informa el coste, se cargan USD 0.10 estimados en lugar de USD 0.03.

Complementa la [ADR 0009](0009-builds-simples.md) y sustituye sólo la parte del modelo. El resto de la ADR 0009 se conserva: entrada, caché, límites diarios y que no haya reservas.

## Consecuencias

- Coste y latencia: en la comparación del 18 de octubre, con un prompt de unos 52 KB, Opus costó unos USD 0.08 y tardó unos 8 s por build, frente a USD 0.01 y 5 s de Flash. Con el prompt actual de unos 27 KB debería costar algo menos; no se midió en esta decisión.
- Con el tope diario predeterminado de USD 5 (`AI_DAILY_BUDGET_USD`) caben unas 50–60 builds nuevas al día. Las builds de la caché no cuentan.
- El historial conserva el modelo con el que se generó cada build.
- No se hicieron llamadas pagadas para esta decisión. La primera build real comprobará el transporte; si falla, se verá como un error del proveedor y se puede volver a pedir.
