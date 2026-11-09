import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstudianteDetalleApiDto } from '../api/models/estudiante-api-dto.model';
import { EstudianteBusquedaApiDto } from '../api/models/estudiante-busqueda-api-dto.model';
import { ApiResponse } from '../models/api-response.model';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { EstudianteGrupoApiDto } from '../api/models/estudiante-grupo-api-dto.model';
import { MOCK_ESTUDIANTES_DIRECTORIO } from '../mocks/role-management.mock';
import { OperationResultResponse } from '../api/models/operation-result-response.model';
import { RegistrarEstudianteEnGrupoRequest } from '../api/models/registrar-estudiante-en-grupo-request.model';
import { getPasswordValidationError } from '../validation/request-form-validation.util';

export interface EnrollStudentFormValue {
  grupo: string;
  tipoDocumento: string;
  numeroIdentificacion: number;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  /** Programa del estudiante cuando el grupo tiene más de uno. */
  idPrograma?: string;
  /** Solo en el alta de un estudiante nuevo; al matricular a uno existente se omiten. */
  correoElectronico?: string;
  password?: string;
}

export type EnrollStudentDTO = EnrollStudentFormValue;

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  constructor(private http: HttpClient) {}

  enrollStudentInGroup(
    dto: EnrollStudentFormValue
  ): Observable<OperationResultResponse> {
    if (environment.useFrontendMocks) {
      return of({
        exitoso: true,
        mensajeUsuario: 'Estudiante matriculado y vinculado al grupo exitosamente.',
      }).pipe(delay(400));
    }

    const esAltaNueva = Boolean(dto.correoElectronico?.trim() || dto.password?.trim());
    const password = dto.password?.trim() ?? '';
    if (esAltaNueva) {
      const passwordError = getPasswordValidationError(password, String(dto.numeroIdentificacion));
      if (passwordError) {
        return throwError(() => new Error(passwordError));
      }
    }

    const request: RegistrarEstudianteEnGrupoRequest = {
      tipoIdentificacionId: dto.tipoDocumento,
      numeroIdentificacion: dto.numeroIdentificacion,
      primerNombre: dto.primerNombre.trim(),
      primerApellido: dto.primerApellido.trim(),
    };

    if (esAltaNueva) {
      request.correo = dto.correoElectronico?.trim() ?? '';
      request.password = password;
    }

    if (dto.idPrograma) {
      request.idPrograma = dto.idPrograma;
    }

    if (dto.segundoNombre?.trim()) {
      request.segundoNombre = dto.segundoNombre.trim();
    }

    if (dto.segundoApellido?.trim()) {
      request.segundoApellido = dto.segundoApellido.trim();
    }

    return this.http.post<OperationResultResponse>(
      `${environment.apiUrl}/grupos/${dto.grupo}/estudiantes`,
      request
    );
  }

  getStudentsByGroup(
    grupoId: string
  ): Observable<ApiListResponse<EstudianteGrupoApiDto>> {
    if (environment.useFrontendMocks) {
      const students = MOCK_ESTUDIANTES_DIRECTORIO
        .filter((student) => student.gruposInscritos?.includes(grupoId))
        .map((student): EstudianteGrupoApiDto => ({
          id: `matricula-${grupoId}-${student.id}`,
          idEstudiante: student.id,
          documento: student.documento,
          nombreCompleto: student.nombreCompleto,
          correo: student.correo,
          codigoEstado: student.estadoMatricula,
          nombreEstado: student.estadoMatricula,
        }));
      return of({
        exitoso: true,
        datos: students,
        total: students.length,
      }).pipe(delay(200));
    }

    return this.http.get<ApiListResponse<EstudianteGrupoApiDto>>(
      `${environment.apiUrl}/grupos/${grupoId}/estudiantes`
    );
  }

  getStudentById(
    estudianteId: string
  ): Observable<EstudianteDetalleApiDto> {
    return this.http.get<EstudianteDetalleApiDto>(
      `${environment.apiUrl}/estudiantes/${estudianteId}`
    );
  }

  /**
   * A.2-15 (DEC-027): el docente titular busca por documento exacto, dentro de su grupo, al estudiante que va a
   * matricular. Devuelve datos mínimos (correo enmascarado) o `datos: null` si no existe; nunca lista el directorio.
   */
  searchStudentByIdentification(
    grupoId: string,
    tipoIdentificacionId: string,
    numeroIdentificacion: number
  ): Observable<ApiResponse<EstudianteBusquedaApiDto | null>> {
    if (environment.useFrontendMocks) {
      return of({ exitoso: true, datos: null }).pipe(delay(200));
    }

    return this.http.get<ApiResponse<EstudianteBusquedaApiDto | null>>(
      `${environment.apiUrl}/grupos/${encodeURIComponent(grupoId)}/estudiantes/busqueda`,
      {
        params: {
          tipoIdentificacionId,
          documento: numeroIdentificacion.toString(),
        },
      }
    );
  }
}
