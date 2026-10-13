# ADR 0004 · Paleta Grafito

- **Estado:** aceptada por el propietario tras revisar la comparación Grafito / Nocturne.
- **Fecha:** 12 de octubre de 2026.
- **Motivo:** el propietario quiere iterar el diseño y señala la paleta de Resend como referencia.

## Decisión

Adoptar una base oscura neutra, inspirada en [Resend](https://resend.com). Los valores siguientes son tokens propios de Elociencia, no una transcripción de tokens oficiales de Resend.

| Uso               | Propuesta                |
| ----------------- | ------------------------ |
| Fondo             | `#0c0c0c`                |
| Sidebar           | `#090909`                |
| Superficie        | `#141414`                |
| Hover / selección | `#1d1d1d`                |
| Divisor           | `#2b2b2b`                |
| Borde de control  | `#737373`                |
| Texto principal   | `#ededed`                |
| Texto secundario  | `#a3a3a3`                |
| Marca             | Lima existente `#c6f36b` |

Primario con contorno neutro claro sobre superficie oscura, manteniendo la regla de evitar relleno sólido. El lima identifica la marca; no pinta cada acción. Verde, ámbar y rojo conservan su significado de estado, siempre acompañados de texto o icono. Mantener Inter para lectura del plan, los recursos reales del juego, navegación contraíble y detalle progresivo.

La comparación visual muestra un ejemplo de plan en Grafito y una referencia Nocturne. El contenido es ilustrativo: no valida un matchup ni sustituye el resultado real del coach. La referencia Nocturne representa la paleta actual, no una captura exacta de la app. El prototipo simplifica contenido para comparar jerarquía y color; la implementación debe conservar iconos de campeones, compras, runas y hechizos.

## Alcance

Esta decisión sustituye el punto 3 de la ADR 0003 para fondos, tinta y acento de interfaz. El handoff y los tokens centrales de Tailwind recogen la paleta vigente. Se mantienen marca, mascota, rangos y resto de reglas. Los estados seleccionados, foco, bordes de campos, botones, errores y fondos de imágenes deben conservar contraste; los divisores decorativos no sustituyen bordes de controles. `accent-*` conserva sus nombres técnicos por compatibilidad, pero ahora representa una escala neutra. El fondo de navegador y PWA se comparte en `lib/design-tokens.ts`, alineado con `--color-bg`.

Validar las pantallas a 390, 834 y 1440 px, contraste WCAG AA, teclado, reduced motion, lint, tipos y build. La aprobación inicial cubrió la implementación local de Grafito. Después de revisar el resultado, el propietario autorizó explícitamente el push. Los recursos exportados de marca conservan su identidad; esta iteración cambia la interfaz, no redibuja iconos ni imágenes sociales.
