# Revisión de la pantalla del plan · 12 de octubre de 2026

Alcance inicial: pantalla de resultado de la captura del propietario y navegación que la contiene. Revisión del código actual, lectura de la captura y comprobaciones locales. La petición posterior amplía la revisión de copy al resto de pantallas; no implica una auditoría visual completa de todas ellas.

## Hallazgos y correcciones

| Categoría     | Prioridad | Problema comprobado                                                                              | Corrección                                                                                                                                                        |
| ------------- | --------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navegación    | Alta      | Sidebar fijo de 232 px sin control para recuperar espacio.                                       | Botón para contraer/expandir en escritorio; preferencia local sin datos personales. Riel de tablet y navegación inferior móvil conservados.                       |
| Jerarquía     | Alta      | El enfrentamiento, retratos, rol y rango se repetían en dos cabeceras.                           | Una sola cabecera con título del matchup y acción de editar.                                                                                                      |
| Información   | Alta      | No se respondía si el jugador tiene ventaja o quién contrarresta a quién.                        | Lectura inicial con valoración, motivo y condición que puede cambiarla.                                                                                           |
| Información   | Alta      | Era posible confundir una dificultad genérica con una valoración del matchup.                    | Cinco estados explícitos: ventaja, eres su counter, el rival es tu counter, equilibrado y sin determinar. Los planes antiguos no reciben una valoración inferida. |
| Legibilidad   | Media     | Párrafos demasiado anchos en escritorio y poca separación entre señal y respuesta.               | Contenedor acotado, prioridad con ancho de lectura limitado y bloques separados de ventana/riesgo.                                                                |
| Densidad      | Media     | Equipos con un solo campeón y “4 por definir” ocupaban espacio antes de los consejos.            | Composición secundaria desplegable sólo si aporta contexto adicional, incluyendo parejas de bot.                                                                  |
| Interacción   | Alta      | Un único “Ver detalles” abría un bloque muy extenso.                                             | Secciones independientes para niveles, reacciones, preparación, mapa y composición.                                                                               |
| Consistencia  | Media     | Los formatos completo, parcial y antiguo tenían estructuras de navegación distintas.             | Una estructura común que presenta todos los consejos disponibles y explicita ausencias.                                                                           |
| Interacción   | Media     | Preguntar y copiar dependían de iconos sin etiquetas visibles.                                   | Acciones con texto y confirmación accesible de copia. La pregunta explica que consume una nueva consulta.                                                         |
| Información   | Media     | Fuentes sólo accesibles bajo determinadas condiciones y al final del detalle expandido.          | “Fuentes y alcance” siempre disponible; enlaces seguros y ausencia de citas explícita.                                                                            |
| Información   | Media     | “RIOT 16.20.1” con estado verde podía interpretarse como parche comprobado o aprobación de Riot. | “Catálogo”, alcance orientativo y aviso de no aval de Riot visibles.                                                                                              |
| Información   | Baja      | “37 planes” no decía si era consumo, total o saldo.                                              | “37 restantes”.                                                                                                                                                   |
| Accesibilidad | Alta      | No había enlace para saltar la navegación; varios controles heredados eran menores de 44 px.     | Enlace al contenido, controles de al menos 44 px, foco visible y desplegables nativos operables con teclado.                                                      |
| Responsive    | Media     | Cabecera sin ajuste suficiente a tablet y bloques de lectura en columnas demasiado estrechas.    | Barra adaptable; contenido de tablet y móvil en una columna; dos columnas sólo en escritorio.                                                                     |
| Mantenimiento | Media     | Resultado monolítico de 1488 líneas y 1628 líneas de CSS heredado.                               | Componentes pequeños para lectura, detalle, preparación, acciones y exportación; utilidades Tailwind con tokens existentes; retirada de la hoja heredada.         |

## Contrato del matchup

La valoración procede del mismo análisis, no de una llamada adicional. El servidor valida el enum y los textos antes de mostrarlos. El prompt exige perspectiva del jugador, interacción de habilidades, rol/rango y condiciones; distingue una ventaja moderada de un counter estructural. No pide winrates ni presenta datos estadísticos inexistentes. Sin contexto suficiente, usa “Sin determinar”.

La recuperación descarta una valoración inválida sin destruir los demás consejos. El filtro de seguridad revisa también ese contenido antes de recuperar secciones. Los planes ya guardados siguen siendo legibles y no se regeneran automáticamente.

## Verificación

| Comprobación                          | Evidencia local                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Formato, lint, TypeScript y unitarias | `pnpm check`; suite actual sin fallos. Incluye contrato, recuperación y renderizado de formatos antiguo/parcial.       |
| Seguridad                             | `pnpm eval:security`: 34/34; proveedor simulado.                                                                       |
| Compilación                           | `pnpm build` completado; página temporal de QA retirada.                                                               |
| Escritorio 1440 px                    | Menú expandido/contraído, persistencia tras recarga, sin desbordamiento.                                               |
| Tablet 834 px                         | Riel, una columna de lectura, niveles desplegados, sin desbordamiento.                                                 |
| Móvil 390 px                          | Navegación inferior, lectura, compras y diálogo; sin desbordamiento.                                                   |
| Interacción                           | Copia incluye matchup; seguimiento simulado; Enter abre detalles; Escape cierra diálogo y devuelve foco; foco de 2 px. |
| Áreas táctiles                        | Todos los botones y resúmenes visibles de la fixture midieron al menos 44 px de alto.                                  |

Capturas locales en `artifacts/qa/plan-redesign/` (excluidas de Git): `desktop.jpg`, `desktop-collapsed.jpg`, `tablet.jpg` y `mobile.jpg`. Son componentes reales con datos sintéticos; el selector “Estado de prueba” no forma parte de la app. La fixture se conserva en `.local/qa-plan-fixture.tsx` para reproducirla, fuera de las rutas publicables.

