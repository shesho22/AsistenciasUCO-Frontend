import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { ApiListResponse } from '../api/models/api-list-response.model';
import {
  AsignacionDocenteApiDto,
  DocenteApiDto,
  DocenteDetalleApiDto,
} from '../api/models/docente-api-dto.model';
import { OperationResultResponse } from '../api/models/operation-result-response.model';
import { RegistrarDocenteRequest } from '../api/models/registrar-docente-request.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class TeacherService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);


  getAllTeachers(): Observable<DocenteApiDto[]> {
    return this.http.get<DocenteApiDto[]>(`${environment.apiUrl}/docentes`);
  }

  getTeacherById(
    docenteId: string
  ): Observable<ApiDataResponse<DocenteDetalleApiDto>> {
    return this.http.get<ApiDataResponse<DocenteDetalleApiDto>>(
      `${environment.apiUrl}/docentes/${docenteId}`
    );
  }

  getTeacherAssignments(
    docenteId: string
  ): Observable<ApiListResponse<AsignacionDocenteApiDto>> {
    return this.http.get<ApiListResponse<AsignacionDocenteApiDto>>(
      `${environment.apiUrl}/docentes/${docenteId}/asignaciones`
    );
  }

  getCurrentTeacher(): Observable<DocenteApiDto> {
    const currentUserId = this.authService.currentUser()?.id;

    if (!currentUserId) {
      return throwError(
        () => new Error('El usuario autenticado no tiene id.')
      );
    }

    return this.getAllTeachers().pipe(
      map((teachers) => {
        const currentTeacher = teachers.find(
          (teacher) => teacher.idUsuario === currentUserId
        );

        if (!currentTeacher) {
          throw new Error(
            'No se encontró un docente asociado al usuario autenticado.'
          );
        }

        return currentTeacher;
      })
    );
  }

  getCurrentTeacherAssignments(): Observable<
    ApiListResponse<AsignacionDocenteApiDto>
  > {
    return this.getCurrentTeacher().pipe(
      switchMap((teacher) => this.getTeacherAssignments(teacher.id))
    );
  }

  registerTeacherFromUser(
    usuarioId: string
  ): Observable<OperationResultResponse> {
    const request: RegistrarDocenteRequest = { usuario: usuarioId };

    return this.http.post<OperationResultResponse>(
      `${environment.apiUrl}/docentes`,
      request
    );
  }
}
