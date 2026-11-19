import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { RolCalendario, SesionCalendario } from '../models/sesion-calendario.model';

/**
 * ATA D7: sesiones con fecha del estudiante o del docente en un rango de fechas locales (`desde`/`hasta`, máximo 31
 * días). Un rango inválido responde 400 `CAL_001` con el mensaje del backend, que se propaga tal cual.
 */
@Injectable({ providedIn: 'root' })
export class SesionCalendarioService {
  private readonly http = inject(HttpClient);

  consultar(rol: RolCalendario, desde: string, hasta: string): Observable<ApiDataResponse<SesionCalendario[]>> {
    const segmento = rol === 'ESTUDIANTE' ? 'estudiante' : 'docente';
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<ApiDataResponse<SesionCalendario[]>>(`${environment.apiUrl}/${segmento}/sesiones/calendario`, { params });
  }
}
