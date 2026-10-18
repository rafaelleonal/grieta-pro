# Directrices de diseño y experiencia de Elociencia

Decisiones del propietario recogidas el 12 de octubre de 2026. Aplican a todas las pantallas, al copy y a la presentación y generación de consejos.

**Alcance vigente desde el 18 de octubre de 2026:** la [ADR 0005](adr/0005-build-hechizos-runas.md), solicitada por el propietario, reduce la respuesta a **build, hechizos y runas**. Las secciones 1–4 y las referencias a estrategia, matchup, niveles y mapa de este documento describen el producto anterior y no deben reintroducirse. La jerarquía vigente es hechizos → compra inicial → runas → núcleo y situacionales, aprovechando dos columnas cuando haya espacio. Se mantienen las reglas visuales, de accesibilidad, seguridad y validación.

Esta guía complementa las ADR de [Tailwind](adr/0001-tailwind-v4.md), [componentes React](adr/0002-componentes-react.md), [marca](adr/0003-marca-elociencia.md) y [paleta Grafito](adr/0004-paleta-grafito.md); no las sustituye. La fuente visual sigue siendo el [handoff de marca](../brand/elociencia/HANDOFF.md). Grafito sustituye la paleta violeta de las referencias anteriores: fondos neutros, texto claro y lima sólo de marca. El [registro de revisión UI/UX](uiux-plan-review.md) documenta hallazgos y pruebas históricas; esta guía define las reglas para nuevas contribuciones.

## 1. Diseñar para decidir durante una partida

El jugador debe entender rápidamente qué priorizar, cuándo actuar y cómo contribuir a ganar. El duelo individual es una parte de la partida: el plan también debe contemplar recursos, mapa, objetivos y peleas en equipo según el rol y el campeón.

- Presenta primero las decisiones importantes. No des el mismo peso visual a una prioridad, un detalle secundario y una fuente.
- Explica una acción concreta y su condición. Evita consejos genéricos que podrían servir para cualquier campeón.
- Preparar una partida no equivale a conocer su estado en vivo. No inventes oro, posiciones, visión, enfriamientos ni ventajas actuales.
- No fuerces una pelea en equipo cuando dividir presión, intercambiar objetivos o retirarse tenga más sentido.

## 2. Jerarquía del plan

El resumen debe permitir encontrar estas respuestas sin abrir todas las secciones:

1. **Hechizos de invocador:** pareja elegida, iconos y motivo breve. Es la primera decisión en selección de campeón.
2. **Compra inicial y runas:** objetos con su coste validado, página de runas y fragmentos, visibles sin desplegar detalles.
3. **Plan de inicio:** prioridad por rol, lectura compacta del matchup, ventana y riesgo.
4. **Próximas compras:** núcleo en orden y opciones situacionales con su condición, visibles justo después de preparación e inicio, sin abrir un desplegable.
5. **Durante la partida:** niveles, reacciones, detalles de preparación y mapa/peleas, en secciones independientes más abajo.

En escritorio y tablet, coloca preparación e inicio en **dos columnas** y aprovecha el ancho disponible. En móvil, conserva el orden hechizos → compra inicial → runas → inicio, sin desbordamiento. Evita tarjetas grandes de una sola frase y encabezados repetidos. El papel en peleas, objetivos y late pertenece al detalle de mapa; no debe retrasar las elecciones de prepartida.

- Evita repetir los mismos campeones, contexto y títulos en varias cabeceras consecutivas.
- Mantén las fuentes y el alcance del consejo accesibles, con menor peso que las acciones de juego.
- Muestra sólo los integrantes conocidos de los equipos y una indicación compacta de lo que falta. No llenes el plan con espacios vacíos.
- Los planes antiguos deben seguir siendo legibles. Si no contienen una evaluación o un consejo nuevo, no lo inventes en la interfaz.

## 3. Lectura del matchup

La evaluación se expresa desde la perspectiva del jugador, para el rol y contexto seleccionados. Debe responder a estas posibilidades:

| Lectura                 | Cuándo corresponde                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Tienes ventaja          | Hay condiciones favorables, sin afirmar que existe un counter directo.             |
| Eres su counter directo | Una interacción concreta entre los kits limita de forma clara al rival.            |
| Es tu counter directo   | Una interacción concreta del rival limita de forma clara a tu campeón.             |
| Equilibrado             | El resultado depende principalmente de ejecución y condiciones del enfrentamiento. |
| Sin determinar          | Falta información o fundamento para sostener las otras lecturas.                   |

Acompaña la lectura con una razón breve y una condición que pueda cambiarla. Un counter no garantiza ganar; el resultado del duelo tampoco determina por sí solo el de la partida. No presentes intuiciones del modelo como tasas de victoria, estadísticas óptimas o experiencia Challenger acreditada.

