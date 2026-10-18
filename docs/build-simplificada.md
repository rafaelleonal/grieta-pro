# Build simplificada · 18 de octubre de 2026

Implementación de la [ADR 0005](adr/0005-build-hechizos-runas.md): respuestas centradas en objetos, hechizos y runas. Opus 5.5 por defecto donde el plan lo permite.

## Cambios

- Contrato `build-v1` reducido; no se solicitan estrategia, niveles, habilidades ni mapa. El contexto elimina instrucciones tácticas y acorta descripciones del kit.
- Formato persistido 4 compatible con historial 1–3; las vistas y la copia muestran sólo elecciones de build, hechizos y runas.
- Streaming de elecciones completas y validadas. Una sola generación, sin reintentos automáticos ni llamadas adicionales para completar campos.
- Opus usa razonamiento bajo y 4 096 tokens máximos para coach. La extracción mantiene su política. Free conserva sus modelos autorizados; la interfaz y el servidor comparten el predeterminado efectivo.
- Se conservan las reservas inciertas, la validación de catálogo y seguridad, el aislamiento del historial y el borrado del replay.

## Evidencia

- `pnpm check`: formato, lint, tipos y 271 pruebas aprobadas.
- `pnpm eval:security`: 34 pruebas aprobadas con proveedores simulados.
- `pnpm test:accounts`: PostgreSQL temporal real; formato 4 guardado y leído por su propietario, aislamiento entre usuarios, replay sin segundo POST, borrado sin perder contabilidad, cancelación incierta e identificación temprana del proveedor. Correo e IA simulados.
- `pnpm build`: compilación local correcta. No había servidor de desarrollo concurrente sobre `.next`.
- Navegador sobre compilación local: demostración a 390, 834 y 1440 px, sin desbordamiento horizontal; controles visibles de al menos 44 px; foco de teclado de 2 px con separación de 2 px. Copiar confirma la acción; editar vuelve a preparación; foto/galería y texto permanecen disponibles.
- Capturas sanitizadas locales en `artifacts/qa/build-only/` (excluidas de Git). El aviso de cuentas no disponibles corresponde al entorno de demostración local, no a producción.
- `pnpm audit --prod --audit-level=moderate`: sin avisos. `pnpm audit:security`: persiste `braces` 3.0.3, severidad alta, en la cadena de desarrollo de ESLint ([aviso](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)); no se ocultó ni se cambiaron dependencias para evadirlo.
- `OPENROUTER_MODEL` actualizado a Opus 5.5 en la configuración local y en los entornos Production/Preview del proyecto Vercel vinculado. La configuración remota se aplica al nuevo despliegue; no se cambiaron claves, presupuestos ni planes persistidos.

No se hicieron llamadas pagadas. La reducción del contrato y del límite de salida es verificable en código; la latencia y calidad del modelo real con esta versión quedan sin medir. Las comprobaciones locales y simuladas no demuestran por sí solas que un despliegue esté publicado.
