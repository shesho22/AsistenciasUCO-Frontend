#!/usr/bin/env node
// Compuerta de fuente VAL-oleada3 MSG-06 (lista de chequeo de validacion 2026-11-12): ningun toast escribe su texto.
// Los textos locales salen del catalogo src/app/core/messages/mensajes-ui.ts con mensajeUi('CODIGO', parametros) y los
// errores del backend se muestran con el texto que ya llega resuelto (getApiErrorMessage / mensajeUsuario).
// Falla (exit 1) si:
//   - un toast (toast/toastService .success/.error/.warning/.info) lleva un literal de texto fuera de mensajeUi(...); una
//     plantilla `${a} ${b}` que solo junta valores (sin texto propio) se acepta;
//   - un mensajeUi('CODIGO') usa un codigo que no esta en el catalogo.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const raiz = resolve(process.cwd(), 'src', 'app');
const archivoCatalogo = join(raiz, 'core', 'messages', 'mensajes-ui.ts');
const catalogo = readFileSync(archivoCatalogo, 'utf8');
const CODIGOS = new Set([...catalogo.matchAll(/^\s{2}([A-Z][A-Z0-9_]*):\s/gm)].map((m) => m[1]));
const TOAST = /\b(?:this\.)?(?:toast|toastService)\.(?:success|error|warning|info)\(/g;
const USO = /\bmensajeUi\(\s*'([A-Z0-9_]+)'/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.ts') && !name.endsWith('.spec.ts') && p !== archivoCatalogo) out.push(p);
  }
  return out;
}

// Indice justo despues del literal que empieza en i (comillas simples, dobles o plantilla con ${...} anidados).
function finLiteral(s, i) {
  const q = s[i];
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === '\\') { j += 2; continue; }
    if (q === '`' && s[j] === '$' && s[j + 1] === '{') { j = finBalanceado(s, j + 1, '{', '}'); continue; }
    if (s[j] === q) return j + 1;
    j++;
  }
  return s.length;
}

function finBalanceado(s, i, abre, cierra) {
  let nivel = 0;
  let j = i;
  while (j < s.length) {
    const c = s[j];
    if (c === '\'' || c === '"' || c === '`') { j = finLiteral(s, j); continue; }
    if (c === abre) nivel++;
    else if (c === cierra && --nivel === 0) return j + 1;
    j++;
  }
  return s.length;
}

// Literales con texto propio dentro de [desde, hasta), sin contar lo que va dentro de mensajeUi(...).
function literalesConTexto(s, desde, hasta) {
  const encontrados = [];
  let j = desde;
  while (j < hasta) {
    if (s.startsWith('mensajeUi(', j)) { j = finBalanceado(s, j + 'mensajeUi'.length, '(', ')'); continue; }
    const c = s[j];
    if (c === '\'' || c === '"') {
      const k = finLiteral(s, j);
      encontrados.push(j);
      j = k;
      continue;
    }
    if (c === '`') {
      const k = finLiteral(s, j);
      let estatico = '';
      let m = j + 1;
      while (m < k - 1) {
        if (s[m] === '$' && s[m + 1] === '{') {
          const fin = finBalanceado(s, m + 1, '{', '}');
          encontrados.push(...literalesConTexto(s, m + 2, fin - 1));
          m = fin;
          continue;
        }
        estatico += s[m];
        m++;
      }
      if (estatico.trim()) encontrados.push(j);
      j = k;
      continue;
    }
    j++;
  }
  return encontrados;
}

const linea = (s, i) => s.slice(0, i).split('\n').length;
let hallazgos = 0;
for (const archivo of walk(raiz)) {
  const s = readFileSync(archivo, 'utf8');
  const nombre = relative(process.cwd(), archivo).split(sep).join('/');
  for (const m of s.matchAll(TOAST)) {
    const abre = m.index + m[0].length - 1;
    for (const i of literalesConTexto(s, abre + 1, finBalanceado(s, abre, '(', ')') - 1)) {
      hallazgos++;
      console.error(`${nombre}:${linea(s, i)}  toast con texto literal: use mensajeUi('CODIGO')`);
    }
  }
  for (const m of s.matchAll(USO)) {
    if (!CODIGOS.has(m[1])) {
      hallazgos++;
      console.error(`${nombre}:${linea(s, m.index)}  codigo ${m[1]} no esta en core/messages/mensajes-ui.ts`);
    }
  }
}

if (hallazgos > 0) {
  console.error(`\ncheck-mensajes-ui: ${hallazgos} hallazgo(s) (VAL-oleada3 MSG-06).`);
  process.exit(1);
}
console.log(`check-mensajes-ui: OK (${CODIGOS.size} codigos en el catalogo, ningun toast con texto literal)`);
