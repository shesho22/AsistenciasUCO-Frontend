import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { ResumenAsistenciaEstudiante } from '../models/indicadores-asistencia.model';

/** CULM-001 B.2 (F-DOC-004): porcentajes, horas y semaforo por estudiante calculados por el backend. */
@Injectable({ providedIn: 'root' })
export class TeacherAttendanceSummaryService {
  private readonly http = inject(HttpClient);

  /** CIERRE-W3M: `busqueda` opcional (nombre o documento) la resuelve el servidor, con la misma regla de la matriz. */
  consultarResumen(
    grupoId: string,
    pagina: number,
    tamano: number,
    busqueda = ''
  ): Observable<ApiPageResponse<ResumenAsistenciaEstudiante>> {
    let params = new HttpParams().set('pagina', String(pagina)).set('tamano', String(tamano));
    const texto = busqueda.trim();
    if (texto) {
      params = params.set('busqueda', texto);
    }
    return this.http.get<ApiPageResponse<ResumenAsistenciaEstudiante>>(
      `${environment.apiUrl}/docente/grupos/${grupoId}/resumen-asistencia`,
      { params }
    );
  }
}
