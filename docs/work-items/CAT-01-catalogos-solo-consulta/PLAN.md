# CAT-01-catalogos-solo-consulta — Catálogos base de solo consulta

Regla de John (2026-11-04): los catálogos base (tipos de documento, tipos de programa, áreas, semestres, componentes, perfiles, estados, razones y días) se cargan por seed y la app no los crea, edita ni cambia de estado. Contrato y validación de las 3 capas: work item homónimo del backend.

## Cambios

- **HU153:** se quitan `AdminTiposDocumentoComponent` (+ spec) y los métodos `crearTipoIdentificacion` y `actualizarTipoIdentificacion` de `CatalogService`. La consulta de tipos de documento sigue en los formularios de registro.
- **HU154 (Sergio):** `AdminCatalogsComponent` (`/app/admin/catalogos`, menú "Tipos de Programa") queda como tabla de consulta.
- **HU151 y HU152 (Sergio):** `AdminAreasComponent` (`/app/admin/areas`) queda como tabla de consulta.
- **Componente compartido nuevo:** `CatalogoSoloConsultaComponent` (`shared/components/catalogo-solo-consulta`). Lo usan las dos pantallas para no duplicar la tabla (SonarCloud).
- **`AdminManagementService`:** sin `crear`, `actualizar` ni `cambiarEstado` de áreas y tipos de programa; se conservan `cargarAreas()` y `cargarTiposPrograma()`.
- **Interceptor mock:** se quitan las simulaciones de `POST`, `PUT` y `PATCH` de áreas.

## Rollback

Revertir el commit del work item.
