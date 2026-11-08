import { HttpRequest } from '@angular/common/http';

/** `ApiPageResponse` del backend para los specs (CULM-001 B2NM). */
export function paginaApi<T>(elementos: T[], numeroPagina = 1, tamanoPagina = 100, totalElementos = elementos.length) {
  return {
    exitoso: true,
    elementos,
    numeroPagina,
    tamanoPagina,
    totalElementos,
    totalPaginas: Math.max(Math.ceil(totalElementos / tamanoPagina), 1),
  };
}

/** Coincide con un GET por la URL sin parámetros de consulta (los listados ahora viajan con pagina y tamano). */
export const porUrl = (url: string) => (req: HttpRequest<unknown>) => req.method === 'GET' && req.url === url;

/** Elemento de GET /decano/grupos tal como lo entrega el backend (B2NM: nombres de programa en `programas`). */
export function grupoFacultadApi(over: Record<string, unknown> = {}) {
  return {
    idGrupo: 'g1',
    codigo: 'MAT-301',
    nombre: 'Sección A',
    idPeriodoAcademico: 'per-1',
    idAsistencia: null,
    idAsignatura: 'asig-1',
    nombreAsignatura: 'Matemática Avanzada III',
    idDocente: 'doc-1',
    capacidadMaximaPermitida: 35,
    estudiantesActivos: 28,
    cuposDisponibles: 7,
    grupoEstaHablitado: true,
    programas: ['Ingeniería de Sistemas'],
    ...over,
  };
}
