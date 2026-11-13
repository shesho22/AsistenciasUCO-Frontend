import { abrirModulo, expect, iniciarSesion, navegarEnApp, test } from './support/fixtures';

// PRU-06: recorridos principales por rol sobre el backend simulado. Cada prueba arranca con una pagina nueva, asi que el
// estado del mock (mockStore) empieza siempre igual y las pruebas no dependen entre si.

test.describe('Administrador', () => {
  test('gestiona periodos academicos: lista y crea un periodo nuevo', async ({ page }) => {
    await iniciarSesion(page, 'ADMINISTRADOR');
    await navegarEnApp(page, '/app/admin/periodos');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Períodos Académicos' })).toBeVisible();
    await expect(main.getByText('3 Períodos')).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Segundo Semestre Académico 2026' })).toBeVisible();

    await main.getByRole('button', { name: '+ Nuevo Período Académico' }).click();
    // PR #91: el alta se hace en el diálogo "Nuevo período académico" (academic-period-form-modal).
    const dialogo = page.getByRole('dialog', { name: 'Nuevo período académico' });
    await expect(dialogo).toBeVisible();
    await dialogo.getByLabel(/Nombre del período/).fill('2027-2');
    await dialogo.getByLabel(/Fecha de inicio/).fill('2027-08-01');
    await dialogo.getByLabel(/Fecha de fin/).fill('2027-12-10');
    await dialogo.getByRole('button', { name: 'Crear período' }).click();

    await expect(main.getByText('4 Períodos')).toBeVisible();
    await expect(main.getByText('2027-2', { exact: false }).first()).toBeVisible();
    await expect(dialogo).toBeHidden();
  });
});

