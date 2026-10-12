# Elociencia — marca

«Elo» + «ciencia»: la ciencia de subir de elo. El símbolo es la casilla «1 · El · elociencia» de una tabla periódica; los rangos de League se muestran como elementos (Fe, Cu, Ag, Au, Pt, C).

El detalle de uso, colores y fases del rediseño está en [elociencia/HANDOFF.md](elociencia/HANDOFF.md).

| Archivo                                   | Uso                                                       |
| ----------------------------------------- | --------------------------------------------------------- |
| `elociencia/svg/a-lockup.svg`             | Logotipo horizontal sobre fondo oscuro                    |
| `elociencia/svg/a-tile.svg`               | Casilla «1 · El · elociencia»                             |
| `elociencia/svg/a-icon-lime.svg`, `-dark` | Iconos de app grandes                                     |
| `elociencia/svg/a-icon-48.svg`, `-24`     | Favicon e iconos pequeños (solo «El» sobre lima)          |
| `elociencia/svg/word.svg`, `word-light`   | Palabra «elociencia» para fondo oscuro o claro            |
| `elociencia/mascota/`                     | Mapache con monóculo; siempre sobre lima, crema o sticker |
| `elociencia/png/og-image.png`             | Imagen social 1200 × 630                                  |

Los `b-*` y `c-*` son direcciones descartadas. Los recursos públicos de la app se generan con:

```sh
pnpm exec tsx scripts/generate-brand-assets.ts
```

Colores: lima `#c6f36b` (acento de marca), tinta `#ecebf5`, violeta Nocturne `#9184d9` (interfaz), fondo `#161826`. Sobre fondo claro no uses lima para texto: usa violeta 700 `#5d5294`. La mascota es casi negra: nunca directamente sobre `#161826`.

Elociencia no está avalado por Riot Games.
