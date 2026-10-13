# Evaluación táctica de Flash · 12 de octubre de 2026

**Resultado: no aprobado para convertirse en predeterminado.** La última configuración conserva la rapidez y entrega las secciones completas, pero la revisión del texto detecta errores mecánicos. El predeterminado continúa siendo Gemini Pro. No se hizo push ni se cambió producción en esta ronda.

## Cambios locales

- Contexto con alcance básico y tooltips detallados de Riot. Las fórmulas sin resolver permanecen desconocidas.
- Referencias mecánicas para los campeones conocidos, incluidos los equipos; limitadas al catálogo vivo 16.20.1. No añaden llamadas de red ni de IA. [Fuentes y límites](coach-mechanics.md).
- Instrucciones para distinguir efectos activos de habilidades gastadas, respetar requisitos y mantener coherencia entre resumen, niveles, compras y mapa.
- Después de la evaluación real se añadió una regla determinista: sin ambas parejas explícitas de bot, el veredicto es `uncertain`, tanto en el avance como en el resultado final. La explicación identifica el dato que falta; no inventa otra táctica. Probado con proveedor simulado. Los equipos conocidos no se convierten automáticamente en parejas de línea.

La mejora del contexto no demuestra por sí misma que el modelo la respete. Se conserva la entrega progresiva con una consulta, sin reintentos automáticos, cuotas adicionales ni cambios de tarifas o límites.

## Protocolo y coste

18 consultas autorizadas, máximo adicional USD 2.50. Se utilizaron **18/18**, coste confirmado **USD 0.39103050**. La autorización está agotada por número de llamadas, aunque sobre presupuesto monetario. No autoriza otra ronda.

Se usó `google/gemini-3.8-flash`, salida limitada a 7000 tokens, sin búsqueda, catálogo vivo 16.20.1 y los mismos seis casos de la evaluación anterior. Cada tanda tuvo una petición por caso. Las llamadas usan `generateCoach` con credencial del servidor, fuera de la admisión de cuentas/base de datos; por ello los tiempos **no son latencia de la aplicación completa**. Se conservan salidas sintéticas, detalles públicos, métricas y huellas de petición en `artifacts/qa/tactical-coach/`, excluido de Git. No se guardan claves, prompts enviados ni razonamiento.

La propuesta inicial incluía seis casos nuevos. Se reasignaron a repetir los casos originales porque persistieron defectos en la calibración; se comunicó durante la ejecución. **No se ejecutó un conjunto reservado ni una revisión por dos expertos humanos.** La revisión editorial del agente se apoya en los datos públicos de Riot y no acredita optimalidad de builds.

| Tanda        | Configuración                          | Planes con estructura completa | Primera prioridad + matchup |  Mediana |   Plan completo |  Coste USD |
| ------------ | -------------------------------------- | -----------------------------: | --------------------------: | -------: | --------------: | ---------: |
| `regression` | Bajo, tooltips y notas iniciales       |                            6/6 |               3.103–4.397 s |  3.520 s | 11.484–13.664 s | 0.11680125 |
| `repeat`     | Medio, coherencia ampliada             |                            6/6 |              5.442–28.806 s | 10.038 s | 14.558–34.475 s | 0.15169950 |
| `final`      | Bajo, notas refinadas y copy más breve |                            6/6 |               2.843–5.268 s |  3.777 s | 10.484–16.858 s | 0.12252975 |

La prueba media cambia también las instrucciones; no aísla causalmente el esfuerzo de razonamiento. Se descarta esa configuración porque incumple el objetivo temporal y todavía presenta ambigüedades tácticas. El código final conserva esfuerzo bajo. En la última tanda, cinco de seis avances llegaron antes de cinco segundos; no se promete ese máximo para toda consulta.

## Revisión de la última tanda

| Caso                   | Avance / completo | Hallazgo                                                                                                                                                                                                                                             |
| ---------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Darius–Yorick TOP      | 3.855 / 11.474 s  | Respeta filo de Q y ejecución letal; niveles y ventana todavía invitan a combatir con condiciones insuficientes cuando aparece la Dama. No se acredita esa decisión como segura.                                                                     |
| Ahri–Yasuo MID         | 2.843 / 10.484 s  | `brief.avoid` atribuye desplazamientos de Yasuo a una «oleada enemiga» desde la perspectiva de Ahri. Yasuo usa unidades enemigas para él: los súbditos aliados de Ahri. También persiste redacción ambigua sobre «sumar rango» a Q.                  |
| Jinx–Caitlyn ADC       | 4.278 / 15.598 s  | El veredicto reconoce incertidumbre. El nivel 5 propone aumentar daño de cohetes al subir Q, sin evidencia numérica resuelta en el contexto. Varias ventanas necesitan precisar distancia y pareja presente. No se da por verificada esa afirmación. |
| Darius–Jax TOP         | 3.698 / 12.625 s  | Resumen distingue E activa y terminada, y R de Darius como daño verdadero. La razón de compra de **3075** afirma que devuelve daño físico; el catálogo especifica **mágico**. Una reacción vuelve a omitir el fin de E antes de atacar.              |
| Lee Sin–Rengar JUNGLE  | 3.471 / 13.263 s  | Ya no usa Tempestad como detector garantizado de camuflaje. La razón de **3053** sitúa el escudo por debajo de «un tercio» de vida; el catálogo dice **30%**. El detalle añade una precisión incorrecta pese a tener el dato disponible.             |
| Janna–Nautilus SUPPORT | 5.268 / 16.858 s  | Ya distingue el empuje de R del seguimiento de Nautilus y no manda caminar canalizando. Ignoró la instrucción de marcar incertidumbre sin parejas explícitas; se corrige después con la regla determinista descrita arriba.                          |

Las tres contradicciones comprobables —objetivo de E de Yasuo, tipo de daño de Espinas y umbral de Sterak— bastan para impedir la promoción. No se convierten los casos restantes en aprobaciones por ausencia de un error identificado. Fuentes: [Yasuo E](https://ddragon.leagueoflegends.com/cdn/16.20.1/data/en_US/champion/Yasuo.json) y [objetos 3075/3053](https://ddragon.leagueoflegends.com/cdn/16.20.1/data/es_MX/item.json).

## Continuación

Comprobaciones locales después del ajuste de bot: `pnpm check` (252 pruebas, formato, lint y tipos), `pnpm eval:security` (34 pruebas), `pnpm test:accounts` (PostgreSQL temporal y proveedores simulados) y `pnpm build`, todas correctas. Se restauró `pnpm dev` después de compilar. Estas comprobaciones no certifican precisión táctica. No se modificó la interfaz ni se presenta esta ronda como QA visual o validación de producción.

La siguiente corrección necesita restringir los hechos que el texto puede afirmar: efectos de compras desde catálogo, condiciones mecánicas con actor/objetivo explícitos y pruebas que rechacen contradicciones observadas. Añadir instrucciones no ha bastado. No promover Flash por JSON completo ni por no mencionar un efecto problemático en una muestra.

Conservar los intentos fallidos al comparar la siguiente versión. Repetir casos conocidos y reservados sólo con autorización nueva y límite explícito. La documentación de esta ronda no acredita la calidad de una modificación posterior ni servicios reales de producción.
