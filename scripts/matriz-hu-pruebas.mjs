#!/usr/bin/env node
// VAL PRU-09 (lado frontend): matriz de trazabilidad Historia de Usuario -> pruebas del frontend.
//
//   node scripts/matriz-hu-pruebas.mjs           compuerta (npm run verify y CI): falla si la matriz versionada no
//                                                coincide con las pruebas actuales
//   node scripts/matriz-hu-pruebas.mjs --write   regenera docs/testing/MATRIZ_HU_PRUEBAS_FRONTEND.md
//
// Una prueba cuenta para una HU cuando su archivo (*.spec.ts de src/ o de e2e/) cita el codigo HU### en el titulo de
// un describe/it o en un comentario. La matriz es la columna "Pruebas (frontend)" que la HU-CATALOG de Infra puede enlazar.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const raiz = process.cwd();
const salida = join(raiz, 'docs', 'testing', 'MATRIZ_HU_PRUEBAS_FRONTEND.md');
const escribir = process.argv.includes('--write');
const HU = /\bHU(\d{3})([A-Z]?)\b/g;

function listar(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const nombre of readdirSync(dir)) {
    const p = join(dir, nombre);
    if (statSync(p).isDirectory()) listar(p, out);
    else if (nombre.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

const archivos = [...listar(join(raiz, 'src')), ...listar(join(raiz, 'e2e'))].sort();
const porHu = new Map();
let conHu = 0;
for (const archivo of archivos) {
  const texto = readFileSync(archivo, 'utf8');
  const codigos = new Set([...texto.matchAll(HU)].map((m) => `HU${m[1]}${m[2]}`));
  if (codigos.size === 0) continue;
  conHu++;
  const pruebas = [...texto.matchAll(/\b(?:it|test)\(\s*['"`]/g)].length;
  const ruta = relative(raiz, archivo).split(sep).join('/');
  const capa = ruta.startsWith('e2e/') ? 'E2E' : 'unitaria';
  for (const codigo of codigos) {
    if (!porHu.has(codigo)) porHu.set(codigo, []);
    porHu.get(codigo).push({ ruta, pruebas, capa });
  }
}

const orden = (a, b) => a.localeCompare(b, 'en', { numeric: true });
const filas = [...porHu.keys()].sort(orden).map((codigo) => {
  const lista = porHu.get(codigo);
  const total = lista.reduce((n, a) => n + a.pruebas, 0);
  const capas = [...new Set(lista.map((a) => a.capa))].sort().join(', ');
  const enlaces = lista.map((a) => `\`${a.ruta}\` (${a.pruebas})`).join('<br>');
  return `| ${codigo} | ${capas} | ${lista.length} | ${total} | ${enlaces} |`;
});

const md = [
  '# Matriz HU → pruebas del frontend (VAL PRU-09)',
  '',
  'Generada por `scripts/matriz-hu-pruebas.mjs --write`; no editar a mano. `npm run verify` falla si queda desactualizada.',
  'Una prueba cuenta para una HU cuando su archivo cita el código HU en un `describe`/`it` o en un comentario; el número entre',
  'paréntesis es la cantidad de casos (`it`/`test`) del archivo. Esta tabla es la columna "Pruebas (frontend)" de la',
  'HU-CATALOG (`AsistenciasUCO-Infra/docs/user-stories/HU-CATALOG.md`).',
  '',
  `Resumen: ${porHu.size} HU con pruebas en ${conHu} de ${archivos.length} archivos de prueba.`,
  '',
  '| HU | Capa | Archivos | Casos | Pruebas |',
  '|---|---|---|---|---|',
  ...filas,
  '',
].join('\n');

if (escribir) {
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, md);
  console.log(`MATRIZ_HU_PRUEBAS_WRITTEN hu=${porHu.size} archivos=${conHu}/${archivos.length}`);
} else if (!existsSync(salida) || readFileSync(salida, 'utf8') !== md) {
  console.error('MATRIZ_HU_PRUEBAS_FAIL docs/testing/MATRIZ_HU_PRUEBAS_FRONTEND.md no esta al dia (corre: npm run sync:matriz-hu).');
  process.exitCode = 1;
} else {
  console.log(`MATRIZ_HU_PRUEBAS_PASS hu=${porHu.size} archivos=${conHu}/${archivos.length}`);
}
