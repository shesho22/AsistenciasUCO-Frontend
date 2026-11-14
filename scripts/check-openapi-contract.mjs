#!/usr/bin/env node
// Compuerta de contrato VAL PRU-03 (lista de chequeo de validacion 2026-11-12): el frontend se valida contra el
// OpenAPI golden path del backend (copia byte a byte en docs/contracts/external/backend/, ver PROVENANCE.md).
//
// Falla (exit 1) si:
//   1. la copia del contrato no coincide con su .sha256 (WORM: no se edita a mano);
//   2. el frontend llama con un metodo que el contrato no define para una ruta del golden path;
//   3. un DTO del frontend no conforma el esquema que el contrato le asigna:
//      - una propiedad del DTO no existe en el esquema (los esquemas son cerrados);
//      - una propiedad requerida del esquema falta en el DTO;
//      - el tipo base no coincide (string, number, boolean, array, object);
//      - en un cuerpo de peticion, el DTO declara opcional algo requerido o envia un valor fuera del enum;
//      - en una respuesta, el DTO no acepta un valor del enum (el lector debe aceptar todo lo que el contrato emite).
// Un valor de enum que el DTO de respuesta acepta y el contrato aun no lista se informa como aviso (el contrato
// puede ir atrasado frente a una decision posterior), sin fallar.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const ts = require('typescript');

const raiz = process.cwd();
const dirContrato = join(raiz, 'docs', 'contracts', 'external', 'backend');
const archivoContrato = join(dirContrato, 'openapi-golden-path.yaml');
const fallas = [];
const avisos = [];

// 1. Integridad de la copia del contrato.
const bytes = readFileSync(archivoContrato);
const esperado = readFileSync(join(dirContrato, 'openapi-golden-path.sha256'), 'utf8').trim().split(/\s+/)[0];
const real = createHash('sha256').update(bytes).digest('hex');
if (real !== esperado) {
  fallas.push(`openapi-golden-path.yaml no coincide con su .sha256 (esperado ${esperado}, real ${real}).`);
}
const contrato = yaml.load(bytes.toString('utf8'));
const esquemas = contrato.components.schemas;

