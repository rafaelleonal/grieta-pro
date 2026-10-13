# ADR 0003 · Marca Elociencia y fuente de verdad visual

- **Estado:** aceptada, 12 de octubre de 2026.
- **Decisión de:** propietario del proyecto.

**Actualización:** la [ADR 0004 · Grafito](0004-paleta-grafito.md) sustituye los colores de interfaz del punto 3. El resto de las decisiones de marca continúa vigente.

## Decisión

1. La marca es **Elociencia** («La ciencia de subir de elo»), dirección A: la casilla «1 · El · elociencia». GrietaPro y «No Era el Jungla» están retiradas; no deben volver a aparecer en código ni interfaz.
2. **Fuentes de verdad:** `brand/elociencia/HANDOFF.md` y el lienzo de diseño que enlaza (Sistema de diseño, Escritorio, Tablet, Móvil). Ante una duda visual se consulta el lienzo, no se inventa.
3. **Colores:** lima `#c6f36b` sólo como acento de marca; violeta Nocturne `#9184d9` para la interfaz; tinta `#ecebf5`; fondo `#161826`. Sobre fondo claro el texto de acento es violeta 700 `#5d5294`, nunca lima. Ámbar = cuidado, verde = listo, rojo = peligro.
4. **Botón primario:** contorno de acento sobre `--color-accent-900`, nunca relleno sólido.
5. **Mascota:** siempre sobre disco lima o crema, o con borde de sticker; nunca directamente sobre `#161826` ni en «En partida».
6. **Rangos como elementos:** Fe, Cu, Ag, Au, Pt y C; Esmeralda, Maestro, Gran Maestro y Challenger usan casilla sin símbolo químico.
7. Recursos públicos (iconos PWA, favicons, imagen OG, mascota) se regeneran con `pnpm exec tsx scripts/generate-brand-assets.ts`; no se editan a mano.
8. Toda pieza pública incluye «No avalado por Riot Games».
