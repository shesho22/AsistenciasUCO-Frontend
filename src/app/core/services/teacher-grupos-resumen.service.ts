import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { ResumenGruposDocente } from '../models/docente-resumen-grupos.model';

/**
 * CIERRE-W3I: totales de los grupos habilitados del docente (grupos, estudiantes activos, cupo y ocupacion) para su tablero y su
 * lista de grupos. Los calcula el backend con el ambito del docente; el cliente no suma.
 */
@Injectable({ providedIn: 'root' })
export class TeacherGruposResumenService {
  private readonly http = inject(HttpClient);

  consultar(): Observable<ApiDataResponse<ResumenGruposDocente>> {
    return this.http.get<ApiDataResponse<ResumenGruposDocente>>(`${environment.apiUrl}/docente/resumen-grupos`);
  }
}
