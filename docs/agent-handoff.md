# Contexto para retomar Elociencia

Actualizado el **12 de octubre de 2026**. Esta instantánea permite continuar desde un clon nuevo sin depender del historial del chat. Comprueba el estado del código, los servicios y las credenciales antes de actuar; las verificaciones citadas son evidencia fechada.

## Continuación del 12 de octubre: lectura progresiva

**Diseño: Grafito aprobado e implementado localmente.** La [ADR 0004](adr/0004-paleta-grafito.md) actualiza los tokens de interfaz, navegación y PWA con neutros oscuros. Conserva lima de marca, colores semánticos y recursos del juego. Los controles tienen un borde distinto de los divisores y foco claro de 2 px + 2 px. Esta iteración no cambia generación, datos, cuotas ni activa Laminar.

[Verificación de Grafito](grafito-qa.md): 390/834/1440 px, teclado, contraste de tokens, `pnpm check` (259 pruebas) y build correctos. También se corrigieron los bordes anulados de botones y el encabezado móvil de preparación. El propietario autorizó el push de esta iteración después de revisar el resultado.

**Continuación: Laminar preparado en código.** [Configuración y límites](laminar.md): trazas opcionales con métricas explícitas y exportación después de responder; sin prompts, planes ni identidad. No hay claves configuradas ni recepción real validada. `pnpm eval:coach` reproduce la revisión sintética de seis casos, sin nuevas llamadas de IA; publicación explícita disponible para Laminar. No es una nueva validación táctica. El usuario autorizó publicar estos cambios y las correcciones de contexto pendientes; Flash sigue sin promoverse y Laminar permanece apagado por defecto.

**Correcciones de contexto y evaluación:** [evaluación táctica](tactical-coach-evaluation.md). Se incorporan tooltips detallados, alcance básico, referencias mecánicas por versión y veredicto incierto de bot sin parejas explícitas (avance y final). Se consumieron las **18 consultas adicionales autorizadas**, USD **0.39103050**; no repetir ni reutilizar esa autorización. Esfuerzo medio fue lento y se revirtió; Flash continúa con esfuerzo bajo y Pro sigue como predeterminado. Últimos seis: estructura completa, avance 2.843–5.268 s, pero errores factuales en Yasuo, Espinas y Sterak impiden promover Flash a predeterminado. No se ejecutaron los casos reservados. Ver el informe antes de continuar; mejorar sólo instrucciones no ha bastado.

Se añadió streaming de una sola generación, con prioridad y matchup validados antes del resto del plan. Gemini Flash 3.8 es una opción rápida; Gemini Pro sigue siendo el predeterminado. No se promueve Flash automáticamente: seis planes finales pasaron estructura, pero la revisión encontró imprecisiones tácticas. El [informe de evaluación](fast-coach-evaluation.md) conserva las 30 consultas, métricas, cambios de contexto y límites.

Puntos nuevos: `lib/provider-stream.ts`, `lib/coach-stream-response.ts`, `lib/client-coach-stream.ts`, `tests/coach-stream.test.ts` y `scripts/smoke-coach-stream.ts`. Los campos visibles deben permanecer iguales hasta el resultado final. El ID de proveedor se registra temprano para poder conciliar una cancelación. Las compras iniciales que suman más de 500 de oro se descartan por `starting_gold` sin inventar reemplazos.

Para habilitar Flash en planes existentes: `pnpm db:seed --enable-flash`, verificando antes la conexión. La opción no modifica cuotas, fondos, reservas ni el modelo configurado. Las llamadas pagadas de esta evaluación ya se consumieron; nuevas llamadas necesitan autorización. No confundir las capturas con reproducción local de respuestas grabadas con latencia o calidad en producción.

## Punto de entrada

