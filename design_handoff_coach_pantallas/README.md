# Handoff: Coach de partida — Selección de campeones + En partida

> **Prompt para Codex:** "Implementa en `cholo-coach` (Next.js) las dos pantallas descritas en `design_handoff_coach_pantallas/README.md`. Las referencias visuales son los HTML de esta carpeta. Sigue el orden de la sección *Plan de implementación*. Corre `pnpm check` al terminar."

## Overview
Este rediseño cambia el resultado del coach (`components/coaching-result.tsx`) para leerlo de un vistazo en un **segundo monitor de 1920×1080**. Todo cabe en pantalla, sin scroll ni acordeones. El resultado se divide en dos pantallas del mismo plan:

1. **Selección de campeones**: qué runas, hechizos, orden de habilidades y compra inicial elegir, con una alternativa según la composición.
2. **En partida**: cuatro cuadrantes fijos (¿Qué hago? · ¿Qué compro? · ¿Cómo respondo? · ¿Cuándo pego?) para las fases Línea, Mid game y Late.

Las dos pantallas comparten la cabecera: selector de pantalla, matchup, titular del plan y los 10 campeones de la composición.

## About the Design Files
Los archivos de esta carpeta son **referencias de diseño hechas en HTML**: muestran el aspecto y el comportamiento esperados. No son código de producción para copiar. La tarea es **recrearlos en el código existente** (Next.js 16 + React, `app/page.tsx`, `components/coaching-result.tsx`, CSS plano como `coaching-result.css`) con sus patrones actuales. Iconos: el diseño usa Phosphor; en la app puedes usar `@phosphor-icons/react` o, si prefieres no añadir dependencias, el equivalente más cercano de `lucide-react` (ya instalado).

Para abrir las referencias, abre `GrietaPro - Pantallas.dc.html` en un navegador. Muestra las dos pantallas lado a lado y son interactivas. `GrietaPro - Coach.dc.html` es la pantalla individual. Sus props `screen="select"|"game"`, `phase` y `form` controlan el estado inicial. Todo el contenido es de **ejemplo** (Ahri vs. Yasuo, sin IA, sin verificar).

## Fidelity
**Alta fidelidad.** Colores, tipografía, espaciado e interacciones son finales. El diseño adopta el sistema **Nocturne** (tokens abajo) para toda la app: sidebar, topbar, formulario y plan. Reemplaza las variables de `app/globals.css` (`--bg`, `--panel`, `--blue`, `--lime`…) por los tokens Nocturne y la fuente Arial por Inter.

---

## Layout general (1920×1080, igual en ambas pantallas)

- **Sidebar** 218px, fondo `--color-bg`. Borde derecho de 1px `--color-divider` que se desvanece en los extremos (gradiente 48px). Mismo contenido que hoy: marca GrietaPro, "TU ESPACIO DE JUEGO", 5 items de navegación, tarjeta "Cada decisión cuenta.", estado de OpenRouter y perfil.
  - Item activo: fondo `--color-accent-900`, texto `--color-accent-200`, icono `--color-accent`, punto de 5px.
- **Topbar** 56px, padding 0 24px, regla inferior que se desvanece. A la izquierda el breadcrumb "Tu espacio › League of Legends". A la derecha, el chip del modelo, la etiqueta "RIOT 16.20.1" y el botón de ajustes. **El encabezado de página "Entra a la Grieta con un plan." se elimina cuando hay un plan**, para ganar alto.
- **Main**: padding 20px, `display:flex; gap:16px`.
  - **Formulario contraído por defecto cuando hay plan**: es un riel de 60px (fondo `--color-surface`, radio 14px). De arriba abajo contiene:
    - botón para expandir;
    - retrato de tu campeón (36px), "vs" y retrato del rival;
    - icono de la línea y el rango;
    - contador "👥 8" (la composición está completa);
    - botón de editar al final.
  - **Formulario expandido**: 340px, el formulario actual con estilo Nocturne. Cuando se expande, "¿Qué hago?" oculta el texto largo de los pasos y deja solo la frase corta, para que todo siga cabiendo.
  - **Panel del plan**: `flex:1`, fondo `--color-surface`, radio 14px, padding 18px 26px 22px.

