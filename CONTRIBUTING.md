# Contribuir a Elociencia

Elociencia ayuda a preparar partidas de League of Legends. Son bienvenidas las mejoras de accesibilidad, experiencia móvil, recomendaciones, pruebas, documentación y seguridad. Para cambios grandes, abre primero una propuesta que explique el problema y el resultado esperado. Para vulnerabilidades, sigue [SECURITY.md](SECURITY.md) y utiliza un canal privado.

## Preparar el entorno

Usa preferentemente Node.js 24 y la versión de pnpm fijada en `package.json`. También se admite Node.js 22 desde la versión 22.12, según `engines`:

```sh
pnpm install --frozen-lockfile
if [ ! -f .env ] && [ ! -f .env.local ]; then
  cp .env.example .env
fi
```

Sigue el [README](README.md) para levantar PostgreSQL local, aplicar las migraciones y configurar las cuentas. Puedes explorar el ejemplo sin claves reales. No necesitas OpenRouter, Riot ni Resend para ejecutar las pruebas automatizadas.

Para conectar servicios reales, consulta la [guía de OpenRouter y Resend](docs/provider-setup.md). Sus claves se configuran en tu entorno privado; no las incluyas en una propuesta de cambios.

Lee [AGENTS.md](AGENTS.md) y [el contexto de continuidad](docs/agent-handoff.md). Conserva el archivo de entorno privado que ya exista; `.env.local` tiene prioridad sobre `.env`. Antes de cambiar código de Next.js, consulta la guía correspondiente de la versión instalada en `node_modules/next/dist/docs/`. No edites los archivos generados en `.next/`, `generated/prisma/` ni `next-env.d.ts`.

## Hacer un cambio

- Escribe la lógica y los componentes en TypeScript y conserva el modo `strict`. Valida también los datos externos en tiempo de ejecución; un tipo no convierte un dato recibido en confiable.
- Mantén los mensajes de la interfaz en español, claros y accionables. Comprueba escritorio y móvil cuando cambies la interfaz, incluyendo el uso con teclado.

### Interfaz

Antes de cambiar pantallas, copy o consejos del coach, lee las [directrices de diseño y experiencia](docs/design-guidelines.md). Sus reglas y criterios de aceptación aplican a toda la app: navegación contraíble, jerarquía y espaciado, imágenes de objetos y hechizos, textos mínimos, lectura del matchup y consejos por rol orientados también al juego en equipo.

Las decisiones de interfaz están registradas como ADR en [`docs/adr/`](docs/adr) y resumidas en [AGENTS.md](AGENTS.md#interfaz-decisiones-obligatorias). Una propuesta que no las siga se devolverá para ajustarla.

- **Estilos con Tailwind CSS v4** ([ADR 0001](docs/adr/0001-tailwind-v4.md)). Usa las utilidades con los tokens de `@theme` en `app/globals.css`. No añadas CSS a las hojas heredadas ni valores sueltos de color, sombra o radio; si falta un token, propónlo en `@theme`. Al tocar una pantalla, migra sus estilos y borra las reglas que dejen de usarse.
- **Componentes React por pantalla** ([ADR 0002](docs/adr/0002-componentes-react.md)). Una pantalla por archivo, componentes pequeños (unas 300 líneas como máximo), props tipadas y estado y llamadas a la API en hooks. Calcula el estado derivado en el render y usa `useEffect` sólo para sistemas externos, con limpieza. Reutiliza `components/ui/` y `components/brand.tsx` antes de crear piezas nuevas.
- **Marca Elociencia** ([ADR 0003](docs/adr/0003-marca-elociencia.md)). Sigue [`brand/elociencia/HANDOFF.md`](brand/elociencia/HANDOFF.md) y su lienzo. Los iconos, favicons, imagen social y mascota públicos se regeneran con `pnpm exec tsx scripts/generate-brand-assets.ts`.
- **Accesibilidad:** comprueba 390, 834 y 1440 px sin desbordamiento horizontal, áreas táctiles de 44 px o más, foco visible y `prefers-reduced-motion` (sólo cambios de opacidad).
- Para cambiar una de estas decisiones, abre primero una propuesta con una ADR nueva.
- Añade pruebas cuando cambies permisos, validaciones, cuotas, contabilidad, persistencia o comportamiento importante. Usa datos sintéticos y proveedores simulados.
- Conserva `pnpm-lock.yaml`. No introduzcas otro gestor de paquetes ni modifiques dependencias sin explicar su necesidad.
- Si modificas la base de datos, incluye una migración versionada y explica su efecto sobre los datos existentes. No pruebes migraciones contra producción.
- Evita cambios de formato ajenos a tu propuesta y supresiones generales del linter. Explica las excepciones concretas que sean necesarias.

## Formato y validación

```sh
pnpm format
pnpm lint:fix
pnpm check
pnpm test:accounts
pnpm build
```

`format` aplica el formato común; `format:check` lo comprueba sin modificar archivos. `lint` revisa las reglas de código y `lint:fix` aplica las correcciones automáticas disponibles. `check` reúne formato, lint, TypeScript y pruebas unitarias.

`test:accounts` levanta PostgreSQL real en un entorno temporal y comprueba autenticación, aislamiento del historial, cuotas e idempotencia. La IA y el correo se simulan; no envía correos reales ni consume créditos. `eval:security` permite ejecutar por separado la evaluación de entradas y respuestas del coach.

Una compilación o prueba simulada no verifica servicios externos ni un despliegue. En la propuesta, distingue lo comprobado localmente de lo que falta verificar con credenciales reales.

## Cuidar los datos y el gasto

No incluyas `.env.local`, claves, contraseñas, tokens, sesiones, copias de la base local, datos personales, conversaciones privadas, prompts internos ni fotos reales en commits, issues, capturas o registros de prueba. Usa `.env.example` para documentar variables con valores ficticios.

Las llamadas privadas deben validar la sesión y los permisos en el servidor. Antes de contactar con la IA, deben reservar cuota y presupuesto; la idempotencia debe impedir llamadas duplicadas. No elimines estos controles para facilitar una prueba. Un timeout no demuestra que una llamada haya sido gratuita.

El contenido de usuarios, capturas, catálogos, páginas web y respuestas de IA es dato no confiable. Mantén la validación de entrada y salida y el alcance exclusivo del coach. Las pruebas de seguridad deben ejecutarse en tu entorno local o en un sistema para el que tengas permiso explícito; no pruebes infraestructuras externas por iniciativa propia.

Las comprobaciones de una contribución no deben requerir secretos de producción ni ejecutar llamadas pagadas. No añadas automatizaciones que expongan secretos a código de una propuesta externa.

## Enviar una propuesta

Describe el problema, el comportamiento resultante y las comprobaciones realizadas. Adjunta capturas sanitizadas para cambios visuales y explica limitaciones, cambios de configuración o migraciones. Mantén cada propuesta centrada en un cambio revisable.

La licencia del proyecto está pendiente de decisión. No añadas una licencia ni cambies las condiciones de distribución sin acordarlo con los responsables del proyecto.
