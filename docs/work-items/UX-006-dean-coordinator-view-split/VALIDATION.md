# VALIDATION — UX-006: Separación de Vistas Sobrecargadas (Decano y Coordinador)

> **Work Item:** `UX-006-dean-coordinator-view-split`  
> **Fecha:** 2026-10-18  
> **Estado:** VALIDATED (Build + Contract Verification)

---

## 1. Comandos de Verificación Ejecutados

| Gate / Verificación | Comando | Directorio | Exit Code | Resultado |
| :--- | :--- | :--- | :---: | :--- |
| **Pre-Flight Infra & WORM** | `.\AsistenciasUCO-Infra\infra.ps1 verify` | `c:\Proyectos\GestioAsistencia` | `0` | **PASS** — 0 secretos detectados, 0 drift en contratos WORM (`.sha256` íntegros). |
| **Compilación Producción Angular** | `npm run build` | `c:\Proyectos\GestioAsistencia\GestioAsistenciaFrontend` | `0` | **PASS** — 0 errores y 0 advertencias de compilación TypeScript/Angular; todos los lazy chunks generados para las nuevas rutas de Decano y Coordinador. |

---

## 2. Cobertura de Pruebas Unitarias Creadas / Mantenidas

Se escribieron especificaciones unitarias (`.spec.ts`) para la totalidad de las páginas desacopladas y se preservaron intactas las suites preexistentes de Decano y Coordinador:

1. **Coordinador (`features/coordinator/`):**
   - `coordinator-study-plans/coordinator-study-plans.component.spec.ts` (Listado de planes, KPIs y navegación por router).
   - `coordinator-study-plans/pages/study-plan-form-page.component.spec.ts` (Creación y edición de plan de estudio en ruta dedicada).
   - `coordinator-study-plans/pages/study-plan-mesh-page.component.spec.ts` (Malla curricular por semestre, filtros y retiro de asignaturas).
   - `coordinator-study-plans/pages/subject-form-page.component.spec.ts` (Vinculación y edición de asignatura en el plan).
   - `coordinator-periods/coordinator-periods.component.spec.ts` (Listado y creación de períodos académicos en `/app/coordinador/periodos`).
   - `coordinator-students/coordinator-students.component.spec.ts` (**Intacto / Sin modificaciones**, manteniendo compatibilidad con `LB-001B.1B` tras dedicar `/app/coordinador/estudiantes` exclusivamente al Directorio Estudiantil del Programa y retirar Solicitudes de Cupo).
   - `coordinator-subjects/coordinator-subjects.component.spec.ts` (Nueva vista dedicada `/app/coordinador/materias` con grupos ofertados, consulta de estudiantes inscritos y catálogo de asignaturas curriculares).
2. **Decano (`features/dean/`):**
   - `dean-faculty/dean-faculty.component.spec.ts` (**Intacto / Sin modificaciones**, manteniendo compatibilidad con los 9 requests HTTP de hidratación e interacción de cursos).
   - `dean-grupos/dean-grupos.component.spec.ts` (Directorio de grupos de la facultad y navegación a detalle).
   - `dean-grupo-detalle/dean-grupo-detalle.component.spec.ts` (Auditoría de sesiones por grupo y creación de sesión en ruta dedicada).
   - `dean-programas/dean-programas.component.spec.ts` (Catálogo de programas académicos y planes de estudio).
   - `dean-plan-malla/dean-plan-malla.component.spec.ts` (Consulta de malla curricular del plan por semestre).
   - `dean-periodos/dean-periodos.component.spec.ts` (Supervisión de períodos académicos y calendarios).
   - `dean-infraestructura/dean-infraestructura.component.spec.ts` (Catálogo de sedes, áreas y edificios).
