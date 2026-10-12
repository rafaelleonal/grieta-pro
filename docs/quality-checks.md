# Verificación local de calidad y seguridad de GrietaPro

Revisión del 10 de octubre de 2026, en macOS con Node.js 24.12.0 y pnpm 10.33.2.

| Comprobación                               | Resultado                  | Alcance                                                                                                             |
| ------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                        | Correcto                   | Prettier para código y documentación, excluyendo secretos y archivos generados.                                     |
| `pnpm lint`                                | 0 errores y 0 advertencias | Next.js, React, TypeScript, promesas y restricciones de importación en clientes.                                    |
| `pnpm typecheck`                           | Correcto                   | TypeScript estricto.                                                                                                |
| `pnpm test`                                | 116 pruebas correctas      | Validación, entradas y respuestas adversarias, imágenes, proveedores simulados, CSP y PWA.                          |
| `pnpm test:accounts`                       | 13 grupos correctos        | PostgreSQL temporal real, Better Auth, privacidad, recuperación, cuotas, concurrencia, idempotencia y contabilidad. |
| `pnpm build`                               | Correcto                   | Compilación de producción de Next.js 16.4.0.                                                                        |
| `pnpm audit --prod --audit-level=moderate` | Sin avisos conocidos       | Dependencias de producción según el registro consultado.                                                            |
| Auditoría completa                         | 1 aviso alto pendiente     | `braces` en herramientas de desarrollo; sin parche publicado, visible en la auditoría semanal.                      |

La prueba de 20 solicitudes concurrentes confirmó una sola reserva activa por usuario. La admisión previa al cuerpo de la petición y la reserva previa a Sharp se verificaron en las rutas reales. Las redirecciones HTTP 307/308 de OpenRouter no repiten el envío ni liberan automáticamente una reserva incierta.

En la compilación local de producción, el HTML respondió `private, no-store`; sus 11 scripts llevaban el mismo nonce que la CSP, sin `unsafe-eval`. El navegador abrió el plan de ejemplo, la entrada de fotos y el acceso sin errores ni advertencias. Las pantallas de 320 y 390 píxeles conservaron su ancho sin desbordamiento horizontal. Esta verificación utiliza un navegador con tamaño simulado; no acredita pruebas en un iPhone o Android físico.

Las pruebas de integración usan una base aislada y correo e IA simulados. No enviaron correo real ni consumieron saldo de OpenRouter. Los servicios reales dependen de completar las credenciales y el remitente verificado en `.env.local`; esta revisión no comprueba esas conexiones ni un despliegue público.

GitHub Actions y Dependabot están preparados, pero todavía no se ejecutaron en GitHub. El repositorio y su licencia aún no se han publicado. Consulta [Seguridad](../SECURITY.md) para el aviso pendiente y [Contribuir](../CONTRIBUTING.md) para reproducir las comprobaciones. Las pruebas reducen riesgos; no equivalen a una auditoría de penetración independiente ni garantizan seguridad absoluta.

## Iteración del handoff: 11 de octubre de 2026

Revisión de las vistas Selección y En partida, el formulario plegable y el nuevo contrato del plan. El historial conserva los planes del formato anterior, sin convertirlos en datos que no contenían.

