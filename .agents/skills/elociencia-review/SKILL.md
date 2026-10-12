---
name: elociencia-review
description: Revisa seguridad, privacidad y control del gasto en Elociencia al auditar el proyecto o cambiar IA, validaciones, imágenes, autenticación, historial, cuotas o caché privada. No exige una auditoría completa para cambios aislados de texto o estilo.
---

# Revisión de Elociencia

Comprueba que el cambio conserve el alcance del coach, el aislamiento entre cuentas y los límites de gasto. Respeta si el usuario pidió sólo una revisión o también implementación; la skill no autoriza publicar, migrar producción, enviar correo real ni consumir saldo adicional.

## Delimitar el cambio

Localiza la raíz del proyecto desde esta carpeta y lee su [AGENTS.md](../../../AGENTS.md). Identifica qué comportamiento cambia y qué entradas, permisos, datos persistidos o servicios toca. Usa el estado actual del código y `package.json`; los informes anteriores no acreditan el resultado de hoy.

Lee sólo las referencias necesarias: [cuentas y consumo](../../../docs/accounts-and-usage.md) para permisos o contabilidad; [SECURITY.md](../../../SECURITY.md) para controles y avisos; [README](../../../README.md) para configuración. Para cambios de Next.js, consulta la guía de la versión instalada en `node_modules/next/dist/docs/`.

## Seguir el flujo afectado

Traza entrada → ruta → autorización → procesamiento → proveedor o base → validación de salida → interfaz o historial. Comprueba los bordes correspondientes, sin convertirlos en una auditoría de áreas ajenas:

- **IA e imágenes:** origen, sesión verificada y admisión antes del cuerpo; límites y esquema antes del envío; reserva antes de Sharp; red fuera de la transacción. Verifica que un endpoint, modelo, encabezado o texto del cliente no amplíe permisos. Rechaza la respuesta completa si su contenido falla los controles; no reflejes errores crudos del proveedor.
- **Cuotas e idempotencia:** distingue admisión de entradas y cuota facturable. Comprueba concurrencia y reservas individuales y compartidas con `Decimal`. Usa la misma clave y huella para un replay, y detecta conflictos. Considera fallo previo al envío, envío incierto y consumo conocido: timeout, cancelación, redirección o salida rechazada no justifican borrar un gasto posible o repetir el POST.
- **Cuentas e historial:** valida permisos con el propietario de la sesión, incluyendo cursores, borrado y administración. Separa plan y rol; comprueba también BYOK. Al borrar un registro, retira su respuesta de replay sin eliminar la contabilidad. Prueba con dos usuarios sintéticos.
- **Interfaz, caché y sesión:** evita mostrar datos anteriores durante un cambio de identidad. Revisa cancelación de consultas y respuestas tardías, borrador por cuenta, limpieza de claves y capturas y liberación de URLs de imágenes. Conserva caché pública explícita y ausencia de reintentos de IA offline. Si toca CSP, verifica el nonce en HTML y encabezado en una compilación local; no habilites scripts arbitrarios para arreglar la hidratación.

La normalización de texto y los filtros de prompt injection son capas de defensa, no una garantía. Mantén secretos y capacidades fuera del modelo y valida datos externos en tiempo de ejecución. Usa datos y claves sintéticos para las reproducciones automatizadas. Verifica servicios o datos reales sólo cuando sea necesario y esté dentro de la autorización del usuario; conserva los secretos fuera de logs y artefactos.

## Elegir evidencia proporcional

| Cambio                                       | Comprobaciones útiles                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Documentación o esta skill                   | Formato de archivos, enlaces y validador de skills disponible; sin levantar servicios.                             |
| Interfaz                                     | Lint y tipos; pruebas de la lógica afectada; navegador y tamaños pertinentes para cambios visuales o de sesión.    |
| Entradas, respuestas, IA o imágenes          | Pruebas pertinentes de `tests/`; `pnpm eval:security`; integración si cambia la ruta, reserva o facturación.       |
| Auth, historial, cuotas o Prisma             | `pnpm test:accounts`: PostgreSQL temporal real y proveedores simulados; migración versionada si cambia el esquema. |
| Next.js, CSP, PWA o configuración de runtime | Pruebas pertinentes y `pnpm build`; comprobación del flujo en navegador cuando proceda.                            |
| Dependencias                                 | Auditoría actual de producción y completa; compatibilidad del flujo afectado después de actualizar.                |

`pnpm check` reúne formato, lint, tipos y unitarias. Para una suite concreta, usa `pnpm exec node --import tsx --test tests/archivo.test.ts`. Revisa comandos en `package.json` antes de ejecutarlos. No repitas comprobaciones ya correctas sin cambios o dudas nuevas que lo justifiquen.

Usa primero las pruebas simuladas existentes; no necesitan credenciales de OpenRouter, Riot o Resend. No ejecutes `db:setup` sobre una conexión persistente desconocida para probar. Si necesitas compilar, evita compartir `.next` con un servidor de desarrollo activo y restaura el entorno después. Una sandbox que impide puertos locales no demuestra un fallo del código: utiliza el mecanismo de ejecución permitido y explica cualquier límite que permanezca.

## Entregar un resultado verificable

En una revisión, informa sólo fallos concretos con ubicación, impacto y reproducción; distingue riesgos pendientes de errores comprobados. En una implementación autorizada, corrige los fallos dentro del alcance y vuelve a comprobar lo afectado.

Resume cambios, comandos realizados y resultados actuales, además de lo que quedó sin verificar. Separa pruebas locales y simuladas de servicios reales y despliegue. No reutilices conteos históricos, prometas seguridad absoluta ni ocultes avisos de dependencias para obtener un resultado verde.
