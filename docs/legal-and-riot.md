# Documentos legales y solicitud de Riot

GrietaPro incluye dos páginas públicas, accesibles sin cuenta:

- `/terminos`: términos de uso y límites del coach.
- `/privacidad`: política de privacidad y aviso de privacidad integral, con datos de cuenta, contexto de juego, capturas, proveedores, conservación y derechos.

El coach y las pantallas de cuenta enlazan ambas páginas. Esos enlaces abren otra pestaña para conservar la selección y el resultado que estés revisando. Las páginas legales incluyen enlaces entre sí y una vuelta al coach.

El pie muestra el aviso completo de Riot en español y la redacción oficial en inglés. La aprobación de una clave no supone que Riot avale el producto.

## Completar los datos del responsable

El responsable actual es **Rafael de Jesús León Alfaro** y la ubicación pública es **Comitán, Chiapas**, según la indicación del propietario. El correo permanece vacío. La ubicación no se presenta como un domicilio completo.

Configura estos valores en el entorno de la aplicación para completar o actualizar los datos. Son datos públicos que aparecerán en los documentos; no uses credenciales ni una dirección ficticia:

| Variable                | Contenido                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `LEGAL_OPERATOR_NAME`   | Nombre legal completo de la persona o entidad responsable.                                                                 |
| `LEGAL_CONTACT_EMAIL`   | Correo real atendido para soporte y solicitudes de privacidad. Un remitente de Resend no demuestra que exista una bandeja. |
| `LEGAL_CONTACT_ADDRESS` | Domicilio de contacto completo, incluido el país.                                                                          |

Mientras falte el correo o un domicilio completo, las páginas indican **Documento en preparación**. No infieren identidad ni contacto a partir de las credenciales o del correo de autenticación. Reinicia el servidor después de cambiar la configuración.

Antes de publicarlas, revisa la identidad, el domicilio, el país de operación y las condiciones reales de los proveedores del despliegue. Los documentos describen el código actual; no acreditan cumplimiento jurídico en toda LATAM.

## Solicitudes de privacidad

Mis sesiones permite leer y eliminar cada plan. El borrado retira el resultado del historial y su copia de replay, y conserva los registros de consumo. Las respuestas de extracción también pueden conservarse para replay; no aparecen como un plan en Mis sesiones.

Las solicitudes relativas a una cuenta, rectificación, acceso, exportación, respuestas de extracción, revocación o limitación se atienden por el correo publicado. No hay un flujo automático de eliminación de cuenta ni de purga por antigüedad. El responsable debe poder atender esas solicitudes y determinar qué conservación es necesaria; publicar el texto no implementa esa operación.

No afirmes que borrar un plan elimina copias de los proveedores o respaldos. El proyecto no fija un calendario de respaldos, registros del alojamiento ni retención de terceros: confírmalo en el despliegue y actualiza el aviso si corresponde.

## Preparar la solicitud de producción

1. Publica la aplicación en una URL HTTPS que puedas verificar como propia. Comprueba que las páginas legales sean accesibles sin entrar.
2. Completa los datos del responsable y revisa los flujos de cuenta, privacidad y límites del coach. Elimina el estado de borrador sólo completando datos reales.
3. Confirma quién aloja la aplicación y la base, las ubicaciones de procesamiento, la retención de registros y respaldos, y la configuración de privacidad de OpenRouter y sus proveedores.
4. Describe el alcance actual: Account-V1 y Spectator-V5 para importación voluntaria de composición de una partida activa; Data Dragon para datos estáticos. La importación no lee la selección de campeones. No anuncies Match-V5, maestría o Riot Sign On como funciones disponibles.
5. Prueba la integración con una clave autorizada y una partida real antes de afirmar que funciona en producción. Una compilación o una prueba simulada no verifica servicios externos.
6. Mantén la descripción registrada al día. Una clave personal o de desarrollo no habilita una beta pública. Si se añade cobro, revisa primero las condiciones de monetización de Riot y los términos del servicio.

Si se elige otro nombre, actualiza ambos avisos de Riot, los documentos, los metadatos, el manifiesto, el correo y la solicitud del portal de manera coherente.

## Fuentes revisadas

- [Políticas generales de Riot: aviso y registro](https://developer.riotgames.com/policies/general).
- [FAQ de Riot: producción y verificación](https://developer.riotgames.com/docs/faqs#production-key-applications).
- [Tipos de clave de Riot](https://developer.riotgames.com/docs/portal#web-apis_api-keys).
- [Ley mexicana vigente de protección de datos en posesión de particulares](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf): artículos 14–16 y 28–31.
- [Privacidad de OpenRouter](https://openrouter.ai/privacy).
- [Privacidad de Resend](https://resend.com/legal/privacy-policy).
- [Privacidad de Riot](https://www.riotgames.com/en/privacy-notice).
- [Privacidad de Exa](https://exa.ai/privacy-policy).

Revisión de contenido: 11 de octubre de 2026. La preparación local no publica los documentos ni envía una solicitud a Riot.
