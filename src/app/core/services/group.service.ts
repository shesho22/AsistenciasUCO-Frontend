import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { EstudianteGrupoApiDto } from '../api/models/estudiante-grupo-api-dto.model';
import { GrupoApiDto } from '../api/models/grupo-api-dto.model';
import { ProgramaResumen } from '../models/role-management.model';
import { MOCK_ESTUDIANTES_DIRECTORIO } from '../mocks/role-management.mock';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  constructor(private http: HttpClient) {}

  /**
   * HU051: el docente titular retira a un estudiante de su grupo (la matrícula pasa a inactiva y se libera el cupo).
   * El motivo es obligatorio; el error HTTP (403/404/409/400) se propaga sin toast global: el modal lo presenta.
   */
  retirarEstudiante(grupoId: string, estudianteId: string, motivo: string): Observable<{ exitoso: boolean }> {
    return this.http.post<{ exitoso: boolean }>(
      `${environment.apiUrl}/docente/grupos/${encodeURIComponent(grupoId)}/estudiantes/${encodeURIComponent(estudianteId)}/retiro`,
      { motivo },
      { context: new HttpContext().set(BYPASS_GLOBAL_ERROR_TOAST, true) }
    );
  }

  /**
   * CULM-001 B2NM: programas del grupo (el docente titular, el coordinador o el decano con ámbito). Con más de uno, la
   * matrícula manual y la ventana QR piden el programa del estudiante.
   */
  getProgramasGrupo(grupoId: string): Observable<ApiListResponse<ProgramaResumen>> {
    return this.http.get<ApiListResponse<ProgramaResumen>>(
      `${environment.apiUrl}/grupos/${encodeURIComponent(grupoId)}/programas`
    );
  }

  getAllGroups(): Observable<ApiListResponse<GrupoApiDto>> {
    return this.http.get<ApiListResponse<GrupoApiDto>>(`${environment.apiUrl}/grupos`);
  }

  getStudentsByGroup(
    grupoId: string
  ): Observable<ApiListResponse<EstudianteGrupoApiDto>> {
    if (environment.useMocks) {
      const students = MOCK_ESTUDIANTES_DIRECTORIO.filter((student) =>
        student.gruposInscritos?.includes(grupoId)
      ).map(
        (student): EstudianteGrupoApiDto => ({
          id: `matricula-${grupoId}-${student.id}`,
          idEstudiante: student.id,
          documento: student.documento,
          nombreCompleto: student.nombreCompleto,
          correo: student.correo,
          codigoEstado: student.estadoMatricula,
          nombreEstado: student.estadoMatricula,
        })
      );

      return of({ exitoso: true, datos: students, total: students.length }).pipe(
        delay(200)
      );
    }

    return this.http.get<ApiListResponse<EstudianteGrupoApiDto>>(
      `${environment.apiUrl}/grupos/${grupoId}/estudiantes`
    );
  }

  descargarPlanillaExcel(grupoId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/grupos/${grupoId}/reportes/asistencia-excel`, {
      responseType: 'blob',
    });
  }
}
