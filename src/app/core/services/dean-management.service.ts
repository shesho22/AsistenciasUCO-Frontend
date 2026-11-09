import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ActualizarCoordinadorPayload, CoordinadorItem, ResultadoGestionCoordinador } from '../models/role-management.model';

/** `ApiPageResponse` de GET /decano/coordinadores. */
interface CoordinadoresPageDto {
  exitoso?: boolean;
  elementos?: Record<string, any>[];
  numeroPagina?: number;
  tamanoPagina?: number;
  totalElementos?: number;
  totalPaginas?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeanManagementService {
  constructor(private http: HttpClient) {}

  getCoordinadores(): Observable<ApiResponse<CoordinadorItem[]>> {
    // CULM-001 D.9-a: GET /decano/coordinadores es ApiPageResponse { elementos, totalElementos, ... }.
    const params = new HttpParams().set('pagina', 1).set('tamano', 100);
    return this.http.get<CoordinadoresPageDto>(`${environment.apiUrl}/decano/coordinadores`, { params }).pipe(
      map((page) => {
        const res = { ...page, datos: page?.elementos } as unknown as ApiResponse<any[]>;
        if (page && page.exitoso !== false && Array.isArray(page.elementos)) {
          const coordMap = new Map<string, any>();
          for (const item of page.elementos) {
            if (item && item['id'] && !coordMap.has(item['id'])) {
              coordMap.set(item['id'], item);
            }
          }

          const normalizados: CoordinadorItem[] = Array.from(coordMap.values()).map((raw) => {
            const nombreCompleto = (raw.nombreCompleto || '').trim();
            let nombres = raw.nombres || '';
            let apellidos = raw.apellidos || '';

            if (!nombres && nombreCompleto) {
              const partes = nombreCompleto.split(/\s+/);
              if (partes.length <= 2) {
                nombres = partes[0] || '';
                apellidos = partes[1] || '';
              } else {
                nombres = partes.slice(0, 2).join(' ');
                apellidos = partes.slice(2).join(' ');
              }
            }

            const programaResuelto =
              raw.programaAcademico ||
              raw.nombrePrograma ||
              'Sin Programa Asignado';

            return {
              id: raw.id,
              idUsuario: raw.idUsuario,
              idPrograma: raw.idPrograma ?? null,
              tipoIdentificacion: raw.tipoIdentificacion || 'CC',
              tipoIdentificacionId: raw.tipoIdentificacionId,
              numeroIdentificacion: String(raw.numeroIdentificacion || ''),
              nombreCompleto: nombreCompleto || `${nombres} ${apellidos}`.trim(),
              primerNombre: raw.primerNombre,
              segundoNombre: raw.segundoNombre,
              primerApellido: raw.primerApellido,
              segundoApellido: raw.segundoApellido,
              nombres: nombres || nombreCompleto,
              apellidos: apellidos,
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

          return { ...res, exitoso: true, datos: normalizados };
        }
        return res as unknown as ApiResponse<CoordinadorItem[]>;
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
