# Cómo evaluar el coaching de GrietaPro

Esta guía define una comparación futura; no contiene un benchmark ejecutado ni demuestra que un modelo sea el mejor coach. El 11 de octubre de 2026 se revisaron el prompt, la validación y las pruebas actuales. No se realizaron consultas de pago para preparar este documento.

El coaching combina hechos comprobables y decisiones contextuales. Una habilidad, un objeto o un rango de habilidad pueden ser incorrectos. Decidir cuándo presionar, intercambiar o rotar admite varias respuestas útiles según la oleada, los recursos y la información disponible. Se evalúa la calidad de esa decisión bajo condiciones explícitas, sin exigir una redacción única ni usar una victoria aislada como prueba.

## Qué acredita hoy la aplicación

La presentación comienza por prioridad, ventana observable con respuesta mecánica y qué evitar. El contrato de generación pide sólo `brief` como núcleo; niveles, mecánicas de línea, compras, runas, hechizos, habilidades y mapa son detalles independientes opcionales. No pide títulos duplicados, fases extensas, highlights de compras, composición decorativa ni alternativas. Las secciones omitidas deliberadamente se distinguen de las que no superaron la validación mediante `partial.invalid` y el motivo `optional`; no se rellenan con consejos genéricos.

Los planes anteriores conservan sus datos: la presentación proyecta el resumen desde su condición de victoria, reacción de línea y error a evitar, o desde un paso disponible del mismo registro. No consulta otra IA ni mezcla historial entre cuentas. Los avisos de preparación se muestran junto al detalle afectado, y una respuesta sin consejo ofrece comprobar el intento o abrir el historial; no dispara una generación adicional. El resumen se copia antes del detalle.

La disponibilidad del resultado se evalúa por separado de su calidad táctica. Un campo mal formado o una página de runas inválida no debe borrar consejos independientes que sí pasan sus controles. Desde el 12 de octubre, la recuperación por secciones conserva exclusivamente campos completos con esquemas estrictos, referencias al contexto y recursos válidos. Un resultado parcial usa `formatVersion: 3`, identifica las secciones omitidas y conserva códigos de diagnóstico finitos en sus metadatos e historial. No rellena consejos ausentes ni hace otra llamada de IA.

El análisis de seguridad abarca la respuesta completa antes de omitir campos: filtraciones, contenido fuera de LoL, instrucciones inseguras, negativas y llamadas a herramientas inesperadas impiden mostrar el plan. Una respuesta con límite de salida sólo se conserva si todavía es JSON íntegro y validable; un JSON cortado, una respuesta vacía o un fallo de red no permiten inventar el contenido perdido. Los costes conocidos y las reservas inciertas mantienen su tratamiento habitual.

[`sanitizeCoachPlan`](../lib/validation.ts) comprueba estructura, niveles 1–6, composición y referencias, runas, hechizos y rangos legales, con excepciones para campeones como Aphelios, Udyr y Jayce. Los objetos desconocidos se omiten con advertencia. Eso evita varias incoherencias; no demuestra que una build sea óptima ni que una reacción mecánica sea correcta.

[`generateCoach`](../lib/openrouter.ts) proporciona catálogo, habilidades disponibles, rol, rango, composición y contexto permitido. El servidor sustituye los nombres y tiempos de `enemyKeys` por los datos de Riot cuando existen; los tiempos no confirmados o condicionales se identifican como tales. El texto libre todavía requiere revisión: una mecánica equivocada puede aparecer en un consejo aunque los IDs y el JSON sean válidos.

`pnpm eval:security` mide controles de seguridad con proveedores simulados. Las pruebas de catálogo y validación comprueban reglas de la aplicación. Ninguna de estas suites mide actualmente la utilidad táctica de un modelo real.

