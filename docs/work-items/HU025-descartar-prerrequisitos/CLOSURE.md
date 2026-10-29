---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-10-29
---

# CLOSURE — HU025: descartar prerrequisitos y correquisitos

## Decisión

John (2026-10-29): **los prerrequisitos y correquisitos no existen y no están incorporados en la aplicación.** La HU025 se descarta y se elimina todo lo referente.

En el backend, el endpoint `GET /api/v1/estudiante/materias/{materiaId}/prerrequisitos` (que respondía 501) se elimina en la rama del mismo nombre. En la BD no existían: solo había un stub.

## Cambio en el frontend (rama `chore/HU025-descartar-prerrequisitos`)

**Estudiante:**
- se elimina `StudentPrerequisitosModalComponent` (`components/modals/student-prerequisitos-modal.component.ts`);
- en `student-courses-list` se eliminan el botón "Prerrequisitos" y el output `viewPrerequisites`;
- en `student-courses` se eliminan el modal, sus señales y los métodos `abrirPrerrequisitos`/`cerrarModalPrerrequisitos`;
- en `StudentManagementService` se elimina `getPrerrequisitosMateria`.

**Coordinador:**
- `subject-form` pierde la sección "Prerrequisitos académicos": selector, chips, señales y métodos, y el input `asignaturasPlan`, que solo servía para eso. El backend nunca persistía ese campo;
- `subject-form-page` deja de pasar `[asignaturasPlan]`;
- `study-plan-mesh` y `coordinator-subjects` dejan de mostrar los prerrequisitos;
- se ajustan los textos de `coordinator-study-plans`.

**Modelo y servicios:** se elimina el campo `prerrequisitos` de `AsignaturaPlanItem` y de su mapeo en `CoordinatorManagementService`.

**Mocks:** en `role-management.mock` se eliminan los campos y los textos de prerrequisitos, y en `mock-backend.interceptor` la ruta simulada.

**Pruebas:** se eliminan los casos del modal y de `getPrerrequisitosMateria`, y el campo en los fixtures (coordinador, decano, malla e interceptor).

**Documentación:** `README.md` (descripción del rol coordinador) y `docs/MAPA_COMPONENTES_FRONTEND.md`. La sección "Prerrequisitos" del README se conserva porque se refiere a Node y npm.

## Validación (2026-10-29)

- `npm run test:ci` (Karma ChromeHeadless con cobertura): **1325 de 1325 SUCCESS**.
- Cobertura: Statements 90.95 %, Branches 74.87 %, Functions 90.54 % y Lines 91.97 %.
- `ng build`: bundle generado sin errores.
