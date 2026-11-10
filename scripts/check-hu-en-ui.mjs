#!/usr/bin/env node
// Compuerta de fuente CULM-001: la interfaz no muestra codigos de historias de usuario (HU + 3 digitos).
// Revisa plantillas .html y .ts (plantillas en linea y literales) de src/app/features y src/app/layouts, ignorando
// comentarios de codigo y los *.spec.ts. Falla (exit 1) e indica archivo y linea.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const raices = ['src/app/features', 'src/app/layouts'].map((r) => resolve(process.cwd(), r));
const PATRON = /\bHU\d{3}/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ((name.endsWith('.ts') && !name.endsWith('.spec.ts')) || name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** Sustituye por espacios los comentarios (/* *​/, <!-- -->, // de linea) conservando saltos de linea. */
function sinComentarios(texto) {
  const blanquear = (m) => m.replace(/[^\n]/g, ' ');
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, blanquear)
    .replace(/<!--[\s\S]*?-->/g, blanquear)
    .replace(/(^|[\s;,{}()])\/\/[^\n]*/g, (m, pre) => pre + m.slice(pre.length).replace(/[^\n]/g, ' '));
}

let hallazgos = 0;
for (const raiz of raices) {
  for (const file of walk(raiz)) {
    sinComentarios(readFileSync(file, 'utf8')).split(/\r?\n/).forEach((linea, i) => {
      if (PATRON.test(linea)) {
        hallazgos++;
        console.error(`${relative(process.cwd(), file).split(sep).join('/')}:${i + 1}  texto visible con codigo de HU: ${linea.trim()}`);
      }
    });
  }
}
if (hallazgos > 0) {
  console.error(`\ncheck-hu-en-ui: ${hallazgos} coincidencia(s). Retira los codigos HUxxx de la interfaz.`);
  process.exit(1);
}
console.log('check-hu-en-ui: sin codigos de HU en la interfaz.');