En jungla, considera recursos, presión y posibilidades de intervención, además del duelo. En bot, no concluyas cómo funciona el 2 contra 2 si faltan los compañeros.

## 4. Consejos según el rol y el equipo

| Rol     | Inicio de partida                                                                                             | Aporte al equipo                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Top     | Oleadas, intercambios, recursos y ventanas de presión.                                                        | Decidir entre presión lateral y reunirse; iniciar, flanquear o proteger según el campeón. |
| Jungla  | Primeras rutas y decisión entre farmear, gankear, invadir o responder, con condiciones de prioridad y visión. | Preparar objetivos, coordinar entradas y conservar recursos para asegurar o intercambiar. |
| Mid     | Oleada, presión y coste de abandonar la línea.                                                                | Rotar, controlar accesos y aportar daño, control, picks o flancos según el kit.           |
| ADC     | Dúo, recursos, intercambios y compras.                                                                        | Mantener una posición segura, golpear al objetivo alcanzable y esperar amenazas clave.    |
| Soporte | Presión del dúo, experiencia y ventanas para salir sin abandonar al ADC en una mala situación.                | Preparar visión y elegir entre iniciar, proteger o responder según el campeón.            |

- No apliques una fase de líneas genérica a jungla ni reduzcas soporte a un duelo individual.
- Conserva niveles y mecánicas útiles, adaptando su contexto y títulos al rol.
- No asumas que todo top inicia, todo mid asesina o todo soporte es tanque. Tampoco que un ADC deba perseguir al carry enemigo.
- No inventes lado del mapa, ruta rival o posiciones para recomendar una invasión. Indica qué información y condiciones hacen viable la acción.
- Recomienda Teleport u otros recursos específicos sólo cuando estén presentes en el contexto.
- Explica cómo convertir una ventaja o una pelea en presión, torres, recursos u objetivos.
- El consejo de peleas debe cubrir **antes**, **tu trabajo** y **si no conviene pelear**. Incluye una salida útil cuando no hay entrada, prioridad o ventaja.

Completar los equipos es **opcional**. Haz visible la opción y usa los campeones conocidos; formula el resto como condiciones. Una composición completa tampoco revela el estado actual de la partida.

## 5. Navegación, espacio y accesibilidad

- El sidebar de escritorio debe poder contraerse y expandirse, conservando la preferencia de presentación. Contraído, sus controles siguen teniendo nombres accesibles y una forma clara de reconocer su destino.
- Adapta la navegación al espacio: barra compacta en tablet y navegación móvil accesible, sin sacrificar el área de lectura.
- Usa una escala consistente de márgenes, padding y gaps con las utilidades y tokens del proyecto. Separa grupos distintos y acerca elementos relacionados.
- Limita el ancho de los párrafos y evita líneas excesivamente largas, tarjetas gigantes vacías y bloques de texto pegados al borde.
- Refuerza prioridades, riesgos, niveles y compras con posición, tipografía, contraste e iconos pertinentes. No dependas sólo del color.
- Todas las acciones deben funcionar con teclado y tener nombre accesible. Usa controles semánticos; los desplegables comunican su estado y los diálogos gestionan el foco.
- Comprueba 390, 834 y 1440 px sin desbordamiento horizontal, áreas táctiles de al menos 44 px y foco visible de 2 px con separación de 2 px.
- Respeta `prefers-reduced-motion`: sólo cambios de opacidad. Conserva el acceso directo al contenido principal.

## 6. Imágenes e iconos del juego

Las imágenes son parte de la lectura rápida del plan. Objetos, hechizos de invocador, campeones y runas deben usar los recursos del catálogo disponible cuando exista una correspondencia válida.

- Resuelve los recursos por identificadores del catálogo. Para contenido antiguo, admite una coincidencia exacta y validada por nombre; no adivines una imagen parecida.
- Mantén el nombre visible junto al recurso. Usa marcos y tamaños consistentes para evitar saltos al cargar.
- Ante un recurso desconocido o una imagen rota, conserva el texto y muestra un icono de respaldo. No dejes huecos ni sustituyas el recurso por arte inventado.
- Distingue inicio, compras principales y opciones situacionales. Muestra orden, coste o condición cuando corresponda y exista información validada.
- Los iconos decorativos no deben repetir innecesariamente el texto a lectores de pantalla; los que transmiten información necesitan una alternativa accesible.

## 7. Copy mínimo en todas las pantallas

Escribe en español claro, directo y consistente con el vocabulario del jugador. Cada texto debe ayudar a entender o completar una acción.

