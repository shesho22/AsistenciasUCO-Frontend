import { CUENTAS, Rol, expect, iniciarSesion, navegarEnApp, test } from './support/fixtures';

// PRU-06: inicio de sesion por rol, pagina de inicio y cierre de sesion.

test.describe('Login', () => {
  test('muestra el formulario institucional y valida los campos obligatorios', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Gestió Asistencia UCO' })).toBeVisible();
    await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();

    await expect(page.getByText('Los campos Correo Institucional y Contraseña son obligatorios.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('rechaza un correo con formato invalido sin salir del login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo Institucional').fill('no-es-un-correo');
    await page.getByLabel('Contraseña', { exact: true }).fill('clave-de-prueba-e2e');
    await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();

    await expect(page.getByText(/debe tener un formato de correo válido/)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Inicio por rol', () => {
  for (const rol of Object.keys(CUENTAS) as Rol[]) {
    test(`${rol}: inicia sesion y ve su pagina de inicio con sus modulos`, async ({ page }) => {
      const cuenta = await iniciarSesion(page, rol);

      await expect(page.getByRole('main').getByRole('heading', { level: 1, name: cuenta.encabezadoInicio })).toBeVisible();
      await expect(page.getByRole('main').getByText(`Sesión activa como: ${rol}`)).toBeVisible();

      const menu = page.getByRole('complementary').getByRole('navigation');
      await expect(menu.getByText(`Módulos para ${rol}`)).toBeVisible();
      for (const modulo of cuenta.modulos) {
        await expect(menu.getByRole('link', { name: modulo, exact: true })).toBeVisible();
      }
    });
  }
});

test.describe('Cierre de sesion', () => {
  test('cierra la sesion y una ruta protegida vuelve al login con returnUrl', async ({ page }) => {
    await iniciarSesion(page, 'DOCENTE');

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Ingresar al Sistema' })).toBeVisible();

    await navegarEnApp(page, '/app/docente/grupos');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fapp%2Fdocente%2Fgrupos$/);
  });
});