| Comprobación              | Resultado             | Alcance                                                                                                                          |
| ------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`              | Correcto; 126 pruebas | Formato, lint sin advertencias, tipos estrictos y pruebas unitarias.                                                             |
| `pnpm eval:security`      | 34 casos correctos    | Entradas adversarias, restricciones del coach y validación de respuestas.                                                        |
| `pnpm test:accounts`      | 15 grupos correctos   | PostgreSQL temporal real, proveedores simulados, autorización, historial de ambos formatos, cuotas, concurrencia y contabilidad. |
| Compilación de producción | Correcta              | `pnpm build` en la etapa `builder` de Docker, aislada del servidor de desarrollo local.                                          |
| `git diff --check`        | Correcto              | Cambios sin errores de espacios.                                                                                                 |

La revisión visual utilizó el navegador integrado con tamaños simulados:

| Tamaño      | Resultado                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1920 × 1080 | Ambas vistas del ejemplo caben completas, incluido «Empezó la partida». El formulario abierto mantiene el plan visible sin desbordamiento. |
| 1024 × 768  | Ambas vistas conservan el ancho de pantalla; el contenido se desplaza verticalmente.                                                       |
| 390 × 844   | Selección sin desbordamiento horizontal.                                                                                                   |
| 360 × 800   | Selección, partida, preguntas y entrada de fotos sin desbordamiento horizontal.                                                            |

Se comprobó el cambio de fase con teclado, la posición estable de las compras y que los atajos no alteren la pantalla al abrir otra ventana. La pregunta fuera de LoL se rechazó antes de llamar al proveedor y conservó el texto para corregirlo. El control de copia mostró su confirmación; la lectura independiente del contenido del portapapeles no estuvo disponible. La entrada móvil mantiene foto, galería y el límite original de 30 MB.

El catálogo oficial de Riot se consultó en modo de lectura y correspondía al parche 16.20.1. Las runas, hechizos, objetos, referencias de campeones y progresiones de habilidades se validan contra los datos permitidos. El ejemplo sigue identificado como demostración y no acredita estadísticas de rendimiento.

Las capturas y el informe de medidas se guardaron localmente en `artifacts/qa/design-handoff/`, carpeta excluida de Git. Esta revisión no consumió créditos de OpenRouter, no envió correo real por Resend y no publicó un despliegue. Tampoco sustituye pruebas en teléfonos físicos ni una evaluación de las nuevas respuestas con modelos reales. No se repitió la auditoría de dependencias; el resultado del 10 de octubre sigue siendo evidencia histórica.

## Registro y primera consulta real: 11 de octubre de 2026

Se levantaron PostgreSQL, el buzón local y Next.js. Una cuenta sintética se registró sin invitación, recibió su enlace en el buzón y lo abrió; PostgreSQL confirmó `emailVerified=true`, y el navegador inició sesión con acceso Free. No se envió correo externo ni se alteró producción.

El primer envío real a OpenRouter con Haiku 5.5 recibió HTTP 400. La clave respondió correctamente a la consulta de estado y el modelo figura en el catálogo y sus endpoints. La respuesta fallida no informó coste, tokens ni identificador de generación: la solicitud conserva `UNKNOWN` y una reserva de USD 0.1135. Ese importe no acredita un cargo real. No se liberó la reserva ni se repitió automáticamente el POST.

El esquema enviado contenía límites de cadenas y arrays que [Claude no admite en su JSON Schema](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). Se adaptó el transporte y se conservaron los límites en la validación final de Zod y las comprobaciones del coach. Esto corrige una incompatibilidad concreta; la causa exacta del primer rechazo no se conservó en la respuesta segura mostrada por la app. La ventana de cuenta ahora diferencia una consulta en curso de una pendiente de confirmar.

Después del ajuste, `pnpm check` pasó 129 pruebas, formato, lint y tipos; `pnpm eval:security` pasó 34 casos. La compilación de producción pasó en la etapa `builder` de Docker, aislada de Next.js en desarrollo. Las pruebas nuevas comprueban el payload compatible y el rechazo de respuestas con longitudes o cantidades incorrectas.

Con autorización del usuario se hizo un segundo envío, desde otra cuenta sintética registrada y verificada mediante el buzón local. También recibió HTTP 400 sin coste, tokens ni identificador de generación. PostgreSQL confirmó dos cuentas verificadas, una solicitud `UNKNOWN` por cuenta y ningún plan en el historial. Las dos reservas permanecen intactas: USD 0.1135 por solicitud, USD 0.227 en total, sin que esto acredite un cargo real. No se ejecutó un tercer envío ni se cambiaron cuotas, modelos o políticas de autorización para evitar el bloqueo.

Se añadieron mensajes de diagnóstico fijos para complejidad del esquema, restricciones JSON, patrones y configuración de razonamiento. Sólo se inspeccionan campos de error permitidos y acotados; no se devuelve ni registra el error crudo del proveedor. Las pruebas incluyen mensajes con secretos y prompts sintéticos, rutas no permitidas y límites de tamaño. La versión final pasó `pnpm check` con 131 pruebas, `pnpm eval:security` con 34 casos y la compilación de producción en Docker. El diagnóstico nuevo aún no se ha comprobado mediante otra consulta real, y no permite deducir la causa exacta de los dos rechazos anteriores.

Las capturas y el informe sin secretos se guardaron en `artifacts/qa/real-flow/`. El registro, la verificación y el acceso local funcionan; la integración de generación real sigue pendiente de resolver el rechazo del proveedor. La app, PostgreSQL y el buzón quedan encendidos para la prueba del usuario. No se usó Resend ni se alteró producción.

## Luna y favoritos por posición: 11 de octubre de 2026

El modelo predeterminado cambió a `openai/gpt-5.6-luna`, confirmado en el catálogo público de OpenRouter. Se añadieron su política de tarifas, reservas y pruebas de combinaciones con imagen y búsqueda. Los modelos anteriores siguen permitidos según el plan. El seed normal conserva las políticas existentes; `pnpm db:seed --enable-default-model` agrega únicamente el modelo nuevo y actualiza la versión del plan si faltaba.

La preparación ahora empieza por el rol. Habituales es una lista editorial orientativa; Todos y la búsqueda global mantienen disponibles todos los campeones. Cada cuenta verificada puede guardar hasta doce favoritos por rol, incluidos campeones fuera de posición, y ordenar su prioridad. El servidor valida IDs, estructura y propietario; limita guardados antes de leer el cuerpo y usa versiones para rechazar sobrescrituras concurrentes. Las preferencias no consumen cuota de IA, no entran en los prompts ni se guardan en almacenamiento local o caché PWA.

| Comprobación              | Resultado             | Alcance                                                                                                                       |
| ------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Formato, lint y tipos     | Correctos; sin avisos | Código y documentación, reglas React y TypeScript estricto.                                                                   |
| `pnpm test`               | 140 pruebas correctas | Incluye filtros, prioridad, IDs del catálogo, validación de preferencias y reservas de Luna.                                  |
| `pnpm eval:security`      | 34 casos correctos    | Proveedores simulados, entradas adversarias y validación de salida.                                                           |
| `pnpm test:accounts`      | 17 grupos correctos   | PostgreSQL temporal, dos propietarios, sesión y origen, versiones concurrentes, límites, cascada y conservación de políticas. |
| Compilación de producción | Correcta              | Etapa `builder` de Docker con `pnpm build`, aislada de Next.js en desarrollo y sin secretos del entorno local.                |

La primera ejecución de las unitarias encontró una restricción del entorno al abrir el servidor HTTP local de prueba de redirecciones. La suite completa pasó al permitir ese puerto temporal; no se cambió ni omitió la prueba.

En el navegador integrado se verificaron guardado, prioridad, conservación tras recargar y volver a entrar, favoritos independientes por rol, búsqueda de un campeón fuera de posición y mantenimiento de las selecciones al cambiar de rol. Al salir desaparecieron los favoritos y otra cuenta sintética no los recibió. Los controles táctiles nuevos miden 44 × 44 píxeles.

| Tamaño simulado | Resultado                                                         |
| --------------- | ----------------------------------------------------------------- |
| 1440 × 1000     | Modelo Luna y selector con favoritos; sin desbordamiento lateral. |
| 768 × 1024      | Lista y prioridad visibles; sin desbordamiento lateral.           |
| 390 × 844       | Favoritos y controles táctiles; sin desbordamiento lateral.       |
| 320 × 800       | Selector estrecho con favoritos; sin desbordamiento lateral.      |

Las capturas se guardaron en `artifacts/qa/champion-preferences/`, excluida de Git. Se aplicó la nueva migración y se permitió Luna en Free/Pro únicamente en PostgreSQL local; se conservaron sus cuotas, presupuestos y las dos reservas inciertas anteriores. No se modificó la base alojada ni se publicó un despliegue. Next.js se reinició y los tres servicios locales siguen encendidos.

No se envió ninguna consulta pagada adicional: la compatibilidad real de generación con Luna queda pendiente de una prueba autorizada. La consulta al catálogo de OpenRouter fue pública y no utilizó la clave. El login RSO y la importación de maestría de Riot todavía no están implementados. Estas comprobaciones no acreditan teléfonos físicos ni producción. No se repitió la auditoría de dependencias, pues no se añadieron paquetes.

## Diagnóstico de OpenRouter: 11 de octubre de 2026

La consulta de lectura `GET /api/v1/key` respondió HTTP 200 con la clave del servidor: límite USD 50, límite restante USD 50 y consumo reportado USD 0. Es una lectura de la política y consumo de esa clave, no del saldo total comprado. PostgreSQL local confirmó que sólo existen los dos intentos anteriores de Haiku con HTTP 400, sin tokens, coste ni ID de generación informado. No había un intento con Luna y las reservas anteriores permanecieron intactas.

El error original completo no se conservó, así que su causa específica no puede reconstruirse desde los mensajes seguros. Se reprodujo el payload actual con fetch simulado y se contrastó con documentación primaria: no se confirmó una incompatibilidad nueva. El esquema del coach llega al máximo de 16 uniones admitido por Claude; un rechazo por complejidad interna sigue siendo una hipótesis, no un resultado observado.

Se añadió el evento JSON `openrouter_failure` del servidor: campos y categorías cerradas, HTTP real, operación, modelo permitido y duración acotada. No serializa errores crudos, prompts, notas, capturas, claves, headers ni identificadores externos. Distingue fallos de red, cancelación, cuerpo, HTTP, errores embebidos en HTTP 200, rechazos, truncado, JSON y validación final. La clasificación de parámetros sólo inspecciona campos acotados y devuelve textos fijos. El registro precede a la conciliación de consumo, sin mover el rechazo ni añadir reintentos; si falla el logger, no altera la llamada ni su contabilidad.

La versión pasó `pnpm check` con **149 pruebas**, formato, lint sin avisos y tipos; `pnpm eval:security` pasó **34 casos**. Nueve pruebas nuevas comprueban ausencia de filtraciones, categorías tipadas, límites, registro único, errores de HTTP 200, rechazo de salida y conservación de `onUsage` aun cuando el diagnóstico o la persistencia fallan. La compilación de producción pasó en Docker, aislada del servidor activo. `GET /api/status` local respondió HTTP 200 con Luna como modelo configurado.

Los informes seguros de lectura y payload están en `artifacts/qa/openrouter-diagnostics/`, excluida de Git. Hasta esta verificación no se ejecutó otra generación real: se solicitó autorización para un diagnóstico con saldo acotado. No se modificaron cuotas, presupuestos, autenticación, esquema de base ni producción; la integración de cuentas y la auditoría de dependencias no se repitieron porque esas áreas no cambiaron. Los servicios locales siguen activos. Consulta [cómo leer los logs](local-testing.md#diagnosticar-openrouter).

## Tres consultas reales con Luna: 11 de octubre de 2026

Con autorización para tres consultas y una reserva total máxima de USD 0.15, se creó una cuenta sintética Free mediante la interfaz, se confirmó el correo en el buzón local y se inició sesión. Las tres consultas fueron manuales, Ahri contra Yasuo en Mid/Oro, sin imagen ni búsqueda. OpenRouter respondió HTTP 200 en las tres; GrietaPro rechazó sus planes y no creó sesiones en el historial.

| Consulta | Resultado observado en el servidor                            | Coste informado por OpenRouter (USD) |
| -------- | ------------------------------------------------------------- | ------------------------------------ |
| 1        | `output_validation`; aún sin regla específica disponible      | 0.00767830                           |
| 2        | `alternative_runes`: par de árbol y runa alternativa inválido | 0.00268928                           |
| 3        | `summoner_spells`: pareja de hechizos inválida                | 0.00780465                           |

El total liquidado fue **USD 0.01817223**, con **USD 0.1404** de reserva acumulada prevista. Los tres registros quedaron `SETTLED`, con tokens y coste informado. Las dos reservas anteriores de Haiku siguen `UNKNOWN`; no se liberaron ni modificaron. El consumo agregado de la clave puede actualizarse después y no se usó para reemplazar la contabilidad individual.

Se añadió `validationCategory` al evento seguro: sólo doce reglas constantes del validador, sin valores del modelo ni errores crudos de Zod. El plan completo sigue rechazándose cuando falla una comprobación. Las instrucciones ahora incluyen un mapa compacto de pares de árbol y runa principal del catálogo utilizado, y permiten omitir la alternativa si no hay una razón concreta. La tercera consulta superó esa regla, pero falló después en los hechizos; no confirma un plan completo válido.

El ajuste posterior restringe ambos pares de hechizos, principal y alternativo, a un enum generado de los IDs actuales en el esquema enviado al proveedor. Conserva la tupla de dos elementos, la comprobación de IDs distintos, campos estrictos, alternativas opcionales y la validación completa de salida. No agrega uniones al esquema, reintentos pagados ni reparaciones de una respuesta rechazada. El esquema compartido y el catálogo no se mutan.

| Comprobación final                        | Resultado               | Alcance                                                         |
| ----------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| `pnpm check`                              | 155 pruebas; sin avisos | Formato, lint, tipos y unitarias con proveedores simulados.     |
| `pnpm eval:security`                      | 34 casos                | Entradas adversarias y protección de salida.                    |
| `pnpm test:accounts`                      | 17 grupos               | PostgreSQL temporal real, sesiones, cuotas, costes e historial. |
| `pnpm build` en etapa `builder` de Docker | Correcto                | Aislado de Next.js activo; sin copiar secretos locales.         |
| Generación real después del último ajuste | Pendiente               | Se agotaron las tres consultas autorizadas.                     |

Se conservaron la selección y el mensaje seguro de error en la interfaz. La captura y el informe de estas pruebas están en `artifacts/qa/openrouter-diagnostics/`, excluidos de Git. No hubo una cuarta consulta ni despliegue. La app, PostgreSQL y el buzón siguen disponibles en local. Los rechazos originales de Haiku continúan sin una causa específica recuperable; este diagnóstico acredita el problema de validación de Luna, no el de aquellos HTTP 400.

## Plan e historial confirmados con Luna: 11 de octubre de 2026

El usuario autorizó una consulta adicional, con tope USD 0.05, después del ajuste de hechizos. Se probó mediante la interfaz con la misma cuenta sintética Free: Ahri contra Yasuo en Mid/Oro, sin foto ni fuentes web. La reserva fue USD 0.0468 y OpenRouter informó **USD 0.00771770**, 21641 tokens de entrada y 1923 de salida. El plan completo pasó la validación, se mostró en la app y la contabilidad quedó `SETTLED`, sin fallo registrado ni solicitudes pendientes de esa cuenta.

Mis sesiones mostró exactamente un plan. Después de recargar la app, se abrió el mismo registro y se comprobaron la pantalla de selección y los consejos de niveles 1–6 en En partida. Una lectura restringida a PostgreSQL local confirmó un `CoachRecord` vinculado a esa consulta y propietario, con plan y metadata iguales a la respuesta de replay y `meta.formatVersion=2`. No se envió otra generación para recuperar el plan.

El reporte, log JSON con campos permitidos y capturas están en `artifacts/qa/openrouter-diagnostics/luna-confirmation.*` y `luna-confirmation-*.png`, excluidos de Git. No contienen claves, correos, IDs de usuario, cookies, prompts ni errores crudos. Las dos reservas antiguas de Haiku siguen intactas; no se modificaron producción ni políticas de gasto.

En esta comprobación sólo cambiaron documentación y evidencia local: se revisaron formato y diferencias. Las verificaciones de código de la sección anterior corresponden al mismo código probado; no se repitieron suites ni compilación sin cambios de implementación. Queda confirmado el flujo manual local con OpenRouter real y buzón local. Las capturas, búsqueda web, envío por Resend y despliegues siguen requiriendo su propia verificación.

## Resend local preparado: 11 de octubre de 2026

Se retiró `.env.local` por petición del usuario. Next.js arranca usando `.env`, con PostgreSQL local, registro abierto y Resend como transporte de correo. El remitente de esta prueba es `GrietaPro <onboarding@resend.dev>`. La comprobación local de `/api/account` responde 200 con cuentas y correo configurados.

Se reforzó el límite de errores de `lib/auth-mail.ts`: los fallos de URL, origen, HTTP, red, cancelación y timeout producen un error nuevo con texto fijo y sin causa privada. El envío exitoso conserva destinatario, enlace, un intento y ausencia de reintentos o fallback.

Comprobaciones actuales: 12 pruebas de correo/configuración, 17 grupos de integración de cuentas con PostgreSQL temporal y proveedores simulados, lint, tipos, formato, `git diff --check` y `pnpm build`: correctos. El servidor de desarrollo se restauró después de compilar.

La cuenta personal se creó desde el formulario local y el usuario confirmó que recibió el correo real de verificación. La última lectura de PostgreSQL mostraba la cuenta pendiente de verificar; el uso del enlace y el inicio de sesión aún no se han comprobado.

La clave de Resend utiliza permisos de envío: la consulta de correos devuelve `restricted_api_key`, por lo que la recepción se acredita mediante la confirmación del usuario, no mediante un evento de entrega consultado por API. Se conservaron sus permisos. No se enviaron mensajes adicionales durante esta revisión ni se incluyeron datos personales, claves o enlaces firmados en el informe.

## Modelo local y reserva fallida: 11 de octubre de 2026

Después de retirar `.env.local`, el `.env` principal todavía seleccionaba Haiku. La consulta personal de prueba recibió HTTP 400, sin coste ni identificador de generación, y conservó una reserva de USD 0.11350000 en estado `UNKNOWN`. El segundo clic no produjo otra llamada a IA.

Se configuró Luna en `.env` y se comprobó por `/api/status`. El aviso del botón ahora distingue consultas en curso de consumo pendiente de confirmar. Formato, lint del archivo, tipos mediante `pnpm build`, compilación y `git diff --check` pasaron. El servidor local se restauró.

El usuario confirmó que Activity mostraba únicamente las consultas previas de Luna, sin Haiku. El consumo informado por la clave coincidía exactamente con el gasto conocido del registro local. Con ese conjunto de evidencias se concilió manualmente sólo la petición HTTP 400 de esta cuenta con coste cero, usando `observeUsage` y `finishGeneration`: quedó `SETTLED`, se conservaron el fallo y su petición, y la cuenta quedó con cero pendientes. Se comprobaron los seis grupos de contabilidad y que las reservas inciertas anteriores permanecieran intactas. Esta decisión manual no introduce una regla general que libere reservas por HTTP 400, timeout o cancelación.

No se generaron nuevas consultas pagadas durante el diagnóstico. La generación posterior con Luna en esta cuenta aún queda por probar desde el navegador. El log sin entradas privadas está en `artifacts/qa/openrouter-diagnostics/local-failure.json`, excluido de Git.

## Conciliación automática y evaluación del coaching: 11 de octubre de 2026

La aplicación distingue trabajo activo de coste incierto. `UNKNOWN` conserva las seis reservas contables y deja de ocupar concurrencia; una intención diferente sigue sujeta a cuota y presupuesto. El mismo intento conserva su clave en memoria y el servidor reconoce una huella pendiente del mismo propietario incluso con otra clave. Una respuesta validada con coste incierto puede recuperarse por replay sin repetir la llamada al modelo.

La comprobación automática usa una ruta privada y lecturas de generaciones existentes. Exige ID coincidente, finalización y coste válido para liquidar una reserva. Falta de ID, 404, timeout o metadata inválida no acreditan coste cero. Los lotes y su rotación son persistentes y acotados; tres IDs antiguos no impiden comprobar el cuarto. Los cargos conocidos se cierran sin red aunque la capacidad compartida esté agotada, y las cuentas sin trabajo consultable no consumen esa capacidad.

Se recupera trabajo abandonado después de cinco minutos: una reserva nunca enviada se anula con protección contra envío tardío; un envío incierto mantiene sus fondos. La conciliación y una respuesta tardía pueden coincidir sin duplicar el cargo ni el historial. La eliminación del historial conserva su marca de borrado en cualquier estado e impide recuperar contenido privado.

| Comprobación             | Resultado                 | Alcance                                                                                                                                  |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`             | 175 pruebas; sin avisos   | Formato, lint, tipos y unitarias, incluidos intención por cuenta, replay incierto, metadata y rotación.                                  |
| `pnpm test:accounts`     | 25 grupos correctos       | PostgreSQL temporal real, proveedores simulados; concurrencia, seis reservas, resultados tardíos, borrado, BYOK, 404 y endpoint privado. |
| `pnpm eval:security`     | 34 casos correctos        | Proveedores simulados y controles de entrada/salida.                                                                                     |
| `pnpm build`             | Correcto                  | Compilación local con desarrollo detenido; servidor restaurado al terminar.                                                              |
| Interfaz desktop y móvil | Correcta en fixture local | Componentes y CSS reales, datos sintéticos, 1156 × 987, 390 × 844 y 320 × 800; sin desbordamiento, acciones de comprobación de 44 px.    |

