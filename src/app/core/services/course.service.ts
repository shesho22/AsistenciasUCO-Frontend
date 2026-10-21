import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, forkJoin, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { AsignaturaDocenteApiDto } from '../api/models/asignatura-docente-api-dto.model';
import { HorarioDocenteApiDto } from '../api/models/horario-docente-api-dto.model';
import { Course } from '../models/course.model';
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

  crearGrupo(nuevo: Partial<Course> & Record<string, unknown>): Observable<ApiResponse<Course>> {
    if (environment.useMocks) {
      const cursoCreado: Course = {
        id: `mock-crs-${this.coursesSignal().length + 1}`,
        code: nuevo.code || 'ASIG-001',
        name: nuevo.name || 'Nueva Asignatura',
        section: nuevo.section || 'Grupo 01',
        schedule: nuevo.schedule || 'Lun, Mié 08:00 - 10:00 AM',
        room: nuevo.room || 'Aula Por Asignar',
        enrolledStudentsCount: nuevo.enrolledStudentsCount || 0,
        cupoMaximo: nuevo.cupoMaximo || 35,
        colorCategory: nuevo.colorCategory || 'emerald',
      };

      this.coursesSignal.update((prev) => [cursoCreado, ...prev]);
      return of({
        idTransaccion: 'mock-tx-create-course',
        exitoso: true,
        mensajeUsuario: `Grupo ${cursoCreado.section} de ${cursoCreado.name} creado exitosamente.`,
        datos: cursoCreado,
      }).pipe(delay(250));
    }

    return this.http.post<ApiResponse<Course>>(`${environment.apiUrl}/grupos`, {
      code: nuevo.code,
      name: nuevo.name,
      section: nuevo.section,
      cupoMaximo: nuevo.cupoMaximo || 35,
      colorCategory: nuevo.colorCategory,
      room: nuevo.room,
      schedule: nuevo.schedule,
      asignaturaId: nuevo['asignaturaId'],
      dias: nuevo['dias'],
      horaInicio: nuevo['horaInicio'],
      horaFin: nuevo['horaFin'],
      generarSesionesAutomaticas: nuevo['generarSesionesAutomaticas'],
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

  actualizarGrupo(id: string, cambios: Partial<Course>): Observable<ApiResponse<Course>> {
    if (environment.useMocks) {
      let actualizado: Course | null = null;
      this.coursesSignal.update((prev) => {
        return prev.map((c) => {
          if (c.id === id) {
            actualizado = { ...c, ...cambios };
            return actualizado;
          }
          return c;
        });
      });

      return of({
        idTransaccion: `mock-tx-update-course-${id}`,
        exitoso: true,
        mensajeUsuario: 'Información del grupo actualizada correctamente.',
        datos: actualizado as unknown as Course,
      }).pipe(delay(250));
    }

    // TARGET (PLAN.md LB-001B.1B, riesgo #3 RESUELTO): Grupo.docente en DB es solo FK UUID;
    // ActualizarGrupoRequest.java del backend no declara docenteName.
    const { docenteName, ...resto } = cambios as Partial<Course> & Record<string, unknown>;
    return this.http.put<ApiResponse<Course>>(`${environment.apiUrl}/grupos/${id}`, resto);
  }
}
