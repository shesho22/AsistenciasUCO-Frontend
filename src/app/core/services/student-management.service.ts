import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiListResponse } from '../api/models/api-list-response.model';
import {
  HorarioEstudianteApiDto,
  MateriaEstudianteApiDto,
} from '../api/models/estudiante-portal-api-dto.model';
import { StudentPortalMapper } from '../mappers/student-portal.mapper';
import { HorarioItem, MateriaEstudianteItem } from '../models/role-management.model';

@Injectable({
  providedIn: 'root',
})
export class StudentManagementService {
  constructor(private http: HttpClient) {}

  /** `GET /estudiante/horarios` (`HorarioEstudianteDTO`) adaptado al modelo de UI; las filas invalidas se descartan. */
  getHorarios(): Observable<ApiResponse<HorarioItem[]>> {
    return this.http
      .get<ApiListResponse<HorarioEstudianteApiDto>>(`${environment.apiUrl}/estudiante/horarios`)
      .pipe(
        map((res) => {
          const datos = StudentPortalMapper.toHorarios(res.datos);
          return { exitoso: res.exitoso, datos, total: datos.length };
        })
      );
  }

  /**
   * `GET /estudiante/materias` (`MateriaEstudianteDTO`) adaptado al modelo de UI; docente y horario se cruzan por
   * `idGrupo` con `GET /estudiante/horarios` (si este falla, las materias se muestran sin ellos).
   */
  getMaterias(): Observable<ApiResponse<MateriaEstudianteItem[]>> {
    const materias$ = this.http.get<ApiListResponse<MateriaEstudianteApiDto>>(`${environment.apiUrl}/estudiante/materias`);
    const horarios$ = this.http
      .get<ApiListResponse<HorarioEstudianteApiDto>>(`${environment.apiUrl}/estudiante/horarios`)
      .pipe(catchError(() => of(null)));
    return forkJoin([materias$, horarios$]).pipe(
      map(([res, horarios]) => {
        const base = StudentPortalMapper.toMaterias(res.datos);
        const datos = horarios ? StudentPortalMapper.conHorarios(base, StudentPortalMapper.toHorarios(horarios.datos)) : base;
        return { exitoso: res.exitoso, datos, total: datos.length };
      })
    );
  }
}
