import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import {
  CancelarSesionCoordinadorRequest,
  MotivoCancelacionCoordinador,
  SesionCanceladaPorCoordinador,
} from '../models/coordinador-sesion-cancelacion.model';

/**
 * CULM-001 / DEC-064 (HU047): el coordinador cancela una sesión creada manualmente por el docente. Los errores
 * (400 `SES_019`/`SES_021`, 403 `SEC_002`, 404, 409 `SES_018`/`SES_011`/`SES_012`/`SES_016`) se propagan tal cual:
 * el mensaje lo entrega el backend.
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
}