1. Lee [AGENTS.md](../AGENTS.md), [README](../README.md) y la [skill de revisión](../.agents/skills/elociencia-review/SKILL.md) cuando el cambio afecte IA, cuentas, privacidad o gasto.
2. Revisa `git status`, `package.json` y los últimos commits. Usa TypeScript estricto, Node.js 24 y pnpm 10.33.2.
3. Usa las pruebas simuladas para reproducir problemas. No necesitan servicios ni claves reales. Un build correcto no confirma coaching real ni entrega de correo.
4. No imprimas secretos ni leas archivos de credenciales para incorporarlos a documentación. `.env*`, `.local/`, `artifacts/` y `generated/prisma/` están excluidos de Git.

## Producto y decisiones vigentes

- Coach educativo de LoL en español: rol primero, campeón y rival, rango y composición opcional. Todos los campeones permanecen disponibles fuera de posición.
- Favorecer consejos breves y ejecutables. No prometer estadísticas óptimas, victorias ni un rango Challenger acreditado.
- Resultado primero con **prioridad, ventana y qué evitar**; niveles, mecánicas, preparación y mapa se despliegan después. Preservar consejos válidos cuando falle un detalle.
- Entrada manual, texto y foto/galería móvil. El límite de 30 MB corresponde al archivo original; la imagen se optimiza antes de subir y se valida/recodifica en el servidor.
- Cuentas con Better Auth, correo verificado, historial privado y favoritos por rol. Invitación opcional en registro abierto; los planes Free/Pro y el rol de administrador son independientes.
- PWA instalada con HTTPS y caché exclusivamente pública; sin caché ni reintentos offline de IA.
- Prisma ORM + PostgreSQL estándar: se puede alojar la app fuera de Vercel. La facturación de suscripciones aún no está implementada; Pro se concede por invitación o cortesía.

## Implementación que ya se publicó

Los últimos commits de implementación antes de este documento fueron:

| Commit    | Resultado                                                                         |
| --------- | --------------------------------------------------------------------------------- |
| `90450ed` | Gemini Pro por defecto con razonamiento y gasto acotados.                         |
| `75688ef` | Recuperación de secciones independientes de respuestas incompletas.               |
| `42cb8fe` | Consejo central primero, detalles opcionales y recuperación sin nueva generación. |

El contrato pide un plan **completo**: `brief`, 6 `levels`, 2–3 `reactions.linea`, `build` (inicio, núcleo, situacionales, runas, hechizos y habilidades) y 2–3 `macro`. La validación local conserva IDs del catálogo, habilidades legales y límites de texto. `skillOrder.max` se guarda como `Q > E > W`. No se exigen títulos, resúmenes duplicados, fases extensas ni alternativas de preparación.

Claude recibe ahora el contrato fijo `compact-v1` de `lib/coach-transport.ts`, con campos nombrados y sin enums de catálogo. El contrato JSON se incorpora al prompt; no se solicita `response_format` al proveedor porque su compilador rechazó también el contrato nombrado simplificado. La app analiza JSON y aplica esquemas estrictos, seguridad y validación semántica antes de mostrar o guardar datos. No se persiste el marcador de transporte. Gemini y OpenAI conservan su esquema estricto en el proveedor. La reducción previa a una sola unión no bastó: producción registró otro `schema_complexity` con Opus el 12 de octubre a las 22:15 UTC.

Los planes completos usan formato 2; los recuperados, formato 3; el formato 1 antiguo sigue siendo legible. `meta.partial.invalid` distingue rechazo de ausencia deliberada; el motivo `optional` no significa que haya fallado la consulta. La presentación de planes antiguos proyecta consejos del mismo registro, sin inventarlos ni consultar otra IA.

Cuando no llega consejo válido, la interfaz conserva la selección y ofrece comprobar estado o abrir el historial. Esas acciones no generan otra consulta. Si permanece un resultado anterior, se identifica como anterior. JSON cortado, contenido inseguro o una respuesta vacía no se convierten en consejos ficticios.

## Diagnóstico de IA del 12 de octubre

### Causas encontradas sin llamadas pagadas

