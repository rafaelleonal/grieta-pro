# ADR 0001 · Tailwind CSS v4 como sistema de estilos

- **Estado:** aceptada, 12 de octubre de 2026.
- **Decisión de:** propietario del proyecto, durante el rediseño de Elociencia.

## Contexto

La interfaz creció con hojas globales grandes (`app/globals.css`, `components/coaching-result.css`, `components/account.css`) que acumulaban capas de estilos superpuestas para los mismos elementos. Cambiar un botón exigía buscar varias reglas con distinta especificidad. El rediseño de Elociencia necesita un sistema coherente de tokens, estados y breakpoints.

## Decisión

1. Los estilos de la interfaz se escriben con **utilidades de Tailwind CSS v4** (`tailwindcss` y `@tailwindcss/postcss`, versión fijada en `package.json`), configurado según la guía de CSS de Next 16 (`postcss.config.mjs` + `@import "tailwindcss"`).
2. Los **tokens de diseño viven en `@theme`** dentro de `app/globals.css`: colores Nocturne y de marca, radios 4/8/14, tipografía Inter, duraciones y curvas de movimiento. No se escriben valores hexadecimales, tamaños o sombras sueltos en los componentes: se usa la utilidad del token o se añade el token.
3. Patrones repetidos con muchos estados (botones, campos, chips, avisos, casillas de rango) se definen **una vez** como componentes React tipados en `components/ui/` o, si sólo es estilo, con `@layer components` en `components/ui.css`. No se duplican cadenas largas de clases en varias pantallas.
4. **No se añade CSS nuevo** a las hojas heredadas. Al tocar una pantalla se migra a utilidades y se borran las reglas antiguas que dejan de usarse.
5. Estilos en línea (`style={{…}}`) sólo para valores realmente dinámicos (por ejemplo, el ancho de una barra de consumo).
6. Breakpoints del diseño: móvil `< 768 px`, tablet `768–1199 px` (riel de 76 px), escritorio `≥ 1200 px` (sidebar de 232 px). Áreas táctiles ≥ 44 px y foco visible de 2 px + 2 px.
7. Movimiento sólo con los tokens de duración (`120/200/350/600 ms`) y la curva de salida; con `prefers-reduced-motion` sólo cambia la opacidad. Nada de animación en «En partida».

## Consecuencias

- Una dependencia de desarrollo más; el CSS generado es estático y compatible con la CSP con nonce (no inyecta estilos en línea).
- La preflight de Tailwind convive con las hojas heredadas durante la migración; las reglas sin capa siguen teniendo prioridad hasta que se borran.
- Revisar en cada cambio de interfaz: `pnpm check`, `pnpm build` y los tamaños 390, 834 y 1440 px.