### Cabecera del panel (compartida)
**Fila 1** (`flex; align-items:center; gap:12px`):
1. **Selector de pantalla**: pastilla con fondo `--color-bg`, padding 3px, radio 8px y 2 pestañas.
   - "Selección de campeones" con icono `users-three` y tecla **S**.
   - "En partida" con icono `sword` y tecla **P**.
   - Pestaña activa: fondo `--color-surface`, texto `--color-accent-200`, `inset 0 0 0 1px --color-accent`. Pestaña inactiva: `--color-neutral-400`. Tamaño 13.5px/500.
2. Matchup: retratos de 30px (radio 7px), "Ahri" (15/500), "vs." (12, neutral-500), "Yasuo", "Mid · Oro" (13, neutral-400).
3. Etiqueta **Ejemplo**, solo si `sample`. Va en ámbar (colores abajo). Al hacer clic muestra u oculta la advertencia completa en una línea.
4. Alineado a la derecha:
   - **solo en "En partida"**: pestañas de fase con borde `--color-divider`, "Línea (Nv. 1–6) [1] · Mid game (Rotaciones) [2] · Late (Peleas) [3]". La activa lleva tinte de acento al 10%, texto accent-200 y anillo de acento;
   - botones fantasma de icono: "Preguntar al coach" (atajo `/`) y "Copiar plan" (cambia a ✓ durante 2.2 s).

**Fila 2** (margin-top 18px, `flex; gap:48px`):
- A la izquierda, el titular (`headline`, 30px/500, letter-spacing -0.02em) y debajo `winCondition` (16px, neutral-300, max-width 720px).
- A la derecha, la **franja de composición**: una cuadrícula de 2 filas, "TU EQUIPO" y "RIVALES" (11px, mayúsculas, tracking 0.08em, neutral-500).
  - Cada campeón: retrato de 40px, radio 8px, `box-shadow: 0 0 0 2px <ring>` y una etiqueta de 11px debajo.
  - Marcas: **amenaza** = anillo y texto ámbar; **sinergia/objetivo** = anillo `--color-accent` y texto accent-300; **tú / tu rival** = anillo neutral-500; **sin marca** = opacidad 0.6, sin anillo, etiqueta neutral-500 con el rol.
  - El `title` (tooltip) explica por qué está marcado.

Debajo va el **cuerpo** de la pantalla activa, con margin-top 18px, que ocupa el resto del alto. Cada cuadrante es una tarjeta con fondo `--color-bg`, radio 8px y padding 16px 22px. El título del cuadrante va a 21px/500 con un icono de 22px en `--color-accent`.

---

## Pantalla 1 — Selección de campeones
Cuadrícula `1.15fr 1fr` × `1fr 1fr`, gap 14px. Debajo, una franja de notas y el CTA.

**¿Qué runas?** (columna izquierda, ocupa las 2 filas). Subtítulo "Página recomendada". Dentro, dos columnas `1.25fr 1fr`, gap 36px:
- **Primaria**: icono del árbol (28px) y su nombre (14px, neutral-300).
  - **Runa clave**: icono de 80px, circular, fondo `--color-surface`, anillo de 2px en acento. Nombre a 28px/500; el motivo debajo a 14.5px en neutral-400.
  - 3 runas menores: icono circular de 44px y nombre a 17px/500, gap 12px.
- **Secundaria**: árbol y 2 runas menores con el mismo estilo.
  - "FRAGMENTOS": 3 filas, cada una con un círculo de 26px (icono en accent-300) y el texto a 15px.
- **Alternativa** (pegada abajo, con una regla que se desvanece encima):
  - Etiqueta "ALTERNATIVA" y la condición en ámbar con mini retratos de 22px, p. ej. "Si Lee Sin juega a mid desde nivel 3".
  - Runa clave alternativa: icono de 52px, nombre a 18px/500 y el árbol en 13px; motivo a 14px.

