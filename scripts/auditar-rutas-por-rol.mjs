#!/usr/bin/env node
/**
 * Auditoría estática de rutas por rol.
 *
 * Para cada ruta del frontend que exige un rol (`data.roles` en app.routes.ts y en sus rutas hijas), recorre el componente
 * que carga, sus componentes importados y los servicios que inyecta, y lista los prefijos de API que esos servicios
 * llaman (`/admin`, `/decano`, `/coordinador`, `/docente`, `/estudiante`). El backend deja cada prefijo a un solo rol
 * (SecurityConfig: `/api/v1/<prefijo>/**` => hasRole), así que un prefijo ajeno al rol de la ruta es un candidato a 403.
 *
 * Es heurístico y trabaja por método: cuenta solo los métodos de servicio que el código del componente (y de sus
 * componentes importados) invoca como `campo.metodo(`. Un método que alterna entre el prefijo del rol y otro (modo
 * administrador/decano) se considera dual y se omite. Cada candidato debe confirmarse con el rol real (token del
 * laboratorio) o leyendo la pantalla.
 *
 * Uso: node scripts/auditar-rutas-por-rol.mjs [--json]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const PREFIJO_DE_ROL = {
  ADMINISTRADOR: 'admin',
  DECANO: 'decano',
  COORDINADOR: 'coordinador',
  DOCENTE: 'docente',
  ESTUDIANTE: 'estudiante',
};
/**
 * Excepciones documentadas en SecurityConfig: lecturas compartidas que el backend abre a más de un rol.
 * Se marcan como "permitida" en lugar de candidato.
 */
const EXCEPCIONES = [
  { prefijo: 'admin', roles: ['DECANO', 'COORDINADOR'], patron: /\/admin\/areas/ },
  { prefijo: 'coordinador', roles: ['ADMINISTRADOR', 'DECANO'], patron: /\/coordinador\/periodos-academicos/ },
  { prefijo: 'coordinador', roles: ['DECANO'], patron: /\/coordinador\/(planes-estudio|asignaturas)/ },
];

function listar(dir, salida = []) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) listar(ruta, salida);
    else if (nombre.endsWith('.ts') && !nombre.endsWith('.spec.ts')) salida.push(ruta);
  }
  return salida;
}

const archivos = listar(RAIZ);
const textoDe = new Map(archivos.map((f) => [f, readFileSync(f, 'utf8')]));
const claseAArchivo = new Map();
for (const [f, t] of textoDe) {
  for (const m of t.matchAll(/export (?:abstract )?class (\w+)/g)) claseAArchivo.set(m[1], f);
}

/** Resuelve un `import('./ruta')` relativo al archivo que lo declara. */
function resolverImport(desde, ruta) {
  const base = resolve(dirname(desde), ruta);
  for (const candidato of [`${base}.ts`, join(base, 'index.ts')]) if (existsSync(candidato)) return candidato;
  return null;
}

const PREFIJOS = 'admin|decano|coordinador|docente|estudiante';

/** Constantes `private readonly decano = `${environment.apiUrl}/decano`` => nombre -> prefijo. */
function constantesDe(texto) {
  const mapa = new Map();
  for (const m of texto.matchAll(new RegExp('(\\w+)\\s*=\\s*`\\$\\{environment\\.apiUrl\\}/(' + PREFIJOS + ')`', 'g'))) {
    mapa.set(m[1], m[2]);
  }
  return mapa;
}

/** Prefijos de API (con la ruta que sigue) que aparecen dentro de un trozo de código. */
function llamadasEnTrozo(trozo, constantes) {
  const res = new Set();
  for (const m of trozo.matchAll(new RegExp('apiUrl\\}/(' + PREFIJOS + ')(/[\\w-]+)?', 'g'))) res.add(`/${m[1]}${m[2] ?? ''}`);
  for (const m of trozo.matchAll(/\$\{this\.(\w+)\}(\/[\w-]+)?/g)) {
    const prefijo = constantes.get(m[1]);
    if (prefijo) res.add(`/${prefijo}${m[2] ?? ''}`);
  }
  return res;
}

