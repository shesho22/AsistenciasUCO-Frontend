import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { ActualizarCoordinadorPayload, CoordinadorItem, ResultadoGestionCoordinador } from '../models/role-management.model';

/** Fila de GET /decano/coordinadores (CoordinadorItemDTO) o una ya normalizada. */
type CoordinadorApiDto = Partial<Omit<CoordinadorItem, 'numeroIdentificacion'>> & {
  numeroIdentificacion?: string | number | null;
  nombreFacultad?: string;
};

/** Filtros de GET /decano/coordinadores (CIERRE-W1B): la búsqueda, el estado y el paginado los resuelve el servidor. */
export interface FiltroCoordinadores {
  pagina: number;
  tamano: number;
  busqueda?: string | null;
  estaActivo?: boolean | null;
  sinPrograma?: boolean | null;
}

/** Página de coordinadores ya normalizada: `elementos` y `datos` traen las mismas filas. */
export interface PaginaCoordinadores extends ApiPageResponse<CoordinadorItem> {
  datos: CoordinadorItem[];
}

/** `ApiPageResponse` de GET /decano/coordinadores. */
interface CoordinadoresPageDto {
  exitoso?: boolean;
  elementos?: CoordinadorApiDto[];
  numeroPagina?: number;
  tamanoPagina?: number;
  totalElementos?: number;
  totalPaginas?: number;
}

const FILTRO_COORDINADORES_POR_DEFECTO: FiltroCoordinadores = { pagina: 1, tamano: 100 };

@Injectable({
  providedIn: 'root',
})
export class DeanManagementService {
  private readonly http = inject(HttpClient);


  /**
   * CIERRE-W1B: `GET /decano/coordinadores` pagina y filtra en el servidor (SP). Sin filtro devuelve la primera página de
   * 100 (el máximo del backend), como hasta ahora para los resúmenes que solo necesitan la lista corta.
   */
  getCoordinadores(
    filtro: FiltroCoordinadores = FILTRO_COORDINADORES_POR_DEFECTO
  ): Observable<PaginaCoordinadores> {
    let params = new HttpParams().set('pagina', filtro.pagina).set('tamano', filtro.tamano);
    const busqueda = filtro.busqueda?.trim();
    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }
    if (filtro.estaActivo !== undefined && filtro.estaActivo !== null) {
      params = params.set('estaActivo', filtro.estaActivo);
    }
    if (filtro.sinPrograma !== undefined && filtro.sinPrograma !== null) {
      params = params.set('sinPrograma', filtro.sinPrograma);
    }
    return this.http.get<CoordinadoresPageDto>(`${environment.apiUrl}/decano/coordinadores`, { params }).pipe(
      map((page) => {
        const crudos = Array.isArray(page?.elementos) ? page.elementos : [];
        // El backend entrega un coordinador por fila, ya con nombres y apellidos separados: no se deduplica ni se parte.
        const normalizados: CoordinadorItem[] = crudos.filter((raw) => !!raw?.id).map((raw) => {
          const nombres = raw.nombres ?? '';
          const apellidos = raw.apellidos ?? '';
          const programaResuelto = raw.programaAcademico || raw.nombrePrograma || 'Sin Programa Asignado';
          return {
            id: raw.id as string,
            idUsuario: raw.idUsuario,
            idPrograma: raw.idPrograma ?? null,
            tipoIdentificacion: raw.tipoIdentificacion || 'CC',
            tipoIdentificacionId: raw.tipoIdentificacionId,
            numeroIdentificacion: String(raw.numeroIdentificacion || ''),
            nombreCompleto: raw.nombreCompleto ?? undefined,
            primerNombre: raw.primerNombre,
            segundoNombre: raw.segundoNombre,
            primerApellido: raw.primerApellido,
            segundoApellido: raw.segundoApellido,
            nombres,
            apellidos,
            correo: raw.correo || '',
            // Certificación F3: el contrato no trae la facultad (es la del decano); no se inventa "Sin Facultad".
            facultad: raw.facultad || raw.nombreFacultad || '',
            programaAcademico: programaResuelto,
            nombrePrograma: raw.nombrePrograma || programaResuelto,
            totalDocentes: raw.totalDocentes ?? null,
            totalGrupos: raw.totalGrupos ?? null,
            estado: raw.estado || (raw.estaActivoCoordinador === false ? 'INACTIVO' : 'ACTIVO'),
            estaActivoCoordinador: raw.estaActivoCoordinador ?? true,
            estaActivoRolCoordinador: raw.estaActivoRolCoordinador,
          };
        });
        const total = Number(page?.totalElementos ?? normalizados.length);
        return {
          exitoso: page?.exitoso !== false,
          elementos: normalizados,
          datos: normalizados,
          numeroPagina: page?.numeroPagina ?? filtro.pagina,
          tamanoPagina: page?.tamanoPagina ?? filtro.tamano,
          totalElementos: total,
          totalPaginas: page?.totalPaginas ?? Math.max(1, Math.ceil(total / filtro.tamano)),
        };
      })
    );
  }

  createCoordinador(nuevoCoord: Omit<CoordinadorItem, 'id' | 'totalDocentes' | 'totalGrupos'> | Record<string, unknown>): Observable<ApiResponse<CoordinadorItem>> {
    return this.http.post<ApiResponse<CoordinadorItem>>(`${environment.apiUrl}/decano/coordinadores`, nuevoCoord);
  }

  updateCoordinador(id: string, payload: ActualizarCoordinadorPayload): Observable<ApiResponse<ResultadoGestionCoordinador>> {
    return this.http.put<ApiResponse<ResultadoGestionCoordinador>>(`${environment.apiUrl}/decano/coordinadores/${id}`, payload);
  }

  setCoordinadorEstado(id: string, estaActivo: boolean): Observable<ApiResponse<ResultadoGestionCoordinador>> {
    return this.http.patch<ApiResponse<ResultadoGestionCoordinador>>(
      `${environment.apiUrl}/decano/coordinadores/${id}/estado`,
      { estaActivo },
    );
  }
}