**¿Qué hechizos?** (arriba a la derecha).
- Recomendados: 2 iconos de 60px (radio 9px, anillo de acento) con el nombre debajo (14/500), y el motivo a 15px en neutral-300.
- Abajo, la **Alternativa** con su condición en ámbar, 2 iconos de 42px, los nombres "Destello + Teleportación" (16/500) y el motivo.

**¿Con qué salgo?** (abajo a la derecha).
- "HABILIDADES · NIVEL 1 A 6": 6 celdas de 44px (radio 8px, fondo surface, letra a 18/600) con "Nv. n" debajo. La celda de R va con fondo accent-900, texto accent-200 y anillo. Al lado, "Después: máximo **Q → W → E**".
- "COMPRA INICIAL · 450 oro": objetos de 48px con anillo de acento, nombre (15/500) y oro.

**Franja inferior**: "POR SU COMPOSICIÓN" y chips con fondo `--color-bg` y padding 9px 14px. Cada chip lleva mini retratos de 24px, el título (14/500, ámbar o acento según la marca), una flecha y la acción a 14px en neutral-300. A la derecha va el botón primario (con contorno) **"Empezó la partida → [P]"**, que cambia a la pantalla En partida.

## Pantalla 2 — En partida
Cuadrícula de 2×2, filas `1.32fr 1fr`, gap 14px. **Las compras no se mueven entre fases**; solo cambia qué se resalta.

**¿Qué hago?** Subtítulo "Por nivel", "Rotaciones" o "Peleas". Leyenda a la derecha: "Tu ventana" (acento) y "Cuidado" (ámbar).
- Cuadrícula de 2 columnas (gap 2px 26px). Cada paso tiene:
  - una barra vertical de 3×40px a la izquierda con el color de la ventaja: acento = tu ventana, ámbar = cuidado, neutral-800 = parejo;
  - el número a 28px/500 (accent-300, ámbar o texto, según la ventaja);
  - la frase corta (`cue`) a 19px/500, el chip de habilidad (12/600, fondo accent-900, texto accent-300) y mini retratos de 24px de los campeones implicados;
  - el texto completo a 14.5px en neutral-400, que se oculta cuando el formulario está abierto.
- Línea tiene 6 pasos (niveles 1–6); Mid y Late tienen 4 pasos cada una.

**¿Qué compro?** Subtítulo "Build orientativa".
- Fila con Inicio (64px), una flecha y el orden 1→2→3 (64px, con un círculo numerado de 22px en la esquina), cada uno con nombre y oro.
- Abajo, después de una regla, los objetos situacionales: icono de 48px, nombre, motivo corto ("Si te buscan", "Si compran RM") y mini retratos de 22px de los campeones que los justifican.
- **Lo que toca comprar en la fase actual**: opacidad 1 y anillo de 2px en acento. El resto: opacidad 0.5 y anillo neutral-800.

**¿Cómo respondo?** Reacciones de la fase. Cada fila lleva retratos de 32px del campeón que provoca la situación, el disparador (17/500) y la respuesta (14.5px, neutral-400), separadas por reglas que se desvanecen.

**¿Cuándo pego?** Subtítulo "Claves de Yasuo · nv. 1".
- Cuadrícula de 2 columnas. Cada fila: tecla (36×34, fondo surface, accent-300), nombre (16/500), enfriamiento alineado a la derecha (17/500, cifras tabulares) y una nota a 13.5px con mini retratos opcionales (p. ej. "Solo si te lanzan:" + Malphite, Rakan, Lee Sin).
- Pegada abajo, una caja **Evita** con fondo ámbar oscuro, icono `shield-warning` y el texto de la fase.

---

## Interactions & Behavior
- **Teclado** (se ignora mientras se escribe en un input o textarea):
  - `S` → Selección; `P` → En partida;
  - `1`/`2`/`3` → En partida con la fase Línea, Mid o Late;
  - `/` → abre "Preguntar al coach" y enfoca el input;
  - `Esc` → lo cierra.
