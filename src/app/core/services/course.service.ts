import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, forkJoin, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { AsignaturaDocenteApiDto } from '../api/models/asignatura-docente-api-dto.model';
import { GrupoApiDto } from '../api/models/grupo-api-dto.model';
import { HorarioDocenteApiDto } from '../api/models/horario-docente-api-dto.model';
import { Course, FranjaHorario } from '../models/course.model';
import { MOCK_COURSES } from '../mocks/course.mock';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private coursesSignal = signal<Course[]>([...MOCK_COURSES]);

  constructor(private http: HttpClient) {}

  getTeacherCourses(docenteId?: string): Observable<ApiResponse<Course[]>> {
    return this.getCurrentTeacherCourses().pipe(
      map((res) => ({
        idTransaccion: 'tx-courses-teacher',
        exitoso: res.exitoso,
        total: res.total,
        datos: res.datos,
      }))
    );
  }

  getCurrentTeacherCourses(): Observable<ApiListResponse<Course>> {
    if (environment.useMocks) {
      const courses = [...this.coursesSignal()];
      return of({
        exitoso: true,
        total: courses.length,
        datos: courses,
      }).pipe(delay(250));
    }

    // /docente/asignaturas es la fuente de grupos autorizados; /docente/horarios solo enriquece.
    return forkJoin([
      this.http.get<ApiListResponse<AsignaturaDocenteApiDto>>(
        `${environment.apiUrl}/docente/asignaturas`
      ),
      this.http
        .get<ApiListResponse<HorarioDocenteApiDto>>(`${environment.apiUrl}/docente/horarios`)
        .pipe(catchError(() => of(null))),
    ]).pipe(
      map(([asignaciones, horarios]) => {
        const courses = this.buildCourses(asignaciones.datos ?? [], horarios?.datos ?? []);
        return {
          exitoso: asignaciones.exitoso,
          total: courses.length,
          datos: courses,
        };
      })
    );
  }

  /**
   * Grupos de la facultad del decano autenticado (GET /decano/grupos, ambito forzado en el backend).
   * Nunca usa los endpoints del docente: `/docente/asignaturas` y `/docente/horarios` devuelven los grupos del docente
   * autenticado y responden 403 a cualquier otro rol.
   */
  getDeanCourses(): Observable<ApiResponse<Course[]>> {
    return this.getGroupsAsCourses('decano/grupos');
  }

  /** Grupos para el coordinador (GET /grupos). Nunca usa los endpoints del docente (403 para su rol). */
  getCoordinatorCourses(): Observable<ApiResponse<Course[]>> {
    return this.getGroupsAsCourses('grupos');
  }

  private getGroupsAsCourses(path: string): Observable<ApiResponse<Course[]>> {
    if (environment.useMocks) {
      const courses = [...this.coursesSignal()];
      return of({
        exitoso: true,
        total: courses.length,
        datos: courses,
      }).pipe(delay(250));
    }

    return this.http.get<ApiListResponse<GrupoApiDto>>(`${environment.apiUrl}/${path}`).pipe(
      map((res) => {
        const courses = this.buildCoursesFromGroups(res.datos ?? []);
        return {
          exitoso: res.exitoso,
          total: courses.length,
          datos: courses,
        };
      })
    );
  }

  /** Solo los campos que entrega el contrato del grupo (F1: incluye las franjas del horario); sin aula ni nombre de docente sintetizados. */
  private buildCoursesFromGroups(grupos: GrupoApiDto[]): Course[] {
    const colors: Course['colorCategory'][] = ['emerald', 'amber', 'blue', 'purple'];
    return grupos.map(
      (grupo, index): Course => ({
        id: grupo.id,
        code: grupo.codigo,
        name: grupo.nombreAsignatura,
        section: grupo.nombre,
        schedule: describirFranjas(toFranjas(grupo)),
        franjas: toFranjas(grupo),
        asignaturaId: grupo.idAsignatura,
        docenteId: grupo.idDocente,
        enrolledStudentsCount: grupo.estudiantesActivos,
        cupoMaximo: grupo.capacidadMaximaPermitida,
        colorCategory: colors[index % colors.length],
      })
    );
  }

  private buildCourses(
    asignaciones: AsignaturaDocenteApiDto[],
    horarios: HorarioDocenteApiDto[]
  ): Course[] {
    const horariosPorGrupo = new Map<string, HorarioDocenteApiDto[]>();
    for (const horario of horarios) {
      const delGrupo = horariosPorGrupo.get(horario.idGrupo);
      if (delGrupo) {
        delGrupo.push(horario);
      } else {
        horariosPorGrupo.set(horario.idGrupo, [horario]);
      }
    }

    const colors: Course['colorCategory'][] = ['emerald', 'amber', 'blue', 'purple'];
    const asignacionesPorGrupo = new Map<string, AsignaturaDocenteApiDto>();
    for (const asignacion of asignaciones) {
      if (!asignacionesPorGrupo.has(asignacion.idGrupo)) {
        asignacionesPorGrupo.set(asignacion.idGrupo, asignacion);
      }
    }

    return Array.from(asignacionesPorGrupo.values()).map((asignacion, index): Course => {
      const delGrupo = horariosPorGrupo.get(asignacion.idGrupo) ?? [];
      const scheduleBlocks = new Set(
        delGrupo.map(
          (h) => `${h.dia} ${h.horaInicio.slice(0, 5)}-${h.horaFin.slice(0, 5)}`
        )
      );
      const primero = delGrupo[0];

      // Solo los campos que entrega el contrato: sin code/room/docenteName/cupo sintetizados.
      const course: Course = {
        id: asignacion.idGrupo,
        name: asignacion.nombreAsignatura,
        section: asignacion.nombreGrupo,
        schedule: Array.from(scheduleBlocks).join(', '),
        asignaturaId: asignacion.idAsignatura,
        colorCategory: colors[index % colors.length],
      };
      if (primero) {
        course.code = primero.codigoMateria;
        course.enrolledStudentsCount = primero.totalEstudiantes;
        course.docenteId = primero.idDocente;
      }
      return course;
    });
  }

  /**
   * F1: crea un grupo (POST /grupos, solo COORDINADOR) con su horario semanal en la misma transacción.
   * El body sigue el contrato real de CrearGrupoRequest; `franjas` vacío o ausente = grupo sin horario.
   */
  crearGrupo(payload: GrupoCoordinadorPayload): Observable<ApiResponse<{ id: string; mensajeUsuario: string }>> {
    if (environment.useMocks) {
      return of({
        idTransaccion: 'mock-tx-create-group',
        exitoso: true,
        mensajeUsuario: 'Grupo registrado(a) exitosamente.',
        datos: { id: `mock-grp-${Date.now()}`, mensajeUsuario: 'Grupo registrado(a) exitosamente.' },
      }).pipe(delay(250));
    }

    return this.http.post<ApiResponse<{ id: string; mensajeUsuario: string }>>(`${environment.apiUrl}/grupos`, {
      idAsignatura: payload.idAsignatura,
      idPeriodoAcademico: payload.idPeriodoAcademico,
      codigo: payload.codigo,
      nombre: payload.nombre,
      idDocente: payload.idDocente,
      franjas: toFranjasRequest(payload.franjas),
    });
  }

  getAsignaturasDocente(): Observable<ApiResponse<AsignaturaDocenteApiDto[]>> {
    if (environment.useMocks) {
      return of({
        idTransaccion: 'mock-tx-asig-docente',
        exitoso: true,
        total: 2,
        datos: [
          {
            idAsignatura: 'E2F3A4B5-0000-0000-0000-000000000001',
            nombreAsignatura: 'Arquitectura de Software',
            idGrupo: 'A1B2C3D4-E5F6-7A8B-9C0D-1E2F3A4B5C6D',
            nombreGrupo: 'Grupo 001 - Arq Software',
            idPrograma: 'AAAAAAAA-0000-0000-0000-000000000001',
            nombrePrograma: 'Ingeniería de Sistemas',
          },
          {
            idAsignatura: '12E18E5A-6AE2-43BD-8A99-5CC694D801C3',
            nombreAsignatura: 'Ingeniería de Software I',
            idGrupo: 'A1B2C3D4-E5F6-7A8B-9C0D-1E2F3A4B5C70',
            nombreGrupo: 'Grupo 001 - Ing Software I',
            idPrograma: 'AAAAAAAA-0000-0000-0000-000000000001',
            nombrePrograma: 'Ingeniería de Sistemas',
          },
        ],
      }).pipe(delay(150));
    }

    return this.http
      .get<ApiResponse<AsignaturaDocenteApiDto[]>>(`${environment.apiUrl}/docente/asignaturas`)
      .pipe(
        map((res) => ({
          idTransaccion: res.idTransaccion || 'tx-docente-asig',
          exitoso: res.exitoso ?? true,
          total: res.total || (res.datos ? res.datos.length : 0),
          datos: res.datos || [],
        }))
      );
  }

  /**
   * F1: actualiza un grupo (PUT /grupos/{id}, solo COORDINADOR). Si se envían `franjas`, reemplazan el horario
   * semanal completo; si no, el horario no cambia.
   */
  actualizarGrupo(id: string, payload: GrupoCoordinadorPayload): Observable<ApiResponse<{ id: string; mensajeUsuario: string }>> {
    if (environment.useMocks) {
      return of({
        idTransaccion: `mock-tx-update-group-${id}`,
        exitoso: true,
        mensajeUsuario: 'Grupo actualizado(a) exitosamente.',
        datos: { id, mensajeUsuario: 'Grupo actualizado(a) exitosamente.' },
      }).pipe(delay(250));
    }

    return this.http.put<ApiResponse<{ id: string; mensajeUsuario: string }>>(`${environment.apiUrl}/grupos/${id}`, {
      codigo: payload.codigo,
      nombre: payload.nombre,
      idDocente: payload.idDocente,
      cupoMaximo: payload.cupoMaximo,
      franjas: toFranjasRequest(payload.franjas),
    });
  }
}

/** Cuerpo de crear/actualizar grupo del coordinador (F1). */
export interface GrupoCoordinadorPayload {
  idAsignatura?: string;
  idPeriodoAcademico?: string;
  codigo?: number;
  nombre?: string;
  idDocente?: string;
  cupoMaximo?: number;
  franjas?: FranjaHorario[];
}

function toFranjasRequest(franjas: FranjaHorario[] | undefined): { dia: string; horaInicio: string; horaFin: string }[] | undefined {
  return franjas?.map((f) => ({ dia: f.dia, horaInicio: f.horaInicio, horaFin: f.horaFin }));
}

/** Texto del horario semanal: "Lunes 08:00-10:00, Miercoles 08:00-10:00". */
export function describirFranjas(franjas: FranjaHorario[] | undefined): string {
  return (franjas ?? []).map((f) => `${f.nombreDia ?? f.dia} ${f.horaInicio}-${f.horaFin}`).join(', ');
}

function toFranjas(grupo: GrupoApiDto): FranjaHorario[] {
  return (grupo.franjas ?? []).map((f) => ({
    dia: f.codigoDia,
    nombreDia: f.nombreDia ?? undefined,
    horaInicio: f.horaInicio,
    horaFin: f.horaFin,
  }));
}