La primera ejecución restringida falló al abrir un puerto temporal; la suite pasó con el permiso de ejecución local adecuado. La compilación también se repitió fuera de esa restricción. No se modificaron autenticación, base de datos, cuotas ni contabilidad. No se probaron consultas autenticadas contra IA real, calidad táctica del nuevo prompt con modelos reales ni despliegue. No se realizaron llamadas pagadas adicionales. Push y despliegue pendientes de confirmación del propietario.

Criterios de accesibilidad contrastados con las [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), adaptados a las ADR del proyecto y al español de la interfaz.

## Segunda revisión: jerarquía, espaciado e imágenes

Correcciones adicionales solicitadas por el propietario:

| Categoría             | Problema                                                                             | Corrección                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jerarquía visual      | La prioridad, el riesgo y varios títulos tenían un peso similar al texto secundario. | Mayor tamaño, peso y contraste; contorno de acento en prioridad, tono ámbar en riesgo y etiquetas visibles para ventanas por nivel.                                                                 |
| Espaciado             | Separaciones pequeñas entre títulos, explicaciones y elementos del mismo grupo.      | Padding coherente en tarjetas, gaps de 12–24 px según contexto y separación de 32 px entre bloques de preparación, con utilidades Tailwind.                                                         |
| Reconocimiento visual | Hechizos, runas, situacionales y compras por fase aparecían sólo como texto.         | Imágenes reales del catálogo de 44/56 px, nombres siempre visibles, runa clave destacada, ramas identificadas y secuencia de habilidades en casillas. Icono de respaldo si falta o falla la imagen. |

Comprobación visual con datos sintéticos a 390, 834 y 1440 px: sin desbordamiento horizontal; controles visibles de al menos 44 px; imágenes de objetos, hechizos, ramas y runas cargadas. El servidor de desarrollo conservaba módulos anteriores durante la recarga en caliente; al reiniciarlo, la nueva navegación dejó de registrar errores de hidratación.

Capturas adicionales: `artifacts/qa/plan-redesign/items-tablet.jpg`, `spells-mobile.jpg` y `runes-desktop.jpg`. La fixture sigue siendo temporal y está fuera de las rutas publicables. No cambió el contrato del proveedor ni se realizaron llamadas de IA.

## Copy mínimo en las demás pantallas

Se redujeron títulos, instrucciones, ayudas, botones y estados de preparación, captura, generación, bienvenida, perfil, cuenta, conexión de IA, sesiones, acceso, registro, recuperación, verificación, instalación y modo sin conexión. Navegación consistente: Coach, Sesiones, Guía y Cuenta; la acción de empezar otra preparación se llama Nuevo plan.

| Categoría    | Problema                                                                    | Corrección                                                                                                                                                       |
| ------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Redundancia  | Títulos y botones repetían toda la selección o el propósito de la pantalla. | «Generar plan», «Usar captura», «Guardar», «Recuperar contraseña».                                                                                               |
| Densidad     | Ayudas de varias frases para acciones simples.                              | Una instrucción breve, con límites y campos opcionales visibles.                                                                                                 |
| Consistencia | Distintas etiquetas para fuentes y navegación.                              | «Fuentes web», «Sesiones», «Guía» y «Nuevo plan».                                                                                                                |
| Precisión    | La guía anunciaba atajos que el código actual ya no implementa.             | Sólo se documenta Ctrl/⌘ + Enter para generar.                                                                                                                   |
| Confianza    | Riesgo de borrar información útil al acortar textos.                        | Se conservan coste posible al cancelar, cuota por pregunta, reserva pendiente, procesamiento de fotos por OpenRouter, privacidad de claves y efecto del borrado. |

Los documentos legales y el aviso oficial de Riot mantienen su contenido. No se cambian autenticación, cuotas, persistencia ni peticiones al proveedor.

Revisión local de preparación a 834 px, guía a 1440 px, captura y acceso a 390 px, cuenta con datos ficticios a 390/1440 px y perfil a 834 px: sin desbordamiento horizontal. Se comprobó la transición a recuperación sin enviar correos. Capturas en `artifacts/qa/minimal-copy/`; la ruta temporal de demostración se retiró antes de compilar. Las pruebas usan proveedores simulados; no hubo llamadas pagadas ni publicación.

## Enfoque por rol y peleas de equipo

La prioridad del rol y el trabajo en las peleas aparecen antes del matchup. El nuevo bloque divide la decisión en preparación, función y alternativa si no conviene pelear. La lectura del matchup permanece, sin equiparar ventaja de duelo con victoria del equipo. Jungla muestra «Primeras rutas» y soporte «Dúo y salidas»; el detalle y el texto copiado usan el mismo contexto.

Añadir equipos pasa a un acceso visible en preparación, sin duplicarlo en el pie ni hacerlo obligatorio. En resultados se indica composición parcial y cuántos campeones se conocen. Se mantienen los campos validados, la lectura de planes antiguos y una sola solicitud al proveedor. Criterios y límites en [calidad del coaching](coaching-quality.md#enfoque-por-rol-y-juego-de-equipo--12-de-octubre-de-2026).

Evidencia local: 227 pruebas unitarias y 34 de seguridad con proveedores simulados; resumen de jungla a 1440 px, soporte a 834 px y ADC a 390 px sin desbordamiento. Cambio de rol y apertura de equipos comprobados en la preparación real. El servidor de desarrollo conservó HTML anterior durante la actualización; al reiniciarlo, una navegación nueva no registró errores de hidratación. Capturas de demostración en `artifacts/qa/role-focus/`; ruta temporal retirada antes de compilar. Ninguna llamada pagada ni push.
