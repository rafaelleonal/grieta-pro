# Verificación local de calidad y seguridad de GrietaPro

Revisión del 10 de octubre de 2026, en macOS con Node.js 24.12.0 y pnpm 10.33.2.

| Comprobación                               | Resultado                  | Alcance                                                                                                             |
| ------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                        | Correcto                   | Prettier para código y documentación, excluyendo secretos y archivos generados.                                     |
| `pnpm lint`                                | 0 errores y 0 advertencias | Next.js, React, TypeScript, promesas y restricciones de importación en clientes.                                    |
| `pnpm typecheck`                           | Correcto                   | TypeScript estricto.                                                                                                |
| `pnpm test`                                | 116 pruebas correctas      | Validación, entradas y respuestas adversarias, imágenes, proveedores simulados, CSP y PWA.                          |
| `pnpm test:accounts`                       | 13 grupos correctos        | PostgreSQL temporal real, Better Auth, privacidad, recuperación, cuotas, concurrencia, idempotencia y contabilidad. |
| `pnpm build`                               | Correcto                   | Compilación de producción de Next.js 16.4.0.                                                                        |
| `pnpm audit --prod --audit-level=moderate` | Sin avisos conocidos       | Dependencias de producción según el registro consultado.                                                            |
| Auditoría completa                         | 1 aviso alto pendiente     | `braces` en herramientas de desarrollo; sin parche publicado, visible en la auditoría semanal.                      |

La prueba de 20 solicitudes concurrentes confirmó una sola reserva activa por usuario. La admisión previa al cuerpo de la petición y la reserva previa a Sharp se verificaron en las rutas reales. Las redirecciones HTTP 307/308 de OpenRouter no repiten el envío ni liberan automáticamente una reserva incierta.

En la compilación local de producción, el HTML respondió `private, no-store`; sus 11 scripts llevaban el mismo nonce que la CSP, sin `unsafe-eval`. El navegador abrió el plan de ejemplo, la entrada de fotos y el acceso sin errores ni advertencias. Las pantallas de 320 y 390 píxeles conservaron su ancho sin desbordamiento horizontal. Esta verificación utiliza un navegador con tamaño simulado; no acredita pruebas en un iPhone o Android físico.

Las pruebas de integración usan una base aislada y correo e IA simulados. No enviaron correo real ni consumieron saldo de OpenRouter. Los servicios reales dependen de completar las credenciales y el remitente verificado en `.env.local`; esta revisión no comprueba esas conexiones ni un despliegue público.

GitHub Actions y Dependabot están preparados, pero todavía no se ejecutaron en GitHub. El repositorio y su licencia aún no se han publicado. Consulta [Seguridad](../SECURITY.md) para el aviso pendiente y [Contribuir](../CONTRIBUTING.md) para reproducir las comprobaciones. Las pruebas reducen riesgos; no equivalen a una auditoría de penetración independiente ni garantizan seguridad absoluta.