La primera ejecución unitaria encontró `EPERM` al abrir el puerto local de la prueba HTTP; la suite completa pasó al permitir ese puerto. No se omitió ni debilitó la prueba. Las capturas de esta revisión corresponden al DOM actual, están en `artifacts/qa/reconciliation-ui/` y no contienen cuentas reales. La fixture comprobó cambio de estado, botón desactivado mientras se comprueba y el diálogo Mi cuenta, con cero llamadas de red; no sustituye una sesión real ni un teléfono físico.

No hubo consultas pagadas adicionales, envío de correo, cambios a la base persistente ni despliegue. El comando portable y la operación Docker están preparados para un programador externo; no se configuró un horario en un alojamiento. El comportamiento nuevo con OpenRouter real aún no se ha ejercitado. Las reservas antiguas sin identificador siguen requiriendo investigación manual; no se liberan por tiempo transcurrido.

La [guía de calidad](coaching-quality.md) propone hechos comprobables, una rúbrica táctica, veinte casos sintéticos y comparación ciega con revisores humanos. Es un protocolo futuro: no se ejecutó un benchmark ni se demostró superioridad de Luna, Sonnet u Opus. Se conserva Luna como predeterminado y las políticas existentes; Opus no está admitido. No se añadieron dependencias ni se repitió su auditoría en este cambio.

