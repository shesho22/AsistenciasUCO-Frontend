#!/usr/bin/env node
// VAL MSG-06 / MSG-03: sincroniza el catalogo de textos de la interfaz (src/app/core/messages/mensajes-ui.ts) con
// MessageUcoLab.
//
//   node scripts/sync-mensajes-ui-catalogo.mjs           compuerta (en npm run verify y en el CI): falla si algo esta
//                                                        desalineado o fuera de los limites de MessageUcoLab
//   node scripts/sync-mensajes-ui-catalogo.mjs --write   asigna codigo remoto a los textos nuevos (sin renumerar los
//                                                        existentes), retira los que ya no estan y regenera el .psv
//
// Limites de importacion de MessageUcoLab (los mismos de AsistenciasUCO-Infra/components/messages/build-message-catalog.py):
// codigo remoto de 1 a 10 letras o numeros (sin "_"), titulo de 10 a 50 caracteres y contenido de 10 a 100.
// El codigo remoto de cada texto de interfaz es UI### y en la ruta publica viaja como MSG_UI### (toMessageCode).
//
// Salidas versionadas:
//   src/app/core/messages/mensajes-ui-codigos-remotos.ts   canonico -> codigo remoto (lo usa la SPA en tiempo de ejecucion)
//   docs/messages/mensajes-ui-messageucolab.psv            filas para importar en MessageUcoLab
//                                                          (canonico|codigo remoto|tipo|categoria|titulo|contenido)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const raiz = process.cwd();
const archivoCatalogo = join(raiz, 'src', 'app', 'core', 'messages', 'mensajes-ui.ts');
const archivoAlias = join(raiz, 'src', 'app', 'core', 'messages', 'mensajes-ui-codigos-remotos.ts');
const archivoPsv = join(raiz, 'docs', 'messages', 'mensajes-ui-messageucolab.psv');
const escribir = process.argv.includes('--write');

const REMOTO = /^[A-Z0-9]{1,10}$/;
const TITULO_MIN = 10;
const TITULO_MAX = 50;
const CONTENIDO_MIN = 10;
const CONTENIDO_MAX = 100;

const fallas = [];

