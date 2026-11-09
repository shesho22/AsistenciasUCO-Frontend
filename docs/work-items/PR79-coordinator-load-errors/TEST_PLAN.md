---
status: active
type: work-item
scope: frontend-tests
owner: frontend-team
last-reviewed: 2026-11-08
---

# TEST_PLAN — PR79

## Requisito y conducta

Una solicitud fallida del coordinador debe mostrarse como error accesible con opción de reintento. No debe aparecer el estado vacío como si la consulta hubiera terminado bien. Al reintentar y recibir éxito, se limpian el error y se presentan los datos. ListadoPaginado conserva la página actual al reintentar.

Fuente: cambio y pruebas del PR #79, merge commit 632ed3545eadbff35673a390c557aa33ea97c10f; el contrato HTTP permanece intacto.

## Matriz conductual

| ID | Escenario | Observable | Esperado | Implementación errónea que detecta | Nivel |
|---|---|---|---|---|---|
| PR79-01 | 500 al cargar grupos/sesiones/asistencias | Alerta, botón Reintentar, mensaje vacío ausente; luego respuesta correcta | Error visible y recuperación en cada nivel | Tratar 500 como lista vacía o reintento sin nueva consulta | Component |
| PR79-02 | 500 al cargar consolidado | Alerta, mensaje vacío ausente; reintento con datos | Error distinguible y recuperación | Renderizar vacío tras fallo | Component |
| PR79-03 | Falla grupos, asignaturas o planes del coordinador | Alerta; planes reintentados tras error | Cada falla se comunica; éxito limpia error | Silenciar un error de fuente secundaria | Component |
| PR79-04 | Falla en ListadoPaginado y luego éxito al reintentar | Clasificación, número de consultas, error, filas | Error publicado; reconsulta de página actual; error limpiado y filas cargadas | Error sin estado visible, página cambiada o estado residual tras éxito | Unit |

Los tests de origen se trasladan sin cambiar sus expectativas. Si un test contradice el requisito, se detiene como TEST_CONTRACT_CONFLICT; no se debilitan sus asserts.

## RED_SNAPSHOT

Base: origin/develop = 7cd38312838c2fc3456ab3b48f734d0106e28fcf. Los cuatro archivos siguientes se aplicaron desde el diff existente de PR #79, sin cambiar sus expectativas. SHA-256 antes del código de producción:

| Archivo | SHA-256 |
|---|---|
| src/app/features/coordinator/coordinator-attendance/coordinator-attendance.component.spec.ts | 89D512E24A8E6134D4A95E5C16D1BEA365B2DC19074729CA0A4BDB71660A0535 |
| src/app/features/coordinator/coordinator-consolidado/consolidado-asistencia.component.spec.ts | 879522CC46497DD58EACB02BD0E8258972AE746F687B716B768BBFEE204BBF81 |
| src/app/features/coordinator/coordinator-subjects/coordinator-subjects.component.spec.ts | 15887BE5226FA23BB108313FE662506A2B65B23F53C9608D790AB7F1394A27BE |
| src/app/shared/utils/listado-paginado.spec.ts | 0C9B003ABB69C79B83B05CFD16F0F4A5FAA16F055215D951D9A984456299DA38 |

### Resultado RED observado

- Focal de las cuatro pruebas: exit 1 al compilar; tres TS2339 en ListadoPaginado.spec.ts por ausencia de error() y reintentar(). Chrome no ejecutó tests en esa corrida.
- Coordinator subjects (con su spec aislado del compile gate anterior): 6 de 28 ejecutados, 3 fallidos en los nuevos casos de error; Chrome se desconectó al llegar a afterAll con errores RxJS sin manejar. Exit 1; resultado parcial.
- Coordinator attendance: 17 ejecutados, 3 fallidos / 14 exitosos; el error se representa como vacío y no aparece alerta/reintento. Exit 1.
- Consolidado: 5 ejecutados, 1 fallido / 4 exitosos; el error se representa como vacío y no aparece alerta/reintento. Exit 1.
- El spec utility se mantiene intacto; la falla de compilación anterior es su RED causal.

## Comandos RED/GREEN y regresión

- Focal: npm run test:ci -- --include=src/app/features/coordinator/coordinator-attendance/coordinator-attendance.component.spec.ts --include=src/app/features/coordinator/coordinator-consolidado/consolidado-asistencia.component.spec.ts --include=src/app/features/coordinator/coordinator-subjects/coordinator-subjects.component.spec.ts --include=src/app/shared/utils/listado-paginado.spec.ts
- Regresión/build: npm run verify.

## Integración, límites y rollback

Los mocks/component tests prueban la conducta UI y no certifican Backend, SQL Server ni permisos. No se requiere provider externo para este cambio. La validación manual Angular se registra solo si se dispone de una sesión coordinador autorizada. No enviar solicitudes mutantes. Rollback: revertir el cambio de PR, preservando el package-lock.json preexistente.
