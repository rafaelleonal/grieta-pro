# Flash para prepartida · 12 de octubre de 2026

El propietario decidió aprovechar la rapidez de Gemini Flash para preparar partidas mientras se sigue iterando la precisión táctica. Esta decisión sustituye el criterio anterior de mantener Pro hasta cerrar todos los hallazgos; no convierte las evaluaciones históricas en aprobadas.

## Comportamiento

- Flash es el predeterminado en código y `.env.example`, con esfuerzo bajo. Pro continúa permitido en las semillas nuevas y como alternativa del selector. Se respeta un modelo elegido explícitamente o configurado en el servidor.
- Se conserva una sola generación en streaming: prioridad, matchup y papel en equipo primero, compras y detalles después. El resumen pasa controles de estructura y seguridad antes de mostrarse; no son una verificación factual completa.
- La instrucción compacta prioriza decisiones previas a jugar y condiciones observables por rol; evita añadir cifras o tipos de daño innecesarios y pide identificar claramente actores y objetivos.
- La preparación no muestra un aviso de consumo incierto cuando aún queda cuota. La conciliación automática, acotada y por cuenta continúa. Un plan pendiente o saldo agotado sí muestra una explicación; no se liberan reservas ni se repiten consultas automáticamente.
- La pantalla de fallo conserva selección, acceso al historial y detalles, sin «Comprobar estado». Cuenta conserva una acción explícita «Actualizar saldo». El selector identifica el modelo predeterminado por nombre.

## Prueba real autorizada

Seis consultas, máximo autorizado USD 1. Consumidas **6/6**, coste comunicado **USD 0.11905950**. No quedan consultas autorizadas de esta tanda. Una llamada por caso, sin reintentos ni fallbacks; cada despacho se registra antes de enviarse y los costes desconocidos conservan la reserva máxima. Artefactos sintéticos en `artifacts/qa/flash-prepartida/`, excluidos de Git; sin claves, prompts ni razonamiento guardados.

| Caso                     | Resumen | Completo | Estructura |
| ------------------------ | ------: | -------: | ---------- |
| Darius–Yorick · Top      | 3.990 s | 13.930 s | Completa   |
| Ahri–Yasuo · Mid         | 3.478 s | 13.449 s | Completa   |
| Jinx–Caitlyn · ADC       | 3.676 s | 14.673 s | Completa   |
| Darius–Jax · Top         | 2.620 s | 11.261 s | Completa   |
| Lee Sin–Rengar · Jungla  | 6.096 s | 13.194 s | Completa   |
| Janna–Nautilus · Soporte | 3.816 s | 15.585 s | Completa   |

Mediana del resumen: **3.746 s**. Cinco de seis antes de cinco segundos; no se garantiza ese plazo. Son tiempos de `generateCoach` con catálogo y detalles preparados, fuera de autenticación, admisión, persistencia y red/render del navegador. No son latencia de extremo a extremo ni de producción.

## Revisión editorial y pendientes

Los seis resúmenes incluyen prioridad, ventana, riesgo y papel en equipo. Bot sin parejas explícitas conserva veredicto incierto. La redacción sigue necesitando trabajo:

- Ahri: «delantera total» es demasiado categórico; el nivel 2 propone retroceder hacia sus propios súbditos frente a Yasuo, sin justificar la ruta segura.
- Darius–Yorick: prioridad de congelar y nivel 1 de asegurar empuje requieren condiciones que distingan cuándo cambiar el plan. «Rango dos» de Q en nivel 5 tampoco concuerda con la progresión Q/W/E/Q/Q mostrada.
- Lee Sin: tres campamentos hacia cangrejo no explica el tiempo de aparición ni la decisión intermedia; requiere contexto antes de recomendar esa ruta.
- Persisten expresiones poco claras («telemetría de guardianes», «transferir el daño») y faltas de acentuación en jungla.

Estos hallazgos impiden declarar calidad táctica certificada o ausencia de errores. La selección de Flash es una decisión de producto para iterar prepartida, no una mejora factual demostrada frente a Pro. Se conservan los resultados completos para la siguiente revisión; no se vuelve a ejecutar ni se borra una muestra problemática para mejorar las métricas.

## Configuración y evidencia local

Para una instalación existente: verificar destino de base, ejecutar `pnpm db:seed --enable-flash` y cambiar `OPENROUTER_MODEL` a `google/gemini-3.8-flash` (o quitar una sobrescritura antigua). Reiniciar el servidor. Habilitarlo no altera cuotas ni presupuestos. La configuración y los planes de la base local se actualizaron; no se modificó la configuración de producción.

`pnpm check`: formato, lint, tipos y 259 pruebas correctos. `pnpm eval:security`: 34 pruebas correctas. `pnpm test:accounts`: PostgreSQL temporal y proveedores simulados correctos, incluyendo streaming, aislamiento e idempotencia. Las pruebas de esquema extendido de Pro usan ahora ese modelo explícitamente; las de Flash siguen cubriendo su transporte compacto.

Navegador: componentes reales con una respuesta sintética grabada, a 390/834/1440 px sin desbordamiento; recuperación sin botón de estado y preparación sin alerta por reserva incierta con cuota disponible. La ruta temporal de QA se retiró. Las capturas no simulan ni acreditan tiempos reales. `pnpm build` terminó correctamente y se restauró el servidor local. El selector de la aplicación reiniciada mostró «Gemini Flash · predeterminado». Sin push ni despliegue de esta iteración.
