# HU156 — aviso del admitido sin grupo

## Motivo

La admisión de HU156 vincula al estudiante con un programa, no con un grupo. La lista de Personas → Estudiantes se arma por grupos (`uv_estudiante`), así que el estudiante recién admitido no aparece ahí hasta que se inscriba en un grupo. En la certificación de CULM-001 esto quedó como hallazgo N3: el administrador admitía a alguien, veía "admitido exitosamente" y no lo encontraba en la lista.

## Decisión

John, 2026-11-11: se deja el comportamiento como está y se avisa en pantalla. Es coherente con su directriz del 2026-11-07 (el alta de un estudiante va atada a su ámbito, que es el grupo). Las alternativas descartadas fueron mostrar en la lista a los que solo tienen programa (cambia la consulta de estudiantes de la institución) y pedir el grupo en la admisión (cambia el contrato de la admisión).

## Cambio

Solo frontend, en `src/app/features/admin/admin-estudiantes/admision-estudiante-modal.component.ts`:

- Debajo del selector de programa, el formulario muestra: "Aparecerá en la lista de estudiantes cuando esté inscrito en un grupo." (`data-testid="aviso-admitido-sin-grupo"`).
- El mismo texto se agrega al mensaje de éxito de la admisión, tanto con la cuenta `ACTIVA` como con otro estado de cuenta.

No cambian el contrato HTTP, el backend ni la base de datos.

## Validación

| Paso | Resultado |
|---|---|
| `npm run verify` (`lint:tokens`, `test:ci`, `coverage:realtime:check`, `check:retiro-solicitudes`, `check:registro-individual`, `check:hu-en-ui` y build de producción), 2026-11-10 | exit 0; `TOTAL: 2692 SUCCESS`; build correcto con la advertencia de presupuesto ya conocida (519.19 kB sobre 512 kB) |
| Pruebas nuevas o ajustadas en `admision-estudiante-modal.component.spec.ts` | El aviso existe en el formulario; el mensaje de éxito y el de cuenta pendiente llevan el aviso |
| Revisión en pantalla con el administrador de prueba del lab, backend de `develop` y BD local al día, 2026-11-10 | El formulario muestra el aviso. Se admitió un estudiante de prueba (CC 970000303, programa Ingenieria de Sistemas, con clave inicial): `POST /api/v1/admin/estudiantes/admision` → 201; el mensaje fue "Estudiante admitido. La cuenta de acceso quedó en estado PENDIENTE_VERIFICACION. Aparecerá en la lista de estudiantes cuando esté inscrito en un grupo."; la lista siguió con 2 estudiantes, como se espera |

## Rollback

Revertir el commit. No hay datos ni contratos que deshacer.
