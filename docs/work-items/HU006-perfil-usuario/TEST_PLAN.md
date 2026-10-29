# TEST_PLAN — HU006-perfil-usuario

Specs: `profile-links.component.spec.ts` (nuevo), `profile.component.spec.ts` (provee `PerfilService`) y el caso MK-06 de `mock-backend.interceptor.spec.ts`.

| ID | Escenario | Esperado |
|---|---|---|
| PL-01 | Carga | Hace un GET sin toast global. Muestra "CC 1017000001", el correo, "Ana Pérez" y "ACTIVA". Sin vínculos, muestra el mensaje vacío. |
| PL-02 | Vínculos | Muestra 3 elementos con las etiquetas "Estudiante en", "Docente en" (inactivo) y "Administra", junto con su detalle. |
| PL-03 | Correo sin confirmar y cuenta inactiva | Muestra "(sin confirmar)" e "INACTIVA". |
| PL-04 | Error 404 | La alerta queda visible y deja de cargar. |
| PL-05 | Etiquetas | Un rol desconocido muestra el valor tal cual; DECANO se muestra como "Decano de" y COORDINADOR como "Coordina". |
| MK-06 | Mock | Devuelve el perfil con 1 vínculo. |

## RED_SNAPSHOT

| Campo | Valor |
|---|---|
| Base commit | `f010db3` |
| Fallo esperado | `ProfileLinksComponent` y `PerfilService` inexistentes |
| Comando | `npm run test:ci` |
