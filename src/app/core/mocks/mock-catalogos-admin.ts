import { HttpResponse } from '@angular/common/http';
import { Observable, delay, of } from 'rxjs';
import { CategoriaJustificacionAdmin, MotivoCancelacionSesionAdmin } from '../models/catalogo-admin.model';

/** Catálogos predefinidos de solo consulta (solo modo mock). */
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

function lista<T>(datos: T[]): Observable<unknown> {
  return of(new HttpResponse({ status: 200, body: { exitoso: true, datos, total: datos.length } })).pipe(delay(150));
}

/** Responde los GET de `/admin/categorias-justificacion` y `/admin/motivos-cancelacion-sesion`; `null` si la ruta no es de estos catálogos. */
export function responderCatalogosAdminMock(url: string, method: string): Observable<unknown> | null {
  if (method !== 'GET') return null;
  if (/\/admin\/categorias-justificacion(?:\?.*)?$/.test(url)) {
    return lista([...categorias].sort((a, c) => a.nombre.localeCompare(c.nombre, 'es')));
  }
  if (/\/admin\/motivos-cancelacion-sesion(?:\?.*)?$/.test(url)) {
    return lista([...motivos].sort((a, c) => a.orden - c.orden));
  }
  return null;
}