- **Gemini incompleto:** el prompt declaraba opcionales niveles, mecánicas, compras y mapa y pedía omitirlos ante la duda; el modelo devolvía planes escuetos. La prioridad de habilidades era texto libre (`Q, E, W` se rechazaba).
- **Sonnet HTTP 400:** el esquema estricto tenía exactamente 16 uniones (`anyOf` con `null`), el máximo documentado por Anthropic, y tres `pattern` con cuantificadores `{0,39}`/`{0,59}`, que Claude compila en su gramática. Ahora hay 1 unión y ningún `pattern`. Los diagnósticos clasifican también «compiled grammar too large» como `schema_complexity`.

### Comparación real autorizada

El usuario autorizó 9 llamadas con tope de USD 3, una por caso, sin reintentos ni búsqueda, con la clave del servidor y catálogo vivo 16.20.1, mediante `.local/compare-models.ts` (excluido de Git; llama a `generateCoach` sin pasar por cuentas ni base de datos). Gasto confirmado por OpenRouter: **USD 1.308**. Los planes completos están en `artifacts/qa/model-comparison/2026-10-12/`.

| Modelo (esfuerzo medio) | Planes válidos completos | Coste medio | Latencia media |
| ----------------------- | ------------------------ | ----------: | -------------: |
| Gemini 3.1 Pro          | 3/3                      |   USD 0.090 |           29 s |
| Sonnet 5.5              | 1/3                      |   USD 0.106 |           21 s |
| Opus 5.5                | 3/3                      |   USD 0.240 |           54 s |

Sonnet: Ahri–Yasuo fue bloqueado por el filtro de seguridad de salida (el texto no se conserva, no se sabe si fue falso positivo) y en Jinx–Caitlyn se descartó un campo del `brief` por esquema, probablemente por longitud. Después se añadieron límites explícitos de caracteres al prompt; no se volvió a probar.

Lectura táctica de Darius–Yorick (una persona, no la rúbrica completa): Opus fue el más específico y correcto en interacciones del matchup; Sonnet, sólido pero más genérico; Gemini, correcto y más escueto. No es una evaluación estadística.

### Continuación recomendada

1. Añadir un identificador finito de la regla de seguridad que bloquea una salida, sin registrar el texto, para distinguir falsos positivos.
2. Decidir el modelo predeterminado con el usuario. Opus reserva USD 0.816 por consulta en curso (coste medido USD 0.24 con el prompt anterior); `pnpm db:seed --enable-opus` lo añade a Pro existente. Se aplicó a la base local y, el 12 de octubre, a Production por el usuario: Pro pasó a la versión 5 con Opus, sin cambiar Free ni presupuestos.
3. Evaluar con [la rúbrica](coaching-quality.md) más casos y revisores. Cualquier llamada real adicional requiere autorización con tope y número de llamadas.

Después de la comparación se compactó el prompt del coach: objetos deduplicados por nombre (se descartan variantes de otros modos como 323075), filas `[id, nombre, oro]` con efectos sólo en objetos completos, habilidades limitadas a 600 caracteres y estilos de runas sin repetir sus ranuras. El caso típico pasó de 84.8 KB a 51.6 KB y el peor medido es de 57 KB. La reserva del coach usa un límite propio de 72 000 bytes. El ahorro real no se ha medido con llamadas pagadas.

La reserva incierta de USD 0.454 de la prueba anterior de Sonnet sigue sin cambios.

### Continuación: formato Claude y Haiku max

El coach de Claude envía el contrato JSON en el prompt y lo valida en el servidor, sin solicitar la gramática estricta que rechazaba el proveedor. Haiku usa Messages con esfuerzo `max` y presupuesto de tarea de 40 000 tokens; sin esa señal agotó hasta 46 000 tokens sólo pensando. El presupuesto de 20 000 produjo estructura completa pero consejos pobres, por lo que se amplió. No equivale al límite duro: se conservan 46 000 tokens máximos y 240 segundos de timeout; la ruta reserva 300 segundos para todo el flujo. La reserva de consumo sin búsqueda es USD 0.187. Consulta [cuentas y consumo](accounts-and-usage.md).

