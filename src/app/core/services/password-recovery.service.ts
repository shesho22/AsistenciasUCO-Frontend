import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, delay, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';

/** Respuesta de las dos rutas públicas de recuperación: el mensaje institucional ya viene listo del catálogo. */
export interface PasswordRecoveryResultDto {
  mensaje: string;
}

/**
 * HU177: recuperación de contraseña. Pedir el enlace responde siempre lo mismo, exista o no la cuenta. La contraseña
 * nueva y el token del enlace viajan solo en el cuerpo del POST; nunca se guardan ni se colocan en la URL de la petición.
 */
@Injectable({ providedIn: 'root' })
export class PasswordRecoveryService {
  constructor(private readonly http: HttpClient) {}

  /** @returns el mensaje institucional que debe mostrarse, igual para cualquier correo. */
  requestLink(correo: string): Observable<string> {
    if (environment.useFrontendMocks) {
      return of('Si el correo está registrado, recibirá un enlace para definir una contraseña nueva.').pipe(delay(300));
    }
    return this.http
      .post<ApiDataResponse<PasswordRecoveryResultDto>>(`${environment.apiUrl}/public/recuperacion-clave/solicitud`, {
        correo,
      })
      .pipe(map((response) => response.datos.mensaje));
  }

  /** @returns el mensaje institucional de éxito. */
  resetPassword(token: string, clave: string): Observable<string> {
    if (environment.useFrontendMocks) {
      return of('Su contraseña fue actualizada. Ya puede iniciar sesión.').pipe(delay(300));
    }
    return this.http
      .post<ApiDataResponse<PasswordRecoveryResultDto>>(`${environment.apiUrl}/public/recuperacion-clave/confirmacion`, {
        token,
        clave,
      })
      .pipe(map((response) => response.datos.mensaje));
  }
}
