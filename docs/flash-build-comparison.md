# Flash y Opus con respuesta reducida · 18 de octubre de 2026

El propietario autorizó hasta cuatro consultas pagadas con un tope conjunto de USD 1. Se ejecutaron exactamente cuatro, dos por modelo, con coste total confirmado de **USD 0.18156375**. La autorización quedó consumida; no se reutiliza para nuevas consultas.

Tras revisar estos resultados, el propietario eligió **Gemini 3.8 Flash como predeterminado** y autorizó el push. Opus 5.5 sigue disponible como selección explícita. El cambio se aplica en código, configuración local y variables Production/Preview; conserva las políticas de tokens, validación, cuotas y presupuesto.

## Resultados reales

| Caso              | Modelo           | Primera elección validada | Respuesta completa |  Coste USD |
| ----------------- | ---------------- | ------------------------: | -----------------: | ---------: |
| Ahri vs. Yasuo    | Gemini 3.8 Flash |                   2.841 s |            4.148 s | 0.01041150 |
| Ahri vs. Yasuo    | Opus 5.5         |                   4.283 s |            7.847 s | 0.08014400 |
| Darius vs. Illaoi | Gemini 3.8 Flash |                   4.171 s |            5.890 s | 0.01084425 |
| Darius vs. Illaoi | Opus 5.5         |                   5.599 s |            8.508 s | 0.08016400 |

Las cuatro respuestas pasaron la validación de formato, catálogo y seguridad. Flash promedió 5.019 s y USD 0.010627875 por respuesta; Opus, 8.1775 s y USD 0.080154. En esta muestra, Flash redujo el tiempo total un 38.6 % y el coste un 86.7 %.

## Método y límites

- Mismos dos contextos sintéticos de equipo completo, rango Oro, sin búsqueda web; catálogo real 16.20.1 precargado y compartido.
- Generación directa con el flujo de proveedor y validación de la aplicación. Los tiempos excluyen carga de catálogo, autenticación, historial y red del navegador.
- Configuración de producción propia de cada modelo: Flash usa prompt compacto, razonamiento bajo y máximo de 7 000 tokens; Opus usa razonamiento bajo y máximo de 4 096. La comparación es entre estas configuraciones, no entre modelos con instrucciones idénticas.
- Consultas secuenciales: Flash y después Opus para cada caso. Dos muestras por modelo no garantizan latencias futuras ni separan efectos de caché o carga del proveedor.
- Una salida válida no prueba que sea la mejor build ni resuelve los límites tácticos señalados en evaluaciones anteriores.
- Registro persistente, reservas conservadoras y parada ante coste desconocido. No hubo reintentos, costes inciertos ni consultas adicionales.

La evidencia local sanitizada está en `artifacts/qa/build-comparison/2026-10-18/` (excluida de Git): `ledger.json`, `summary.json` y cuatro respuestas validadas. No contiene claves, prompts enviados ni datos de usuarios reales.
