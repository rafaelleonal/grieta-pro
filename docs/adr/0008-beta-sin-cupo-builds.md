# ADR 0008 · Beta sin cupo de builds

- **Estado:** aceptada por instrucción del propietario el 18 de octubre de 2026.
- **Petición:** retirar temporalmente el límite de cantidad de planes para probar el proyecto, conservar el control de gasto y deshabilitar la generación cuando esté bloqueada.

## Decisión

En `APP_ACCESS_MODE=beta` no se aplica el cupo mensual de cantidad de builds (`COACH`). Esta excepción sustituye ese punto de la [ADR 0006](0006-acceso-beta-comun.md). El modo `plans` mantiene su cupo histórico; las lecturas de capturas conservan su límite actual.

No se modifican presupuestos de usuario, fondo común o aplicación, límites por minuto, concurrencia ni reservas. El consumo y las solicitudes inciertas se conservan: retirar un cupo no devuelve dinero ni autoriza repetir una consulta pendiente. Las claves personales mantienen el tratamiento contable existente y no evitan autenticación, admisión, concurrencia o idempotencia.

La API representa la ausencia de cupo con `null` en `coachLimit` y `coachRemaining`, sin fingir una cantidad disponible. La interfaz muestra acceso beta sin contador de builds restantes. Los límites monetarios siguen decidiendo si se puede admitir una consulta.

El botón de generación y su atajo de teclado comparten las mismas condiciones de disponibilidad. Se deshabilitan ante bloqueos conocidos de cuenta, configuración, concurrencia, ritmo o presupuesto para el modelo seleccionado. La consulta de disponibilidad no reserva fondos ni sustituye la admisión atómica del servidor; los presupuestos compartidos pueden cambiar entre la lectura y el envío. La recuperación de una respuesta ya admitida permanece separada de una generación nueva.

## Validación

Pruebas con usuarios sintéticos y PostgreSQL temporal deben cubrir una cuenta beta por encima del antiguo cupo, reservas inciertas, presupuestos individuales y compartidos, concurrencia, ritmo, claves personales y restauración del cupo en `plans`. No se requieren nuevas consultas pagadas para verificar esta decisión.
