---
status: active
type: work-item
scope: frontend
owner: fullstack-team
last-reviewed: 2026-11-10
---

# CERT-CULM001-CORRECCIONES — Correcciones de la certificación de CULM-001

El origen, el contrato y las correcciones del backend (HU026C, HU171 y el estado con varias tomas) están en el work item homónimo del backend.

## Cambios

- **HU156 (admisión del estudiante por el administrador):**
  - `AdmisionEstudianteModalComponent` enviaba `numeroIdentificacion` como texto y el backend lo espera entero, así que respondía `FIELD_INVALID_TYPE`.
  - Ahora valida un entero positivo sin ceros a la izquierda y de hasta 2.147.483.647 (el máximo del `Integer` del backend) y lo envía como número.
  - `procesarError` leía `codigo` y `campo`, que no existen en el sobre de error. Ahora usa `getApiErrorCode`, `getApiErrorMessage` y `getApiFieldErrors` (`code`, `message`, `details[].field`). Un detalle de un campo del formulario se muestra junto a ese campo; los demás, como error general. `ADS_006` sigue mostrando el campo de contraseña.
- **HU007 (buscar en "Mis materias"):**
  - `StudentCoursesListComponent` agrega un campo de búsqueda que filtra por nombre, código, grupo o docente, sin distinguir tildes ni mayúsculas.
  - Muestra cuántas materias coinciden ("1 de 3 materias"). Sin coincidencias, avisa con el texto buscado en vez de decir que no hay materias matriculadas.
  - Cada búsqueda vuelve a la página 1, y la paginación cuenta solo las materias filtradas.
- **Estado PARCIAL (hallazgo alto de varias tomas):**
  - El backend ya marca `PARCIAL` como reclamable. `ESTADOS_RECLAMABLES` del mapper ahora lo incluye, y `enviarReclamo` dejó de bloquearlo.
  - La solicitud local registra `estadoOriginal = AUSENTE`, porque el reclamo es por la toma ausente. Ese dato no viaja al backend.
  - La insignia PARCIAL explica al pasar el cursor que en alguna toma el estudiante quedó ausente.
- **HU177 (recuperar contraseña), solo el botón:** el login muestra "¿Olvidaste tu contraseña?" en los dos modos de acceso. Al pulsarlo informa que la recuperación por correo aún no está habilitada y que el restablecimiento lo hace el administrador de la plataforma. No llama al backend ni al proveedor de identidad. La HU sigue PENDIENTE: falta activar `resetPasswordAllowed` y el SMTP en Keycloak, que son del equipo de seguridad (decisión de John del 2026-11-09).

### Hallazgos de la recertificación (2026-11-10)

- **"Ver detalle de la materia" en Mis Alertas (HU026C):**
  - El botón navegaba a `/app/estudiante/materias/{id}`, una ruta que no existe, y terminaba en "404 · Página no encontrada".
  - Ahora navega a la pestaña "Materias" de "Mis materias" con `?materia=<idAsignatura>&grupo=<idGrupo>`.
  - `StudentCoursesComponent` abre el detalle de esa materia cuando llegan las materias, una sola vez. Solo busca entre las materias del propio estudiante: un identificador ajeno, desconocido o mal formado deja la lista.
- **Clave inicial en la admisión (HU156):**
  - Con una persona nueva el backend responde `ERR_PASSWORD_REQUERIDO` antes de llegar a la BD, y el formulario solo abría el campo de la clave con `ADS_006`. Salía "La clave es obligatoria." sin campo donde escribirla.
  - Ahora los dos códigos abren el campo y dejan el mensaje junto a él.
- **Documento inválido en la admisión (HU156):** con un documento como `12a4` el botón quedaba deshabilitado sin explicación. Ahora el campo dice que solo admite números, sin puntos, espacios ni ceros al inicio.
- **Sin cambio, decide John:** el estudiante admitido sin grupo no aparece en Personas → Estudiantes. La causa está en la BD y se explica en el work item homónimo del backend.
- **Sin cambio, se avisa a Sergio:** el diálogo del coordinador para resolver una cancelación abre con "Aprobar cancelación" marcado y envía sin confirmar.

## Pruebas

- `student-alerts.component.spec.ts`: el botón navega a la pestaña "Materias" con la materia y el grupo; nunca a la ruta inexistente; sin grupo envía solo la materia; sin asignatura abre la lista.
- `student-courses.component.spec.ts`: el enlace abre el detalle del grupo pedido; con solo la materia abre su primer grupo; un grupo ajeno cae al propio; una materia ajena o un identificador inválido dejan la lista; el enlace se usa una sola vez.
- `admision-estudiante-modal.component.spec.ts`: envía el documento como entero; rechaza `abc`, `12a4`, `0123`, `99999999999` y `2147483648` y acepta `2147483647`; muestra `FIELD_INVALID_TYPE` en su campo; un detalle ajeno al formulario va al error general; `ERR_PASSWORD_REQUERIDO` abre el campo de la clave; un documento inválido muestra su aviso. Las pruebas de error usan el sobre real.
- `student-courses-list.component.spec.ts`: el campo tiene etiqueta accesible; filtra por nombre sin tildes, código, grupo y docente; sin coincidencias avisa, no muestra "sin materias" y vuelve a la página 1.
- `student-portal.mapper.spec.ts`, `student-course-detail.component.spec.ts` y `student-courses.component.spec.ts`: PARCIAL reclamable ofrece "Radicar Reclamo" y se radica; `NO_DISPONIBLE` nunca se radica.
- `login.component.spec.ts`: el botón aparece en los dos modos, solo informa y no aparece si la configuración de seguridad es inválida.

## Rollback

Revertir el commit del work item.
