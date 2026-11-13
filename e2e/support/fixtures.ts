import { expect, Page, test as base } from '@playwright/test';

/**
 * PRU-06 (VAL oleada 3): utilidades comunes de las pruebas E2E.
 *
 * Las cuentas son las del backend simulado (src/app/core/mocks/user.mock.ts). En modo mock el formulario legacy
 * resuelve el rol por el correo y no valida la contrasena: no hay credenciales reales en estas pruebas.
 */
export type Rol = 'ADMINISTRADOR' | 'DECANO' | 'COORDINADOR' | 'DOCENTE' | 'ESTUDIANTE';

export interface CuentaPrueba {
  rol: Rol;
  correo: string;
  nombre: string;
  /** Ruta a la que el login lleva a este rol (AuthService.navigateForRole). */
  inicio: RegExp;
  /** Encabezado principal visible en la pagina de inicio del rol. */
  encabezadoInicio: string;
  /** Enlaces de modulos que el menu lateral debe ofrecer al rol. */
  modulos: string[];
}

export const CUENTAS: Record<Rol, CuentaPrueba> = {
  ADMINISTRADOR: {
    rol: 'ADMINISTRADOR',
    correo: 'admin.sistemas@uco.edu.co',
    nombre: 'Carlos Alberto Restrepo',
    inicio: /\/app\/admin\/personas\/decanos$/,
    encabezadoInicio: 'Gestión de Decanos',
    modulos: ['Personas', 'Estructura', 'Configuración', 'Indicadores'],
  },
  DECANO: {
    rol: 'DECANO',
    correo: 'decano.ingenieria@uco.edu.co',
    nombre: 'Dr. Juan Carlos Gómez Pérez',
    inicio: /\/app\/decano\/mi-facultad\/coordinadores$/,
    encabezadoInicio: 'Mi facultad',
    modulos: ['Mi Facultad', 'Seguimiento', 'Directorio', 'Períodos Académicos'],
  },
  COORDINADOR: {
    rol: 'COORDINADOR',
    correo: 'coordinador.sistemas@uco.edu.co',
    nombre: 'Ing. Andrés Felipe López Martínez',
    inicio: /\/app\/coordinador\/programa\/docentes$/,
    encabezadoInicio: 'Programa',
    modulos: ['Asistencia', 'Programa', 'Planes de Estudio', 'Estudiantes del Programa'],
  },
  DOCENTE: {
    rol: 'DOCENTE',
    correo: 'maria.rostagno@uco.edu.co',
    nombre: 'Dra. María Elena Rostagno',
    inicio: /\/app\/docente\/grupos$/,
    encabezadoInicio: 'Gestión Integral de Grupos y Sesiones',
    modulos: ['Mis Grupos', 'Tomar Asistencia', 'Reclamos', 'Mis Horarios'],
  },
  ESTUDIANTE: {
    rol: 'ESTUDIANTE',
    correo: 'carlos.zapata@uco.edu.co',
    nombre: 'Carlos Andrés Zapata Gómez',
    inicio: /\/app\/estudiante\/mis-materias\/horarios$/,
    encabezadoInicio: 'Mi Horario de Clases',
    modulos: ['Mis Materias', 'Mis Reclamos', 'Mis Alertas'],
  },
};

/**
 * Prueba base: bloquea cualquier peticion fuera del origen bajo prueba (el modo mock no debe salir a la red) y falla
 * si la pagina lanza una excepcion no controlada.
 */
export const test = base.extend<{ erroresPagina: Error[] }>({
  erroresPagina: [
    async ({ page, baseURL }, use) => {
      // E2E_ALLOWED_ORIGINS (separados por coma) habilita otros origenes al apuntar a un entorno desplegado.
      const permitidos = [
        new URL(baseURL ?? 'http://127.0.0.1').origin,
        ...(process.env['E2E_ALLOWED_ORIGINS'] ?? '').split(',').map((o) => o.trim()).filter(Boolean),
      ];
      await page.route('**/*', (route) => {
        const url = route.request().url();
        if (permitidos.some((o) => url.startsWith(o)) || url.startsWith('data:') || url.startsWith('blob:')) {
          return route.fallback();
        }
        return route.abort('blockedbyclient');
      });
      const errores: Error[] = [];
      page.on('pageerror', (error) => errores.push(error));
      await use(errores);
      expect(errores.map((e) => e.message), 'excepciones no controladas en la pagina').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Inicia sesion con el formulario de login (proveedor legacy en modo mock) y espera la pagina de inicio del rol. */
export async function iniciarSesion(page: Page, rol: Rol): Promise<CuentaPrueba> {
  const cuenta = CUENTAS[rol];
  await page.goto('/login');
  await page.getByLabel('Correo Institucional').fill(cuenta.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-de-prueba-e2e');
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page).toHaveURL(cuenta.inicio);
  await expect(page.getByRole('complementary').getByText(cuenta.nombre, { exact: true })).toBeVisible();
  return cuenta;
}

/**
 * Navega dentro de la SPA sin recargar la pagina (como un enlace del router). En modo mock una recarga completa vuelve a
 * iniciar la sesion simulada con el rol por defecto (DOCENTE), por eso las rutas que no estan en el menu se abren asi.
 */
export async function navegarEnApp(page: Page, ruta: string): Promise<void> {
  await page.evaluate((destino) => {
    window.history.pushState({}, '', destino);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }, ruta);
}

/** Abre un modulo desde el menu lateral. */
export async function abrirModulo(page: Page, nombre: string): Promise<void> {
  await page.getByRole('complementary').getByRole('navigation').getByRole('link', { name: nombre, exact: true }).click();
}
