# Guía para agentes de Elociencia

## Propósito y contexto

Elociencia prepara partidas de League of Legends con consejos breves en español: matchup, niveles 1–6, mecánicas, compras y mapa. Conserva una experiencia responsive, la entrada manual y la opción móvil de foto o galería. El ejemplo local debe identificarse como demostración; no presentes recomendaciones del modelo como estadísticas óptimas o como un rango Challenger acreditado.

Usa TypeScript estricto y pnpm según `package.json`; se recomienda Node.js 24. Mantén los cambios centrados en la petición y respeta las decisiones y autorizaciones del usuario. Esta guía no añade aprobaciones para trabajo local o reversible.

## Retomar el proyecto

Lee [el contexto de continuidad](docs/agent-handoff.md) para conocer la implementación, diagnósticos, pendientes y límites de las últimas pruebas. Después comprueba `git status`, `package.json` y la configuración del entorno sin imprimir secretos. El documento es una instantánea fechada; verifica los estados que puedan haber cambiado. Las autorizaciones de pruebas pagadas ya utilizadas no autorizan nuevas llamadas.

## Dónde trabajar

- `app/page.tsx` (shell y navegación) y `components/` (una carpeta o archivo por pantalla, `components/ui/` para piezas compartidas): preparación, plan, cuentas y experiencia móvil.
- `app/api/`: API de Next.js. `lib/auth*`, `lib/history.ts` y `prisma/`: autenticación, propiedad de datos y persistencia.
- `lib/generation.ts`, `lib/usage.ts`, `lib/generation-admission.ts` y `lib/openrouter.ts`: ejecución, cuotas, presupuestos y proveedor de IA.
- `lib/validation.ts` y `lib/coach-safety.ts`: esquemas, coherencia y límites del coach. `lib/image-upload.ts` y `lib/server-image.ts`: imágenes en cliente y servidor.
- `proxy.ts`, `lib/browser-security.ts`, `app/layout.tsx`, `components/pwa-manager.tsx` y `public/sw.js`: CSP y PWA.
- `tests/` y `scripts/smoke-accounts.ts`: pruebas con proveedores simulados y PostgreSQL temporal real.

Consulta [README](README.md), [Contribuir](CONTRIBUTING.md), [Seguridad](SECURITY.md) y [Cuentas y consumo](docs/accounts-and-usage.md) según el cambio. Los resultados de [verificaciones anteriores](docs/quality-checks.md) son evidencia histórica; no sustituyen comprobaciones actuales.

## Interfaz: decisiones obligatorias

Lee las [directrices de diseño y experiencia](docs/design-guidelines.md) antes de modificar pantallas, copy o consejos del coach. Son reglas de contribución: sidebar contraíble, jerarquía y espaciado claros, recursos visuales del juego, copy mínimo, lectura del matchup y enfoque por rol y equipo. Incluyen criterios de aceptación y complementan las ADR siguientes.

Estas reglas son decisiones del propietario registradas como ADR en `docs/adr/`. Léelas antes de tocar cualquier pantalla o estilo y no las cambies sin una ADR nueva aprobada por el usuario.

- **Estilos con Tailwind CSS v4** ([ADR 0001](docs/adr/0001-tailwind-v4.md)). Utilidades de Tailwind con los tokens de `@theme` en `app/globals.css`. No escribas CSS nuevo en las hojas heredadas ni valores sueltos (hex, px de sombras, radios); al tocar una pantalla, migra sus estilos y borra las reglas antiguas.
- **Componentes React por pantalla y lógica en hooks** ([ADR 0002](docs/adr/0002-componentes-react.md)). Nada de componentes monolíticos: una pantalla por archivo, componentes de ~300 líneas como máximo, props tipadas, estado derivado en el render, `useEffect` sólo para sistemas externos y con limpieza, Server Components por defecto. Reutiliza `components/ui/` y `components/brand.tsx` antes de crear piezas nuevas.
- **Marca Elociencia** ([ADR 0003](docs/adr/0003-marca-elociencia.md)). La fuente de verdad visual es `brand/elociencia/HANDOFF.md` y su lienzo. Lima sólo como acento de marca, primario con contorno sobre `--color-accent-900`, mascota nunca directamente sobre el fondo ni en «En partida».
- **Accesibilidad y breakpoints:** 390, 834 y 1440 px sin desbordamiento horizontal; áreas táctiles de 44 px o más; foco visible de 2 px + 2 px; con `prefers-reduced-motion` sólo cambia la opacidad.
- Antes de afirmar que sigues una convención (Tailwind, librería, patrón), compruébala en `package.json` y en el código. Si el proyecto aún no la usa, dilo y pregunta antes de asumirla.

