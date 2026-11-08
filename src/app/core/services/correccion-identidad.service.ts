import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  ConfiguracionCorreccionIdentidad,
  CorregirIdentidadPayload,
  ResultadoCorreccionIdentidad,
} from '../models/correccion-identidad.model';

/**
 * HU159: corrección de identidad del estudiante (coordinador de su programa) y del decano (administrador), y la
 * configuración que dice si el documento es corregible. Coordinador (HU121) y docente (HU092) se corrigen en sus
 * endpoints de edición.
 */
@Injectable({ providedIn: 'root' })
export class CorreccionIdentidadService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Una sola consulta por sesión; si falla, el documento se muestra de solo lectura. */
  private readonly configuracion$ = this.http
    .get<ApiResponse<ConfiguracionCorreccionIdentidad>>(`${this.api}/configuracion/identidad`)
    .pipe(
      map((res) => res.datos?.permitirCorregirDocumento === true),
      catchError(() => of(false)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  permiteCorregirDocumento(): Observable<boolean> {
    return this.configuracion$;
  }

  corregirEstudiante(idEstudiante: string, payload: CorregirIdentidadPayload): Observable<ApiResponse<ResultadoCorreccionIdentidad>> {
    return this.http.put<ApiResponse<ResultadoCorreccionIdentidad>>(
      `${this.api}/coordinador/estudiantes/${encodeURIComponent(idEstudiante)}/identidad`,
      payload,
    );
  }

  /** HU156: corrección de identidad de un estudiante por el administrador institucional (PUT /admin/estudiantes/{id}/identidad). */
  corregirEstudiantePorAdmin(idEstudiante: string, payload: CorregirIdentidadPayload): Observable<ApiResponse<ResultadoCorreccionIdentidad>> {
    return this.http.put<ApiResponse<ResultadoCorreccionIdentidad>>(
      `${this.api}/admin/estudiantes/${encodeURIComponent(idEstudiante)}/identidad`,
      payload,
    );
  }

  corregirDecano(idDecano: string, payload: CorregirIdentidadPayload): Observable<ApiResponse<ResultadoCorreccionIdentidad>> {
    return this.http.put<ApiResponse<ResultadoCorreccionIdentidad>>(
      `${this.api}/admin/decanos/${encodeURIComponent(idDecano)}/identidad`,
      payload,
    );
  }
}
