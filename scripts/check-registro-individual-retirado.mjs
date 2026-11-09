#!/usr/bin/env node
// Compuerta de fuente CULM-001 D.7 (CONTRACT D 8.4, TD-009, HU027/HU033): el registro individual de asistencia
// POST /api/v1/asistencias se retiro (el backend responde 404). La asistencia se registra por lote
// (POST /asistencias/lote) o por toma (POST /tomas/{id}/asistencias).
// Falla (exit 1) si algun archivo de src/ llama por POST a una URL que termina exactamente en "/asistencias" o simula esa
// ruta en el mock-backend, e indica archivo y linea. Las rutas con prefijo (grupos/, coordinador/sesiones/, tomas/) y las
// lecturas GET no se tocan.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd(), 'src');
const exts = ['.ts', '.html'];
// post(`${api}/asistencias`) | post<T>('/api/v1/asistencias', ...): el primer literal del post, sin la base inicial
// "${...}", debe ser exactamente /asistencias (o /api/vN/asistencias). Con segmentos (tomas/..., grupos/...) no aplica.
const PRIMER_LITERAL_POST = /\.post\s*(?:<[^()]*>)?\(\s*([`'"])((?:(?!\1).)*)\1/;
const URL_RETIRADA = /^(?:\$\{[^}]*\})?(?:\/api\/v\d+)?\/asistencias$/;
const esPostRetirado = (linea) => {
  const m = PRIMER_LITERAL_POST.exec(linea);
  return m !== null && URL_RETIRADA.test(m[2]);
};
const MOCK_POST = /endsWith\(\s*['"`]\/asistencias['"`]\s*\)[^\n]*['"`]POST['"`]/;
const NOMBRES = ['RegistrarAsistenciaRequest', 'registrarAsistenciaIndividual'];

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
    const motivo = esPostRetirado(linea) || MOCK_POST.test(linea)
      ? 'POST a /asistencias (registro individual retirado)'
      : NOMBRES.find((n) => linea.includes(n));
    if (motivo) {
      hallazgos++;
      console.error(`${relative(process.cwd(), file).split(sep).join('/')}:${i + 1}  ${motivo}`);
    }
  });
}

if (hallazgos > 0) {
  console.error(`\ncheck-registro-individual-retirado: ${hallazgos} rastro(s) del registro individual (CULM-001 D.7). Use el lote o la toma.`);
  process.exit(1);
}
console.log('check-registro-individual-retirado: OK (ningun POST a /asistencias en src/).');
