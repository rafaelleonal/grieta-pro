# Seguridad de Elociencia

La autenticación, los permisos, el historial privado, las cuotas y los límites de gasto se controlan en el servidor. Las entradas y respuestas del coach se validan como datos no confiables. Estos controles reducen riesgos; no garantizan inmunidad a ataques, filtraciones ni errores del modelo.

Las rutas de coach y capturas admiten hasta 6 solicitudes por usuario y 30 globales por minuto antes de leer el JSON. Este límite persistente incluye entradas inválidas y reintentos y es independiente de las cuotas de IA. La decodificación y reducción de imágenes con Sharp ocurre después de reservar cuota, presupuesto y concurrencia.

El HTML se renderiza por solicitud y se sirve como `private, no-store`. La CSP utiliza un nonce nuevo para scripts; en producción no incluye `unsafe-eval`. Se permiten estilos inline por compatibilidad con React, sin permitir scripts inline sin nonce. La caché pública de la PWA no almacena páginas privadas ni respuestas API.

## Reportar una vulnerabilidad

No abras un issue público con detalles de una vulnerabilidad. Cuando el repositorio tenga habilitado el reporte privado de GitHub, utiliza **Security → Advisories → Report a vulnerability**. Si ese canal no está disponible, solicita a los responsables un medio privado sin publicar la reproducción ni datos sensibles. Este proyecto todavía no anuncia una dirección de correo específica para reportes.

En el reporte privado incluye:

- Versión o revisión afectada y configuración relevante, sin secretos.
- Pasos mínimos con cuentas y datos sintéticos, comportamiento observado e impacto.
- Requisitos para reproducirlo y una posible corrección, si la conoces.

No adjuntes claves, contraseñas, cookies, tokens, correos de usuarios, fotos privadas, copias de bases de datos ni prompts internos. Si encontraste un secreto expuesto, describe dónde apareció sin copiarlo. Coordina la divulgación pública después de evaluar y corregir el problema. No se ofrece un programa de recompensas ni un plazo fijo de respuesta.

## Pruebas responsables

Prueba únicamente tu instalación local o sistemas para los que tengas autorización explícita. Usa proveedores de IA y correo simulados. No intentes acceder a cuentas ajenas, extraer información, agotar saldo, enviar correos reales ni explorar infraestructura de Riot, OpenRouter, Resend o terceros para demostrar un fallo.

Los problemas del código de Elociencia pueden reportarse aquí. Los incidentes propios de un proveedor deben comunicarse mediante el canal de seguridad de ese proveedor.

## Dependencias y comprobaciones

```sh
pnpm format:check
pnpm lint
pnpm check
pnpm eval:security
pnpm test:accounts
pnpm audit --prod --audit-level=moderate
pnpm audit:security
```

`check` reúne formato, lint, TypeScript estricto y pruebas unitarias. `format` y `lint:fix` permiten aplicar correcciones. La [guía de contribución](CONTRIBUTING.md) describe el flujo completo; el [README](README.md) explica configuración y despliegue.

En la revisión local del 10 de octubre de 2026, la auditoría de producción no encontró avisos. Se fijaron versiones transitivas mediante overrides de `deepmerge-ts` 8.0.0 y `mysql2` 3.23.1 en `pnpm-workspace.yaml`.

La auditoría completa todavía detecta `braces` 3.0.3 en la cadena de desarrollo de ESLint. [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) afecta a patrones profundamente anidados y no indica una versión corregida. Esta dependencia se utiliza con patrones del repositorio al ejecutar ESLint; no interviene en las solicitudes de la aplicación. No se ignora el aviso: `audit:security` y el flujo completo semanal fallan y lo reportan. Mantén controlados los patrones de lint y da seguimiento a una corrección compatible.

Los flujos de GitHub Actions y Dependabot están configurados; consulta los resultados de cada ejecución en GitHub. El CI usa permisos de lectura, acciones fijadas a commits verificados y checkout sin credenciales persistentes. Las propuestas se comprueban sin secretos de producción. La auditoría completa semanal/manual incluye también dependencias de desarrollo; la auditoría de producción forma parte del CI de contribuciones.

## Mantener una instalación

- Mantén `.env.local`, claves y la base local fuera del repositorio. En producción utiliza el gestor de secretos del alojamiento, HTTPS y una conexión PostgreSQL protegida.
- Restringe los orígenes de autenticación a los necesarios. El registro abierto predeterminado conserva la verificación del correo y las cuotas; la invitación opcional sólo concede su plan y no un rol de administrador. Usa `invite` únicamente si decides una beta cerrada y concede administración sólo a cuentas verificadas.
- Configura presupuestos y cuotas, además de un límite de saldo en la clave de OpenRouter. Conserva las reservas de consumo pendiente hasta poder conciliarlo.
- Actualiza las dependencias y ejecuta formato, lint, TypeScript, pruebas de seguridad e integración antes de publicar cambios.
- Las comprobaciones de propuestas externas deben funcionar sin secretos de producción. No ejecutes código de una propuesta con credenciales privilegiadas.
- Si un secreto se expone, revócalo o rótalo en el proveedor. Eliminarlo del archivo o del último commit no lo invalida.

Las pruebas automatizadas utilizan PostgreSQL temporal, IA y correo simulados. Verificar esos controles no acredita una auditoría independiente ni demuestra la seguridad de una instalación de producción.
