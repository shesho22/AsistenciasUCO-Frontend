import { EMPTY, Observable, expand, reduce } from 'rxjs';
import { PaginaApi } from '../../../../core/models/toma-asistencia.model';

/** El backend limita la página a 100 (PAGINACION/TAMANO_MAXIMO): las listas por toma se recorren por páginas. */
export const TAMANO_PAGINA_TOMA = 100;

/** Recorre todas las páginas de un listado paginado del backend y devuelve los elementos acumulados en orden. */
export function cargarTodasLasPaginas<T>(pedir: (pagina: number) => Observable<PaginaApi<T>>): Observable<T[]> {
  return pedir(1).pipe(
    expand((respuesta) => (respuesta.numeroPagina < respuesta.totalPaginas ? pedir(respuesta.numeroPagina + 1) : EMPTY)),
    reduce((acumulado, respuesta) => [...acumulado, ...respuesta.elementos], [] as T[])
  );
}