## Ajustes de preparación e historial: 11 de octubre de 2026

Se retiraron el lema lateral, el texto promocional del footer y la frase bajo Generar. El aviso legal ocupa el ancho del contenido. La tarjeta inicial y sus tres resúmenes usan textos breves; Equipos y notas explica cómo adaptar compras y mapa. Los selectores principales miden 80 px y sus opciones 56 px. Generar muestra un spinner, `aria-busy` y botón desactivado durante la consulta; el error tiene título de 15 px y explicación de 14 px.

Mis sesiones conserva filas para cualquier cantidad, ahora con ambas miniaturas, nombres, rol, rango, fecha y acción Abrir. El borrado mantiene su confirmación y controles desactivados durante la eliminación. No se modificaron autorización, carga, cursores, persistencia ni llamadas del proveedor.

`pnpm check` pasó formato, lint, tipos y 175 pruebas; `pnpm test:accounts` pasó 25 grupos con PostgreSQL temporal y proveedores simulados. `pnpm build` pasó con desarrollo detenido y el servidor local fue restaurado. El último ajuste CSS de altura móvil pasó formato y quedó incluido en la compilación. No se añadieron dependencias.

Una fixture aislada de Home y componentes reales verificó 1156 × 987, 390 × 844 y 320 × 800, sin desbordamiento. Se comprobaron una y tres sesiones, diálogo responsive, confirmación y Conservar, contexto opcional, selectores y estado de carga. El error simulado conservó Darius e Illaoi; el contador acreditó cero envíos reales a OpenRouter. Las capturas actuales están en `artifacts/qa/browser-comments-ui/`. La fixture y su pestaña se cerraron y se restauró el viewport. No se tocaron la cuenta ni el historial reales, no se gastaron créditos y no hubo despliegue. Esta revisión no acredita un teléfono físico ni la calidad táctica del plan.

