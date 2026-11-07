import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { FestivosAnio, RecargaFestivos, SesionFestivoConAsistencia } from '../models/festivo.model';

/**
 * CULM-001 B.1 (pantalla 3.7): festivos del administrador. Solo consulta y recarga; los errores del backend
 * (FES_001, FES_009, 403) se propagan sin traducir.
 */
@Injectable({ providedIn: 'root' })
export class AdminFestivosService {
  private readonly http = inject(HttpClient);

  private get base(): string {
    return `${environment.apiUrl}/admin/festivos`;
  }

  consultar(anio: number): Observable<ApiDataResponse<FestivosAnio>> {
    return this.http.get<ApiDataResponse<FestivosAnio>>(this.base, {
      params: new HttpParams().set('anio', String(anio)),
    });
  }

  recargar(anio: number): Observable<ApiDataResponse<RecargaFestivos>> {
    return this.http.post<ApiDataResponse<RecargaFestivos>>(`${this.base}/${anio}/recarga`, null);
  }

  sesionesConAsistencia(
    anio: number,
    pagina: number,
    tamano: number
  ): Observable<ApiPageResponse<SesionFestivoConAsistencia>> {
    return this.http.get<ApiPageResponse<SesionFestivoConAsistencia>>(
      `${this.base}/${anio}/sesiones-con-asistencia`,
      { params: new HttpParams().set('pagina', String(pagina)).set('tamano', String(tamano)) }
    );
  }
}
