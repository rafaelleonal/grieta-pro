# No Era el Jungla — marca

El símbolo es la hoja del rol de jungla con un tachón encima: «no fue el jungla». Usa el violeta de Nocturne, así que encaja con el resto de la interfaz.

## Archivos

| Archivo                                           | Uso                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `svg/logo-mark.svg`                               | Símbolo a color, fondo transparente                              |
| `svg/logo-mark-mono.svg`                          | Símbolo a una tinta (`currentColor`)                             |
| `svg/logo-horizontal.svg`                         | Símbolo + nombre, para fondo oscuro                              |
| `svg/logo-horizontal-light.svg`                   | Símbolo + nombre, para fondo claro                               |
| `svg/logo-stacked.svg`                            | Versión apilada («NO ERA EL / Jungla»)                           |
| `svg/app-icon.svg`                                | Icono de app con esquinas redondeadas                            |
| `svg/app-icon-maskable.svg`                       | Icono PWA _maskable_ (símbolo dentro de la zona segura del 80 %) |
| `svg/favicon.svg`                                 | Favicon simplificado (sin nervio, tachón más grueso)             |
| `favicon.ico`                                     | 16, 32 y 48 px                                                   |
| `png/icon-192.png`, `png/icon-512.png`            | Manifest PWA, `purpose: "any"`                                   |
| `png/maskable-192.png`, `png/maskable-512.png`    | Manifest PWA, `purpose: "maskable"`                              |
| `png/apple-touch-icon.png`                        | iOS, 180 px                                                      |
| `png/favicon-16/32/48.png`                        | Favicons sueltos                                                 |
| `png/logo-mark-512.png`, `png/logo-mark-1024.png` | Símbolo en mapa de bits                                          |
| `png/logo-horizontal.png`                         | Logotipo horizontal transparente (render con Inter)              |
| `png/social-avatar-400.png`                       | Avatar para redes                                                |
| `png/og-image.png`                                | Imagen social 1200 × 630 (Open Graph / X)                        |
| `source/og.html`, `source/wordmark.html`          | Fuentes para volver a generar los PNG con texto                  |

## Colores

| Token                       | Valor                  | Dónde                       |
| --------------------------- | ---------------------- | --------------------------- |
| Hoja                        | `#9184d9` (acento)     | Símbolo sobre oscuro        |
| Tachón                      | `#e7e5fe` (acento 200) | Símbolo sobre oscuro        |
| Fondo                       | `#161826`              | Iconos de app, OG           |
| «Jungla»                    | `#b5abfc` (acento 400) | Logotipo sobre oscuro       |
| Hoja y «Jungla» sobre claro | `#5d5294` (acento 700) | `logo-horizontal-light.svg` |

## Reglas

- Tipografía del nombre: Inter 600, tracking −0,02 em. Los SVG con texto usan la fuente instalada (Inter si existe, si no Helvetica o Arial). Para piezas finales usa los PNG o convierte el texto a trazos.
- Área de respeto: la mitad del ancho del símbolo por cada lado.
- Tamaño mínimo: 16 px con `favicon.svg`; 24 px con `logo-mark.svg`.
- No rotes el símbolo, no cambies la dirección del tachón y no lo pongas sobre arte de campeones sin una capa oscura.
- Mantén siempre visible el aviso «No avalado por Riot Games» en piezas públicas.

## Integración pendiente

Estos archivos todavía no reemplazan los de la app. Para usarlos haría falta:
copiar los PNG a `public/icons/`, sustituir `app/icon.svg` por `svg/favicon.svg`,
cambiar `name` y `short_name` en `app/manifest.ts`, y actualizar los textos «GrietaPro».