## Darius contra Illaoi: diagnóstico sin nuevas generaciones

El 11 de octubre de 2026 se recuperó el diagnóstico seguro del intento señalado por el usuario: Luna respondió HTTP 200 tras 22 528 ms y la validación rechazó `phase_items`. Esa regla detectaba un ID válido en el catálogo dentro de `nowByPhase` que no pertenecía a `starting`, `core` ni `situational`. El mensaje genérico no acreditaba truncamiento. No se conservaron el JSON original ni los prompts y no se consultó contenido privado del proveedor para reconstruirlos.

`nowByPhase` sólo resalta compras ya propuestas. La corrección retira referencias huérfanas con un aviso fijo, mantiene los indicadores válidos y no añade objetos, prioridades, razones ni fases por su cuenta. Si no queda un destacado, conserva el array vacío. Estructura estricta, límites, contenido seguro, composición, runas, hechizos y orden de habilidades siguen comprobándose antes del filtro. El prompt explicita esta relación y permite `[]`; el texto copiado omite la línea de compra cuando no hay un destacado para esa fase.

Una regresión sintética Darius/Illaoi con Luna simulado acredita un plan de seis niveles, build intacta, aviso único, un POST, un dispatch y una observación de coste exacta. Las pruebas comprueban también orden, idempotencia de la sanitización, avisos independientes y rechazo de datos inseguros o excesivos antes de filtrar. No hay reintentos pagados ni cambios en contabilidad, reservas o políticas de gasto.

Comprobaciones actuales: `pnpm check` con 178 pruebas, `pnpm eval:security` con 34 casos, `pnpm test:accounts` con 25 grupos y `pnpm build`: correctos. El servidor local se restauró después de compilar. La auditoría de producción no encontró avisos; la completa conserva un aviso alto de `braces` en la cadena de desarrollo de ESLint, ya documentado en Seguridad y sin versión corregida indicada por el registro. No se ocultó ni ignoró ese resultado.

El diagnóstico y resumen seguros están en `artifacts/qa/openrouter-diagnostics/darius-illaoi-validation.json`, excluido de Git. No hubo nuevas consultas pagadas, cambios en la base persistente ni recuperación del plan original descartado. La corrección está confirmada con proveedores simulados; una generación posterior con Luna real requiere una prueba separada. Estos resultados locales no acreditan un despliegue ni la ejecución remota de GitHub Actions.