/** Métodos de una clase de servicio con las llamadas HTTP de su cuerpo. */
const cacheMetodos = new Map();
function metodosDe(archivo) {
  if (cacheMetodos.has(archivo)) return cacheMetodos.get(archivo);
  const texto = textoDe.get(archivo) ?? '';
  const constantes = constantesDe(texto);
  const cabeceras = [...texto.matchAll(/^ {2}(?:public |private |protected )?(?:async )?(\w+)\s*(?:<[^>]*>)?\([^)]*\)[^{;=]*\{/gm)];
  const mapa = new Map();
  cabeceras.forEach((c, i) => {
    const fin = i + 1 < cabeceras.length ? cabeceras[i + 1].index : texto.length;
    const llamadas = llamadasEnTrozo(texto.slice(c.index, fin), constantes);
    if (llamadas.size > 0) mapa.set(c[1], llamadas);
  });
  cacheMetodos.set(archivo, { mapa, global: llamadasEnTrozo(texto, constantes) });
  return cacheMetodos.get(archivo);
}

/** Campo -> clase inyectada (`private readonly coordService = inject(CoordinatorManagementService)`). */
function inyeccionesDe(texto) {
  const mapa = new Map();
  for (const m of texto.matchAll(/(\w+)\s*=\s*inject\((\w+)/g)) mapa.set(m[1], m[2]);
  return mapa;
}

/** Componentes importados (`imports: [...]`) de un archivo, resueltos a su archivo. */
function hijosDe(archivo) {
  const t = textoDe.get(archivo) ?? '';
  const lista = t.match(/imports:\s*\[([\s\S]*?)\]/);
  if (!lista) return [];
  return [...lista[1].matchAll(/\b([A-Z]\w+)\b/g)].map((m) => claseAArchivo.get(m[1])).filter(Boolean);
}

/**
 * Recorre componente -> componentes hijos y devuelve, por cada servicio, los métodos que el código invoca
 * (`this.campo.metodo(`) con los prefijos que esos métodos llaman. Si el servicio no es de ruta HTTP, se ignora.
 */
function recolectar(inicio, profundidad = 3) {
  const visitados = new Set();
  const llamadas = [];
  const visitar = (archivo, nivel) => {
    if (!archivo || visitados.has(archivo) || nivel > profundidad) return;
    visitados.add(archivo);
    const texto = textoDe.get(archivo) ?? '';
    for (const [campo, clase] of inyeccionesDe(texto)) {
      const archivoServicio = claseAArchivo.get(clase);
      if (!archivoServicio) continue;
      const { mapa } = metodosDe(archivoServicio);
      const usados = new Set([...texto.matchAll(new RegExp(`\\b${campo}\\.(\\w+)`, 'g'))].map((m) => m[1]));
      for (const metodo of usados) {
        const prefijos = mapa.get(metodo);
        if (!prefijos) continue;
        llamadas.push({ metodo: `${clase}.${metodo}`, prefijos: [...prefijos], archivo });
      }
    }
    for (const h of hijosDe(archivo)) visitar(h, nivel + 1);
  };
  visitar(inicio, 0);
  return llamadas;
}

/** Rutas con rol: lee `path`, `roles` y el import diferido de app.routes.ts y de sus archivos de rutas hijas. */
function rutasConRol() {
  const principal = join(RAIZ, 'app.routes.ts');
  const t = textoDe.get(principal);
  const salida = [];
  const bloques = [...t.matchAll(/path:\s*'([^']+)'/g)];
  bloques.forEach((m, i) => {
    const fin = i + 1 < bloques.length ? bloques[i + 1].index : t.length;
    const bloque = t.slice(m.index, Math.min(fin, m.index + 900));
    const roles = bloque.match(/roles:\s*\[([^\]]*)\]/);
    if (!roles) return;
    const imp = bloque.match(/import\('([^']+)'\)/);
    if (!imp) return;
    const archivo = resolverImport(principal, imp[1]);
    if (!archivo) return;
    const listaRoles = [...roles[1].matchAll(/'(\w+)'/g)].map((x) => x[1]);
    const esRutasHijas = /loadChildren/.test(bloque);
    if (!esRutasHijas) {
      salida.push({ ruta: m[1], roles: listaRoles, componente: archivo });
      return;
    }
    const tr = textoDe.get(archivo) ?? '';
    for (const h of tr.matchAll(/path:\s*'([^']*)'[\s\S]{0,260}?import\('([^']+)'\)/g)) {
      const comp = resolverImport(archivo, h[2]);
      if (comp) salida.push({ ruta: `${m[1]}/${h[1]}`, roles: listaRoles, componente: comp });
    }
    for (const h of tr.matchAll(/component:\s*(\w+)/g)) {
      const comp = claseAArchivo.get(h[1]);
      if (comp && !/Shell/.test(h[1])) salida.push({ ruta: m[1], roles: listaRoles, componente: comp });
    }
  });
  return salida;
}

const hallazgos = [];
for (const r of rutasConRol()) {
  const propios = new Set(r.roles.map((x) => PREFIJO_DE_ROL[x]).filter(Boolean));
  const vistos = new Set();
  for (const { metodo, prefijos, archivo } of recolectar(r.componente)) {
    // Un método que también llama al prefijo del rol (p. ej. `base = admin ? this.admin : this.decano`) se considera dual.
    if (prefijos.some((l) => propios.has(l.split('/')[1]))) continue;
    const clave = `${r.ruta}|${metodo}|${archivo}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const permitida = prefijos.every((llamada) =>
      EXCEPCIONES.some(
        (e) => e.prefijo === llamada.split('/')[1] && e.patron.test(llamada) && r.roles.every((rol) => e.roles.includes(rol))
      )
    );
    hallazgos.push({
      ruta: `/app/${r.ruta}`.replace(/\/$/, ''),
      roles: r.roles.join(','),
      metodo,
      llamadas: prefijos.join(' '),
      origen: relative(RAIZ, archivo).replaceAll('\\', '/'),
      estado: permitida ? 'permitida' : 'CANDIDATA',
    });
  }
}

hallazgos.sort((a, b) => a.estado.localeCompare(b.estado) || a.ruta.localeCompare(b.ruta));
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(hallazgos, null, 2));
} else {
  const candidatas = hallazgos.filter((h) => h.estado === 'CANDIDATA');
  console.log(`Rutas con prefijo de API ajeno a su rol: ${candidatas.length} candidatas, ${hallazgos.length - candidatas.length} permitidas por excepción.\n`);
  for (const h of hallazgos) {
    console.log(`${h.estado.padEnd(10)} ${h.ruta}  [${h.roles}]  ${h.metodo}  ->  ${h.llamadas}   (${h.origen})`);
  }
}
