#!/usr/bin/env node
// Accesibilidad de formularios y tablas en las vistas de coordinador, decano y administrador (CULM-001 E.2):
// - todo input/select/textarea necesita nombre accesible (aria-label, id con label, aria-labelledby) o ir dentro
//   de <label> o <app-form-field> (que asocia la etiqueta al control);
// - todo <th> declara scope.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const roots = ['coordinator', 'dean', 'admin'].map((d) => resolve(process.cwd(), 'src/app/features', d));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

function enclosed(text, index, open, close) {
  const before = text.slice(0, index);
  const opens = (before.match(new RegExp(String.raw`<${open}[\s>]`, 'g')) ?? []).length;
  const closes = (before.match(new RegExp(`</${close}>`, 'g')) ?? []).length;
  return opens > closes;
}

const hits = [];
for (const file of roots.flatMap((r) => walk(r))) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(process.cwd(), file).split(sep).join('/');
  const lineOf = (i) => text.slice(0, i).split('\n').length;

  for (const m of text.matchAll(/<(input|select|textarea)\b([^>]*)>/gs)) {
    const attrs = m[2];
    if (/type="(hidden|checkbox|radio)"/.test(attrs) && !/type="(checkbox|radio)"/.test(attrs)) continue;
    if (/aria-label|aria-labelledby|\[attr\.aria-label\]/.test(attrs)) continue;
    if (enclosed(text, m.index, 'app-form-field', 'app-form-field') || enclosed(text, m.index, 'label', 'label')) continue;
    if (/\bid="/.test(attrs) && new RegExp(`for="${(attrs.match(/\bid="([^"]+)"/) ?? [])[1]}"`).test(text)) continue;
    hits.push(`${rel}:${lineOf(m.index)}  [control-sin-nombre]  <${m[1]}>`);
  }
  for (const m of text.matchAll(/<th\b([^>]*)>/gs)) {
    if (!/scope=/.test(m[1])) hits.push(`${rel}:${lineOf(m.index)}  [th-sin-scope]`);
  }
}

if (hits.length) {
  console.error(hits.join('\n'));
  console.error(`\nlint:a11y FALLO: ${hits.length} controles o cabeceras sin nombre accesible.`);
  process.exit(1);
}
console.log('lint:a11y OK: controles con nombre accesible y th con scope.');