- **Preguntar al coach**: popover anclado arriba a la derecha (520px, fondo surface, `--shadow-lg`).
  - Contiene la etiqueta "¿Algo cambia en tu partida?", un input "¿Y si me campean?" (máximo 1000 caracteres), el botón "Preguntar ↑" (deshabilitado si está vacío) y la ayuda "Cada pregunta genera un nuevo análisis. · Esc para cerrar".
  - Reutiliza `onFollowup` de hoy.
- **Copiar plan**: mantén `copyPlan()`, pero añade las secciones nuevas (selección, composición, fases).
- **Formulario**: se contrae automáticamente al recibir un resultado. Se puede expandir y contraer con los botones del riel y de la cabecera del formulario.
- **Etiqueta Ejemplo**: alterna la advertencia completa (`meta.warnings`).
- **Hover**: los estados de botón vienen de Nocturne (`.btn-primary`, `.btn-ghost`, `.btn-secondary`). Foco: `outline: 2px solid var(--color-accent); outline-offset: 2px`.
- **Pantalla inicial**: "Selección de campeones" justo después de generar el plan. Opcional: si la importación con Riot ID detecta una partida activa, pasar sola a "En partida".

## State Management
`screen: 'select' | 'game'`, `phase: 'linea' | 'mid' | 'late'`, `formOpen: boolean`, `followupOpen`, `followup`, `warnOpen`, `copied`. Guarda `screen` y `phase` en `sessionStorage` para que no se pierdan al recargar.

## Data model — cambios en `lib/types.ts` (`CoachPlan`)
El diseño necesita campos nuevos. Hay que añadirlos al esquema estricto que valida la respuesta del modelo (`lib/generation.ts` / `lib/validation.ts`) y a `lib/demo.ts`.

```ts
type Edge = "tu" | "par" | "ojo";            // tu ventana · parejo · cuidado
type Mark = "threat" | "synergy" | "target";  // ámbar · acento · acento

interface Step { cue: string; text: string; edge: Edge; skill?: "Q"|"W"|"E"|"R"; champions?: string[] }
interface Reaction { trigger: string; response: string; champions: string[] }

interface CoachPlan {
  headline: string; difficulty: string; winCondition: string;
  levels: (Step & { level: string })[];         // 6 pasos, nivel 1–6
  phases: { mid: Step[]; late: Step[] };         // 3–4 pasos cada una
  reactions: { linea: Reaction[]; mid: Reaction[]; late: Reaction[] };  // reemplaza mechanics
  avoid: { linea: string; mid: string; late: string };
  enemyKeys: { key: string; name: string; cooldown: string; note: string; champions?: string[] }[];
  composition: { champion: string; team: "ally" | "enemy"; mark?: Mark; label: string; note?: string }[];
  compNotes: { champions: string[]; mark: Mark; title: string; action: string }[];
  build: {
    label: string;
    starting: string[]; core: string[];
    situational: { item: string; reason: string; champions?: string[] }[];
    nowByPhase: { linea: string[]; mid: string[]; late: string[] }; // IDs de objetos que se resaltan
    runes: {
      primary: { style: string; keystone: string; minors: [string, string, string] };   // keys de runesReforged
      secondary: { style: string; minors: [string, string] };
      shards: [string, string, string];
      why: string;
      alternative?: { style: string; keystone: string; when: string; why: string; champions?: string[] };
    };
    summoners: { pick: [string, string]; why: string;                  // IDs de summoner.json, ej. "SummonerFlash"
      alternative?: { pick: [string, string]; when: string; why: string; champions?: string[] } };
    skillOrder: { first6: ("Q"|"W"|"E"|"R")[]; max: string };
  };
  macro: string[];   // se mantiene para "Copiar plan"
}
```
`champions` usa los IDs de campeón de Data Dragon (`LeeSin`, `Kaisa`). Valida que existan en el catálogo y que pertenezcan a la composición enviada.

## Catálogo (`lib/catalog.ts`)
Añade junto a los objetos:
- `runesReforged.json` (`/cdn/{v}/data/es_MX/runesReforged.json`): mapa `key → { name, icon }`. Icono = `https://ddragon.leagueoflegends.com/cdn/img/{icon}`.
- `summoner.json` (`/cdn/{v}/data/es_MX/summoner.json`): `id → { name, image }`. Icono = `/cdn/{v}/img/spell/{id}.png`.
- Valida que las runas y hechizos del plan existan, igual que hoy con los objetos. Los fragmentos no están en Data Dragon; van como texto ("Fuerza adaptable", "Vida") con icono genérico.
- Actualiza `data/catalog-snapshot.json` con runas y hechizos para el modo de respaldo.