// 2. Metodos usados por el frontend en rutas del golden path.
const LLAMADAS = [
  { metodo: 'get', ruta: '/api/v1/docente/horarios', patron: /\.get(?:<[^(]*>)?\(\s*`\$\{environment\.apiUrl\}\/docente\/horarios`/ },
  { metodo: 'post', ruta: '/api/v1/asistencias/lote', patron: /\.post<[^(]*\(\s*`\$\{environment\.apiUrl\}\/asistencias\/lote`/ },
  { metodo: 'get', ruta: '/api/v1/realtime/stream', patron: /`\$\{environment\.apiUrl\}\/realtime\/stream\?grupoId=/ },
];
const fuentes = listar(join(raiz, 'src', 'app')).filter((p) => p.endsWith('.ts') && !p.endsWith('.spec.ts') && !p.includes(`${sep}mocks${sep}`));
const textoFuentes = fuentes.map((p) => [p, readFileSync(p, 'utf8')]);
for (const llamada of LLAMADAS) {
  const operacion = contrato.paths[llamada.ruta]?.[llamada.metodo];
  if (!operacion) {
    fallas.push(`El contrato no define ${llamada.metodo.toUpperCase()} ${llamada.ruta}.`);
    continue;
  }
  const usos = textoFuentes.filter(([, texto]) => llamada.patron.test(texto)).map(([p]) => relative(raiz, p));
  if (usos.length === 0) {
    fallas.push(`Ningun servicio del frontend llama ${llamada.metodo.toUpperCase()} ${llamada.ruta} (operationId ${operacion.operationId}).`);
  }
}

// 3. Conformidad de DTOs (TypeScript) con los esquemas del contrato.
const DTOS = [
  { esquema: 'ApiErrorResponse', archivo: 'src/app/core/api/models/api-error-response.model.ts', interfaz: 'ApiErrorResponse', uso: 'respuesta' },
  { esquema: 'ApiFieldError', archivo: 'src/app/core/api/models/api-field-error.model.ts', interfaz: 'ApiFieldError', uso: 'respuesta' },
  { esquema: 'EstudianteResumen', archivo: 'src/app/core/api/models/estudiante-api-dto.model.ts', interfaz: 'EstudianteResumenApiDto', uso: 'respuesta' },
  { esquema: 'EstudianteGrupo', archivo: 'src/app/core/api/models/estudiante-grupo-api-dto.model.ts', interfaz: 'EstudianteGrupoApiDto', uso: 'respuesta' },
  { esquema: 'HorarioDocente', archivo: 'src/app/core/api/models/horario-docente-api-dto.model.ts', interfaz: 'HorarioDocenteApiDto', uso: 'respuesta' },
  { esquema: 'SesionV2', archivo: 'src/app/core/api/models/sesion-consultada-api-dto.model.ts', interfaz: 'SesionV2ApiDto', uso: 'respuesta' },
  { esquema: 'CancelacionSesion', archivo: 'src/app/core/models/sesion-estado.model.ts', interfaz: 'CancelacionSesion', uso: 'respuesta' },
  { esquema: 'RegistrarAsistenciasSesionRequest', archivo: 'src/app/core/api/models/registrar-asistencias-sesion-request.model.ts', interfaz: 'RegistrarAsistenciasSesionRequest', uso: 'peticion' },
  { esquema: 'CrearSesionV2Request', archivo: 'src/app/core/api/models/sesion-consultada-api-dto.model.ts', interfaz: 'CrearSesionV2Request', uso: 'peticion' },
  { esquema: 'ActualizarSesionV2Request', archivo: 'src/app/core/api/models/sesion-consultada-api-dto.model.ts', interfaz: 'ActualizarSesionV2Request', uso: 'peticion' },
];

const programa = ts.createProgram([...new Set(DTOS.map((d) => join(raiz, d.archivo)))], {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ES2022,
  noEmit: true,
});
const checker = programa.getTypeChecker();

for (const dto of DTOS) {
  const fuente = programa.getSourceFile(join(raiz, dto.archivo));
  const declaracion = fuente?.statements.find((s) => ts.isInterfaceDeclaration(s) && s.name.text === dto.interfaz);
  if (!declaracion) {
    fallas.push(`${dto.archivo}: no existe la interfaz ${dto.interfaz}.`);
    continue;
  }
  const esquema = esquemas[dto.esquema];
  if (!esquema) {
    fallas.push(`El contrato no define el esquema ${dto.esquema}.`);
    continue;
  }
  comparar(checker.getTypeAtLocation(declaracion), esquema, `${dto.interfaz} ~ ${dto.esquema}`, dto.uso);
}

function comparar(tipo, esquemaCrudo, donde, uso) {
  const esquema = resolver(esquemaCrudo);
  const propiedadesEsquema = esquema.properties ?? {};
  const requeridas = new Set(esquema.required ?? []);
  const propiedadesDto = new Map(checker.getPropertiesOfType(tipo).map((p) => [p.getName(), p]));

  for (const [nombre, simbolo] of propiedadesDto) {
    if (!(nombre in propiedadesEsquema)) {
      fallas.push(`${donde}: la propiedad '${nombre}' no existe en el contrato.`);
      continue;
    }
    const opcional = (simbolo.getFlags() & ts.SymbolFlags.Optional) !== 0;
    if (uso === 'peticion' && requeridas.has(nombre) && opcional) {
      fallas.push(`${donde}: '${nombre}' es requerida en el contrato y el DTO de peticion la declara opcional.`);
    }
    const tipoPropiedad = checker.getTypeOfSymbol(simbolo);
    compararTipo(tipoPropiedad, propiedadesEsquema[nombre], `${donde}.${nombre}`, uso);
  }
  for (const nombre of requeridas) {
    if (!propiedadesDto.has(nombre)) {
      fallas.push(`${donde}: falta la propiedad requerida '${nombre}'.`);
    }
  }
}

function compararTipo(tipo, esquemaCrudo, donde, uso) {
  const esquema = resolver(esquemaCrudo);
  const tipos = (Array.isArray(esquema.type) ? esquema.type : [esquema.type ?? 'object']).filter((t) => t !== 'null');
  const base = tipos[0] === 'integer' ? 'number' : tipos[0];
  const partes = (tipo.isUnion() ? tipo.types : [tipo]).filter(
    (t) => !(t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined))
  );
  const categoria = categoriaDe(partes);
  if (categoria !== base) {
    fallas.push(`${donde}: el contrato dice '${base}' y el DTO '${categoria}'.`);
    return;
  }
  if (base === 'string' && Array.isArray(esquema.enum)) {
    const literales = partes.every((t) => t.isStringLiteral()) ? new Set(partes.map((t) => t.value)) : null;
    const valoresContrato = esquema.enum.filter((v) => v !== null);
    if (literales) {
      const fuera = [...literales].filter((v) => !valoresContrato.includes(v));
      const faltan = valoresContrato.filter((v) => !literales.has(v));
      if (uso === 'peticion' && fuera.length) fallas.push(`${donde}: envia valores fuera del enum del contrato: ${fuera.join(', ')}.`);
      if (uso === 'respuesta' && faltan.length) fallas.push(`${donde}: no acepta valores que el contrato emite: ${faltan.join(', ')}.`);
      if (uso === 'respuesta' && fuera.length) avisos.push(`${donde}: acepta valores que el contrato aun no lista: ${fuera.join(', ')}.`);
    }
  }
  if (base === 'array') {
    const elemento = partes[0] && checker.getTypeArguments(partes[0])[0];
    const items = resolver(esquema.items ?? {});
    if (elemento && items.properties) {
      comparar(elemento, items, `${donde}[]`, uso);
    } else if (elemento) {
      compararTipo(elemento, items, `${donde}[]`, uso);
    }
  }
  if (base === 'object' && esquema.properties && partes.length === 1) {
    comparar(partes[0], esquema, donde, uso);
  }
}

function categoriaDe(partes) {
  if (partes.length === 0) return 'null';
  const es = (bandera) => partes.every((t) => t.flags & bandera);
  if (es(ts.TypeFlags.StringLike)) return 'string';
  if (es(ts.TypeFlags.NumberLike)) return 'number';
  if (es(ts.TypeFlags.BooleanLike)) return 'boolean';
  if (partes.every((t) => checker.isArrayType(t))) return 'array';
  if (partes.every((t) => t.flags & ts.TypeFlags.Object)) return 'object';
  return partes.map((t) => checker.typeToString(t)).join(' | ');
}

function resolver(esquema) {
  let actual = esquema ?? {};
  for (let i = 0; i < 10 && actual.$ref; i++) {
    actual = esquemas[actual.$ref.split('/').pop()] ?? {};
  }
  if (Array.isArray(actual.allOf) && actual.allOf.length === 1) {
    return resolver(actual.allOf[0]);
  }
  return actual;
}

function listar(dir, salida = []) {
  for (const nombre of readdirSync(dir)) {
    const p = join(dir, nombre);
    if (statSync(p).isDirectory()) listar(p, salida);
    else salida.push(p);
  }
  return salida;
}

for (const aviso of avisos) console.warn(`OPENAPI_CONTRACT_WARN ${aviso}`);
if (fallas.length) {
  for (const falla of fallas) console.error(`OPENAPI_CONTRACT_FAIL ${falla}`);
  process.exitCode = 1;
} else {
  console.log(`OPENAPI_CONTRACT_PASS sha256=${real.slice(0, 12)} llamadas=${LLAMADAS.length} dtos=${DTOS.length}`);
}
