# HU159-correccion-identidad-usuarios — Corrección de identidad por jerarquía

Contrato y validación de las 3 capas: work item homónimo del backend.

## Cambios

- **Común:**
  - `CorreccionIdentidadService`: configuración cacheada (`GET /configuracion/identidad`) y los dos PUT de corrección.
  - `app-correccion-documento`: documento y motivo. Si el parámetro está apagado o el catálogo de tipos falla, muestra el documento de solo lectura. Avisa que el documento es el usuario de acceso.
  - `app-correccion-identidad-modal`: nombres, apellidos, documento y motivo obligatorio.
- **Estudiante:** botón "Corregir datos" en `CoordinatorFichaModalComponent`. Al guardar recarga la ficha; si la sincronización queda pendiente, muestra un aviso.
- **Decano:** botón "Corregir datos" en `AdminDecanosComponent`. Al guardar recarga la lista.
- **HU121 y HU092 (pantallas de Sergio, cambio acotado):**
  - `DeanCoordinadorEditModalComponent` y `CoordinatorDocenteEditModalComponent` reemplazan el texto "Documento (no se puede modificar)" por `app-correccion-documento`.
  - Solo envían el documento y el motivo cuando el documento cambia.

## Rollback

Revertir el commit del work item. Sin desplegar: con el parámetro `IDENTIDAD.PERMITIR_CORREGIR_DOCUMENTO` en 0, los campos de documento no aparecen.
