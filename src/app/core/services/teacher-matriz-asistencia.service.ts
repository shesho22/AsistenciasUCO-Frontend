import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { MatrizAsistenciaPagina } from '../models/matriz-asistencia.model';
import { ResumenSesionesGrupo } from '../models/resumen-sesiones-grupo.model';

/**
 * CIERRE-W3M: matriz de asistencia (estudiantes x sesiones) y resumen de sesiones del grupo, calculados por el backend.
 * La paginacion y la busqueda son del servidor.
 */
@Injectable({ providedIn: 'root' })
export class TeacherMatrizAsistenciaService {
  private readonly http = inject(HttpClient);

  consultarMatriz(grupoId: string, pagina: number, tamano: number, busqueda = ''): Observable<MatrizAsistenciaPagina> {
    let params = new HttpParams().set('pagina', String(pagina)).set('tamano', String(tamano));
    const texto = busqueda.trim();
    if (texto) {
      params = params.set('busqueda', texto);
    }
    return this.http.get<MatrizAsistenciaPagina>(`${environment.apiUrl}/docente/grupos/${grupoId}/matriz-asistencia`, { params });
  }

  consultarResumenSesiones(grupoId: string): Observable<ApiDataResponse<ResumenSesionesGrupo>> {
    return this.http.get<ApiDataResponse<ResumenSesionesGrupo>>(`${environment.apiUrl}/docente/grupos/${grupoId}/resumen-sesiones`);
  }
}
