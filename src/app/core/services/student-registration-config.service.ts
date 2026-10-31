import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';

/** Respuesta de `GET /api/v1/configuracion/registro-estudiante`. */
export interface StudentRegistrationConfigDto {
  dominioCorreo: string;
}

/** Dominio de datos de prueba cuando el frontend corre con mocks (el backend real nunca se consulta). */
const MOCK_EMAIL_DOMAIN = '@uco.edu.co';

/**
 * IDENT-001: entrega el dominio institucional vigente para validar el correo del estudiante en el formulario de
 * matricula manual. Se consulta una sola vez por sesion y se reutiliza; si falla, se permite reintentar.
 */
@Injectable({ providedIn: 'root' })
export class StudentRegistrationConfigService {
  private cached$: Observable<string> | null = null;

  constructor(private readonly http: HttpClient) {}

  getEmailDomain(): Observable<string> {
    if (environment.useFrontendMocks) {
      return of(MOCK_EMAIL_DOMAIN);
    }
    if (!this.cached$) {
      this.cached$ = this.http
        .get<ApiDataResponse<StudentRegistrationConfigDto>>(
          `${environment.apiUrl}/configuracion/registro-estudiante`
        )
        .pipe(
          map((response) => response.datos.dominioCorreo),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    const current$ = this.cached$;
    return new Observable<string>((subscriber) => {
      const subscription = current$.subscribe({
        next: (value) => subscriber.next(value),
        complete: () => subscriber.complete(),
        error: (error) => {
          // Un fallo no queda en cache: el siguiente intento vuelve a consultar al backend.
          if (this.cached$ === current$) {
            this.cached$ = null;
          }
          subscriber.error(error);
        },
      });
      return () => subscription.unsubscribe();
    });
  }
}
