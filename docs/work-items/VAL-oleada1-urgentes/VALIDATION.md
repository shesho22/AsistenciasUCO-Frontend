---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-12
---

# VALIDATION — VAL-oleada1-urgentes (frontend)

| Alcance | Comando (Chrome Headless, 2026-11-12) | Resultado |
|---|---|---|
| EST-03 | `npx ng test --watch=false --include=` claim.mapper, admin-system, coordinator-subjects y study-plan-mesh (specs) | 37 SUCCESS, 0 fallos |
| SEG-12 | `npx ng test --watch=false --include=` environment, auth.service, componentes-externos.service, login, message-administration, security-administration, dashboard-layout.ux-menu | 176 SUCCESS, 0 fallos |
| SEG-12, resto de specs que tocan `window.env` o `environment.security` | misma forma, 10 archivos | 178 SUCCESS, 0 fallos |

Specs ajustados por el cambio de defecto, sin cambiar su intención: `auth.service.spec.ts` (fija `SECURITY_PROVIDER: 'legacy'` en el `beforeEach` y espera `baseline` con valor vacío) y `componentes-externos.service.spec.ts` (sin proveedor ahora es baseline). Specs nuevos: `environment.spec.ts` (defecto baseline, legacy explícito, valor inválido) y uno por cada corrección de EST-03.

Limitaciones: no se corrió la suite completa ni Sonar; el workflow no se ejecutó y la versión `@v5.0.0` de la acción debe confirmarse en el primer run de CI.
