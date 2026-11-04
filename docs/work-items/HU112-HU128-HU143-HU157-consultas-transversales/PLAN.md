# HU112-HU128-HU143-HU157-consultas-transversales — Programas y créditos, docentes, asignaturas y ficha unificada

## Objetivo

Pantallas de solo lectura para el decano y el administrador. Las pantallas existentes del portal (de otro integrante) solo reciben cambios acotados.

## Alcance y límites

- El contrato HTTP, las decisiones (D1-D7) y la validación de las 3 capas están en el work item homónimo del backend (`docs/work-items/HU112-HU128-HU143-HU157-consultas-transversales/`).
- Sin cambios en `SecurityConfig` ni en contratos existentes. Las rutas, las entradas de menú y los archivos nuevos son aditivos.

## Pantallas, servicios y simulación

- **HU112:** `DeanProgramasCreditosComponent` (tabla unificada, filtro y paginación en el navegador) dentro de `DeanProgramasComponent`. La pantalla pide `GET /decano/programas-creditos` una vez (`tamano=100`, más páginas si la facultad las tiene) y de ahí toman las tarjetas los créditos y las asignaturas. Ya no se pide la malla de cada plan.
- **HU128:** `DeanDocentesComponent` (`/app/decano/docentes`, menú "Docentes de la Facultad"). El selector de programa sale de `/decano/estructura`.
- **HU143:** `DeanAsignaturasComponent` en `/app/decano/asignaturas` (facultad del decano) y en `/app/admin/asignaturas` con `data.comoAdministrador` (toda la institución, con selector de facultad de `/admin/facultades`).
- **HU157:** `AdminEstudiantesComponent` (`/app/admin/estudiantes`, buscador y ficha) y `HistorialEstudianteComponent` (compartido), que también se muestra en la ficha de `DeanEstudiantesComponent`.
- `ConsultasTransversalesService` y `consultas-transversales.model.ts`. `parametros()` de `DeanFacultadService` se exporta y se reutiliza.
- `ListadoPaginado<T>` (`shared/utils`): estado y carga común de los listados paginados, para no repetir la misma suscripción en cada pantalla (SonarCloud: menos de 3 % de duplicación en código nuevo).
- Modo mock: `core/mocks/mock-consultas-transversales.ts`, invocado desde el interceptor antes de la ruta genérica `/decano/estudiantes/{id}`.

## Archivos de otros integrantes que se tocan (aviso a Sergio)

- `app.routes.ts` y `dashboard-layout.component.ts`: 4 rutas y 4 entradas de menú nuevas (aditivas).
- `dean-programas.component.ts`: tabla nueva y créditos de las tarjetas desde la tabla. Se eliminó la carga de la malla por plan; `mallaCargada()` pasa a llamarse `creditosCargados()`.

## Rollback

Revertir los commits del work item; el frontend no tiene migraciones de datos.
