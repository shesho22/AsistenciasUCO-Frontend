import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FaltaReclamable, FiltroFaltasReclamables } from '../models/falta-reclamable.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';

/** ATA D10: faltas por reclamar del estudiante (`GET /estudiante/faltas-reclamables`). */
@Injectable({ providedIn: 'root' })
export class FaltaReclamableService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly baseUrl = `${environment.apiUrl}/estudiante/faltas-reclamables`;

  consultar(filtro?: FiltroFaltasReclamables): Observable<ApiPageResponse<FaltaReclamable>> {
    if (!this.http) return EMPTY;
    let params = new HttpParams();
    if (filtro?.pagina !== undefined && filtro.pagina !== null) {
      params = params.set('pagina', String(filtro.pagina));
    }
    if (filtro?.tamano !== undefined && filtro.tamano !== null) {
      params = params.set('tamano', String(filtro.tamano));
    }
    return this.http.get<ApiPageResponse<FaltaReclamable>>(this.baseUrl, { params });
  }

  /** Total de tomas reclamables (consulta de una fila, solo para el contador del menú). */
  contar(): Observable<number> {
    return this.consultar({ pagina: 1, tamano: 1 }).pipe(map((res) => Number(res.totalElementos ?? 0)));
  }
}