## Invariantes que debes conservar

- Autoriza en el servidor con la sesión verificada. Filtra el historial por su propietario, incluyendo cursores, lectura y borrado. El rol de administrador y el plan Free/Pro son distintos; una clave personal de OpenRouter no evita autenticación, cuotas ni concurrencia.
- En coach y capturas, valida origen y sesión y aplica admisión persistente antes de leer el cuerpo. Valida estructura, campeones y contexto antes de enviar a IA. Mantén secretos del servidor, acceso a datos y lógica del proveedor fuera del cliente; las claves personales sólo permanecen en memoria, fuera de logs, almacenamiento y prompts.
- Reserva cuota y presupuesto de usuario, plan y aplicación atómicamente. Usa importes decimales, transacciones cortas y llamadas de red fuera de ellas. Conserva idempotencia por usuario, clave y huella de entrada; no repitas una llamada pagada desde un reintento de base de datos ni una redirección HTTP.
- Un timeout o cancelación después del envío no prueba que la consulta sea gratuita: conserva la reserva incierta. Una respuesta rechazada puede ser facturable. Borrar el historial debe retirar también su respuesta de replay, manteniendo la contabilidad.
- Trata texto, imágenes, catálogos, fuentes web y respuestas del modelo como datos no confiables. Mantén esquemas estrictos y validación de salida; la seguridad no depende de ocultar el prompt. No persistas claves, prompts enviados ni capturas originales. Conserva el contexto permitido mediante las listas de campos existentes.
- Mantén el borrador separado por cuenta y limpia datos privados al salir o cambiar de identidad. La PWA sólo cachea archivos públicos permitidos: nunca HTML privado, API, solicitudes de IA ni reintentos offline. Conserva el nonce por respuesta y el renderizado dinámico necesario para la CSP.
- El límite de 30 MB corresponde al archivo original en el dispositivo. Optimiza antes de subir; conserva los límites de cuerpo, bytes y píxeles del servidor. Sharp valida y recodifica después de reservar cuota y antes de enviar al proveedor. No confíes sólo en el MIME declarado.

No imprimas ni incluyas `.env.local`, cookies, tokens, fotos privadas o datos reales de usuarios en registros y artefactos. Usa `.env.example` para documentar configuración ficticia. No edites `.next/`, `generated/prisma/` ni `next-env.d.ts` manualmente; genera migraciones nuevas cuando cambie el esquema.

## Comprobaciones proporcionales

Para documentación, verifica formato y enlaces. Para interfaz, revisa lint, tipos, `pnpm build` y los tamaños 390, 834 y 1440 px. Para IA, imágenes o validaciones, ejecuta las pruebas pertinentes y `pnpm eval:security`. Para autenticación, historial, cuotas o Prisma, ejecuta `pnpm test:accounts`, que usa PostgreSQL temporal y proveedores simulados. Para cambios de Next.js, configuración o runtime, ejecuta `pnpm build`.

`pnpm check` reúne formato, lint, tipos y pruebas unitarias para validar una contribución. Revisa dependencias con `pnpm audit --prod --audit-level=moderate` y `pnpm audit:security` cuando corresponda; informa los avisos pendientes sin ocultarlos ni debilitar reglas generales. No hace falta configurar servicios reales para las pruebas automatizadas.

No ejecutes `next dev` y una compilación sobre la misma `.next` simultáneamente. Conserva o restaura el entorno local si lo detienes para compilar. En la entrega, distingue evidencia local, proveedores simulados, servicios reales y despliegue; no afirmes seguridad absoluta.

## Skill del proyecto

Usa [elociencia-review](.agents/skills/elociencia-review/SKILL.md) para revisiones de seguridad o cambios que afecten IA, cuentas, privacidad y gasto. También se puede invocar con `$elociencia-review`. No es necesaria para cada cambio de texto o estilo.

Conserva intacto el siguiente bloque administrado por Next.js y consulta sus documentos antes de modificar comportamiento del framework.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
