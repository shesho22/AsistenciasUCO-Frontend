---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-02
---

# VALIDATION — F3: el docente crea sus propios grupos (frontend)

## Evidencia ejecutada (2026-11-02)

- `npm run test:ci` (Karma ChromeHeadless con cobertura): **1373 de 1373 SUCCESS** (antes 1356).
- Cobertura: Statements 91.33 %, Branches 75.74 %, Functions 91.02 % y Lines 92.28 %.
- `npx ng build`: bundle generado sin errores.

## Pendiente

- Prueba manual contra el backend y la BD de F3 (docente con vínculo, sin vínculo, y creación con horario). El CI no la cubre.
- Sin período en el cuerpo de `POST /grupos`: se confirma al integrar (la DB toma el más reciente).

## Estado

`PARCIAL`: frontend probado con pruebas unitarias y build; falta la prueba manual integrada con BD y backend.
