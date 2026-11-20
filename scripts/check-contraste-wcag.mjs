#!/usr/bin/env node
// Contraste WCAG 2.1 de la identidad UCO (Manual de diseno institucional UCO v8.0, 2026-11-19). Parte de `npm run lint:tokens`.
// Falla (exit 1) si alguna pareja fondo/texto de los tokens incumple:
//   - texto normal >= 4.5:1; texto grande (text-xl o mas, o text-lg con negrita) >= 3:1;
//   - anillos de foco y bordes de controles >= 3:1 contra su superficie.
// Parejas revisadas:
//   1. Roles fijos: on-primary sobre primary-600/700, on-surface sobre surface/surface-muted, foco sobre blanco y sobre verde oscuro.
//   2. Toda clase `text-<token>` de tono 600 o mas sobre blanco y sobre warm-50 (los tonos de texto).
//   3. Toda cadena de clases del codigo (src/**/*.ts, *.html) que combine un fondo solido `bg-<token>` con un texto
//      `text-<token>` / `text-white` / `text-black` (mismo prefijo de estado: base, hover:, focus:...): el par real que se pinta.
//      Un fondo con opacidad (bg-x/20) no se revisa: su color final depende de lo que hay debajo.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd(), 'src');
const css = readFileSync(resolve(root, 'styles.css'), 'utf8') + '\n' + readFileSync(resolve(root, 'styles', 'uco-tokens.css'), 'utf8');

// ---- tokens: --color-* y --uco-* con resolucion de var() ----
const crudos = new Map();
for (const m of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) crudos.set(m[1], m[2].trim());
crudos.set('color-white', '#ffffff');
crudos.set('color-black', '#000000');
function resolver(nombre, visitados = new Set()) {
  const valor = crudos.get(nombre);
  if (!valor || visitados.has(nombre)) return null;
  visitados.add(nombre);
  const hex = valor.match(/^#[0-9a-fA-F]{6}$/);
  if (hex) return valor.toLowerCase();
  const ref = valor.match(/^var\(--([\w-]+)\)$/);
  return ref ? resolver(ref[1], visitados) : null;
}
const color = (token) => resolver(`color-${token}`);

const luminancia = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const fallas = [];
function exigir(etiqueta, textoToken, fondoToken, minimo) {
  const t = color(textoToken);
  const f = color(fondoToken);
  if (!t || !f) {
    fallas.push(`[token] ${etiqueta}: no se pudo resolver ${!t ? textoToken : fondoToken}`);
    return;
  }
  const r = contraste(t, f);
  if (r + 1e-9 < minimo) fallas.push(`[contraste] ${etiqueta}: ${textoToken} (${t}) sobre ${fondoToken} (${f}) = ${r.toFixed(2)}:1 < ${minimo}:1`);
}

// 1. Roles fijos.
exigir('boton principal', 'on-primary', 'primary-600', 4.5);
exigir('boton principal (hover)', 'on-primary', 'primary-700', 4.5);
exigir('texto sobre superficie', 'on-surface', 'surface', 4.5);
exigir('texto sobre superficie atenuada', 'on-surface', 'surface-muted', 4.5);
exigir('anillo de foco sobre blanco', 'primary-600', 'white', 3);
exigir('anillo de foco sobre fondo de pagina', 'primary-600', 'warm-50', 3);
exigir('anillo de foco amarillo sobre verde oscuro', 'accent-500', 'primary-900', 3);
exigir('texto sobre amarillo UCO', 'black', 'accent-500', 4.5);
exigir('texto sobre naranja UCO', 'black', 'danger-500', 4.5);
exigir('texto sobre turquesa UCO', 'black', 'category-500', 4.5);
exigir('texto sobre verde UCO', 'black', 'primary-500', 4.5);
exigir('texto sobre verde oscuro UCO', 'white', 'primary-900', 4.5);
exigir('texto sobre azul UCO', 'white', 'info-700', 4.5);

// ---- recorrido del codigo ----
function recorrer(dir, out = []) {
  for (const nombre of readdirSync(dir)) {
    const p = join(dir, nombre);
    if (statSync(p).isDirectory()) recorrer(p, out);
    else if ((nombre.endsWith('.ts') || nombre.endsWith('.html')) && !nombre.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}
const ESCALAS = 'primary|accent|warm|danger|info|category|success|warning|neutral|attendance|avatar|surface|on-surface|on-primary|border-subtle';
const reToken = String.raw`((?:${ESCALAS})(?:-[\w-]+)?|white|black)`;
const reTexto = new RegExp(String.raw`^((?:[\w-]+:)*)text-${reToken}$`);
const reFondo = new RegExp(String.raw`^((?:[\w-]+:)*)bg-${reToken}$`);
const TAMANOS_GRANDES = /^(?:[\w-]+:)*text-(?:xl|[2-9]xl)$/;

const tonosTexto = new Map();
for (const archivo of recorrer(root)) {
  const rel = relative(process.cwd(), archivo).split(sep).join('/');
  const contenido = readFileSync(archivo, 'utf8');
  // Cadenas candidatas a lista de clases: atributos class/className y literales de texto con al menos un utilitario.
  const cadenas = [...contenido.matchAll(/(["'`])((?:(?!\1)[^\n])*?)\1/g)].map((m) => ({ texto: m[2], indice: m.index }));
  for (const { texto, indice } of cadenas) {
    if (!/\b(?:bg|text)-/.test(texto)) continue;
    const clases = texto.split(/\s+/).filter(Boolean);
    const linea = contenido.slice(0, indice).split('\n').length;
    const grande = clases.some((c) => TAMANOS_GRANDES.test(c))
      || (clases.some((c) => /^(?:[\w-]+:)*text-lg$/.test(c)) && clases.some((c) => /^(?:[\w-]+:)*font-(?:bold|extrabold|black|semibold)$/.test(c)));
    const textos = new Map();
    const fondos = new Map();
    for (const c of clases) {
      const t = c.match(reTexto);
      if (t && color(t[2])) {
        textos.set(t[1], t[2]);
        if (/-(?:[6-9]00|950)$/.test(t[2])) tonosTexto.set(t[2], `${rel}:${linea}`);
      }
      const f = c.match(reFondo);
      if (f && color(f[2])) fondos.set(f[1], f[2]);
    }
    for (const [prefijo, fondo] of fondos) {
      // WCAG 1.4.3 exime a los controles inactivos (disabled:).
      if (prefijo.includes('disabled:')) continue;
      const texto = textos.get(prefijo) ?? (prefijo ? textos.get('') : undefined);
      if (!texto) continue;
      exigir(`${rel}:${linea} "${prefijo}bg-${fondo} ${prefijo}text-${texto}"`, texto, fondo, grande ? 3 : 4.5);
    }
  }
}

// 2. Tonos de texto usados en el codigo, sobre las superficies claras de la UI.
for (const [token, donde] of tonosTexto) {
  exigir(`texto ${token} sobre blanco (p. ej. ${donde})`, token, 'white', 4.5);
  exigir(`texto ${token} sobre warm-50 (p. ej. ${donde})`, token, 'warm-50', 4.5);
}

if (fallas.length) {
  console.error([...new Set(fallas)].join('\n'));
  console.error(`\nlint:contraste FALLO: ${new Set(fallas).size} parejas de color por debajo de WCAG 2.1 AA.`);
  process.exit(1);
}
console.log('lint:contraste OK: parejas fondo/texto y foco cumplen WCAG 2.1 AA (4.5:1 texto, 3:1 texto grande y foco).');
