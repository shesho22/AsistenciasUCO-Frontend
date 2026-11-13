import { Rol, expect, iniciarSesion, navegarEnApp, test } from './support/fixtures';

// PRU-06: el roleGuard bloquea las rutas de otro rol con la pagina 403 y conserva la sesion.

const CASOS: Array<{ rol: Rol; rutaAjena: string }> = [
  { rol: 'ESTUDIANTE', rutaAjena: '/app/docente/reclamos' },
  { rol: 'DOCENTE', rutaAjena: '/app/admin/periodos' },
  { rol: 'COORDINADOR', rutaAjena: '/app/decano/seguimiento/indicadores' },
  { rol: 'DECANO', rutaAjena: '/app/coordinador/asistencia' },
  { rol: 'ADMINISTRADOR', rutaAjena: '/app/estudiante/reclamos' },
];

for (const { rol, rutaAjena } of CASOS) {
  test(`${rol} no puede abrir ${rutaAjena}`, async ({ page }) => {
    await iniciarSesion(page, rol);

    await navegarEnApp(page, rutaAjena);

    await expect(page).toHaveURL(/\/app\/acceso-denegado$/);
    const aviso = page.getByRole('main').getByRole('alert');
    await expect(aviso.getByRole('heading', { name: 'No tienes acceso a esta sección' })).toBeVisible();
    await expect(aviso.getByText('Tu sesión sigue activa.', { exact: false })).toBeVisible();
    await expect(page.getByText('Acceso denegado: No cuenta con los permisos necesarios para acceder a esta sección.')).toBeVisible();
    // La sesion se conserva: el menu sigue mostrando los modulos del mismo rol.
    await expect(page.getByRole('complementary').getByText(`Módulos para ${rol}`)).toBeVisible();
  });
}

test('una carga directa de una ruta ajena tambien termina en 403', async ({ page }) => {
  // En modo mock una carga completa abre la sesion simulada de DOCENTE (AuthService.initKeycloak).
  await page.goto('/app/admin/periodos');

  await expect(page).toHaveURL(/\/app\/acceso-denegado$/);
  await expect(page.getByRole('heading', { name: 'No tienes acceso a esta sección' })).toBeVisible();
});
