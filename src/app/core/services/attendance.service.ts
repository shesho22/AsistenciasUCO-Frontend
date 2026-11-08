import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { ApiMessageResponse } from '../api/models/api-message-response.model';
import { AsistenciaConsultadaApiDto } from '../api/models/asistencia-consultada-api-dto.model';
import { RegistrarAsistenciasSesionRequest } from '../api/models/registrar-asistencias-sesion-request.model';
import { SolicitarRevisionAsistenciaRequest } from '../api/models/solicitar-revision-asistencia-request.model';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  constructor(private http: HttpClient) {}

  getAttendancesByGroup(
    grupoId: string,
    sesionId?: string
  ): Observable<ApiListResponse<AsistenciaConsultadaApiDto>> {
    return this.http.get<ApiListResponse<AsistenciaConsultadaApiDto>>(
      `${environment.apiUrl}/grupos/${grupoId}/asistencias`,
      {
        params: sesionId ? { sesionId } : {},
      }
    );
  }

  requestAttendanceRevision(
    request: SolicitarRevisionAsistenciaRequest
  ): Observable<ApiMessageResponse> {
    const justificacion = (request.justificacion || '').trim();

    if (justificacion.length < 5 || justificacion.length > 500) {
      return throwError(
        () => new Error('La justificación debe contener entre 5 y 500 caracteres.')
      );
    }

    return this.http.post<ApiMessageResponse>(
      `${environment.apiUrl}/asistencias/revisiones`,
      request
    );
  }

  saveBatchAttendance(
    payload: RegistrarAsistenciasSesionRequest
  ): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(
      `${environment.apiUrl}/asistencias/lote`,
      payload
    );
  }
}

