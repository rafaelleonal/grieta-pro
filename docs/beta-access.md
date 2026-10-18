# Beta común · 18 de octubre de 2026

La [ADR 0006](adr/0006-acceso-beta-comun.md) deja en pausa las diferencias comerciales. Toda cuenta verificada utiliza la misma política de acceso y puede elegir Opus 5.5 o Gemini 3.8 Flash. Opus sigue predeterminado. La respuesta mantiene únicamente build, hechizos y runas.

## Funcionamiento

- `APP_ACCESS_MODE=beta` es el valor predeterminado. `plans` restaura el modo histórico sin reescribir datos.
- Los cupos, presupuestos y concurrencia comunes son los valores numéricos ya administrados de la política base. El rol administrador permanece independiente.
- No se reinicia el consumo ni se eliminan concesiones o reservas. Las solicitudes anteriores se concilian contra su fondo original.
- Se ocultan Free/Pro, las ofertas y los controles comerciales. La búsqueda web se desactiva para todos; un borrador antiguo no puede reactivarla.
- Flash tiene cuatro pruebas de proveedor simulado: contrato reducido, streaming y reserva, salida truncada sin reintento y recuperación de runas inválidas. Estas pruebas no miden velocidad real.

## Comprobación visual

Cuenta sintética en PostgreSQL temporal y servidor local aislado, sin claves pagadas ni correos reales. Se verificaron inicio de sesión, etiqueta Beta, cuotas comunes, Opus predeterminado y selección de Gemini 3.8 Flash. La preparación conserva entrada manual y captura, sin control de búsqueda web.

Revisión visual a 390, 834 y 1440 px: sin desbordamiento horizontal. Capturas locales en `artifacts/qa/beta-access/`, excluidas de Git. El servidor y la base temporal se cerraron al terminar.

Las pruebas locales, proveedores simulados y compilación se distinguen de una consulta real. No se hicieron llamadas pagadas ni se afirma que Flash sea más rápido con esta versión sin medirlo.

## Comprobaciones automatizadas

- `pnpm check`: formato, lint, tipos y 282 pruebas aprobadas.
- `pnpm eval:security`: 34 pruebas aprobadas.
- `pnpm test:accounts`: aprobado con PostgreSQL temporal. Verifica acceso común, conciliación contra el fondo original, recuperación autenticada de respuestas previas con búsqueda web, conflictos de entrada y modelo, aislamiento por propietario y rechazo de búsquedas nuevas en beta. Correo e IA simulados.
- `pnpm build`: compilación correcta, sin servidor de desarrollo concurrente.