Data Dragon es una fuente de datos estáticos; puede actualizarse después del parche y su versión no siempre coincide con el cliente regional. Cada evaluación debe fijar la versión, la procedencia y la fecha; una afirmación sobre el balance actual requiere evidencia aplicable. [Documentación de Riot](https://developer.riotgames.com/docs/lol#data-dragon).

## Comparación de modelos

Gemini 3.1 Pro Preview es el nuevo predeterminado por la preferencia del usuario, con razonamiento medio. Su configuración se contrastó el 11 de octubre de 2026 con metadatos públicos y documentación oficial; todavía no hay una consulta real de Gemini validada ni una comparación táctica ejecutada. Este cambio no demuestra que dé mejores consejos. [Modelo en OpenRouter](https://openrouter.ai/google/gemini-3.1-pro-preview) y [niveles de razonamiento de Google](https://ai.google.dev/gemini-api/docs/thinking).

GPT 5.6 Luna conserva su política y permanece disponible como comparación explícita. Su orientación a cargas sensibles al coste no acredita conocimiento especializado de LoL. [GPT 5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna). Hay que comparar el conjunto modelo, contexto, búsqueda, esfuerzo y formato: una respuesta de la aplicación de Gemini con herramientas distintas no aísla la calidad del modelo usado por GrietaPro.

Sonnet y Opus son candidatos para comparar. No hay aquí evidencia de que superen a Luna en estos matchups. La elección debe considerar utilidad, tasa de planes válidos, latencia y coste por plan útil. La guía de Anthropic también plantea evaluar capacidades, velocidad, coste y esfuerzo en el caso de uso concreto. [Selección de modelos Claude](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model).

En el código actual, `MODEL_POLICIES` contempla `anthropic/claude-sonnet-5.5`; las semillas nuevas lo permiten en Pro. Opus no está admitido. Una política persistida puede ser distinta a la semilla. Antes de comparar hay que verificar el ID disponible en OpenRouter, precio, compatibilidad del esquema y permisos del plan. No se debe aumentar un límite ni cambiar el predeterminado sólo para obtener una respuesta de otro modelo.

## Primera barrera: hechos y seguridad

Para cada salida se registra aprobado, rechazado o no verificable. Un fallo crítico impide declararla útil, aunque esté bien escrita.

| Comprobación                                    | Evidencia requerida                                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| IDs, runas, hechizos, habilidades y composición | Validadores existentes contra el mismo catálogo fijado para todos los modelos.                                                                   |
| Mecánicas descritas en prosa                    | Referencia vigente de la habilidad o prueba reproducible en el cliente, revisada por una persona conocedora del campeón.                         |
| Cooldowns y ventanas                            | Fuente, rango y condiciones explícitas. No convertir el tiempo base mostrado en un reloj del enemigo.                                            |
| Builds y estadísticas                           | Objeto válido y justificación contextual. Un winrate o una afirmación de optimalidad requieren parche, rol, rango, muestra y fuente pertinentes. |
| Contexto desconocido                            | El consejo condiciona la acción; no inventa posición del jungla, oro, vida, oleada ni habilidades disponibles.                                   |
| Seguridad                                       | Sin secretos, instrucciones internas, trampas, automatización de acciones ni contenido fuera de LoL. Mantener `pnpm eval:security`.              |

No verificado no significa falso. Sí impide usar esa afirmación como evidencia a favor del modelo. La búsqueda web debe evaluarse aparte: habilitarla para un candidato y no para otro confunde la calidad del modelo con la información que recibió.

## Rúbrica táctica

Dos revisores conocedores de los roles puntúan cada dimensión de 0 a 4: 0 es incorrecto o perjudicial, 1 genérico, 2 parcialmente útil, 3 útil con condiciones claras y 4 preciso, ejecutable y bien priorizado. Se conserva una observación breve con el fragmento que respalda cada valoración, sin pedir ni guardar razonamiento interno del modelo.

| Dimensión             | Peso propuesto | Qué debe aportar                                                                           |
| --------------------- | -------------: | ------------------------------------------------------------------------------------------ |
| Matchup y niveles 1–6 |            30% | Ventanas y riesgos propios del enfrentamiento, coherentes con habilidades y recursos.      |
| Reacción mecánica     |            25% | Una señal observable y una respuesta ejecutable; alternativas si falta información.        |
| Compras y adaptación  |            20% | Prioridad y condiciones por daño, control o composición; evitar una lista sin explicación. |
| Mapa y composición    |            15% | Conexiones concretas entre el equipo conocido, el objetivo y la siguiente acción.          |
| Claridad y concisión  |            10% | Se entiende con una lectura breve; lo esencial aparece antes que lo secundario.            |

La puntuación es `Σ(peso × nota / 4)`, en escala de 0 a 100. Como criterio inicial de trabajo se propone 75 y ninguna dimensión por debajo de 2, además de superar la barrera factual. Son umbrales editoriales para calibrar con revisores, no cifras ya validadas.

Los revisores pueden discrepar por estilo de juego. Primero identifican si el consejo es viable bajo sus condiciones; después comparan cuál ayuda más a este usuario. El desacuerdo se registra y se resuelve sin convertir una preferencia en una ley del juego.

## Conjunto inicial y protocolo

Preparar 20 casos sintéticos: 10 para calibrar la rúbrica y el prompt, y 10 reservados para la comparación final. Cubrir los cinco roles, rangos distintos, composiciones parciales y completas, campeones fuera de posición y excepciones de habilidades. Por ejemplo:

| Caso                                        | Variación a revisar                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Ahri contra Yasuo, MID                      | Mismo matchup con rango Bronce y Diamante; comprobar que cambie la carga mecánica sin inventar datos. |
| Garen contra Darius, TOP                    | Consejo de oleada y riesgo condicionado a recursos desconocidos.                                      |
| Lee Sin contra Rengar, JUNGLE               | Rutas y enfrentamientos condicionados a información; no rellenar posiciones enemigas.                 |
| Aphelios contra Caitlyn, ADC                | Progresión válida, consejos de línea y dependencia del support conocido.                              |
| Janna contra Nautilus, SUPPORT              | Reacción y protección, con carry aliado conocido y sin inventar los demás picks.                      |
| Udyr, Jayce, Nidalee o Elise                | Legalidad del orden de habilidades y tratamiento de transformaciones.                                 |
| Yasuo, SUPPORT                              | Admitir la selección; adaptar el plan sin fingir que es una elección habitual acreditada.             |
| Catálogo de respaldo o habilidades ausentes | Expresar incertidumbre y no completar números por memoria.                                            |

Un experto prepara para cada caso hechos comprobables, errores graves y señales que un consejo útil debería considerar. No redacta una única respuesta obligatoria. Validar estos casos antes de gastar y mantener la parte reservada fuera de las iteraciones del prompt.

1. Fijar entradas, catálogo, detalles de habilidades, búsqueda, esquema y versión del código. Registrar modelo, proveedor, configuración de esfuerzo, límites, fecha, coste y latencia. Comparar la configuración completa: cambiar también el esfuerzo puede afectar la conclusión.
2. Generar una salida por caso y modelo mediante la misma admisión, cuota e idempotencia. Veinte casos y tres candidatos significan 60 consultas de generación, más cualquier juez de IA; esta guía no autoriza ese gasto. Definir un presupuesto antes de ejecutarlas y contar también respuestas rechazadas o fallos facturables.
3. Aplicar la barrera factual y registrar rechazos sin borrarlos del denominador. No repetir automáticamente una consulta incierta ni elegir sólo la mejor salida de un candidato.
4. Mostrar planes A/B con el mismo formato, ocultando modelo, precio y proveedor. Aleatorizar el orden; conservar empate y ninguno es útil como respuestas posibles. Los revisores puntúan de forma independiente antes de discutir.
5. Si se usa un juez de IA, tratar planes y referencias como datos no confiables, con salida estricta y sin acceso a secretos o herramientas. Calibrarlo contra las valoraciones humanas y comprobar si cambia el veredicto al invertir A/B. No usar su propio gusto como fuente de mecánicas.
6. Repetir después una muestra pequeña con autorización y presupuesto nuevos para medir consistencia. No mezclar esa repetición con reintentos de red ni con el resultado inicial.

Las comparaciones por pares, criterios específicos, revisión humana y control de sesgos de orden o longitud están recogidos en la guía oficial de OpenAI. [Buenas prácticas de evaluación](https://developers.openai.com/api/docs/guides/evaluation-best-practices). Anthropic propone combinar verificaciones por código, humanos y jueces de IA según el criterio. [Criterios de éxito y evaluaciones](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests).

## Resultado que permite tomar una decisión

El informe debe mostrar por modelo: planes útiles sobre todos los intentos, fallos factuales, notas por dimensión, victorias/empates en comparación ciega, desacuerdo entre revisores, coste total dividido entre planes útiles y latencia mediana. Con pocas muestras conviene publicar conteos y rangos, sin afirmar que un ganador provisional generaliza a todos los matchups.

Un candidato más caro se adopta cuando resuelve una carencia repetida y demostrable. Podría ofrecerse como opción Pro si su mejora justifica el coste; no debe enviarse una segunda consulta pagada automáticamente después de un fallo de Luna. La seguridad y la contabilidad siguen siendo requisitos para todos los modelos.

Después, el usuario puede valorar si identificó una ventana y si pudo aplicar una reacción. Esos comentarios ayudan a mejorar la guía. Ganar o perder depende de muchas variables y no atribuye por sí solo el resultado al coaching. Una prueba con replays o usuarios requeriría un protocolo separado y permiso para usar sus datos; este conjunto inicial usa únicamente datos sintéticos y activos públicos.

Los artefactos de evaluación nunca deben incluir claves, cookies, correos reales, capturas privadas originales ni prompts enviados. Se pueden conservar casos sintéticos permitidos, planes evaluados y versiones del código/catálogos, respetando los controles de privacidad del proyecto. Este documento no cambia modelos, planes, cuotas ni datos existentes.
