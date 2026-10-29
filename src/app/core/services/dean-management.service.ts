import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ActualizarCoordinadorPayload, CoordinadorItem, ResultadoGestionCoordinador } from '../models/role-management.model';

@Injectable({
  providedIn: 'root',
})
export class DeanManagementService {
  constructor(private http: HttpClient) {}

  getCoordinadores(): Observable<ApiResponse<CoordinadorItem[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/decano/coordinadores`).pipe(
      map((res) => {
        if (res && res.exitoso && Array.isArray(res.datos)) {
          const coordMap = new Map<string, any>();
          for (const item of res.datos) {
            if (item && item.id && !coordMap.has(item.id)) {
              coordMap.set(item.id, item);
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
              facultad: raw.facultad || raw.nombreFacultad || 'Sin Facultad Asignada',
              programaAcademico: programaResuelto,
              nombrePrograma: raw.nombrePrograma || programaResuelto,
              totalDocentes: raw.totalDocentes ?? 0,
              totalGrupos: raw.totalGrupos ?? 0,
              estado: raw.estado || (raw.estaActivoCoordinador === false ? 'INACTIVO' : 'ACTIVO'),
              estaActivoCoordinador: raw.estaActivoCoordinador ?? true,
              estaActivoRolCoordinador: raw.estaActivoRolCoordinador,
            };
          });

          return { ...res, datos: normalizados };
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
