import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarSesionV2Request,
  CrearSesionV2Request,
  SesionV2ApiDto,
} from '../api/models/sesion-consultada-api-dto.model';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { ApiMessageResponse } from '../api/models/api-message-response.model';
import { ApiDataResponse, ApiVoidDataResponse } from '../api/models/api-data-response.model';
import { ClassSession } from '../models/attendance.model';
import { getSessionNameError } from '../validation/session-name.util';
import { SessionTimeZoneService } from './session-timezone.service';
import { SessionTimeZoneError } from '../time/session-timezone.util';

export interface SessionLocalFormInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface UpdateSessionV2Input extends SessionLocalFormInput {
  /** Sesión leída antes de editar; permite conservar instantes con precisión completa. */
  originalSession?: ClassSession;
}

@Injectable({ providedIn: 'root' })
export class SessionV2Service {
  constructor(
    private readonly http: HttpClient,
    private readonly timeZone: SessionTimeZoneService
  ) {}

  getSession(sesionId: string): Observable<ApiDataResponse<ClassSession>> {
    return this.http
      .get<ApiDataResponse<SesionV2ApiDto>>(`${environment.apiV2Url}/sesiones/${sesionId}`)
      .pipe(map((response) => ({ ...response, datos: this.toClassSession(response.datos) })));
  }

  getSessionsByGroup(grupoId: string): Observable<ApiListResponse<ClassSession>> {
    return this.http
      .get<ApiListResponse<SesionV2ApiDto>>(`${environment.apiV2Url}/sesiones/grupo/${grupoId}`)
      .pipe(
        map((response) => ({
          ...response,
          datos: response.datos.map((session) => this.toClassSession(session)),
        }))
      );
  }

  createSession(grupoId: string, data: SessionLocalFormInput): Observable<ApiMessageResponse> {
    return defer(() => {
      const payload: CrearSesionV2Request = {
        grupo: grupoId,
        nombre: this.validateName(data.title),
        ...this.toUtcPayload(data),
      };
      return this.http.post<ApiMessageResponse>(`${environment.apiV2Url}/sesiones`, payload);
    });
  }

  updateSession(
    sesionId: string,
    data: UpdateSessionV2Input
  ): Observable<ApiVoidDataResponse> {
    return defer(() => {
      const title = this.validateName(data.title);
      const unchangedInstants =
        data.originalSession?.fechaHoraInicio &&
        data.originalSession.fechaHoraFin &&
        this.timeZone.displaySessionDate(data.originalSession) === data.date &&
        this.timeZone.displaySessionStartTime(data.originalSession) === data.startTime &&
        this.timeZone.displaySessionEndTime(data.originalSession) === data.endTime;

      const temporal = unchangedInstants
        ? {
            fechaHoraInicio: data.originalSession!.fechaHoraInicio!,
            fechaHoraFin: data.originalSession!.fechaHoraFin!,
          }
        : this.toUtcPayload(data);

      const payload: ActualizarSesionV2Request = {
        nombre: title,
        ...temporal,
      };
      return this.http.patch<ApiVoidDataResponse>(
        `${environment.apiV2Url}/sesiones/${sesionId}`,
        payload
      );
    });
  }

  private validateName(title: string): string {
    const error = getSessionNameError(title);
    if (error) throw new Error(error);
    return title.trim();
  }

  private toUtcPayload(data: SessionLocalFormInput): {
    fechaHoraInicio: string;
    fechaHoraFin: string;
  } {
    try {
      return this.timeZone.toInstants({
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      });
    } catch (error) {
      if (error instanceof SessionTimeZoneError) throw error;
      throw new Error('No fue posible convertir el horario a un instante válido.');
    }
  }

  private toClassSession(session: SesionV2ApiDto): ClassSession {
    const confirmed = session.estadoTemporal === 'CONFIRMADA';
    const start = confirmed && session.fechaHoraInicio
      ? this.timeZone.displayInstant(session.fechaHoraInicio)
      : null;
    const end = confirmed && session.fechaHoraFin
      ? this.timeZone.displayInstant(session.fechaHoraFin)
      : null;

    return {
      id: session.sesion,
      courseId: session.grupo,
      sessionNumber: session.numero,
      title: session.nombre,
      date: start?.date ?? '',
      endDate: end?.date,
      startTime: start?.time ?? '',
      endTime: end?.time ?? '',
      records: [],
      fechaHoraInicio: session.fechaHoraInicio,
      fechaHoraFin: session.fechaHoraFin,
      estadoTemporal: session.estadoTemporal,
      procedenciaTemporal: session.procedenciaTemporal,
      codigo: session.codigo,
      numeroSemana: session.numeroSemana,
      codigoGrupo: session.codigoGrupo,
      nombreGrupo: session.nombreGrupo,
    };
  }
}

