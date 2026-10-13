# Laminar: trazas y evaluación del coach

La integración está preparada y apagada por defecto. No se ha validado contra un proyecto real de Laminar ni en producción. No cambia el modelo predeterminado: Flash sigue pendiente de validación táctica. Se aplica la [revisión de privacidad y gasto](../.agents/skills/elociencia-review/SKILL.md).

## Dos fuentes de evidencia distintas

1. **Uso real, sólo métricas:** una traza por petición admitida al coach, con modelo permitido, catálogo listo, primer consejo validado, final, estructura completa/parcial, replay, consumo conocido y fallo/cancelación. `quality=unreviewed` siempre: una respuesta válida no demuestra precisión táctica.
2. **Evaluación sintética revisada:** seis casos archivados de la [última tanda](tactical-coach-evaluation.md). Registra estructura, rapidez, mecánicas, contexto y revisión experta por separado. `null` significa sin revisar; nunca equivale a aprobado. Los tres errores factuales siguen en rojo. La corrección posterior de bot no modifica la muestra histórica.

Las trazas reales no contienen el texto necesario para evaluar tácticas automáticamente. Los casos sintéticos contienen hallazgos resumidos y referencias públicas revisadas, sin conversaciones de usuarios. No se implementa un juez automático ni se activan Signals. Laminar organiza la evidencia; no reemplaza los hechos de Riot ni la revisión del consejo.

## Activación en el servidor

Para Laminar Cloud, configura fuera de Git:

```dotenv
LAMINAR_ENABLED=true
LMNR_PROJECT_API_KEY=clave_del_proyecto
```

Usa una clave restringida a ingestión. Nunca `NEXT_PUBLIC_`, nunca claves en el chat. Para detener nuevas exportaciones cambia `LAMINAR_ENABLED=false`; los datos ya enviados se administran en Laminar. La implementación usa el destino fijo `https://api.lmnr.ai`, sin redirecciones. Self-hosting no está configurado.

El envío utiliza la [API JSON de spans](https://laminar.sh/docs/api-reference/ingestion/create-spans), sin dependencias ni instrumentación automática. Next.js `after` lo programa después de cerrar la respuesta, con un máximo de dos segundos para el envío y sin reintentos. Una desconexión espera a que termine la operación para registrar su estado final. Un fallo de Laminar sólo emite `laminar_export_failed`, sin cuerpo ni error remoto; no cambia el resultado ni repite consultas de IA. No es un registro durable: un cierre del proceso o el límite del hosting puede perder una traza.

No se exportan prompts, planes, razonamiento, capturas, notas, Riot IDs, cookies, claves, IDs de cuenta, IDs de proveedor ni mensajes de error. Los identificadores de traza son aleatorios y no permiten resolver una cuenta. La extracción de capturas queda fuera de esta instrumentación. Revisar la [política de datos](https://laminar.sh/policies/data-use) y Privacy Mode antes de activar Signals u otro análisis de contenido; esta implementación no los activa.

## Lectura de las métricas

Los atributos usan el prefijo `elociencia.` y se consultan como atributos personalizados en Laminar:

| Atributo                                    | Significado                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `catalog_ms`                                | Tiempo hasta tener catálogo y ambos campeones.                                                              |
| `provider_start_ms`                         | Inicio del trabajo de generación, después de admisión/reserva. No acredita que el proveedor haya facturado. |
| `first_useful_ms`                           | Primera prioridad y matchup validados, listos para el stream; no primer token. Ausente si no hubo avance.   |
| `total_ms`                                  | Final de la operación con persistencia, o fallo.                                                            |
| `outcome`                                   | `complete`, `partial`, `failed` o `cancelled`.                                                              |
| `replay`                                    | Reutilización de una respuesta: excluirla al comparar modelos.                                              |
| `input_tokens`, `output_tokens`, `cost_usd` | Consumo comunicado por el proveedor y registrado; ausente no significa cero.                                |
| `quality`                                   | Siempre `unreviewed` en runtime.                                                                            |

El reloj comienza después de verificar sesión y admisión, antes de leer el cuerpo. No incluye autenticación, la red del navegador ni renderizado: **no es latencia visual de extremo a extremo**. `catalog_ms` también incluye lectura y validación de entrada. El span raíz termina antes de exportar. No hay capturas automáticas de subllamadas ni del contenido de LLM.

## Revisar y publicar la referencia histórica

```sh
pnpm eval:coach
```

Por defecto sólo lee `tests/fixtures/coach-evaluation-2026-10-12.json`, valida su estructura y presenta sus puntuaciones. No llama a IA, no lee claves y no usa red. **No vuelve a evaluar la implementación actual:** reproduce anotaciones de la evidencia archivada. `ready=1` exige estructura completa, avance en cinco segundos y aprobación explícita de mecánicas, contexto y experto; esta referencia tiene cero casos aprobados. Los tiempos archivados son del proveedor, fuera del flujo de cuentas, y no son comparables directamente con los del runtime.

Para publicar esa referencia, configura una clave de proyecto separada `LMNR_EVAL_API_KEY` y ejecuta explícitamente:

```sh
pnpm eval:coach --publish-laminar
```

Usa las APIs oficiales para [crear una evaluación](https://laminar.sh/docs/api-reference/evaluations/create-an-evaluation) y [añadir resultados](https://laminar.sh/docs/api-reference/evaluations/add-evaluation-datapoints). Cada ejecución crea una evaluación nueva. Si falla el segundo envío o se pierde la respuesta, revisa Laminar antes de repetir: puede existir una evaluación parcial. Este comando no ejecuta jueces ni modelos; el almacenamiento de Laminar queda sujeto al plan del proyecto.

## Siguiente comparación

Conservar fallos, versión de contexto/modelo/catálogo, latencia, coste y evidencia mecánica al incorporar nuevas muestras sintéticas. Revisar casos conocidos y reservados, por rol y equipo, y mantener separados los tiempos de proveedor y aplicación. La revisión editorial del agente no cuenta como revisión experta humana. No convertir ausencia de hallazgos en aprobación. Las autorizaciones de consultas anteriores están consumidas; esta integración no autoriza otras llamadas pagadas.

Antes de activar en producción: verificar recepción de una traza sintética, su ausencia de contenido, comportamiento del stream y fallo del exportador en el hosting elegido. No basta con que las pruebas simuladas pasen.

## Verificación local · 12 de octubre de 2026

Formato, lint, tipos, 259 pruebas unitarias, 34 pruebas de seguridad, integración de cuentas con PostgreSQL temporal y `pnpm build`: correctos. La suite unitaria necesitó repetirse con puertos locales habilitados porque la sandbox bloqueó la prueba HTTP de redirecciones. El servidor de desarrollo quedó restaurado después del build.

Las siete pruebas nuevas verifican opt-in, exclusión de contenido privado, envío único posterior al final, cancelación, costes desconocidos, replay, separación entre formato/calidad y contrato HTTP de las evaluaciones. Los envíos a Laminar se simularon. Se cotejaron las seis métricas archivadas con sus artefactos originales. No se ejecutaron modelos, no se publicó una evaluación, no se configuraron claves y no se hizo push.
