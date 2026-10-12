# Handoff: rediseño Elociencia

## Prompt para el agente de código

> Implementa el rediseño de la app con la nueva marca **Elociencia**, siguiendo `brand/elociencia/HANDOFF.md`. Respeta `AGENTS.md` (invariantes de auth, cuotas, CSP/nonce, PWA, privacidad). Trabaja por fases y, al terminar cada una, ejecuta las comprobaciones de `AGENTS.md` que le correspondan: `pnpm check` siempre, `pnpm build` si tocas Next o la configuración, `pnpm test:accounts` si tocas Prisma, auth o cuotas, y `pnpm eval:security` si tocas IA o validación. No cambies la lógica de cuotas, historial ni el proveedor de IA salvo lo que pida este documento. Las referencias visuales están en el lienzo de diseño indicado abajo.

## Referencias

- **Lienzo de diseño (fuente de verdad visual):** https://claude.ai/artifact/CDbP9xtJMVHxx1qjBN2MXb. Es privado: si el agente no puede abrirlo, compártelo o exporta capturas.
  - Página **Sistema de diseño:** Fundamentos, Componentes, Patrones, Movimiento.
  - Páginas **Escritorio / Tablet / Móvil:** todas las pantallas.
  - Página **Marca → «Elociencia · 3 direcciones»**: se usa la **dirección A, el elemento «El»**.
- **Handoff anterior del plan de partida:** `design_handoff_coach_pantallas/README.md` (tokens Nocturne y pantallas de selección y en partida).
- **Mascota:** `elociencia.png` (original), `brand/elociencia/mascota/mascota-{1024,512,256}.png` (recortadas, cuadradas, fondo transparente) y `mascota-sticker-{lima,crema}.png` (con contorno para fondo oscuro). Reglas de uso en el lienzo, página **Marca → «Elociencia · marca final con mascota»**.
- **SVG de marca:** `brand/elociencia/svg/`. Se usan los `a-*`:
  - `a-lockup.svg`: logotipo horizontal.
  - `a-tile.svg`: casilla «1 · El · elociencia».
  - `a-icon-dark.svg` y `a-icon-lime.svg`: iconos de app grandes.
  - `a-icon-48.svg` y `a-icon-24.svg`: favicon e iconos pequeños.
  - Los `b-*` y `c-*` son alternativas descartadas; no se usan.
- **Marca antigua:** `brand/svg`, `brand/png`, `brand/favicon.ico` y `brand/source` son de «No Era el Jungla» (descartada). Bórralos cuando migres.

## Fase 1 · Marca

1. Renombra GrietaPro → **Elociencia** en todo el código:
   - `app/manifest.ts`: `name` «Elociencia — Tu coach de League of Legends», `short_name` «Elociencia».
   - Metadatos de `app/layout.tsx`, textos de UI y correos de `lib/auth-mail.ts`.
   - Documentos legales (`lib/legal-*.ts`, `app/privacidad`, `app/terminos`) y README.
   - Busca «GrietaPro» y «Grieta» con grep para no dejar ninguno.
2. **Iconos (ya generados, solo copiar):**
   - `brand/elociencia/png/icon-192.png` e `icon-512.png` → `public/icons/` (manifest `purpose: "any"`; mapache sobre lima).
   - `maskable-192.png` y `maskable-512.png` → `public/icons/` (`purpose: "maskable"`).
   - `apple-touch-icon.png` (180) → `app/apple-icon.png`.
   - `brand/elociencia/svg/favicon.svg` («El» sobre lima) → sustituye `app/icon.svg`; `brand/elociencia/favicon.ico` → `app/favicon.ico`.
   - Comprueba que `public/sw.js` sigue cacheando solo los archivos públicos permitidos.
3. **Imagen social (ya generada):** `brand/elociencia/png/og-image.png` (1200 × 630). Úsala como `app/opengraph-image.png` y `app/twitter-image.png`. Para regenerarla, la fuente está en `brand/elociencia/source/og.html`.
   - Logotipo con mascota: `png/logo-mascota.png` (fondo oscuro) y `png/logo-mascota-claro.png` (fondo claro). En la barra lateral usa el mapache sobre disco lima de 32 px más `svg/word.svg`.
4. **Mascota (mapache con monóculo):**
   - Es casi negra: nunca la pongas directamente sobre `#161826`. Colócala sobre un disco lima `#c6f36b` o crema `#f6efe2`, o añádele un contorno tipo sticker (lima o crema, unos 14 px a 1024).
   - Úsala en el onboarding (panel izquierdo), en estados vacíos (sin sesiones), en la carga del plan y en la imagen OG.
   - No la uses en «En partida».
