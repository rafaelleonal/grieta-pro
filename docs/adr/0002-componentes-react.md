# ADR 0002 · Componentes React por pantalla y lógica en hooks

- **Estado:** aceptada, 12 de octubre de 2026.
- **Decisión de:** propietario del proyecto, durante el rediseño de Elociencia.

## Contexto

`app/page.tsx` llegó a unas 2 000 líneas con más de 30 `useState`, llamadas a la API, borradores, imágenes, Riot y toda la presentación en un único componente. `components/coaching-result.tsx` supera las 1 400 líneas. Era difícil cambiar una pantalla sin riesgo de romper otra.

## Decisión

1. **Una pantalla, un componente.** Cada pantalla del lienzo (Preparar, Generando, Plan, Sesiones, Cuenta, Onboarding, Acceso, Cómo funciona, Instalar) vive en su propio archivo bajo `components/`, agrupado por carpeta cuando tenga piezas propias. `app/page.tsx` sólo compone el shell de navegación y decide qué pantalla mostrar.
2. **Componentes pequeños y enfocados.** Como guía, un archivo de componente no pasa de ~300 líneas; si crece, se extraen subcomponentes. Props tipadas con TypeScript estricto, sin `any`.
3. **Estado y efectos en hooks.** Las llamadas a la API, el borrador por cuenta, la generación con cancelación y el consumo viven en hooks (`components/hooks/use-*.ts` o junto a su pantalla). Los componentes de presentación reciben datos y callbacks.
4. **Buenas prácticas de React 19:**
   - Estado derivado se calcula en el render, no con `useEffect` + `setState`.
   - `useEffect` sólo para sincronizar con sistemas externos (red, almacenamiento, eventos del navegador) y siempre con limpieza (`AbortController`, `removeEventListener`).
   - Claves estables en listas (IDs, nunca el índice si el orden cambia).
   - Composición antes que props booleanas que se multiplican; variantes explícitas.
   - Server Components por defecto; `"use client"` sólo en la frontera interactiva.
   - Nada de secretos, claves personales ni lógica del proveedor en el cliente (ver invariantes de `AGENTS.md`).
5. **Accesibilidad como requisito:** elementos nativos (`<button>`, `<a>`, `<input>` con `<label>`), `aria-*` correctos, foco visible y navegación por teclado.
6. **Reutilizar antes de crear:** antes de escribir un componente nuevo se busca uno existente en `components/ui/` o `components/brand.tsx`.

## Consecuencias

- La migración se hace por fases, pantalla por pantalla, sin cambiar la lógica de cuotas, historial ni proveedor de IA.
- Las pruebas de lógica se mueven a los hooks y módulos de `lib/`; los componentes quedan finos.
