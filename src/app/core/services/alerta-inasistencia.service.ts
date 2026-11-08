import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AlertaInasistencia, FiltroAlertasEstudiante, MarcarLecturaResponse } from '../models/alerta-inasistencia.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class AlertaInasistenciaService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly baseUrl = `${environment.apiUrl}/estudiante/alertas`;

  consultar(filtro?: FiltroAlertasEstudiante): Observable<ApiPageResponse<AlertaInasistencia>> {
    if (!this.http) return EMPTY;
    let params = new HttpParams();
    if (filtro) {
      if (filtro.soloVigentes !== undefined && filtro.soloVigentes !== null) {
        params = params.set('soloVigentes', String(filtro.soloVigentes));
      }
      if (filtro.soloNoLeidas !== undefined && filtro.soloNoLeidas !== null) {
        params = params.set('soloNoLeidas', String(filtro.soloNoLeidas));
      }
      const grp = filtro.grupoId || filtro.idGrupo;
      if (grp) {
        params = params.set('grupoId', grp);
      }
      if (filtro.tipo) {
        params = params.set('tipo', filtro.tipo);
      }
      if (filtro.pagina !== undefined && filtro.pagina !== null) {
        params = params.set('pagina', String(filtro.pagina));
      }
      if (filtro.tamano !== undefined && filtro.tamano !== null) {
        params = params.set('tamano', String(filtro.tamano));
      }
    }
    return this.http.get<ApiPageResponse<AlertaInasistencia>>(this.baseUrl, { params });
  }

  contarVigentes(): Observable<number> {
    return this.consultar({ soloVigentes: true, tamano: 1 }).pipe(
      map((res) => Number(res.totalElementos ?? 0))
    );
  }

  contarNoLeidas(): Observable<number> {
    return this.consultar({ soloNoLeidas: true, tamano: 1 }).pipe(
      map((res) => Number(res.totalElementos ?? 0))
    );
  }

  marcarLeidas(ids: string[]): Observable<MarcarLecturaResponse> {
    if (!this.http) return EMPTY;
    return this.http.post<ApiResponse<MarcarLecturaResponse>>(`${this.baseUrl}/marcar-lectura`, { ids }).pipe(
      map((res) => res.datos ?? { marcadas: ids.length })
    );
  }
}
