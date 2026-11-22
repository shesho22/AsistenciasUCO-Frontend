import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, forkJoin, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { AsignaturaDocenteApiDto } from '../api/models/asignatura-docente-api-dto.model';
import { GrupoProgramaItem } from '../models/asistencia-programa.model';
import { GrupoFacultadApiDto } from '../api/models/grupo-facultad-api-dto.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { obtenerTodasLasPaginas, paramsSinVacios } from '../api/pagination.util';
import { HorarioDocenteApiDto } from '../api/models/horario-docente-api-dto.model';
import { Course, FranjaHorario } from '../models/course.model';
import { PrevisualizacionHorarioGrupo, PrevisualizarHorarioPayload } from '../models/horario-grupo.model';
import { MOCK_COURSES } from '../mocks/course.mock';
import { AttendanceClaimService } from './attendance-claim.service';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly claimService = inject(AttendanceClaimService);

  private readonly coursesSignal = signal<Course[]>([...MOCK_COURSES]);

  getTeacherCourses(_docenteId?: string): Observable<ApiResponse<Course[]>> {
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
      this.claimService
        .getHorarioDocente<HorarioDocenteApiDto>()
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
    if (environment.useMocks) {
      return this.getGroupsAsCourses();
    }
    // B2NM: `GET /decano/grupos` es una página; la UI aún no pagina, así que se leen las páginas de 100 (contrato §4.1).
    return obtenerTodasLasPaginas<GrupoFacultadApiDto>(this.http, `${environment.apiUrl}/decano/grupos`).pipe(
      map(({ elementos }) => ({
        exitoso: true,
        total: elementos.length,
        datos: this.buildCoursesFromGruposFacultad(elementos),
      }))
    );
  }

  /**
   * Una página de los grupos de la facultad del decano (GET /decano/grupos): la búsqueda, el programa, el periodo y la
   * paginación los resuelve el servidor; `totalElementos` es el total real, no el tamaño de la página.
   */
  getDeanCoursesPage(filtro: {
    busqueda?: string | null;
    programaId?: string | null;
    idPeriodoAcademico?: string | null;
    pagina: number;
    tamano: number;
  }): Observable<ApiPageResponse<Course>> {
    if (environment.useMocks) {
      const q = (filtro.busqueda ?? '').trim().toLowerCase();
      const todos = this.coursesSignal().filter(
        (c) => !q || c.name.toLowerCase().includes(q) || (c.code ?? '').toLowerCase().includes(q)
      );
      const inicio = (filtro.pagina - 1) * filtro.tamano;
      return of({
        exitoso: true,
        elementos: todos.slice(inicio, inicio + filtro.tamano),
        numeroPagina: filtro.pagina,
        tamanoPagina: filtro.tamano,
        totalElementos: todos.length,
        totalPaginas: Math.max(1, Math.ceil(todos.length / filtro.tamano)),
      }).pipe(delay(250));
    }
    return this.http
      .get<ApiPageResponse<GrupoFacultadApiDto>>(`${environment.apiUrl}/decano/grupos`, {
        params: paramsSinVacios({
          busqueda: filtro.busqueda,
          programaId: filtro.programaId,
          idPeriodoAcademico: filtro.idPeriodoAcademico,
          pagina: filtro.pagina,
          tamano: filtro.tamano,
        }),
      })
      .pipe(map((res) => ({ ...res, elementos: this.buildCoursesFromGruposFacultad(res.elementos ?? []) })));
  }

  private buildCoursesFromGruposFacultad(grupos: GrupoFacultadApiDto[]): Course[] {
    const colors: Course['colorCategory'][] = ['emerald', 'amber', 'blue', 'purple'];
    return grupos.map(
      (grupo, index): Course => ({
        id: grupo.idGrupo,
        code: grupo.codigo,
        name: grupo.nombreAsignatura,
        section: grupo.nombre,
        schedule: '',
        asignaturaId: grupo.idAsignatura,
        docenteId: grupo.idDocente,
        enrolledStudentsCount: grupo.estudiantesActivos,
        cupoMaximo: grupo.capacidadMaximaPermitida,
        programas: grupo.programas ?? [],
        colorCategory: colors[index % colors.length],
      })
    );
  }

  /**
   * Una página de los grupos del programa del coordinador (GET /coordinador/grupos, CIERRE-W2A): la búsqueda, el período y la
   * paginación los resuelve el servidor y `totalElementos` es el total real, no el tamaño de la página. Nunca usa los
   * endpoints del docente (403 para su rol).
   */
  getCoordinatorCoursesPage(filtro: {
    busqueda?: string | null;
    idPeriodo?: string | null;
    pagina: number;
    tamano: number;
  }): Observable<ApiPageResponse<Course>> {
    return this.http
      .get<ApiPageResponse<GrupoProgramaItem>>(`${environment.apiUrl}/coordinador/grupos`, {
        params: paramsSinVacios({
          busqueda: filtro.busqueda,
          idPeriodo: filtro.idPeriodo,
          pagina: filtro.pagina,
          tamano: filtro.tamano,
        }),
      })
      .pipe(map((res) => ({ ...res, elementos: this.buildCoursesFromGruposPrograma(res.elementos ?? []) })));
  }

  /** Solo los campos que entrega el contrato del grupo (incluye las franjas del horario); sin aula ni nombre de docente sintetizados. */
  private buildCoursesFromGruposPrograma(grupos: GrupoProgramaItem[]): Course[] {
    const colors: Course['colorCategory'][] = ['emerald', 'amber', 'blue', 'purple'];
    return grupos.map((grupo, index): Course => {
      const franjas = toFranjas(grupo.franjas);
      return {
        id: grupo.id,
        code: grupo.codigo === null || grupo.codigo === undefined ? undefined : String(grupo.codigo),
        name: grupo.nombreAsignatura,
        section: grupo.nombre,
        schedule: describirFranjas(franjas),
        franjas,
        asignaturaId: grupo.idAsignatura ?? undefined,
        docenteId: grupo.idDocente ?? undefined,
        docenteName: grupo.nombreDocente ?? undefined,
        enrolledStudentsCount: grupo.estudiantesActivos ?? undefined,
        cupoMaximo: grupo.capacidadMaxima ?? undefined,
        nombreProgramaResponsable: grupo.nombreProgramaResponsable ?? null,
        esResponsable: grupo.esResponsable === true,
        colorCategory: colors[index % colors.length],
      };
    });
  }

  /** Solo con el simulador del frontend (USE_MOCKS): los grupos del estado local. */
  private getGroupsAsCourses(): Observable<ApiResponse<Course[]>> {
    const courses = [...this.coursesSignal()];
    return of({
      exitoso: true,
      total: courses.length,
      datos: courses,
    }).pipe(delay(250));
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
      if (asignacion.idTipoPrograma) {
        course.idTipoPrograma = asignacion.idTipoPrograma;
        course.nombreTipoPrograma = asignacion.nombreTipoPrograma ?? undefined;
      }
      if (primero) {
        course.code = primero.codigoMateria;
        course.enrolledStudentsCount = primero.totalEstudiantes;
        course.docenteId = primero.idDocente;
      }
      // Matrícula activa del grupo desde /docente/asignaturas: existe aunque el grupo aún no tenga horario.
      if (typeof asignacion.estudiantesActivos === 'number') {
        course.enrolledStudentsCount = asignacion.estudiantesActivos;
      }
      if (typeof asignacion.capacidadMaximaPermitida === 'number') {
        course.cupoMaximo = asignacion.capacidadMaximaPermitida;
      }
      return course;
    });
  }

  /**
   * F1/F3: crea un grupo (POST /grupos, COORDINADOR o el propio DOCENTE) con su horario semanal en la misma transacción.
   * El body sigue el contrato real de CrearGrupoRequest; `franjas` vacío o ausente = grupo sin horario. Sin
   * `idPeriodoAcademico` la DB toma el período en curso o, si no hay, el próximo en planeación (DEC-076).
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

    // SES-GEN-01: todo grupo nace con horario y con sus sesiones; el backend rechaza (400) una creación sin franjas.
    return this.http.post<ApiResponse<{ id: string; mensajeUsuario: string }>>(`${environment.apiUrl}/grupos`, {
      idAsignatura: payload.idAsignatura,
      idPeriodoAcademico: payload.idPeriodoAcademico,
      codigo: payload.codigo,
      nombre: payload.nombre,
      idDocente: payload.idDocente,
      franjas: toFranjasRequest(payload.franjas),
    });
  }

  /**
   * SES-GEN-01: calcula, sin escribir nada, las sesiones del semestre, las horas y los conflictos de un horario propuesto. Mismas reglas
   * y misma definición de ranuras que la confirmación (que vuelve a validar todo): `puedeConfirmar` solo informa.
   */
  previsualizarHorarioGrupo(payload: PrevisualizarHorarioPayload): Observable<ApiResponse<PrevisualizacionHorarioGrupo>> {
    return this.http.post<ApiResponse<PrevisualizacionHorarioGrupo>>(`${environment.apiUrl}/coordinador/grupos/previsualizacion-horario`, {
      idGrupo: payload.idGrupo,
      idAsignatura: payload.idAsignatura,
      idPeriodoAcademico: payload.idPeriodoAcademico,
      idDocente: payload.idDocente,
      franjas: payload.franjas,
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

/** Cuerpo de crear/actualizar grupo (F1). Crear exige al menos una franja (SES-GEN-01); en actualizar, sin franjas el horario no cambia. */
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

function toFranjas(franjas: GrupoProgramaItem['franjas']): FranjaHorario[] {
  return (franjas ?? []).map((f) => ({
    dia: f.codigoDia,
    nombreDia: f.nombreDia ?? undefined,
    horaInicio: f.horaInicio,
    horaFin: f.horaFin,
  }));
}
