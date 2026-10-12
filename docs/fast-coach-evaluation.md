# Lectura progresiva y comparación de modelos rápidos

Evaluación del 12 de octubre de 2026. Se implementó una lectura inicial con prioridad y matchup mientras la misma generación completa niveles, reacciones, compras, runas, hechizos y mapa. **La rapidez y el formato están medidos; la equivalencia de calidad táctica no está demostrada.** Gemini Flash queda como opción explícita, sin sustituir a Gemini Pro como predeterminado.

## Método y alcance

30 consultas reales a OpenRouter, sin búsqueda ni imágenes, con catálogo vivo Data Dragon 16.20.1 y habilidades de los dos campeones. Coste confirmado total: **USD 0.33933205**. El primer lote tuvo un máximo de 24 llamadas; el usuario autorizó seis adicionales con máximo adicional USD 1.50 y total debajo de USD 3. No hubo reintentos automáticos ni llamadas con coste desconocido.

Los cuatro candidatos recibieron los mismos cuatro casos iniciales:

| Caso          | Rol / rango     | Equipo conocido adicional                                   |
| ------------- | --------------- | ----------------------------------------------------------- |
| Darius–Yorick | Top / Oro       | Ninguno                                                     |
| Ahri–Yasuo    | Mid / Platino   | Aliados: Lee Sin, Jinx, Thresh. Rivales: Vi, Caitlyn, Lux   |
| Jinx–Caitlyn  | ADC / Esmeralda | Aliado: Thresh. Rival: Lux. Sin campos explícitos de pareja |
| Darius–Jax    | Top / Oro       | Ninguno                                                     |

Después se añadieron Lee Sin–Rengar (Jungla/Oro, sin equipo adicional) y Janna–Nautilus (Soporte/Oro, Jinx aliada y Caitlyn rival). No se inventaron posiciones, oro ni estados de partida. Es una muestra pequeña, usada para ajustar el contexto; no es un conjunto independiente de evaluación ni una prueba con dos revisores expertos.

Se llamó a `generateCoach` directamente con streaming, después de cargar el catálogo y habilidades. El reloj mide desde el inicio de esa función hasta el primer bloque válido o el resultado completo. **No incluye sesión, admisión, base de datos, carga previa del catálogo, navegador ni buffering del despliegue.** Esos componentes se comprobaron por separado con datos simulados; aún falta medir clic → primera decisión en producción y sus percentiles.

«Completo» significa que están todas las secciones solicitadas y `partial.invalid` está vacío. No significa que cada afirmación táctica sea correcta. Las secciones antiguas omitidas intencionalmente por el contrato compacto no se cuentan como errores.

## Comparación inicial: 16 llamadas

Todos tuvieron el mismo límite de 7000 tokens de salida, sin fallback. Se probó la configuración completa, no sólo el nombre del modelo. Esta ronda omitía parte de los efectos de objetos y esperaba el resumen entero antes de mostrarlo.

| Configuración                                 | Planes completos | Primer resumen entero |  Tiempo total | Coste del lote |
| --------------------------------------------- | ---------------: | --------------------: | ------------: | -------------: |
| GPT 6 Luna, sin razonamiento                  |              0/4 |           3.95–4.89 s | 10.79–15.73 s | USD 0.00651620 |
| Haiku 5.5, esfuerzo bajo por Chat Completions |              1/4 |         13.35–19.97 s | 18.78–23.49 s | USD 0.01396240 |
| Gemini 3.8 Flash, esfuerzo bajo               |              4/4 |           4.22–6.15 s | 10.45–14.19 s | USD 0.04936425 |
| Gemini 3.5 Flash Lite, esfuerzo mínimo        |              0/4 |        Ninguno válido |   5.57–6.23 s | USD 0.02867020 |

Luna falló en niveles/runas; Haiku, en niveles/compras/runas; Lite, en resumen/niveles/compras. Se rechazaron campos en vez de relajarse la validación. Haiku bajo en este ensayo es distinto del Haiku max con presupuesto de tarea que conserva la aplicación; no se cambió esa política para todos los usuarios.

## Ajustes y rondas posteriores

- Se permite mostrar matchup + prioridad cuando ambos campos están completos y validados. Teamfight, ventana y riesgo llegan después; no se muestran frases cortadas.
- Se compactaron las runas a filas, conservando claves, rama y ranura. Las habilidades y el contexto por rol se mantienen.
- Se restauraron los efectos de objetos: quitar esos datos ahorraba contexto pero favorecía recomendaciones basadas en efectos antiguos. El perfil final permite 300 caracteres por objeto completo, conservando el límite total de 72 000 bytes y la reserva conservadora.
- Se reforzaron condiciones mecánicas y temporales: defensa activa frente a gastada, ejecución letal, habilidades aprendidas, alcance frente a rango de habilidad, y compras situacionales condicionadas.
- El servidor ahora descarta la compra inicial si suma más de 500 de oro. Jungla y soporte reciben además opciones completas y asequibles calculadas con los precios del catálogo.

La segunda ronda de Flash (seis casos, efectos a 120 caracteres) entregó 6/6 formatos completos, primera decisión en 2.88–4.34 s y total en 10.83–13.89 s; coste USD 0.09485550. La lectura manual encontró una compra inicial de jungla de 600 de oro. Dos repeticiones con el nuevo control dieron 1/2 completas: el control detectó y omitió de nuevo esa compra; coste USD 0.03148350. Ese fallo permanece en el informe, no se elimina del denominador.

