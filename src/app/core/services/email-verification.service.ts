import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, delay, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { ApiVoidDataResponse } from '../api/models/api-data-response.model';

/** Respuesta de `POST /api/v1/public/verificar-correo`: el mensaje institucional ya viene listo del catalogo. */
export interface EmailVerificationResultDto {
  mensaje: string;
}

/**
 * IDENT-001: verificacion publica del correo (token de un solo uso del enlace) y reenvio del enlace por el docente.
 * El token viaja solo en el cuerpo del POST; nunca se guarda ni se coloca en la URL de la peticion.
 */
@Injectable({ providedIn: 'root' })
export class EmailVerificationService {
  constructor(private readonly http: HttpClient) {}

  /** @returns el mensaje institucional de exito que debe mostrarse al estudiante. */
  verifyEmail(token: string): Observable<string> {
    if (environment.useFrontendMocks) {
      return of('Su correo fue verificado. Ya puede iniciar sesión.').pipe(delay(300));
    }
    return this.http
      .post<ApiDataResponse<EmailVerificationResultDto>>(
        `${environment.apiUrl}/public/verificar-correo`,
        { token }
      )
      .pipe(map((response) => response.datos.mensaje));
  }

  resendVerification(grupoId: string, estudianteId: string): Observable<ApiVoidDataResponse> {
    if (environment.useFrontendMocks) {
      return of({ exitoso: true, datos: null } as ApiVoidDataResponse).pipe(delay(300));
    }
    return this.http.post<ApiVoidDataResponse>(
      `${environment.apiUrl}/grupos/${encodeURIComponent(grupoId)}/estudiantes/${encodeURIComponent(estudianteId)}/reenviar-verificacion`,
      {}
    );
  }
}
