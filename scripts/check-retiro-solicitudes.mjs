#!/usr/bin/env node
// Compuerta de fuente CULM-001 A.1 (F-RED-08): las solicitudes de ingreso fueron retiradas.
// Falla (exit 1) si algun archivo de src/ conserva un rastro de ellas e indica archivo y linea.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd(), 'src');
const exts = ['.ts', '.html', '.css', '.json'];
const PROHIBIDOS = [
  'solicitud-ingreso.service',
  'SolicitudIngresoService',
  'solicitudes-matricula',
  'solicitudes-ingreso',
  'SolicitudMatriculaItem',
  'SOLICITUD_INGRESO_',
  'idSolicitudAbierta',
  'solicitar-ingreso',
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

let hallazgos = 0;
for (const file of walk(root)) {
  const lineas = readFileSync(file, 'utf8').split(/\r?\n/);
  lineas.forEach((linea, i) => {
    for (const termino of PROHIBIDOS) {
      if (linea.includes(termino)) {
        hallazgos++;
        console.error(`${relative(process.cwd(), file).split(sep).join('/')}:${i + 1}  contiene "${termino}"`);
      }
    }
  });
}

if (hallazgos > 0) {
  console.error(`\ncheck-retiro-solicitudes: ${hallazgos} rastro(s) de solicitudes de ingreso (CULM-001 A.1).`);
  process.exit(1);
}
console.log('check-retiro-solicitudes: OK (sin rastros de solicitudes de ingreso en src/).');
