# Contexto para retomar GrietaPro

Actualizado el **12 de octubre de 2026**. Esta instantánea permite continuar desde un clon nuevo sin depender del historial del chat. Comprueba el estado del código, los servicios y las credenciales antes de actuar; las verificaciones citadas son evidencia fechada.

## Punto de entrada

1. Lee [AGENTS.md](../AGENTS.md), [README](../README.md) y la [skill de revisión](../.agents/skills/grieta-pro-review/SKILL.md) cuando el cambio afecte IA, cuentas, privacidad o gasto.
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

El contrato que recibe el modelo solicita `brief` con `priority`, `window.trigger/response` y `avoid`. `levels`, `reactions.linea`, `build` y `macro` son opcionales. Ya no exige títulos, resúmenes duplicados, fases extensas ni alternativas de preparación. La respuesta completa se analiza por seguridad antes de omitir campos.

Los planes completos usan formato 2; los recuperados, formato 3; el formato 1 antiguo sigue siendo legible. `meta.partial.invalid` distingue rechazo de ausencia deliberada; el motivo `optional` no significa que haya fallado la consulta. La presentación de planes antiguos proyecta consejos del mismo registro, sin inventarlos ni consultar otra IA.

Cuando no llega consejo válido, la interfaz conserva la selección y ofrece comprobar estado o abrir el historial. Esas acciones no generan otra consulta. Si permanece un resultado anterior, se identifica como anterior. JSON cortado, contenido inseguro o una respuesta vacía no se convierten en consejos ficticios.

## Diagnóstico de IA que debe retomarse

### Gemini: Darius contra Yorick

La captura del usuario mostró consejo central y una omisión de **Orden de habilidades**. El log de Production confirmó HTTP 200 en aproximadamente 20 segundos, modelo `google/gemini-3.1-pro-preview`, categoría `output_validation` y regla `skill_order`.

Esa regla en `lib/validation.ts` revisa:

- Seis asignaciones legales de habilidades, incluyendo rangos máximos por nivel.
- R a partir de nivel 6 para campeones normales; excepciones explícitas para Udyr, Jayce, Nidalee, Elise y Aphelios.
- Una prioridad de tres habilidades básicas únicas. Hoy `max` es un string separado con `→` o `>`.

El campo original rechazado no se conserva. **No está demostrado qué condición concreta falló.** Una reproducción sintética confirma que `Q, E, W` se rechaza aunque los seis niveles sean legales; es una posible fricción de formato, no una reconstrucción de aquella respuesta. El nombre «Procesión Oscura» de la W de Yorick es correcto según Riot; no usarlo como supuesto fallo.

### Sonnet: única prueba real autorizada

El usuario autorizó **una** consulta con `anthropic/claude-sonnet-5.5`, sin búsqueda ni reintentos, con tope de USD 0.50. Esa autorización ya se utilizó.

- Cuenta local sintética Pro; sesión, admisión, reserva persistente y endpoint reales. No hubo cambios en Production ni correo real.
- Datos vivos de Riot 16.20.1 y habilidades de ambos campeones disponibles.
- Política vigente de Sonnet: razonamiento bajo, hasta 7000 tokens de salida, esquema estricto, sin proveedores alternativos.
- Un solo POST a OpenRouter. HTTP 400 en aproximadamente 1.85 segundos, diagnóstico `invalid_request`; sin consejo ni motivo más específico confirmado.
- El coste no vino confirmado ni hubo identificador de generación. Se conservó `UNKNOWN` con **reserva de USD 0.454** en la base local. No es un cargo confirmado ni prueba de gratuidad.
- Se retiraron las sesiones y el acceso Pro de prueba; se conservaron la cuenta sintética y su contabilidad. No borrar o liberar esa reserva sin evidencia.

Esto no permite concluir que Sonnet sea mejor o peor coach. No cambiar el predeterminado ni repetir la llamada por iniciativa propia para intentar obtener una comparación.

### Continuación recomendada

1. Precisar los diagnósticos de habilidades con códigos finitos que distingan prioridad/formato y progresión, sin registrar textos rechazados, prompts o razonamiento.
2. Evaluar un formato estructurado para la prioridad de habilidades, manteniendo lectura del historial anterior y las reglas de rangos legales. No quitar controles para aceptar un resultado.
3. Investigar el HTTP 400 de Sonnet: restricciones de esquema y parámetros del proveedor. La compatibilidad anunciada por el modelo puede variar entre endpoints; todavía no se conoce la causa exacta.
4. Reproducir esos casos con proveedores simulados. Cualquier comparación real posterior requiere autorización nueva, un tope y un número de llamadas explícitos.
5. Evaluar la calidad táctica con [la rúbrica](coaching-quality.md): hechos, condiciones del intercambio, utilidad y concisión. Formato válido y seguridad no acreditan buen coaching.

## Archivos que conviene leer

| Área                                      | Archivos                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pantalla, estados y navegación            | `app/page.tsx`, `components/coaching-result.tsx`, `components/coaching-result.css`, `components/coach-brief.tsx`, `components/coach-failure.tsx` |
| Proyección sin otra llamada               | `lib/coach-presentation.ts`, `lib/types.ts`                                                                                                      |
| Proveedor, prompt y esquema de transporte | `lib/openrouter.ts`, `lib/provider-diagnostics.ts`                                                                                               |
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

- `brand/` contiene recursos de **No Era el Jungla**, todavía sin integrar. La app, PWA y correos siguen usando GrietaPro. No considerar comprobadas disponibilidad de marca o dominio. La futura integración debe actualizar nombres, metadatos, iconos, manifiesto, correo y textos legales de forma coherente.
- Páginas legales en preparación; revisar contacto, domicilio completo, proveedores, regiones, retención y operación de solicitudes de privacidad. No tratar el texto publicado como aprobación jurídica.
- Riot: se implementan Account-V1 y Spectator-V5 para composición de partida activa. OAuth/RSO, maestría, historial Match-V5, asignación automática de rol y champion select no están implementados. Aprobación de producto público y monetización siguen siendo pasos separados.
- Docker/VPS están preparados en [su guía](vps-deployment.md); Netlify es una alternativa documentada, aún sin despliegue validado y con una espera que debe revisarse.
- Decisión de licencia open source y facturación de Pro pendientes; no inventar condiciones ni activar cobros.
