#!/usr/bin/env node
// Regla de tokens de diseno: la identidad visual vive solo en el bloque @theme de src/styles.css.
// Falla (exit 1) si el codigo usa la paleta por defecto de Tailwind o colores literales.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd(), 'src');
// styles/uco-tokens.css: tokens oficiales del Manual de diseno institucional UCO v8.0 (hex del manual, copiados tal cual).
const excluded = new Set(['styles.css', 'index.html', 'styles/uco-tokens.css'].map((f) => resolve(root, f)));
const exts = ['.ts', '.html', '.css'];

// 'neutral' no se incluye: es un token semantico propio definido en @theme (la paleta por defecto fue anulada).
const PALETTE = 'slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTIL = 'bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|divide|placeholder|shadow|accent|caret';
const rules = [
  { name: 'paleta-tailwind', re: new RegExp(String.raw`(?<![\w-])(?:${UTIL})-(?:${PALETTE})-\d{2,3}(?![\w-])`, 'g') },
  { name: 'hex', re: /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b/g },
  { name: 'rgb/hsl', re: /\b(?:rgba?|hsla?)\(/g },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (exts.some((e) => name.endsWith(e)) && !excluded.has(p)) out.push(p);
  }
  return out;
}

// Comentarios de bloque (CSS/TS y HTML). Pueden abrir en una linea y cerrar en otra, asi que el
// delimitador de cierre pendiente se conserva en state.close entre lineas del mismo archivo.
const BLOCK_COMMENTS = [['/*', '*/'], ['<!--', '-->']];

function stripBlockComments(line, state) {
  let rest = line;
  let out = '';
  while (rest.length) {
    if (state.close) {
      const end = rest.indexOf(state.close);
      if (end < 0) return out;
      rest = rest.slice(end + state.close.length);
      state.close = null;
      continue;
    }
    let first = -1;
    let pair = null;
    for (const candidate of BLOCK_COMMENTS) {
      const at = rest.indexOf(candidate[0]);
      if (at >= 0 && (first < 0 || at < first)) { first = at; pair = candidate; }
    }
    if (!pair) { out += rest; break; }
    out += rest.slice(0, first);
    rest = rest.slice(first + pair[0].length);
    state.close = pair[1];
  }
  return out;
}

function stripNoise(line, state) {
  let s = stripBlockComments(line, state);
  s = s.replace(/data:[^'")\s]+/g, '');
  s = s.replace(/(^|\s)\/\/.*$/, '$1');
  // Anclas/ids de URL (p. ej. href="#seccion", routerLink con #) no son colores.
  s = s.replace(/(href|routerLink|\[href\]|fragment)\s*=\s*["'][^"']*["']/g, '');
  return s;
}

const hits = [];
for (const file of walk(root)) {
  const state = { close: null };
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((raw, i) => {
    const line = stripNoise(raw, state);
    for (const { name, re } of rules) {
      for (const m of line.matchAll(re)) hits.push(`${relative(process.cwd(), file).split(sep).join('/')}:${i + 1}  [${name}]  ${m[0]}`);
    }
  });
}

// Contraste WCAG AA (4.5:1) de los tokens que se usan como texto (F-TRX-013).
const theme = readFileSync(resolve(root, 'styles.css'), 'utf8');
const tokenHex = (name) => theme.match(new RegExp(String.raw`--color-${name}:\s*(#[0-9a-fA-F]{6})`))?.[1];
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const surfaces = { white: '#ffffff', 'warm-50': tokenHex('warm-50') };
for (const text of ['warm-400', 'warm-500', 'primary-600', 'primary-700']) {
  for (const [surfaceName, surfaceHex] of Object.entries(surfaces)) {
    const textHex = tokenHex(text);
    const r = textHex && surfaceHex ? ratio(textHex, surfaceHex) : 0;
    if (r < 4.5) hits.push(`src/styles.css  [contraste]  ${text} (${textHex}) sobre ${surfaceName}: ${r.toFixed(2)}:1 < 4.5:1`);
  }
}

if (hits.length) {
  console.error(hits.join('\n'));
  console.error(`\nlint:tokens FALLO: ${hits.length} usos de colores fuera de los tokens de @theme (src/styles.css).`);
  process.exit(1);
}
console.log('lint:tokens OK: sin paleta por defecto de Tailwind ni colores literales.');
