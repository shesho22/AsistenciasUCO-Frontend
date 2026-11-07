#!/usr/bin/env node
// Regla de tokens de diseno: la identidad visual vive solo en el bloque @theme de src/styles.css.
// Falla (exit 1) si el codigo usa la paleta por defecto de Tailwind o colores literales.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd(), 'src');
const excluded = new Set(['styles.css', 'index.html'].map((f) => resolve(root, f)));
const exts = ['.ts', '.html', '.css'];

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
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

function stripNoise(line, state) {
  let s = line;
  if (state.block) {
    const end = s.indexOf('*/');
    if (end < 0) return '';
    state.block = false;
    s = s.slice(end + 2);
  }
  s = s.replace(/\/\*.*?\*\//g, '').replace(/<!--.*?-->/g, '');
  const open = s.indexOf('/*');
  if (open >= 0) { state.block = true; s = s.slice(0, open); }
  s = s.replace(/data:[^'")\s]+/g, '');
  s = s.replace(/(^|\s)\/\/.*$/, '$1');
  // Anclas/ids de URL (p. ej. href="#seccion", routerLink con #) no son colores.
  s = s.replace(/(href|routerLink|\[href\]|fragment)\s*=\s*["'][^"']*["']/g, '');
  return s;
}

const hits = [];
for (const file of walk(root)) {
  const state = { block: false };
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((raw, i) => {
    const line = stripNoise(raw, state);
    for (const { name, re } of rules) {
      for (const m of line.matchAll(re)) hits.push(`${relative(process.cwd(), file).split(sep).join('/')}:${i + 1}  [${name}]  ${m[0]}`);
    }
  });
}

if (hits.length) {
  console.error(hits.join('\n'));
  console.error(`\nlint:tokens FALLO: ${hits.length} usos de colores fuera de los tokens de @theme (src/styles.css).`);
  process.exit(1);
}
console.log('lint:tokens OK: sin paleta por defecto de Tailwind ni colores literales.');