La respuesta bruta puede superar el tamaño del plan por metadatos: se observó un cuerpo de 177 014 bytes. El lector permite hasta 512 000 bytes, respeta cancelación después de headers y no espera una limpieza de stream bloqueada. Los límites de texto del plan se mantienen; no se guardan pensamientos ni metadatos descartados. Capturas, modelo predeterminado y presupuestos persistidos siguen iguales.

La validación de estructura no valida la calidad táctica. Revisar por separado habilidades realmente aprendidas, interacción de kits, umbrales de ejecución, condiciones de pelea y builds sin estadísticas supuestas. La evidencia final de esta ronda está en [la revisión de interfaz y generación](uiux-plan-review.md).

## Archivos que conviene leer

| Área                                      | Archivos                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pantalla, estados y navegación            | `app/page.tsx`, `components/coaching-result.tsx`, `components/coaching-result.css`, `components/coach-brief.tsx`, `components/coach-failure.tsx` |
| Proyección sin otra llamada               | `lib/coach-presentation.ts`, `lib/types.ts`                                                                                                      |
| Proveedor, prompt y esquema de transporte | `lib/openrouter.ts`, `lib/coach-transport.ts`, `lib/provider-diagnostics.ts`                                                                     |
| Esquemas, seguridad y recuperación        | `lib/validation.ts`, `lib/coach-safety.ts`, `lib/coach-recovery.ts`                                                                              |
| Autorización, gasto e idempotencia        | `app/api/coach/route.ts`, `lib/generation.ts`, `lib/usage.ts`, `lib/generation-admission.ts`, `lib/reconciliation.ts`                            |
| Persistencia y planes                     | `prisma/schema.prisma`, `prisma/migrations/`, `scripts/seed-plans.ts`, `lib/history.ts`                                                          |
| Reproducciones simuladas                  | `tests/coach-brief.test.ts`, `tests/coach-recovery.test.ts`, `tests/openrouter.test.ts`, `tests/validation.test.ts`, `scripts/smoke-accounts.ts` |
| Diseño y propuesta de marca               | [handoff de pantallas](../design_handoff_coach_pantallas/README.md), [recursos de marca](../brand/README.md)                                     |

## Configuración y arranque

Las claves se obtienen del propietario o de su gestor privado. Este documento contiene nombres de variables, nunca sus valores. En la máquina de trabajo actual se usa `.env`; se eliminó `.env.local` por petición del usuario porque tenía prioridad sobre él. En un clon nuevo, conserva cualquier archivo privado existente antes de copiar `.env.example`.

| Variables                                                                             | Qué configurar                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`                                              | Clave del servidor y modelo permitido. Predeterminado: Gemini 3.1 Pro Preview con razonamiento medio; Pro también permite Sonnet según la política persistida. |
| `DATABASE_URL`                                                                        | PostgreSQL local en desarrollo; pooled de Prisma Postgres con TLS verificado en Production.                                                                    |
| `DIRECT_URL`                                                                          | Conexión directa para migraciones. No mezclar la administración de Production con la base local.                                                               |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`                | Secreto privado y orígenes exactos; HTTPS en Production.                                                                                                       |
| `RESEND_API_KEY`, `AUTH_EMAIL_FROM`                                                   | Proveedor y remitente. `onboarding@resend.dev` sólo sirve para pruebas al correo dueño de Resend; correo público requiere dominio verificado.                  |
| `AUTH_MAILPIT_URL`                                                                    | Buzón local opcional. Resend tiene prioridad si su clave está presente: usar un entorno local separado sin esa clave para el buzón.                            |
| `AI_MONTHLY_BUDGET_USD`, `AI_DAILY_BUDGET_USD`, `AI_FREE_POOL_USD`, `AI_PRO_POOL_USD` | Fondos compartidos y separados por plan; no son presupuestos individuales.                                                                                     |
| `APP_REGISTRATION_MODE`                                                               | `open` por defecto, invitación opcional; no desactivar la verificación.                                                                                        |
| `RIOT_API_KEY`                                                                        | Opcional, importación voluntaria de una partida activa; no se necesita para Data Dragon.                                                                       |
| `LEGAL_OPERATOR_NAME`, `LEGAL_CONTACT_EMAIL`, `LEGAL_CONTACT_ADDRESS`                 | Datos públicos del responsable, pendientes de completar/verificar para publicar los documentos legales.                                                        |