- Un título breve por propósito y una instrucción por paso. Elimina repeticiones entre título, subtítulo, etiqueta y ayuda.
- Los botones describen la acción: «Generar plan», «Usar captura», «Guardar». Evita frases promocionales o explicaciones dentro del botón.
- Usa etiquetas concretas y cortas: «Tu rol», «Jungla rival», «Sesiones», «Guía». Identifica los campos opcionales.
- No repitas nombres completos de habilidades en cada frase cuando la referencia ya esté clara.
- Un error explica qué ocurrió y cómo seguir. Sólo afirma que los datos se conservaron cuando sea cierto.
- Los estados de carga, copia y guardado deben confirmar lo que realmente está pasando. No muestres atajos que no funcionen.

La brevedad no elimina información necesaria para decidir: consumo de planes, posible coste tras cancelar, envío de capturas, límites de archivos, tratamiento de claves, borrado e incertidumbre del consejo. Tampoco elimina avisos legales o de Riot. Presenta esos mensajes en el momento pertinente y con el mínimo texto que conserve su significado.

## 8. Coherencia entre generación y presentación

Los consejos por rol, la evaluación del matchup y el papel en las peleas forman parte del mismo plan. No añadas llamadas pagadas para completar automáticamente una tarjeta o volver a abrir una sección.

Mantén alineados tipos, esquemas, instrucciones al modelo, recuperación de respuestas, interfaz y exportación. Valida las respuestas antes de mostrarlas; los fallbacks no deben convertir una respuesta insegura en contenido aceptado ni fabricar recomendaciones ausentes. Conserva la compatibilidad del historial y las invariantes de [AGENTS.md](../AGENTS.md).

Puntos de entrada para contribuir:

| Área                   | Referencias                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Navegación             | [Shell](../components/shell/app-shell.tsx) y [preferencia del sidebar](../components/hooks/use-sidebar.ts)   |
| Plan                   | [Componentes del plan](../components/plan) y [presentación compartida](../lib/coach-presentation.ts)         |
| Roles                  | [Etiquetas y contexto visual](../lib/role-focus.ts) e [instrucciones del coach](../lib/coach-role-policy.ts) |
| Contrato de respuesta  | [Tipos](../lib/types.ts), [validación](../lib/validation.ts) y [recuperación](../lib/coach-recovery.ts)      |
| Evaluación de consejos | [Calidad del coaching](coaching-quality.md)                                                                  |

### Entrega progresiva

- Objetivo: mostrar las elecciones de prepartida y el inicio en 3–5 segundos con un modelo rápido. Medir desde el clic, además del tiempo del proveedor; una muestra local no garantiza latencia de producción.
- Mostrar sólo campos completos que hayan pasado esquema, alcance y protección de secretos. No renderizar tokens sueltos, JSON, razonamiento ni frases a medio escribir.
- La lectura inicial es provisional: indicar que faltan detalles y guardar únicamente después de validar el resultado final. Un fallo, cancelación o cambio de cuenta retira el avance.
- Mantener los espacios de preparación e inicio durante el streaming y el resultado final. Emitir hechizos, compra inicial y runas completos antes de esperar niveles y mapa; validar pares, catálogo, presupuesto inicial y ranuras. Los detalles posteriores se agregan debajo. Nunca inventar una elección mientras se espera.
- Una sola llamada admitida: no generar un resumen con otro modelo ni reintentar automáticamente para completar secciones.
- No promover un modelo por velocidad o JSON válido solamente. Comparar también mecánicas, compras, condiciones y roles; publicar los límites del ensayo. Véase [la comparación de modelos rápidos](fast-coach-evaluation.md).

## 9. Criterios de aceptación

Antes de entregar un cambio, comprueba lo que corresponda a su alcance:

- La decisión principal se reconoce primero; el detalle no compite con ella.
- La navegación contraída, los desplegables y los controles siguen siendo comprensibles y accesibles.
- El copy es breve y conserva condiciones, costes y avisos necesarios.
- Los recursos del juego tienen nombre y fallback; no se inventan imágenes ni datos.
- El rol cambia el enfoque del consejo y su contribución al equipo. Se distingue información conocida de condiciones hipotéticas.
- El matchup explica razón y condición sin prometer resultados; el historial anterior sigue funcionando.
- Para interfaz: lint, tipos, `pnpm build` y revisión visual y con teclado a 390, 834 y 1440 px. Adjunta capturas sanitizadas.
- Para IA o validaciones: pruebas pertinentes y `pnpm eval:security`; usa proveedores simulados. Sigue las comprobaciones adicionales de [AGENTS.md](../AGENTS.md) si cambian imágenes, cuentas, cuotas o persistencia.
- Para cambios sólo de documentación: formato y enlaces. No hacen falta pruebas de la app.

Describe qué se verificó localmente, qué usó datos simulados y qué quedó sin comprobar. Un fixture demuestra presentación y comportamiento; no demuestra calidad táctica de una respuesta real ni funcionamiento en producción. Sigue [CONTRIBUTING.md](../CONTRIBUTING.md) para preparar y entregar la contribución.
