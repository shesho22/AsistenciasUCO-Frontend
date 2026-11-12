# VALIDATION — VAL-oleada2-cumplimiento (frontend)

## Agente B: PAR-05 y PAR-06

Fecha: 2026-11-12. Comando:

```
npx ng test --watch=false \
  --include=src/app/core/files/soporte-file.validator.spec.ts \
  --include=src/app/features/coordinator/coordinator-consolidado/consolidado-asistencia.component.spec.ts \
  --include=src/app/features/student/student-courses/components/student-claim-form.component.spec.ts \
  --include=src/app/features/student/student-courses/student-courses.component.spec.ts \
  --include=src/app/features/attendance/attendance-control/components/group-sessions-overview.component.spec.ts
```

Resultado: `TOTAL: 130 SUCCESS` (Chrome 157).

Pruebas nuevas:
- `soporte-file.validator.spec.ts`: límite parametrizado (512 KB), respaldo de 5 MB si falta o supera el techo,
  `describirTamano`.
- `consolidado-asistencia.component.spec.ts`: el color de inasistencia sigue el umbral de los KPI (5 %) y conserva 15/20
  si los KPI fallan. El helper `crear()` ahora atiende también la petición de `/indicadores`.

No corrido aquí: `npm run verify` completo (lo corre John al final).

## Cadena de suministro y CI (agente T)

`npm run lint`: 0 errores, 427 avisos. actionlint 0 hallazgos; YAML OK. Trivy local: 15 CVE HIGH (14 de Angular 18 sin parche en la línea 18, 1 de source-map-js), clasificados en `.trivyignore` con vencimiento 2027-02-12. gitleaks con configuración: 0. Detalle en [CI-CADENA-SUMINISTRO.md](CI-CADENA-SUMINISTRO.md).

- PAR-06 (correccion): `consolidado-asistencia` embebido en CULM-001 ya no repite GET `/indicadores`; toma los umbrales del estado compartido de `CoordinatorIndicatorsService.kpis()` (las tarjetas KPI ya lo piden). Standalone/decano siguen pidiendolos. `ng test --include=coordinator/**`: 233 SUCCESS.
