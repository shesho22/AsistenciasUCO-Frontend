---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-14
---

# PLAN — VAL-oleada4-frontend-cierre (frontend)

Cierre de los pendientes del frontend en la lista de chequeo de validación (`LISTA_CHEQUEO_VALIDACION_2026-11-12`,
estado al 2026-11-13 tras la oleada 3). Rama `fix/VAL-oleada4-frontend-cierre`, desde `develop` 91f89f5.

## Alcance

| Ítem | Estado de partida | Qué se hace |
|---|---|---|
| SEG-14 | PARCIAL | Reglas espejo iguales a `SecurityConfig` (ADMINISTRADOR sin `/decano` ni `/coordinador`, salvo la lista de periodos) y retiro del alias `ADMIN`. |
| OBS-14 | PARCIAL | `ErrorHandler` global y el correlationId visible en los avisos de error. |
| PRU-08 | PARCIAL | Umbral global de cobertura en `karma.conf.js`. |
| PRU-11 | PARCIAL | Bordes 19/20/21 del tope de tomas y rechazo `TOM_004`. |
| PRU-13 | PARCIAL | Bordes del plazo de reclamo (último segundo válido y primer minuto vencido) en UTC y en America/Bogota. |
| PRU-14 | PARCIAL | El semáforo compara después de redondear a dos decimales (decisión 3A) y prueba 19,99 / 19,995 / 20,00 / 20,01. |
| PRU-03 | CUMPLE (mejora) | Prueba del frontend contra el OpenAPI golden path. |
| CF-04 | CUMPLE (mejora) | CSP sin JavaScript en línea. |
| EST-10 | CUMPLE (mejora) | Bundle inicial bajo el presupuesto de 500 kB. |
| EST-11 | CUMPLE (mejora) | Lote de avisos de ESLint y reglas a `error`. |
| MSG-02 | CUMPLE (mejora) | Proveedor de mensajes por ambiente documentado (ver VALIDATION.md). |
| PRU-06, SEC-05, SEC-08, EST-07, EST-08, TRI-03 | Configuración de GitHub | Revisar y completar la protección de `develop`. |

## Fuera de alcance (depende de otros equipos o de una decisión)

- **MSG-06 y MSG-03:** llevar los textos de `mensajes-ui.ts` al catálogo de MessageUcoLab. La ruta pública de
  MessageUcoLab es por código y limita a 120 peticiones por minuto por IP, así que el navegador no puede cargar los ~130
  textos por su cuenta. Hace falta una ruta del backend que los entregue en lote (contrato, PDP y backend) y sembrar los
  códigos `UI_*` en MessageUcoLab y en la BD. Se deja para decisión de John y José Alejandro.
- **CF-04, `style-src 'unsafe-inline'`:** Security UI y minifront-mensajes inyectan `<style>` en su shadow DOM sin soporte
  de nonce. Quitarlo depende de esos equipos.
- **EST-11, `no-explicit-any`:** queda en `warn` con 315 avisos (siguiente lote).
- **F12-06 / REA-04:** rotación del QR por SSE con 2 réplicas (bus distribuido en el backend).
