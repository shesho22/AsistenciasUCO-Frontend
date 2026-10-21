import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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

  /** `GET /estudiante/materias` (`MateriaEstudianteDTO`) adaptado al modelo de UI sin inventar campos. */
  getMaterias(): Observable<ApiResponse<MateriaEstudianteItem[]>> {
    return this.http
      .get<ApiListResponse<MateriaEstudianteApiDto>>(`${environment.apiUrl}/estudiante/materias`)
      .pipe(
        map((res) => {
          const datos = StudentPortalMapper.toMaterias(res.datos);
          return { exitoso: res.exitoso, datos, total: datos.length };
        })
      );
  }

  getPrerrequisitosMateria(materiaId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/estudiante/materias/${materiaId}/prerrequisitos`);
  }

  matricularGrupo(codigoOPin: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/estudiante/matricular-grupo`, {
      codigo: codigoOPin,
    });
  }
}

