import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import {
  AsistenciaToma,
  CierreToma,
  FaltanteToma,
  LoteToma,
  LoteTomaRequest,
  ModoToma,
  PaginaApi,
  RegistroTomaRequest,
  TomaAsistencia,
  TomasSesion,
} from '../models/toma-asistencia.model';

/** CULM-001 B.2 (CONTRACT 3.2.5). Los errores del backend se propagan sin traducir. */
@Injectable({ providedIn: 'root' })
export class TomaAsistenciaService {
  private readonly http = inject(HttpClient);

  private get api(): string {
    return environment.apiUrl;
  }

  abrirToma(sesionId: string, modo: ModoToma): Observable<ApiDataResponse<TomaAsistencia>> {
    return this.http.post<ApiDataResponse<TomaAsistencia>>(`${this.api}/sesiones/${sesionId}/tomas`, { modo });
  }

  consultarTomas(sesionId: string): Observable<ApiDataResponse<TomasSesion>> {
    return this.http.get<ApiDataResponse<TomasSesion>>(`${this.api}/sesiones/${sesionId}/tomas`);
  }

  cerrarToma(tomaId: string, marcarAusentes: boolean | null): Observable<ApiDataResponse<CierreToma>> {
    return this.http.post<ApiDataResponse<CierreToma>>(`${this.api}/tomas/${tomaId}/cierre`, { marcarAusentes });
  }

  registrarAsistencias(tomaId: string, registros: RegistroTomaRequest[]): Observable<ApiDataResponse<LoteToma>> {
    const cuerpo: LoteTomaRequest = { registros };
    return this.http.post<ApiDataResponse<LoteToma>>(`${this.api}/tomas/${tomaId}/asistencias`, cuerpo);
  }

  consultarAsistencias(tomaId: string, pagina: number, tamano: number): Observable<PaginaApi<AsistenciaToma>> {
    return this.http.get<PaginaApi<AsistenciaToma>>(`${this.api}/tomas/${tomaId}/asistencias`, {
      params: this.paginacion(pagina, tamano),
    });
  }

  consultarFaltantes(tomaId: string, pagina: number, tamano: number): Observable<PaginaApi<FaltanteToma>> {
    return this.http.get<PaginaApi<FaltanteToma>>(`${this.api}/tomas/${tomaId}/faltantes`, {
      params: this.paginacion(pagina, tamano),
    });
  }

  private paginacion(pagina: number, tamano: number): HttpParams {
    return new HttpParams().set('pagina', String(pagina)).set('tamano', String(tamano));
  }
}
