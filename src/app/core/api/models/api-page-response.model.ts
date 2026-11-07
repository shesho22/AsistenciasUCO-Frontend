/**
 * `ApiPageResponse<T>` del backend (AGENTS.md 2.3): listado paginado con metadatos. `numeroPagina` es base 1.
 */
export interface ApiPageResponse<T> {
  exitoso: boolean;
  elementos: T[];
  numeroPagina: number;
  tamanoPagina: number;
  totalElementos: number;
  totalPaginas: number;
}
