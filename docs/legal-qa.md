# Verificación local de documentos legales

Fecha: 11 de octubre de 2026.

## Resultado

Se añadieron `/terminos` y `/privacidad` como páginas públicas, con enlaces desde el coach y las pantallas de cuenta. El aviso de Riot aparece completo en español y con su redacción oficial en inglés. Las páginas muestran el responsable y la ubicación solicitados, con el correo pendiente y la ubicación diferenciada de un domicilio completo.

Los documentos conservan el estado **Documento en preparación**. Falta completar el contacto y el domicilio, confirmar los proveedores de producción y definir la conservación de registros y respaldos. No se publicó la aplicación ni se envió una solicitud a Riot.

## Comprobaciones

| Comprobación                  | Resultado                                                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formato, ESLint y tipos       | Correctos.                                                                                                                                                                             |
| Pruebas unitarias             | 175 correctas, sin fallos. Incluyen las evaluaciones de seguridad existentes y usan proveedores simulados. Una prueba de red necesitó permiso para abrir un puerto local.              |
| Compilación de producción     | Correcta con webpack en una copia temporal sin `.env.local`, para conservar intacto el servidor de desarrollo activo.                                                                  |
| Runtime standalone generado   | `/terminos` y `/privacidad` respondieron HTTP 200 sin autenticación; sus estilos también respondieron HTTP 200.                                                                        |
| CSP y caché del runtime local | Ambas páginas mantuvieron CSP con nonce distinto por respuesta y `no-store`. No se cambió la política de seguridad.                                                                    |
| Contenido del runtime local   | Responsable, ubicación, estado de preparación y aviso íntegro de Riot presentes; sin enlaces a correos ficticios.                                                                      |
| Navegación                    | Índices sin destinos faltantes; navegación entre documentos y enlaces legales desde coach y cuenta. Los enlaces del coach y cuenta abren otra pestaña con `noopener noreferrer`.       |
| Responsive                    | Privacidad, términos, coach y cuenta revisados en navegador integrado a 1365, 820 y 390 px según las vistas afectadas; sin desbordamiento horizontal en las comprobaciones realizadas. |
| Documentación                 | Enlaces locales de README y guía legal resueltos; fuentes legales y de proveedores consultadas.                                                                                        |

La primera copia de compilación utilizó un enlace a dependencias y produjo un aviso de trazado de standalone. Se repitió con las dependencias dentro de la copia aislada; la compilación final terminó sin ese aviso y se probó el servidor standalone generado. El servidor temporal se detuvo al finalizar; el servidor de desarrollo original se conservó.

## Evidencia visual

Las capturas se guardan localmente en `artifacts/legal-qa/` (carpeta ignorada por Git):

- [Privacidad en escritorio](../artifacts/legal-qa/privacidad-desktop.jpg).
- [Privacidad en móvil](../artifacts/legal-qa/privacidad-mobile.jpg).
- [Términos en tableta](../artifacts/legal-qa/terminos-tablet.jpg).
- [Aviso de Riot al pie del coach móvil](../artifacts/legal-qa/coach-footer-mobile.jpg).
- [Términos en el runtime de producción local](../artifacts/legal-qa/terminos-production-desktop.jpg).

Los tamaños son emulados en el navegador integrado; no equivalen a pruebas en Safari, iPhone o iPad físicos. Las comprobaciones no usaron Riot, OpenRouter o Resend reales, no consumieron saldo y no verifican un despliegue público ni cumplimiento jurídico en todas las jurisdicciones.