5. **Colores de marca:**
   - Lima `#c6f36b` como acento de marca.
   - Tinta `#ecebf5`.
   - Violeta Nocturne `#9184d9` para la interfaz.
   - Fondo `#161826`.
   - Sobre fondo claro no uses lima para texto: usa violeta 700 `#5d5294`.

## Fase 2 · Tokens y componentes (`app/globals.css`, `components/`)

- Tokens Nocturne y escala de acento y neutros, como en el lienzo «Fundamentos».
- Ámbar para «cuidado», verde para «listo», rojo para «peligro».
- Radios 4/8/14 y foco de 2 px + 2 px.
- Botón primario: contorno acento sobre `--a900`, nunca relleno sólido. Secundario, fantasma, peligro e icono, con sus estados.
- Tokens de movimiento (lienzo «Movimiento»):
  - Duraciones de 120, 200, 350 y 600 ms.
  - Curva de salida `cubic-bezier(.2,.8,.2,1)`.
  - Con `prefers-reduced-motion`, solo cambios de opacidad.
  - Nada de animación en «En partida».

## Fase 3 · Pantallas

1. **Navegación:** sidebar de 232 px en escritorio (≥1200), riel de 76 px en tablet (768–1199) y barra inferior de 4 pestañas en móvil (Coach, Sesiones, Guía, Cuenta).
2. **Onboarding (primer inicio de sesión, todo opcional):**
   - Riot ID + servidor (los 9 de `lib/riot.ts`), luego «buscando» y luego «resultado» editable: rango, 2 posiciones y campeones favoritos.
   - Alternativas: «prefiero elegir a mano» y «saltar».
   - Backend nuevo:
     - League-V4 por PUUID para el rango.
     - Champion-Mastery-V4 (top) para los favoritos.
     - Posiciones deducidas con `lib/champion-roles.ts`, sin Match-V5.
   - Guarda rango y posiciones en el perfil reutilizando `lib/champion-preferences.ts`, con la propiedad de datos en el servidor.
3. **Preparar partida:**
   - El rango sale del formulario y pasa a un chip editable en el perfil.
   - El matchup ocupa toda la pantalla: tarjetas «Tú» y «Tu rival».
   - Cuadrícula de 20 campeones filtrada por línea, con los favoritos primero y búsqueda.
   - Lo opcional va en chips: resto de equipos, nota, Riot ID y fuentes actuales (Pro).
   - **Bot 2v2:** si la línea es ADC o Support, aparecen 4 tarjetas (tú, tu pareja, su ADC, su support). Las parejas son opcionales y la cuadrícula cambia al rol de la tarjeta activa. El esquema de validación (`lib/validation.ts`) y el prompt deben aceptar las parejas como contexto.
4. **Plan:** selección de campeones y en partida, según `design_handoff_coach_pantallas` y el lienzo. Incluye la versión de tablet en una columna y la de móvil con pestañas pegadas arriba.
5. **Generando:** pasos de progreso, skeleton y aviso de que cancelar puede consumir cuota (no lo trates como gratis; ver `AGENTS.md`).
6. **Mis sesiones:** lista agrupada por fecha, vista previa, filtros y borrado (el consumo no cambia).
7. **Cuenta:** consumo con barra, clave de OpenRouter (solo en memoria), perfil de juego (rango y posiciones) y privacidad.
8. **Acceso, Cómo funciona, Instalar (PWA) y aviso sin conexión:** según el lienzo.
9. **Casillas de rango como elementos:**
   - Fe 26, Cu 29, Ag 47, Au 79, Pt 78, C 6 (Hierro, Bronce, Plata, Oro, Platino, Diamante).
   - Úsalas en el onboarding, el perfil y los chips de rango.
   - Para Esmeralda, Maestro, Gran Maestro y Challenger no hay elemento: usa una casilla sin símbolo químico.

## Criterios de aceptación

- No queda ningún «GrietaPro» en código ni en la interfaz.
- Los iconos PWA son nuevos y el manifest es válido.
- La CSP con nonce sigue funcionando y la PWA sigue sin cachear HTML privado ni la API.
- Las pantallas funcionan a 390, 834 y 1440 px, con áreas táctiles de 44 px o más y foco visible.
- `pnpm check` y `pnpm build` pasan; también `pnpm test:accounts` si se tocó Prisma, auth o cuotas.
- La entrega separa lo verificado en local de lo que no se probó contra la API real de Riot.