test.describe('Decano', () => {
  test('consulta el seguimiento de su facultad por pestañas', async ({ page }) => {
    await iniciarSesion(page, 'DECANO');
    await abrirModulo(page, 'Seguimiento');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Seguimiento' })).toBeVisible();
    const pestanas = main.getByRole('tablist', { name: 'Secciones de Seguimiento' });
    await expect(pestanas.getByRole('tab', { name: 'Indicadores' })).toHaveAttribute('aria-selected', 'true');
    await expect(main.getByRole('heading', { name: 'Ausentismo por programa' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Aforo de grupos' })).toBeVisible();

    await pestanas.getByRole('tab', { name: 'Consolidado' }).click();
    await expect(page).toHaveURL(/\/app\/decano\/seguimiento\/consolidado$/);
    await expect(pestanas.getByRole('tab', { name: 'Consolidado' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Coordinador', () => {
  test('consulta los indicadores de asistencia del programa y filtra por materia', async ({ page }) => {
    await iniciarSesion(page, 'COORDINADOR');
    await abrirModulo(page, 'Asistencia');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Asistencia del programa' })).toBeVisible();
    await expect(main.getByText('2 Grupos')).toBeVisible();

    const tabla = main.getByRole('table');
    await expect(tabla.getByRole('columnheader', { name: '% Asistencia' })).toBeVisible();
    await expect(tabla.getByRole('row', { name: /Cálculo Diferencial Grupo 01/ })).toContainText('93.75%');
    await expect(tabla.getByRole('row', { name: /Estructuras de Datos Grupo 02/ })).toContainText('97.78%');

    await main.getByRole('combobox', { name: 'Materia' }).selectOption({ label: 'Cálculo Diferencial' });
    await expect(main.getByText('1 Grupos').or(main.getByText('1 Grupo', { exact: true }))).toBeVisible();
    await expect(tabla.getByRole('row', { name: /Estructuras de Datos Grupo 02/ })).toHaveCount(0);
    await expect(tabla.getByRole('row', { name: /Cálculo Diferencial Grupo 01/ })).toBeVisible();
  });
});

test.describe('Docente', () => {
  test('revisa la bandeja de reclamos de sus estudiantes', async ({ page }) => {
    await iniciarSesion(page, 'DOCENTE');
    await abrirModulo(page, 'Reclamos');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Reclamos y Justificaciones de Asistencia' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Revisar en Detalle' })).toHaveCount(3);
    await expect(main.getByRole('heading', { level: 3, name: 'Carlos Andrés Zapata Gómez' })).toBeVisible();

    await expect(main.getByRole('heading', { level: 3, name: 'Mateo Botero Hincapié' })).toBeVisible();
    // PC (puntos de control): la tarjeta muestra la toma reclamada.
    await expect(main.getByTestId('tarjeta-toma').filter({ hasText: 'Toma 2 · 04:00' })).toBeVisible();
    await expect(main.getByText('Pendiente de evaluación')).toHaveCount(2);
    await expect(main.getByText('Evaluado', { exact: true })).toHaveCount(1);
    // El filtro por estado y el detalle del reclamo dependen de rutas que el mock no simula (ver VALIDATION.md).
    await expect(main.getByRole('combobox', { name: 'Filtrar reclamos por estado' })).toBeVisible();
  });

  test('abre el control de asistencia con sus grupos', async ({ page }) => {
    await iniciarSesion(page, 'DOCENTE');
    await abrirModulo(page, 'Tomar Asistencia');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Control de Asistencia' })).toBeVisible();
    await expect(main.getByRole('heading', { level: 2, name: 'Historial y Cronograma de Sesiones' })).toBeVisible();
    const grupo = main.getByRole('combobox').first();
    await expect(grupo.getByRole('option', { name: 'MAT-301 - Matemática Avanzada III (Sección A)' })).toBeAttached();
    await expect(grupo.getByRole('option', { name: 'FIS-202 - Física Cuántica Aplicada (Sección B)' })).toBeAttached();
    await expect(main.getByRole('button', { name: '+ Nueva Sesión' })).toBeVisible();
  });
});

test.describe('Estudiante', () => {
  test('consulta sus reclamos y retira uno pendiente', async ({ page }) => {
    await iniciarSesion(page, 'ESTUDIANTE');
    await abrirModulo(page, 'Mis Reclamos');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Mis Reclamos' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Retirar' })).toHaveCount(2);
    await expect(main.getByText('Justificación válida y confirmada con la coordinación del semillero.')).toBeVisible();

    await main.getByRole('button', { name: 'Retirar' }).first().click();
    await expect(main.getByText('Retirada', { exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Retirar' })).toHaveCount(1);
  });

  test('radica un reclamo sobre una toma ausente y lo ve en Mis Reclamos', async ({ page }) => {
    await iniciarSesion(page, 'ESTUDIANTE');
    await abrirModulo(page, 'Mis Materias');

    const main = page.getByRole('main');
    await main.getByRole('tab', { name: 'Materias' }).click();
    await expect(main.getByRole('heading', { level: 1, name: 'Gestión de Mis Materias' })).toBeVisible();
    await main.getByRole('button', { name: 'Ver Detalle' }).first().click();
    await expect(main.getByRole('heading', { level: 2, name: 'Ingeniería de Software II' })).toBeVisible();

    await main.getByRole('button', { name: 'Reclamar la toma 1 de la sesión 3' }).click();
    await expect(main.getByRole('heading', { name: 'Solicitud de Revisión y Justificación de Asistencia' })).toBeVisible();

    const justificacion = 'E2E: el bus intermunicipal se varó y llegué después del primer llamado de lista.';
    const radicar = main.getByRole('button', { name: 'Radicar Reclamo' });
    await expect(radicar).toBeDisabled();
    await main.getByLabel('Categoría de Justificación *').selectOption({ label: 'Fuerza Mayor' });
    await main.getByLabel('Explicación detallada y justificación del reclamo *').fill(justificacion);
    await expect(radicar).toBeEnabled();
    await radicar.click();

    await expect(page.getByText('Solicitud de revisión registrada correctamente.')).toBeVisible();

    await abrirModulo(page, 'Mis Reclamos');
    await expect(main.getByRole('heading', { level: 1, name: 'Mis Reclamos' })).toBeVisible();
    // El reclamo nuevo queda pendiente, sobre la toma reclamada y retirable (el mock no devuelve el texto radicado).
    await expect(main.getByRole('button', { name: 'Retirar' })).toHaveCount(3);
    await expect(main.getByText('Toma 1 · 03:00', { exact: true })).toBeVisible();
  });
});
