# PR — SES-01 (Frontend): tomar asistencia solo durante la sesión activa

**Base:** `develop` · **Rama:** `fix/ses01-cierre-estricto-asistencia` · **Orden de integración:** 3/3 (después de DB y Backend)

## Alcance funcional
«Tomar asistencia» bloquea fuera de la ventana `[inicio, fin)`: el cambio individual, «Marcar todos presentes/ausentes», los atajos de teclado y «Guardar», con un aviso visible. La consulta del registro sigue disponible. Se recalcula al inicio y al fin exactos aunque la página quede abierta; al cerrarse descarta los cambios sin guardar. Un 409 del backend nunca se muestra como éxito.

## Causa corregida
LB-001B.1B retiró el gate de sesión sin sustituto; la decisión del 2026-11-02 introduce la regla temporal.

## Contrato
Consume el 409 del backend (`ERR_SESION_NO_INICIADA`, `ERR_SESION_CERRADA`, `ERR_SESION_HORARIO_INDETERMINADO`). La ventana se deriva por **instante** de los campos v2 (APP-04 intacto). El reloj del navegador solo controla la presentación; la autoridad es el servidor.

## Pruebas
- RED `e3fd4f0` → fix `47c0dd7`.
- `ng test` ChromeHeadlessCI **1488/1488**; `tsc` de app y specs OK.
- `TEST_CONTRACT_CONFLICT` resuelto: tres specs que afirmaban «sin gate por estado de sesión» se reformularon según la decisión del 2026-11-02 (documentado en `PLAN.md`).
- **NOT_RUN:** navegador con DOCENTE (después del merge y despliegue).

## Dependencias
Backend `alejovh12/AsistenciasUCO#?` y DB `johnjduque/gestion-asistencia-db#?`.

## Reversión
Revertir el PR.
