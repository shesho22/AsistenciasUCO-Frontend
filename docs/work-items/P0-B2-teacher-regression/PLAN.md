---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-10-20
---

# P0-B2 — Regresión docente: grupos asignados sin horario

## Objetivo

Consolidar la corrección publicada en `fac2f640` para que un docente vea sus
grupos autorizados aunque todavía no tengan horario semanal. La API de
`/docente/asignaturas` es la fuente de grupos; `/docente/horarios` solo
enriquece. No se integra el soporte de reclamos de B1 ni se cambia el contrato
backend.

## REQUIREMENT → CONTRACT

- Fuente de grupos: `GET /api/v1/docente/asignaturas` y su DTO real.
- Enriquecimiento opcional: `GET /api/v1/docente/horarios`.
- Grupo asignado sin horarios: visible, sin código, aula o cupo inventados.
- Error de horarios: conserva los grupos autorizados.
- Error de asignaturas: propaga el error; no transforma autorización fallida
  en lista vacía.
- No se añade ni modifica una ruta pública.

## Evidencia AS-IS / cambio

El AS-IS anterior construía la lista únicamente desde horarios. El commit
`fac2f640` añade el DTO de asignatura docente, los tests de ausencia de
horario, deduplicación y no-síntesis, y adapta el mapeo de grupos. Su rama
actual está limpia y publicada como
`origin/jose-valencia/lb-004d-f1-support-binding`.

## Alcance

- Revisar el diff de `fac2f640` contra `origin/develop`.
- Ejecutar la suite de frontend y el build productivo.
- Preparar la evidencia para revisión; el merge en `develop` queda fuera de
  esta ejecución.

## No alcance y stop conditions

- No cherry-pickear el backend B1 ni implementar `/docente/reclamos`.
- No tocar SQL, PEP, secrets, Keycloak ni el contrato OpenAPI backend.
- Detener si el diff requiere endpoints no documentados o si la suite no
  reproduce el comportamiento.

## Definition of Ready

`READY_WITH_SCOPED_EXTERNAL_BLOCKERS`: el endpoint AS-IS está comprobado en
la matriz HTTP del backend, la corrección existe en una rama limpia, y sus
tests observables están presentes. E2E contra backend/DB real sigue pendiente.