// Entradas `  CODIGO: 'texto',` del catalogo (comillas simples, dobles o plantilla sin interpolar), en su orden.
const fuente = readFileSync(archivoCatalogo, 'utf8');
const entradas = [...fuente.matchAll(/^ {2}([A-Z][A-Z0-9_]*):\s*(['"`])((?:\\.|(?!\2).)*)\2,?\s*$/gm)].map((m) => ({
  codigo: m[1],
  texto: m[3].replace(/\\(['"`\\])/g, '$1'),
}));
const declarados = [...fuente.matchAll(/^ {2}([A-Z][A-Z0-9_]*):/gm)].map((m) => m[1]);
if (entradas.length !== declarados.length) {
  const leidos = new Set(entradas.map((e) => e.codigo));
  fallas.push(`No se pudo leer el texto de: ${declarados.filter((c) => !leidos.has(c)).join(', ')} (una sola linea, sin \${}).`);
}

// Codigos remotos ya asignados.
const previos = new Map(
  existsSync(archivoAlias)
    ? [...readFileSync(archivoAlias, 'utf8').matchAll(/^ {2}([A-Z][A-Z0-9_]*):\s*'([A-Z0-9]+)',?$/gm)].map((m) => [m[1], m[2]])
    : [],
);

const alias = new Map();
let siguiente = Math.max(0, ...[...previos.values()].map((r) => Number(r.replace(/^UI/, '')) || 0)) + 1;
for (const { codigo } of entradas) {
  if (previos.has(codigo)) {
    alias.set(codigo, previos.get(codigo));
  } else if (escribir) {
    alias.set(codigo, `UI${String(siguiente++).padStart(3, '0')}`);
  } else {
    fallas.push(`${codigo} no tiene codigo remoto: corre "node scripts/sync-mensajes-ui-catalogo.mjs --write".`);
  }
}
const sobrantes = [...previos.keys()].filter((c) => !entradas.some((e) => e.codigo === c));
if (sobrantes.length && !escribir) {
  fallas.push(`Codigos remotos de textos que ya no existen: ${sobrantes.join(', ')} (corre --write).`);
}

const vistos = new Map();
for (const [codigo, remoto] of alias) {
  if (!REMOTO.test(remoto)) fallas.push(`${codigo}: el codigo remoto '${remoto}' no cumple 1..10 letras o numeros.`);
  if (vistos.has(remoto)) fallas.push(`${codigo} y ${vistos.get(remoto)} comparten el codigo remoto ${remoto}.`);
  vistos.set(remoto, codigo);
}

// Filas de importacion y limites de MessageUcoLab.
const filas = entradas.map(({ codigo, texto }) => {
  const titulo = codigo.length >= TITULO_MIN ? codigo.slice(0, TITULO_MAX) : `${codigo} (interfaz)`;
  if (texto.length < CONTENIDO_MIN || texto.length > CONTENIDO_MAX) {
    fallas.push(`${codigo}: el texto tiene ${texto.length} caracteres; MessageUcoLab admite de ${CONTENIDO_MIN} a ${CONTENIDO_MAX}.`);
  }
  if (texto.includes('|') || /[\r\n]/.test(texto)) fallas.push(`${codigo}: el texto no puede llevar "|" ni saltos de linea.`);
  const categoria = /^(AUTH_|API_ERROR_|UI_ERROR_)/.test(codigo) ? 'Error' : 'Información';
  return [codigo, alias.get(codigo) ?? '', 'Funcional', categoria, titulo, texto].join('|');
});
const psv = [
  '# Generado por scripts/sync-mensajes-ui-catalogo.mjs desde src/app/core/messages/mensajes-ui.ts. No editar a mano.',
  '# canonico|codigo remoto|tipo|categoria|titulo|contenido',
  ...filas,
  '',
].join('\n');

const ts = [
  '/**',
  ' * VAL MSG-06: codigo remoto en MessageUcoLab de cada texto de `mensajes-ui.ts` (1 a 10 letras o numeros; en la ruta',
  ' * publica viaja como MSG_<codigo>). Generado por `scripts/sync-mensajes-ui-catalogo.mjs --write`: un texto nuevo toma',
  ' * el siguiente numero libre y nunca se renumeran los existentes. No editar a mano.',
  ' */',
  "import type { CodigoMensajeUi } from './mensajes-ui';",
  '',
  'export const CODIGOS_REMOTOS_MENSAJES_UI: Readonly<Record<CodigoMensajeUi, string>> = {',
  ...[...alias].map(([codigo, remoto]) => `  ${codigo}: '${remoto}',`),
  '};',
  '',
].join('\n');

if (escribir) {
  writeFileSync(archivoAlias, ts);
  mkdirSync(dirname(archivoPsv), { recursive: true });
  writeFileSync(archivoPsv, psv);
}
if (!escribir) {
  if (!existsSync(archivoAlias) || readFileSync(archivoAlias, 'utf8') !== ts) {
    fallas.push('mensajes-ui-codigos-remotos.ts no esta al dia (corre --write).');
  }
  if (!existsSync(archivoPsv) || readFileSync(archivoPsv, 'utf8') !== psv) {
    fallas.push('docs/messages/mensajes-ui-messageucolab.psv no esta al dia (corre --write).');
  }
}

if (fallas.length) {
  for (const falla of fallas) console.error(`MENSAJES_UI_CATALOGO_FAIL ${falla}`);
  process.exitCode = 1;
} else {
  console.log(`MENSAJES_UI_CATALOGO_${escribir ? 'WRITTEN' : 'PASS'} textos=${entradas.length} remotos=${alias.size}`);
}
