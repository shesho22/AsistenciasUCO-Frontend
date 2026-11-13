import { defineConfig, devices } from '@playwright/test';

/**
 * PRU-06 (VAL oleada 3): pruebas E2E por rol con Playwright (solo Chromium).
 *
 * Por defecto levanta e2e/support/serve-dist.mjs, que sirve el build de produccion con el backend simulado
 * (USE_MOCKS) y sin Keycloak: corre en CI sin backend. Para apuntar a un entorno ya desplegado se fija
 * E2E_BASE_URL y no se levanta ningun servidor (ver docs/work-items/VAL-oleada3-e2e/PLAN.md).
 */
const externalBaseUrl = process.env['E2E_BASE_URL'];
const port = Number(process.env['E2E_PORT'] || 4300);
const baseURL = externalBaseUrl || `http://127.0.0.1:${port}`;
const isCi = !!process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `node e2e/support/serve-dist.mjs ${port}`,
        url: `${baseURL}/login`,
        reuseExistingServer: !isCi,
        timeout: 30_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
