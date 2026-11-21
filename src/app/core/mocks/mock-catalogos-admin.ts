import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { CategoriaJustificacionAdmin, MotivoCancelacionSesionAdmin } from '../models/catalogo-admin.model';

/** Estado en memoria de los catálogos administrables (solo modo mock). */
const categorias: CategoriaJustificacionAdmin[] = [
  { id: 'cat-1', codigo: 'MED', nombre: 'Incapacidad médica', descripcion: 'Incapacidad expedida por una entidad de salud.', requiereSoporte: true, estaActivo: true },
  { id: 'cat-2', codigo: 'CAL', nombre: 'Calamidad doméstica', descripcion: null, requiereSoporte: true, estaActivo: true },
  { id: 'cat-3', codigo: 'INS', nombre: 'Representación institucional', descripcion: 'Actividad oficial de la universidad.', requiereSoporte: false, estaActivo: false },
];

const motivos: MotivoCancelacionSesionAdmin[] = [
  { id: 'mot-1', codigo: 'DOCENTE_INCAPACIDAD', nombre: 'Incapacidad del docente', orden: 1, estaActivo: true },
  { id: 'mot-2', codigo: 'EVENTO_INSTITUCIONAL', nombre: 'Evento institucional', orden: 2, estaActivo: true },
  { id: 'mot-3', codigo: 'FUERZA_MAYOR', nombre: 'Fuerza mayor', orden: 3, estaActivo: false },
];

function error(status: number, message: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { status, message } }));
}

function ok<T>(status: number, datos: T, mensajeUsuario: string, extra: object = {}) {
  return of(new HttpResponse({ status, body: { exitoso: true, datos, mensajeUsuario, ...extra } })).pipe(delay(150));
}

interface Item {
  id: string;
  codigo: string;
  nombre: string;
  estaActivo: boolean;
}

function responder<T extends Item>(
  lista: T[],
  ordenar: (a: T, b: T) => number,
  etiqueta: string,
  subruta: string,
  method: string,
  body: Record<string, unknown>,
  crear: (id: string) => T,
  editar: (item: T) => void
): Observable<unknown> {
  if (subruta === '' && method === 'GET') {
    const datos = [...lista].sort(ordenar);
    return of(new HttpResponse({ status: 200, body: { exitoso: true, datos, total: datos.length } })).pipe(delay(150));
  }
  if (subruta === '' && method === 'POST') {
    const codigo = String(body['codigo'] ?? '');
    const nombre = String(body['nombre'] ?? '').trim();
    if (lista.some((i) => i.codigo === codigo || i.nombre.toLowerCase() === nombre.toLowerCase())) {
      return error(409, `Ya existe ${etiqueta} con ese código o nombre.`);
    }
    const nuevo = crear(`mock-${etiqueta.replace(/\s/g, '')}-${lista.length + 1}`);
    lista.push(nuevo);
    return ok(201, { id: nuevo.id }, 'Registro creado correctamente.');
  }
  const m = /^\/([^/]+)(\/estado)?$/.exec(subruta);
  const item = m ? lista.find((i) => i.id === m[1]) : undefined;
  if (!m || !item) return error(404, 'El registro del catálogo no existe.');
  if (m[2] && method === 'PATCH') {
    const estaActivo = body['estaActivo'] === true;
    if (!estaActivo && item.estaActivo && lista.filter((i) => i.estaActivo).length === 1) {
      return error(409, 'No se puede desactivar el último registro activo del catálogo.');
    }
    item.estaActivo = estaActivo;
    return ok(200, { id: item.id, estaActivo }, 'Estado actualizado correctamente.');
  }
  if (!m[2] && method === 'PUT') {
    const nombre = String(body['nombre'] ?? '').trim();
    if (lista.some((i) => i.id !== item.id && i.nombre.toLowerCase() === nombre.toLowerCase())) {
      return error(409, `Ya existe ${etiqueta} con ese código o nombre.`);
    }
    item.nombre = nombre;
    editar(item);
    return ok(200, { id: item.id }, 'Registro actualizado correctamente.');
  }
  return error(405, 'Operación no permitida.');
}

/** Responde `/admin/categorias-justificacion` y `/admin/motivos-cancelacion-sesion`; `null` si la ruta no es de estos catálogos. */
export function responderCatalogosAdminMock(url: string, method: string, body: unknown): Observable<unknown> | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const cat = /\/admin\/categorias-justificacion(\/[^?]*)?(?:\?.*)?$/.exec(url);
  if (cat) {
    return responder(
      categorias,
      (a, c) => a.nombre.localeCompare(c.nombre, 'es'),
      'una categoría',
      cat[1] ?? '',
      method,
      b,
      (id) => ({
        id,
        codigo: String(b['codigo']),
        nombre: String(b['nombre']).trim(),
        descripcion: (b['descripcion'] as string | undefined) ?? null,
        requiereSoporte: b['requiereSoporte'] === true,
        estaActivo: true,
      }),
      (item) => {
        item.descripcion = (b['descripcion'] as string | undefined) ?? null;
        item.requiereSoporte = b['requiereSoporte'] === true;
      }
    );
  }
  const mot = /\/admin\/motivos-cancelacion-sesion(\/[^?]*)?(?:\?.*)?$/.exec(url);
  if (mot) {
    return responder(
      motivos,
      (a, c) => a.orden - c.orden,
      'un motivo',
      mot[1] ?? '',
      method,
      b,
      (id) => ({
        id,
        codigo: String(b['codigo']),
        nombre: String(b['nombre']).trim(),
        orden: typeof b['orden'] === 'number' ? b['orden'] : Math.max(0, ...motivos.map((x) => x.orden)) + 1,
        estaActivo: true,
      }),
      (item) => {
        item.orden = Number(b['orden']);
      }
    );
  }
  return null;
}
