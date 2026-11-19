# TEST_PLAN — HU008-oferta-grupos-estudiante

**Specs:**
- `student-group-offer.component.spec.ts`
- `oferta-academica.service.spec.ts`
- el caso MK-08 de `mock-backend.interceptor.spec.ts`

| ID | Escenario | Esperado |
|---|---|---|
| OF-01 | Carga inicial | 4 tarjetas con los cupos "5 de 30", el horario o "Sin horario registrado", el estado "Próximo", el texto "lista de espera" cuando no hay cupo y las etiquetas "Transversal · Institucional" y "Transversal · Básica" |
| OF-02b | Grupo no matriculado con cupo | Sin `solicitar-ingreso` ni texto "Solicitar ingreso"; muestra `oferta-como-matricularse` |
| OF-03b | Grupo matriculado | Muestra "Ya estás matriculado" y no el texto informativo |
| OF-04b | Sin solicitudes | El componente no inyecta el servicio de solicitudes y solo hace `GET` de la oferta |
| OF-05 | Búsqueda | Consulta con debounce y vuelve a la página 1 |
| OF-06 | Tamaño de página | Vuelve a la página 1 |
| OF-07 | Error 403 | Alerta visible y lista vacía |
| OS-01 / OS-02 | Servicio | Paginación, búsqueda recortada, sin búsqueda vacía y sin toast global |
| MK-08 | Mock | Oferta con 2 grupos y sin campos de solicitud de ingreso |

## RED_SNAPSHOT

| Campo | Valor |
|---|---|
| Base commit | `f010db3` |
| Fallo esperado | `StudentGroupOfferComponent` y `OfertaAcademicaService` inexistentes |
| Comando | `npm run test:ci` |
