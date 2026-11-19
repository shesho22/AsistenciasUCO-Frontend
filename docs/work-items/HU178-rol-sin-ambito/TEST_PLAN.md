# TEST_PLAN — HU178: Rol sin ámbito, ajustes tras la prueba en pantalla (frontend)

## Pruebas unitarias

| Archivo | Casos |
|---|---|
| `src/app/app.routes.spec.ts` | `decano/revisiones-cancelacion` lleva `roleGuard` y después `decanoConFacultadGuard`; `coordinador/revisiones-cancelacion` y `coordinador/solicitudes-sesion` llevan `roleGuard` y después `coordinadorConProgramaGuard` (se suman a las rutas que ya se verificaban). `decano/periodos` conserva `roleGuard` y **no** lleva `decanoConFacultadGuard` (calendario institucional). Se retiraron los casos que afirmaban que Revisiones no se bloqueaba. |
| `src/app/features/dashboard/overview/overview.component.spec.ts` | Decano sin facultad: el encabezado no tiene «Gestionar Coordinadores» (ni el `data-testid` ni el enlace a `/app/decano/mi-facultad/coordinadores`), la frase queda en «Decanatura — <departamento>.» y el aviso del panel sigue. Decano con facultad: el enlace y la frase completa siguen. Coordinador sin programa: sin «Gestionar Docentes» ni «Planes de Estudio y Malla», frase recortada y aviso presente. Coordinador con programa: los dos enlaces (`/app/coordinador/programa/docentes`, `/app/coordinador/planes-estudio`) y la frase completa. Perfil sin vínculos informados (`undefined`): no se presume la falta y las acciones se muestran. Decano con solo un vínculo de COORDINADOR: cuenta la entidad del rol activo y las acciones se ocultan. |

## Gates

1. `npx tsc --noEmit -p tsconfig.spec.json`, `npm run lint`.
2. `npm run lint:tokens`, `npm run check:mensajes-ui`, `npm run check:mensajes-ui-catalogo`, `npm run check:hu-en-ui`,
   `npm run check:matriz-hu` (con `npm run sync:matriz-hu` si cambian los conteos), `npm run check:openapi-contract`,
   `npm run check:retiro-solicitudes`, `npm run check:registro-individual`.
3. `ng test` de los specs cambiados de esta rama (los dos de HU178 y los seis de HU074).
4. `npm run build -- --configuration=production`.

## Prueba manual (pendiente de repetir con los ajustes)

Con el decano sin facultad y el coordinador sin programa de prueba:

1. Panel principal: el encabezado no muestra botones de acción y la frase solo dice «Decanatura — Sin facultad
   asignada.» / «Coordinación Académica — Sin programa asignado.»; el aviso informativo de abajo sigue.
2. Menú → Revisiones de cancelación: lleva al aviso del rol (`/app/decano/sin-facultad` o
   `/app/coordinador/sin-programa`) en lugar de la lista vacía.
3. Decano → Períodos: sigue mostrando el calendario institucional.
4. Con un decano y un coordinador con entidad: encabezado con sus botones y Revisiones de cancelación con su lista.
