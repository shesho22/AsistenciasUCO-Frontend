import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { ApiPageResponse } from './models/api-page-response.model';

/** Tamaño máximo de página que acepta el backend (TAMANO_MAXIMO = 100). */
export const TAMANO_PAGINA_MAXIMO = 100;

export interface TodasLasPaginas<T> {
  elementos: T[];
  total: number;
}

/**
 * CULM-001 B2NM (contrato §4.1): los listados que la UI aún no pagina se leen pidiendo páginas de 100 hasta
 * agotar `totalPaginas`. Los filtros viajan en `params`; `pagina` y `tamano` los fija esta función.
 */
export function obtenerTodasLasPaginas<T>(
  http: HttpClient,
  url: string,
  params: HttpParams = new HttpParams()
): Observable<TodasLasPaginas<T>> {
  const pedir = (pagina: number) =>
    http.get<ApiPageResponse<T>>(url, {
      params: params.set('pagina', pagina).set('tamano', TAMANO_PAGINA_MAXIMO),
    });
  return pedir(1).pipe(
    expand((p) => ((p.numeroPagina ?? 1) < (p.totalPaginas ?? 1) ? pedir((p.numeroPagina ?? 1) + 1) : EMPTY)),
    reduce(
      (acc, p) => ({ elementos: [...acc.elementos, ...(p.elementos ?? [])], total: p.totalElementos ?? acc.total }),
      { elementos: [] as T[], total: 0 }
    ),
    map((r) => ({ elementos: r.elementos, total: r.total || r.elementos.length }))
  );
}


/** Omite filtros vacíos al armar los parámetros de una consulta. */
export function paramsSinVacios(filtro: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
      params = params.set(clave, String(valor).trim());
    }
  }
  return params;
}