```sh
pnpm install --frozen-lockfile
```

Si no existen `.env` ni `.env.local`, copia `.env.example` a `.env` y configura sus valores privados. Para un entorno local nuevo:

```sh
pnpm db:local
```

Mantén ese proceso activo. En otra terminal, después de confirmar que `DATABASE_URL` y, si existe, `DIRECT_URL` apuntan a la base local:

```sh
pnpm db:setup
pnpm dev
```

La web local usa http://127.0.0.1:3000 y PostgreSQL local el puerto 55439. El buzón opcional se levanta con `pnpm mail:local` en el puerto 55441. Son instrucciones de desarrollo; no ejecutar `db:setup` contra Production por conveniencia. No aplicar `db push`, `migrate reset` ni migraciones durante el build.

La base alojada está en la cuenta de Prisma del propietario y se conecta a Vercel por variables privadas; no requiere su Marketplace. Usa [la guía de base y migraciones](database-deployment.md) para verificar el destino. Los planes iniciales nuevos son Free 10 análisis/mes, USD 1/día y 1/mes; Pro 50 análisis/mes, USD 2/día y 5/mes. `db:seed` conserva políticas existentes: leerlas antes de cambiarlas. No hay IA ilimitada.

## Evidencia y límites

Para la implementación `42cb8fe` se comprobaron localmente 200 pruebas unitarias, 34 evaluaciones de seguridad, 27 grupos de cuentas con PostgreSQL temporal y proveedores simulados, lint, TypeScript y build. Las fixtures de componentes reales comprobaron completo, limitado y sin respuesta en escritorio y móvil, y el resumen en tablet; sin desbordamiento horizontal ni llamadas reales.

[GitHub Actions de ese commit](https://github.com/rafaelleonal/grieta-pro/actions/runs/38280140047) pasó y Vercel lo publicó en https://grieta-pro.vercel.app/. Las lecturas públicas devolvieron HTTP 200, incluyeron los textos nuevos en el bundle y rechazaron historial anónimo con HTTP 401. Eso no demuestra que una consulta real o un correo nuevo funcionen hoy.

Las capturas e informes sanitizados de aquella máquina están en `artifacts/qa/value-first-ui/`, `artifacts/qa/openrouter-diagnostics/` y `artifacts/qa/sonnet-darius-yorick/`; no se publican con Git. Un clon nuevo debe usar este resumen y reproducir las comprobaciones, sin depender de esos archivos ni de scripts privados en `.local/`.

Para cambios de documentación basta comprobar formato y enlaces. Para cambios de IA, ejecutar las suites pertinentes y `pnpm eval:security`; si afectan persistencia o gasto, añadir `pnpm test:accounts`. Ejecutar `pnpm build` cuando cambie Next.js o runtime. No compilar sobre la misma `.next` mientras `pnpm dev` está activo; restaurar el servidor al terminar.

## Otros pendientes

- La marca es **Elociencia** (`brand/elociencia/`, dirección A «El»). El rediseño sigue `brand/elociencia/HANDOFF.md`; los recursos públicos se generan con `scripts/generate-brand-assets.ts`. Dominio, redes y registro de marca no están comprobados.
- Páginas legales en preparación; revisar contacto, domicilio completo, proveedores, regiones, retención y operación de solicitudes de privacidad. No tratar el texto publicado como aprobación jurídica.
- Riot: se implementan Account-V1 y Spectator-V5 para composición de partida activa. OAuth/RSO, maestría, historial Match-V5, asignación automática de rol y champion select no están implementados. Aprobación de producto público y monetización siguen siendo pasos separados.
- Docker/VPS están preparados en [su guía](vps-deployment.md); Netlify es una alternativa documentada, aún sin despliegue validado y con una espera que debe revisarse.
- Decisión de licencia open source y facturación de Pro pendientes; no inventar condiciones ni activar cobros.
