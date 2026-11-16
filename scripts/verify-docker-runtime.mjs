import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const image = process.argv[2] ?? 'asistencias-uco-frontend-ci';
const container = `asistencias-frontend-env-${process.pid}`;
const values = {
  API_URL: 'http://backend.test/api/v1',
  KEYCLOAK_URL: 'http://keycloak.test:8080',
  KEYCLOAK_REALM: 'security-baseline',
  KEYCLOAK_CLIENT_ID: 'asistencias-uco-frontend',
  USE_MOCKS: 'false',
  SECURITY_PROVIDER: 'baseline',
  SECURITY_BASELINE_URL: 'http://pdp.test:18080',
  SECURITY_BASELINE_UI_URL: 'http://security-ui.test:5175',
  SECURITY_BASELINE_APPLICATION_ID: 'application-test',
  SECURITY_BASELINE_ISSUER_URL: 'http://keycloak.test:19090/realms/security-baseline',
  SECURITY_BASELINE_CLIENT_ID: 'asistencias-uco-spa',
};

function runDocker(args, options = {}) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertRenderedEnv(envJs, source) {
  assert(envJs.length > 0, `${source}: env.js está vacío.`);
  assert(!/\$\{[^}]+}/.test(envJs), `${source}: env.js conserva expresiones sin sustituir.`);
  for (const [name, value] of Object.entries(values)) {
    assert(
      envJs.includes(`window.env['${name}'] = '${value}';`),
      `${source}: falta ${name}=${value} en env.js.`,
    );
  }
}

let containerStarted = false;
try {
  runDocker(['image', 'inspect', image]);

  runDocker([
    'run', '-d', '--name', container,
    ...Object.entries(values).flatMap(([name, value]) => ['-e', `${name}=${value}`]),
    image,
  ]);
  containerStarted = true;

  let envJs = '';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      envJs = runDocker(['exec', container, 'cat', '/usr/share/nginx/html/assets/env.js']);
      break;
    } catch {
      await delay(500);
    }
  }
  assertRenderedEnv(envJs, 'contenedor Nginx');

  // VAL CF-04: la CSP generada no permite JavaScript en linea y el index no trae manejadores de evento en linea.
  const csp = runDocker(['exec', container, 'cat', '/etc/nginx/snippets/csp.conf']);
  const politica = (/Content-Security-Policy "([^"]+)"/.exec(csp) ?? [])[1] ?? '';
  const directivas = new Map(
    politica.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const [nombre, ...fuentes] = d.split(/\s+/);
      return [nombre, fuentes];
    }),
  );
  for (const nombre of ['script-src', 'script-src-attr', 'script-src-elem', 'default-src']) {
    assert(!(directivas.get(nombre) ?? []).includes("'unsafe-inline'"), `CSP: ${nombre} permite 'unsafe-inline'.`);
    assert(!(directivas.get(nombre) ?? []).includes("'unsafe-eval'"), `CSP: ${nombre} permite 'unsafe-eval'.`);
  }
  assert((directivas.get('script-src-attr') ?? []).join(' ') === "'none'", "CSP: script-src-attr debe ser 'none'.");
  for (const [nombre, valor] of [['object-src', "'none'"], ['frame-ancestors', "'none'"], ['base-uri', "'self'"]]) {
    assert((directivas.get(nombre) ?? []).join(' ') === valor, `CSP: ${nombre} debe ser ${valor}.`);
  }
  // Comparacion exacta de origenes (URL parseada), no de subcadenas: cada fuente de connect-src es un origen completo.
  const origenApi = new URL(values.API_URL).origin;
  const origenesConnect = new Set(
    (directivas.get('connect-src') ?? [])
      .filter((fuente) => /^https?:\/\//.test(fuente))
      .map((fuente) => new URL(fuente).origin),
  );
  assert(origenesConnect.has(origenApi), `CSP: connect-src no incluye el origen del API (${origenApi}).`);
  // Los micro frontends remotos (Security UI) se cargan como modulos JavaScript desde su propio origen: sin ese origen
  // en script-src el navegador bloquea la consola de seguridad y muestra "no disponible".
  const origenSecurityUi = new URL(values.SECURITY_BASELINE_UI_URL).origin;
  const origenesDe = (nombre) => new Set(
    (directivas.get(nombre) ?? []).filter((fuente) => /^https?:\/\//.test(fuente)).map((fuente) => new URL(fuente).origin),
  );
  for (const nombre of ['script-src', 'connect-src', 'style-src']) {
    assert(origenesDe(nombre).has(origenSecurityUi), `CSP: ${nombre} no incluye el origen de Security UI (${origenSecurityUi}).`);
  }
  const index = runDocker(['exec', container, 'cat', '/usr/share/nginx/html/index.html']);
  assert(!/<[^>]+\son[a-z]+\s*=/i.test(index), 'index.html trae un manejador de evento en linea (onload/onclick).');

  const compose = runDocker(['compose', '-f', 'docker-compose.yml', 'config'], {
    env: { ...process.env, ...values },
  });
  assert(!/\$\{[^}]+}/.test(compose), 'Docker Compose conserva variables sin resolver.');
  for (const value of [
    values.KEYCLOAK_URL,
    values.KEYCLOAK_REALM,
    values.SECURITY_BASELINE_URL,
    values.SECURITY_BASELINE_UI_URL,
    values.SECURITY_BASELINE_APPLICATION_ID,
    values.SECURITY_BASELINE_ISSUER_URL,
    values.SECURITY_BASELINE_CLIENT_ID,
  ]) {
    assert(compose.includes(value), `Docker Compose no conserva el valor ${value}.`);
  }
  assert(compose.includes('SECURITY_PROVIDER: baseline'), 'Compose no queda configurado en modo baseline.');

  console.log(`DOCKER_RUNTIME_ENV_PASS image=${image}`);
  console.log('DOCKER_RUNTIME_CSP_PASS script-inline=none');
  console.log('COMPOSE_SECURITY_WIRING_PASS oauth=oidc keycloak=bff-pep-pdp security-ui');
} catch (error) {
  console.error(`DOCKER_RUNTIME_ENV_FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (containerStarted) {
    try {
      runDocker(['rm', '-f', container]);
    } catch (error) {
      console.error(`DOCKER_RUNTIME_CLEANUP_FAIL: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