## Design Tokens (Nocturne)
| Token | Valor |
|---|---|
| `--color-bg` | `#161826` |
| `--color-surface` | `#232532` |
| `--color-text` | `#e9e9ed` |
| `--color-accent` | `#9184d9` |
| `--color-divider` | `color-mix(in srgb, #e9e9ed 16%, transparent)` |
| neutral 100–900 | `#f3f5fe #e4e7f5 #cfd3e5 #b2b6ca #9397ab #75798c #595d6c #3f424d #292b31` |
| accent 100–900 | `#f5f4ff #e7e5fe #d2cefd #b5abfc #968ae0 #796cbf #5d5294 #423a6a #2b2741` |
| Ámbar "cuidado" (no está en Nocturne; derivado en OKLCH) | barra/anillo `oklch(0.74 0.11 75)`, texto `oklch(0.85 0.08 78)`, fondo `oklch(0.25 0.03 75)`, borde de la etiqueta `oklch(0.45 0.07 75)` sobre `oklch(0.27 0.035 75)` |
| Radios | sm 4px · md 8px · lg 14px |
| Sombras | sm `0 0 0 1px #3f424d` · md `0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,.55)` · lg `0 0 0 1px #9397ab, 0 16px 40px rgba(0,0,0,.65)` |
| Tipografía | Inter 400/500/600. Títulos a 500 como máximo. Escala usada: 11 · 12 · 13.5 · 14.5 · 15 · 17 · 19 · 21 · 28 · 30px |
| Reglas | 1px `--color-divider` que se desvanecen 48px por lado: `linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)` |

Los botones primarios llevan contorno (borde de 1px en acento sobre transparente), nunca relleno. El archivo completo de tokens y clases está en `_ds/nocturne-87d988fd-cab1-477f-b3a2-a3e2da980d9a/styles.css`.

## Assets
- Retratos, objetos y hechizos: Data Dragon `16.20.1` (`/cdn/16.20.1/img/champion|item|spell/…`).
- Runas: `/cdn/img/perk-images/…`, a partir de `runesReforged.json`.
- Iconos de interfaz: Phosphor (regular) — `sword, crosshair, users-three, stack, shopping-bag, timer, magic-wand, flag-banner, circles-three-plus, shield-warning, warning, chat-circle-text, copy, check, caret-*, pencil-simple, arrow-right, arrow-up, lightning, heart`.

## Plan de implementación
1. Tokens de Nocturne e Inter en `app/globals.css`; reestilizar sidebar, topbar y formulario.
2. Ampliar `CoachPlan` y su validación, y actualizar `lib/demo.ts` con los datos de ejemplo (están en la clase JS de `GrietaPro - Coach.dc.html`: constantes `ALLIES`, `ENEMIES`, `PHASES`, `KEYS`, `SITU`, `PAGE`, `COMP_NOTES`).
3. Añadir runas y hechizos al catálogo y al snapshot.
4. Reescribir `components/coaching-result.tsx` con la cabecera compartida, `SelectScreen` y `GameScreen`, más los atajos de teclado.
5. Contraer el formulario y quitar el encabezado de página cuando hay resultado (`app/page.tsx`).
6. Actualizar el prompt del modelo para que genere los campos nuevos (frases cortas de 3 a 5 palabras en `cue`).
7. `pnpm check`.

## Files
- `GrietaPro - Pantallas.dc.html`: las dos pantallas lado a lado (ábrelo primero).
- `GrietaPro - Coach.dc.html`: la pantalla interactiva. Su clase JS contiene todos los datos de ejemplo y la lógica de estado.
- `support.js`: runtime necesario para abrir los `.dc.html` en el navegador.
- `_ds/nocturne-…/styles.css`: tokens y clases de Nocturne.
