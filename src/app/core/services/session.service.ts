import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { ApiMessageResponse } from '../api/models/api-message-response.model';
import { ApiVoidDataResponse } from '../api/models/api-data-response.model';
import { SesionConsultadaApiDto } from '../api/models/sesion-consultada-api-dto.model';
import { getApiErrorMessage } from '../api/errors/api-error.util';
import { ClassSession } from '../models/attendance.model';
import { getSessionNameError } from '../validation/session-name.util';
import { SessionV2Service, UpdateSessionV2Input } from './session-v2.service';

export interface UpdateSessionInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  originalSession?: ClassSession;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private initialSessions: Record<string, ClassSession[]> = {
    'crs-1': [
      {
        id: 'ses-101',
        courseId: 'crs-1',
        sessionNumber: 1,
        date: '2026-08-25',
        startTime: '08:00',
        endTime: '10:00',
        title: 'Introducción al Cálculo Multivariado',
        records: [],
      },
      {
        id: 'ses-102',
        courseId: 'crs-1',
        sessionNumber: 2,
        date: '2026-08-27',
        startTime: '08:00',
        endTime: '10:00',
        title: 'Derivadas Parciales y Gradiente',
        records: [],
      },
      {
        id: 'ses-103',
        courseId: 'crs-1',
        sessionNumber: 3,
        date: '2026-09-01',
        startTime: '08:00',
        endTime: '10:00',
        title: 'Optimización y Multiplicadores de Lagrange',
        records: [],
      },
      {
        id: 'ses-104',
        courseId: 'crs-1',
        sessionNumber: 4,
        date: '2026-09-05',
        startTime: '14:00',
        endTime: '16:00',
        title: 'Taller Extraordinario de Nivelación',
        records: [],
      },
    ],
    'crs-2': [
      {
        id: 'ses-201',
        courseId: 'crs-2',
        sessionNumber: 1,
        date: '2026-08-26',
        startTime: '10:30',
        endTime: '12:30',
        title: 'Dualidad Onda-Partícula',
        records: [],
      },
      {
        id: 'ses-202',
        courseId: 'crs-2',
        sessionNumber: 2,
        date: '2026-09-02',
        startTime: '10:30',
        endTime: '12:30',
        title: 'Ecuación de Schrödinger en una Dimensión',
        records: [],
      },
    ],
  };

  private sessionsByGroupSignal = signal<Record<string, ClassSession[]>>(this.initialSessions);

  constructor(
    private http: HttpClient,
    private sessionV2: SessionV2Service
  ) {}

  getSessionsByGroup(grupoId: string): Observable<ApiResponse<ClassSession[]>> {
    if (environment.useSessionsV2 && !environment.useMocks) {
      return this.sessionV2.getSessionsByGroup(grupoId).pipe(
        map((response) => ({
          exitoso: response.exitoso,
          total: response.total,
          datos: response.datos,
        }))
      );
    }

    if (environment.useMocks) {
      const map = this.sessionsByGroupSignal();
      const existing = map[grupoId];
      const list =
        existing ||
        ([
          {
            id: `ses-${grupoId}-1`,
            courseId: grupoId,
            sessionNumber: 1,
            date: new Date().toISOString().split('T')[0],
            startTime: '08:00',
            endTime: '10:00',
            title: 'Sesión Inaugural del Curso',
            records: [],
          },
        ]);

      return of({
        idTransaccion: `mock-tx-ses-${grupoId}`,
        exitoso: true,
        total: list.length,
        datos: [...list],
      }).pipe(delay(200));
    }

    return this.http
      .get<ApiListResponse<SesionConsultadaApiDto>>(
        `${environment.apiUrl}/sesiones/grupo/${grupoId}`
      )
      .pipe(
        map((response) => {
          const sessions: ClassSession[] = response.datos.map((session) => {
            const start = this.splitLocalDateTime(session.fechaHoraInicio);
            const end = this.splitLocalDateTime(session.fechaHoraFin);

            return {
              id: session.sesion,
              courseId: session.grupo,
              sessionNumber: session.numero,
              title: session.nombre,
              date: start.date,
              endDate: end.date,
              startTime: start.time,
              endTime: end.time,
              records: [],
            };
          });

          return {
            exitoso: response.exitoso,
            total: sessions.length,
            datos: sessions,
          };
        })
      );
  }

  getSession(sesionId: string): Observable<{ exitoso: boolean; datos: ClassSession }> {
    if (environment.useSessionsV2 && !environment.useMocks) {
      return this.sessionV2.getSession(sesionId);
    }
    return this.http.get<any>(`${environment.apiUrl}/sesiones/${sesionId}`);
  }

  private splitLocalDateTime(value: string): { date: string; time: string } {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(
      value
    );
    if (!match) {
      throw new Error(`Formato LocalDateTime no soportado: ${value}`);
    }
    return { date: match[1], time: match[2] };
  }

  createSession(
    grupoId: string,
    data: {
      title: string;
      date: string;
      startTime: string;
      endTime: string;
    }
  ): Observable<ApiMessageResponse> {
    const nombreError = getSessionNameError(data.title);
    if (nombreError) {
      return throwError(() => new Error(nombreError));
    }
    if (data.startTime === data.endTime) {
      return throwError(() => new Error('La hora de fin debe ser posterior a la hora de inicio; una sesión de 24 horas no se crea implícitamente.'));
    }

    if (environment.useSessionsV2 && !environment.useMocks) {
      return this.sessionV2.createSession(grupoId, data);
    }

    if (environment.useMocks) {
      const currentList = this.sessionsByGroupSignal()[grupoId] || [];
      const sessionNumber = currentList.length + 1;
      const newSession: ClassSession = {
        id: `mock-ses-${sessionNumber}`,
        courseId: grupoId,
        sessionNumber,
        title: data.title,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        records: [],
      };

      this.sessionsByGroupSignal.update((map) => ({
        ...map,
        [grupoId]: [...(map[grupoId] || []), newSession],
      }));

      return of({
        exitoso: true,
        mensaje: `Sesión #${sessionNumber} programada correctamente.`,
      }).pipe(delay(250));
    }

    return this.http.post<ApiMessageResponse>(`${environment.apiUrl}/sesiones`, {
        grupo: grupoId,
        nombre: data.title.trim(),
        fechaHoraInicio: `${data.date}T${data.startTime}:00`,
        fechaHoraFin: `${data.date}T${data.endTime}:00`,
      });
  }

  /**
   * PATCH /sesiones/{sesionId} → `ApiDataResponse<Void>` (`{ exitoso: true, datos: null }`,
   * BACKEND_GOLDEN_PATH_CONTRACT §C.8). El backend no devuelve la sesión: quien consume
   * debe recargar por GET /sesiones/grupo/{grupoId}. No se fabrica idTransaccion ni mensajeUsuario.
   */
  updateSession(
    grupoId: string,
    sesionId: string,
    cambios: UpdateSessionInput
  ): Observable<ApiVoidDataResponse> {
    const nombreError = getSessionNameError(cambios.title);
    if (nombreError) {
      return throwError(() => new Error(nombreError));
    }
    if (cambios.startTime === cambios.endTime) {
      return throwError(() => new Error('La hora de fin debe ser posterior a la hora de inicio; una sesión de 24 horas no se crea implícitamente.'));
    }

    if (environment.useSessionsV2 && !environment.useMocks) {
      return this.sessionV2.updateSession(sesionId, cambios as UpdateSessionV2Input);
    }

    if (environment.useMocks) {
      this.sessionsByGroupSignal.update((map) => {
        const list = map[grupoId] || [];
        const modified = list.map((s) =>
          s.id === sesionId
            ? {
                ...s,
                title: cambios.title,
                date: cambios.date,
                startTime: cambios.startTime,
                endTime: cambios.endTime,
              }
            : s
        );
        return { ...map, [grupoId]: modified };
      });

      return of<ApiVoidDataResponse>({ exitoso: true, datos: null }).pipe(delay(250));
    }

    const body = {
      nombre: cambios.title.trim(),
      fechaHoraInicio: `${cambios.date}T${cambios.startTime}:00`,
      fechaHoraFin: `${cambios.date}T${cambios.endTime}:00`,
    };

    return this.http.patch<ApiVoidDataResponse>(
      `${environment.apiUrl}/sesiones/${sesionId}`,
      body
    );
  }

  // OUT_OF_GOLDEN_PATH (LB-001B.5A): closeSession, cancelarSesion, getQrToken y
  // registrarAutoAsistencia no pertenecen a BACKEND_GOLDEN_PATH_CONTRACT. Permanecen como
  // legado interno; ningún flujo del Golden Path los invoca (las acciones de UI están
  // deshabilitadas por `environment.features`) hasta que exista un contrato propio.

  /** @deprecated OUT_OF_GOLDEN_PATH — sin contrato congelado (cierre legacy, DB SES_003 → 501). Sin consumidores en UI. */
  closeSession(sesionId: string): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(`${environment.apiUrl}/sesiones/cierres`, {
        sesion: sesionId,
      })
      .pipe(
        map((res) => ({
          idTransaccion: res.idTransaccion || 'tx-ses-cierre-001',
          exitoso: res.exitoso,
          mensajeUsuario: res.mensajeUsuario || 'Sesión cerrada y consolidada exitosamente.',
          datos: undefined,
        }))
      );
  }

  /** @deprecated OUT_OF_GOLDEN_PATH — sin contrato congelado. Acción de UI deshabilitada (`features.sessionCancelEnabled`). */
  cancelarSesion(sesionId: string, motivo: string): Observable<ApiResponse<any>> {
    if (environment.useMocks) {
      return of({
        idTransaccion: `mock-tx-cancelar-${sesionId}`,
        exitoso: true,
        mensajeUsuario: 'Sesión cancelada formalmente y notificada a los estudiantes.',
        datos: { sesionId, estado: 'CANCELADA', motivoCancelacion: motivo },
      }).pipe(delay(250));
    }

    return this.http
      .patch<any>(`${environment.apiUrl}/docente/sesiones/${sesionId}/cancelar`, { motivo })
      .pipe(
        map((res) => ({
          idTransaccion: res.idTransaccion || 'tx-cancelar-ses',
          exitoso: true,
          mensajeUsuario: res.mensajeUsuario || 'Sesión cancelada formalmente.',
          datos: res.datos,
        })),
        catchError(() =>
          of({
            idTransaccion: 'tx-cancelar-error',
            exitoso: false,
            mensajeUsuario: 'No fue posible cancelar la sesión.',
            datos: undefined,
          })
        )
      );
  }

  /** @deprecated OUT_OF_GOLDEN_PATH — sin contrato congelado. Acción de UI deshabilitada (`features.sessionQrEnabled`). */
  getQrToken(sesionId: string): Observable<ApiResponse<{
    sesionId: string;
    grupoId: string;
    token: string;
    codigoAcceso: string;
    expiraEnSegundos: number;
    expiraEn: string;
  }>> {
    return this.http.get<ApiResponse<{
      sesionId: string;
      grupoId: string;
      token: string;
      codigoAcceso: string;
      expiraEnSegundos: number;
      expiraEn: string;
    }>>(`${environment.apiUrl}/sesiones/${sesionId}/qr-token`).pipe(
      map((res) => ({
        idTransaccion: res.idTransaccion || 'tx-qr-token',
        exitoso: res.exitoso,
        mensajeUsuario: res.mensajeUsuario || 'Token generado con éxito.',
        datos: res.datos,
      }))
    );
  }

  /** @deprecated OUT_OF_GOLDEN_PATH — vertical estudiante (auto-registro QR); sin contrato congelado. */
  registrarAutoAsistencia(payload: { token?: string; codigoAcceso?: string }): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${environment.apiUrl}/estudiante/asistencia-qr`, payload).pipe(
      map((res) => ({
        idTransaccion: res.idTransaccion || 'tx-auto-asistencia',
        exitoso: res.exitoso,
        mensajeUsuario: res.mensajeUsuario || '¡Asistencia registrada con éxito!',
        datos: res.datos,
      })),
      catchError((err: unknown) => {
        const errorMsg = getApiErrorMessage(err);
        return throwError(() => new Error(errorMsg));
      })
    );
  }
}
