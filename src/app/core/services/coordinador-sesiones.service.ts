import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { paramsSinVacios } from '../api/pagination.util';
import {
  CancelarSesionCoordinadorRequest,
  MotivoCancelacionCoordinador,
  SesionCanceladaPorCoordinador,
} from '../models/coordinador-sesion-cancelacion.model';
import {
  AprobarSolicitudSesionRequest,
  FiltroSolicitudesSesion,
  RechazarSolicitudSesionRequest,
  SolicitudSesionItem,
} from '../models/coordinador-solicitud-sesion.model';

/**
 * CULM-001 / DEC-064 (HU047): el coordinador cancela una sesión creada manualmente por el docente. Los errores
 * (400 `SES_019`/`SES_021`, 403 `SEC_002`, 404, 409 `SES_018`/`SES_011`/`SES_012`/`SES_016`) se propagan tal cual:
 * el mensaje lo entrega el backend.
 *
 * DEC-065 (2): bandeja de solicitudes de sesión extraordinaria con aprobación y rechazo del coordinador.
 */
@Injectable({ providedIn: 'root' })
export class CoordinadorSesionesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/coordinador/sesiones`;

  getMotivosCancelacion(): Observable<ApiResponse<MotivoCancelacionCoordinador[]>> {
    return this.http.get<ApiResponse<MotivoCancelacionCoordinador[]>>(`${this.base}/motivos-cancelacion`);
  }

  cancelarSesion(
    sesionId: string,
    request: CancelarSesionCoordinadorRequest
  ): Observable<ApiDataResponse<SesionCanceladaPorCoordinador>> {
    return this.http.post<ApiDataResponse<SesionCanceladaPorCoordinador>>(
      `${this.base}/${encodeURIComponent(sesionId)}/cancelacion`,
      request
    );
  }

  consultarSolicitudes(filtro: FiltroSolicitudesSesion): Observable<ApiPageResponse<SolicitudSesionItem>> {
    const params = paramsSinVacios({
      soloPendientes: filtro.soloPendientes,
      programaId: filtro.programaId,
      grupoId: filtro.grupoId,
      pagina: filtro.pagina,
      tamano: filtro.tamano,
    });
    return this.http.get<ApiPageResponse<SolicitudSesionItem>>(`${this.base}/solicitudes`, { params });
  }

  /** Total de solicitudes pendientes: se pide una sola fila y solo interesa `totalElementos`. */
  contarPendientes(programaId?: string | null): Observable<number> {
    return this.consultarSolicitudes({ soloPendientes: true, programaId, pagina: 1, tamano: 1 }).pipe(
      map((pagina) => pagina.totalElementos ?? pagina.elementos?.length ?? 0)
    );
  }

  aprobar(sesionId: string, observacion?: string): Observable<ApiDataResponse<unknown>> {
    const body: AprobarSolicitudSesionRequest = observacion ? { observacion } : {};
    return this.http.post<ApiDataResponse<unknown>>(`${this.base}/${encodeURIComponent(sesionId)}/aprobacion`, body);
  }

  rechazar(sesionId: string, codigoMotivo: string, observacion?: string): Observable<ApiDataResponse<unknown>> {
    const body: RechazarSolicitudSesionRequest = observacion ? { codigoMotivo, observacion } : { codigoMotivo };
    return this.http.post<ApiDataResponse<unknown>>(`${this.base}/${encodeURIComponent(sesionId)}/rechazo`, body);
  }
}
