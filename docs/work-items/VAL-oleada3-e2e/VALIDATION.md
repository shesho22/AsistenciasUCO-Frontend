# VALIDATION — VAL-oleada3-e2e (PRU-06)

Fecha: 2026-11-13. Máquina local Windows 10, Node 24.19.0, Chromium de Playwright 1.64.1, headless.

## Qué cubre la suite (21 pruebas)

| Archivo | Prueba | Rol |
|---|---|---|
| `autenticacion.spec.ts` | Login muestra el formulario y valida los campos obligatorios | sin sesión |
| | Login rechaza un correo con formato inválido | sin sesión |
| | Inicio por rol: login, URL de inicio, encabezado, "Sesión activa como", nombre en el menú y módulos del menú (5 pruebas) | ADMINISTRADOR, DECANO, COORDINADOR, DOCENTE, ESTUDIANTE |
| | Cierre de sesión: vuelve a `/login` y una ruta protegida redirige a `/login?returnUrl=…` | DOCENTE |
| `guardas-de-rol.spec.ts` | Ruta de otro rol → `/app/acceso-denegado` (403), aviso "Acceso denegado" y la sesión se conserva (5 pruebas) | ESTUDIANTE→docente, DOCENTE→admin, COORDINADOR→decano, DECANO→coordinador, ADMINISTRADOR→estudiante |
| | Carga directa de una ruta ajena también termina en 403 | DOCENTE (sesión mock por defecto) |
| `flujos-por-rol.spec.ts` | Gestiona períodos académicos: lista 3, crea `2027-2` y la lista pasa a 4 | ADMINISTRADOR |
| | Consulta Seguimiento por pestañas (Indicadores → Consolidado) | DECANO |
| | Indicadores de asistencia del programa: tabla con % por grupo y filtro por materia | COORDINADOR |
| | Bandeja de reclamos: 3 reclamos, estados y toma reclamada | DOCENTE |
| | Control de asistencia: grupos del docente, cronograma y acción de nueva sesión | DOCENTE |
| | Mis reclamos: lista y retira uno pendiente | ESTUDIANTE |
| | Radica un reclamo sobre una toma ausente (Mis materias → detalle → toma) y lo ve pendiente en Mis reclamos | ESTUDIANTE |

Además, en todas las pruebas: ninguna petición sale del origen bajo prueba y ninguna excepción no controlada en la página.

## Resultados

| Corrida | Comando | Resultado |
|---|---|---|
| 1 | `CI=1 npx playwright test --trace off` | **21 passed** (31,2 s) |
| 2 | `CI=1 npx playwright test --trace off` | **21 passed** (31,5 s) |
| Flakiness | `CI=1 npx playwright test --trace off --repeat-each=3` | **63 passed** (1,4 min), 0 flaky, 0 reintentos |
| Tipos | `npm run e2e:typecheck` | OK |
| `npm run verify` | sin cambios en el script | **OK** (exit 0): Karma 2744/2744 SUCCESS, cobertura realtime 95,26 % líneas / 86,81 % ramas, checks y build de producción |

## Lo que la suite NO cubre (límites del backend simulado)

El mock no simula estas rutas o datos; quedan para la corrida contra el stack real (ver PLAN.md):

- **Detalle y resolución del reclamo por el docente**: `GET /docente/reclamos/{id}` no está simulado (501
  `MOCK_ROUTE_NOT_IMPLEMENTED`), y `GET /docente/reclamos` ignora el filtro `estado`.
- **Toma de asistencia con sesiones**: el grupo del docente no tiene sesiones en el mock y
  `GET /grupos/{id}/asistencias` no está simulado; el flujo de sesiones es de José Alejandro.
- **Texto del reclamo radicado**: el servicio envía `justificacion` y el mock lista `justificacionSolicitud`, por eso
  la prueba verifica el reclamo nuevo por su estado, la toma y la acción Retirar, no por el texto.
- **Login real** (PDP baseline + Keycloak), SSE en tiempo real, QR y notificaciones.

Observación (no se corrige aquí): en la pestaña Indicadores del decano el modo mock registra en consola `NG0600`
(escritura de una señal durante la detección de cambios). No es una excepción no controlada y no afecta la prueba.
