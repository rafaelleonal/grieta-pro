# Grafito · verificación local

12 de octubre de 2026. Implementación de la [ADR 0004](adr/0004-paleta-grafito.md), revisada con la demostración escrita Ahri vs. Yasuo y una sesión anónima en localhost. Sin consultas de IA ni cambios de cuentas.

## Resultado

- Preparación a 390, 834 y 1440 px: ancho del documento igual al viewport, sin desbordamiento horizontal. Capturas en `artifacts/qa/grafito/` (evidencia local excluida de Git).
- Sidebar contraído y expandido; navegación móvil y guía verificadas.
- Plan: sección de compras desplegable y recursos del juego conservados; sin imágenes rotas en la vista revisada.
- Acceso: campo de correo enfocado con teclado, contorno calculado de 2 px y separación de 2 px.
- Corregida la clase base de botones que anulaba los bordes de las variantes. El primario muestra ahora el contorno claro previsto por la ADR.
- Corregido el encabezado móvil: rango y captura en una fila propia. Selector de rango dentro del viewport (16–336 px a un ancho de 390 px).
- Movimiento reducido: regla existente conservada y revisada en código; no se simuló la preferencia del sistema.

## Contraste de los tokens

Ratios calculados según luminancia relativa sRGB. Son comprobaciones de estos pares, no una certificación completa de accesibilidad.

| Par                           | Ratio   |
| ----------------------------- | ------- |
| Texto principal / fondo       | 16.71:1 |
| Texto secundario / superficie | 7.30:1  |
| Placeholder / campo           | 6.37:1  |
| Borde de control / superficie | 3.89:1  |
| Foco / superficie             | 14.62:1 |

## Comprobaciones y límites

`pnpm check` pasó formato, lint, tipos y 259 pruebas. Después de las correcciones visuales finales se repitieron lint y tipos; `pnpm build` terminó correctamente. El servidor de desarrollo se detuvo durante la compilación y se restauró después.

No se validaron despliegue, coaching real, pagos ni recepción de trazas. Los consejos de la demostración no son evidencia táctica. El propietario autorizó publicar esta iteración después de revisar el resultado local; estas comprobaciones no acreditan el despliegue.