## Perfil final: seis consultas adicionales

Efectos de objetos a 300 caracteres y opciones iniciales asequibles. Todas entregaron las secciones solicitadas, sin campos rechazados; las seis compras iniciales caben en 500 de oro.

| Caso           | Matchup + prioridad | Plan completo |          Coste |
| -------------- | ------------------: | ------------: | -------------: |
| Darius–Yorick  |             3.990 s |      12.406 s | USD 0.01832925 |
| Ahri–Yasuo     |             4.720 s |      16.864 s | USD 0.02100375 |
| Jinx–Caitlyn   |             2.818 s |       9.558 s | USD 0.01834650 |
| Darius–Jax     |             3.328 s |      12.546 s | USD 0.01974000 |
| Lee Sin–Rengar |             3.119 s |      10.903 s | USD 0.01837200 |
| Janna–Nautilus |             3.642 s |      12.598 s | USD 0.01868850 |

Coste del último lote: USD 0.11448. El tiempo de primera lectura entra en el objetivo de 3–5 segundos en estas muestras del proveedor (una incluso antes), sin otra generación para el resumen.

## Calidad: lo que queda pendiente

La estructura completa no alcanza la barrera factual de [la rúbrica](coaching-quality.md). La revisión encontró, entre otras, estas afirmaciones que requieren corrección o contraste con datos mecánicos más precisos:

- Jinx–Caitlyn: se aconseja usar cohetes al nivel 1 sin entrar en el rango de Caitlyn y se atribuye ventaja de alcance sin condicionar el nivel de Q. No se debe convertir esa afirmación en una lectura fiable del duelo.
- Lee Sin–Rengar: el consejo mezcla revelación de área, camuflaje y protección ante saltos con condiciones incompletas; los tooltips estáticos no bastan para certificar esas interacciones.
- Janna–Nautilus: se describe usar el escudo de Nautilus para «ejecutar súbditos»; la frase confunde capacidad del kit y ejecución del objeto de soporte.
- Varias recomendaciones de visión, invasión o pelea son demasiado categóricas para una preparación sin estado de partida.

Las rondas anteriores también tuvieron efectos erróneos de objetos y recomendaciones de mascotas/ejecuciones. Ampliar el contexto y validar el oro mejora restricciones concretas; no demuestra haber eliminado alucinaciones. No se hizo evaluación ciega, comparación táctica equivalente con Pro/Opus ni reconocimiento real de capturas.

Por estos motivos **Flash no se convierte automáticamente en el modelo habitual**. Se puede elegir para probar la lectura rápida, con el aviso orientativo que ya acompaña al plan. La promoción requiere referencias mecánicas aplicables y revisión de los cinco roles, no más repeticiones elegidas sólo porque producen JSON válido.

## Entrega, activación y pruebas

El transporte envía únicamente campos completos comprobados por esquema, alcance y protección de secretos. Mantiene visibles los campos ya recibidos sin cambiarlos; un campo contradictorio, una respuesta insegura o una interrupción impiden entregar éxito. El resultado final conserva la validación de todo el plan y se guarda antes del evento final.

La ruta conserva origen, sesión verificada y admisión antes del cuerpo, reserva antes del envío e idempotencia por propietario. El ID del proveedor se registra antes del primer avance. Cancelar conserva una reserva incierta y no reintenta. El cliente limpia el resumen al cancelar, fallar o cambiar de cuenta. La respuesta es privada y no cacheable; un replay devuelve el resultado guardado sin otra llamada.

Para habilitar la opción en una base existente, verificar primero que la conexión apunta al entorno deseado y ejecutar:

```sh
pnpm db:seed --enable-flash
```

Después elegir **Gemini Flash** en el selector. No cambia `OPENROUTER_MODEL`, otros modelos, cuotas ni presupuestos. Un push por sí solo no modifica la configuración ni las políticas persistidas de producción.

Evidencia local: pruebas unitarias de fragmentación UTF-8/SSE, límites, cancelación, filtrado temprano/tardío, contradicciones y terminación; integración con PostgreSQL temporal y proveedor simulado para avance antes del historial, un solo cargo, replay y cancelación con ID recuperable. La interfaz se revisó a 390, 834 y 1440 px, sin desbordamiento, controles de al menos 44 px y foco de 2 px con separación de 2 px. Se reprodujeron carga, resumen, final, error posterior y cancelación con componentes reales y una respuesta grabada; eso no es una prueba de latencia real de usuario.

Las capturas y resúmenes sanitizados están en `artifacts/qa/fast-coach/` en la máquina de evaluación, fuera de Git. No contienen claves, prompts, pensamientos ni capturas privadas. La ruta temporal de QA se retiró antes de compilar. No hay prueba de producción ni garantía de tiempos en todos los dispositivos, proveedores o estados de red.

Comprobaciones finales: `pnpm check` pasó con 247 pruebas unitarias, formato, lint y tipos; `pnpm eval:security` pasó 34 evaluaciones; `pnpm test:accounts` pasó 29 grupos con PostgreSQL temporal; `pnpm build` compiló sin la ruta de demostración. El servidor de desarrollo se restauró y se habilitó Flash en los planes locales mediante la opción explícita; no se modificaron variables ni políticas de producción.
