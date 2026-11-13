// PRU-06 (VAL oleada 3): servidor estatico minimo para las pruebas E2E.
// Sirve el build de produccion (dist/gestio-asistencia-frontend/browser) con fallback de SPA y reemplaza
// /assets/env.js por e2e/support/env.e2e.js (modo mock, proveedor legacy). El build y el env.js de produccion
// no cambian: la configuracion de prueba solo existe en este servidor.
// Uso: node e2e/support/serve-dist.mjs [puerto]   (por defecto 4300, o E2E_PORT)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..', '..', 'dist', 'gestio-asistencia-frontend', 'browser');
const envFile = resolve(here, 'env.e2e.js');
const port = Number(process.argv[2] || process.env.E2E_PORT || 4300);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

try {
  await stat(join(root, 'index.html'));
} catch {
  console.error(`[e2e] No existe ${root}/index.html. Ejecuta antes: npm run e2e:build`);
  process.exit(1);
}

async function send(res, file, status = 200) {
  const body = await readFile(file);
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (pathname === '/assets/env.js') {
      await send(res, envFile);
      return;
    }
    const candidate = normalize(join(root, pathname));
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      res.writeHead(400).end();
      return;
    }
    try {
      const info = await stat(candidate);
      if (info.isFile()) {
        await send(res, candidate);
        return;
      }
    } catch {
      // No es un archivo: cae al fallback de la SPA.
    }
    if (extname(pathname)) {
      res.writeHead(404).end();
      return;
    }
    await send(res, join(root, 'index.html'));
  } catch {
    res.writeHead(500).end();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[e2e] Sirviendo ${root} en http://127.0.0.1:${port}`);
});
