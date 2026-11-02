---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-02
---

# PLAN — F2: precarga de las sesiones del grupo (frontend)

## Decisión

John (2026-11-02): las sesiones se crean al definir el horario del grupo. La BD y el backend lo hacen (ramas `feature/F2-precarga-sesiones`); desde el frontend no hay endpoint ni pantalla nueva.

## Cambios

- `FranjasEditorComponent`: el texto de ayuda avisa que, al guardar, las sesiones futuras del grupo se crean o se ajustan según el horario. Lo ven el formulario del coordinador y el del docente.
- `docs/MAPA_COMPONENTES_FRONTEND.md`: nota de F2 en el módulo del docente.

## Validación

Ver `VALIDATION.md`.
