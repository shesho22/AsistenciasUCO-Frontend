import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  DocenteItem,
  PlanEstudioItem,
  AsignaturaPlanItem,
  EstudianteDirectorioItem,
  SolicitudMatriculaItem,
  PeriodoAcademicoItem,
} from '../models/role-management.model';
import { EstudiantePaginaApiDto } from '../api/models/estudiante-api-dto.model';

export interface DirectorioEstudiantesQuery {
  page: number;
  size: number;
  nombre?: string;
  numeroIdentificacion?: string;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CoordinatorManagementService {
  private planesSignal = signal<PlanEstudioItem[]>([]);
  public planes = this.planesSignal.asReadonly();

  private asignaturasSignal = signal<Record<string, AsignaturaPlanItem[]>>({});

  private periodosSignal = signal<PeriodoAcademicoItem[]>([]);
  public periodos = this.periodosSignal.asReadonly();

  private estudiantesSignal = signal<EstudianteDirectorioItem[]>([]);
  public estudiantes = this.estudiantesSignal.asReadonly();

  private solicitudesMatriculaSignal = signal<SolicitudMatriculaItem[]>([]);
  public solicitudesMatricula = this.solicitudesMatriculaSignal.asReadonly();

  constructor(private http: HttpClient) {
    this.cargarDatosIniciales();
  }

  private cargarDatosIniciales(): void {
    this.getPlanesEstudio().subscribe();
    this.getPeriodosAcademicos().subscribe();
  }

  // --- DOCENTES ---
  getDocentes(): Observable<ApiResponse<DocenteItem[]>> {
    return this.http.get<ApiResponse<DocenteItem[]>>(`${environment.apiUrl}/coordinador/docentes`);
  }

  createDocente(nuevoDocente: Omit<DocenteItem, 'id' | 'totalGruposAsignados'>): Observable<ApiResponse<DocenteItem>> {
    return this.http.post<ApiResponse<DocenteItem>>(`${environment.apiUrl}/coordinador/docentes`, nuevoDocente);
  }

  toggleDocenteStatus(id: string): Observable<ApiResponse<DocenteItem | null>> {
    return this.http.patch<ApiResponse<DocenteItem | null>>(`${environment.apiUrl}/coordinador/docentes/${id}/toggle`, {});
  }

  // --- PLANES DE ESTUDIO ---
  getAsignaturasPlan(planId: string): AsignaturaPlanItem[] {
    return this.asignaturasSignal()[planId] || [];
  }

  getPlanesEstudio(): Observable<ApiResponse<PlanEstudioItem[]>> {
    return this.http.get<ApiResponse<PlanEstudioItem[]>>(`${environment.apiUrl}/coordinador/planes-estudio`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.planesSignal.set(res.datos);
        }
      })
    );
  }

  crearPlanEstudio(datos: Partial<PlanEstudioItem>): Observable<ApiResponse<PlanEstudioItem>> {
    return this.http.post<ApiResponse<PlanEstudioItem>>(`${environment.apiUrl}/coordinador/planes-estudio`, datos).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.planesSignal.update((prev) => [res.datos, ...prev]);
        }
      })
    );
  }

  actualizarPlanEstudio(id: string, cambios: Partial<PlanEstudioItem>): Observable<ApiResponse<PlanEstudioItem>> {
    return this.http.put<ApiResponse<PlanEstudioItem>>(`${environment.apiUrl}/coordinador/planes-estudio/${id}`, cambios).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.planesSignal.update((prev) => prev.map((p) => (p.id === id ? res.datos : p)));
        }
      })
    );
  }

  toggleEstadoPlanEstudio(id: string): Observable<ApiResponse<PlanEstudioItem>> {
    return this.http.patch<ApiResponse<PlanEstudioItem>>(`${environment.apiUrl}/coordinador/planes-estudio/${id}/toggle`, {}).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.planesSignal.update((prev) => prev.map((p) => (p.id === id ? res.datos : p)));
        }
      })
    );
  }

  getAsignaturasPorPlan(planId: string): Observable<ApiResponse<AsignaturaPlanItem[]>> {
    return this.http.get<ApiResponse<AsignaturaPlanItem[]>>(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/asignaturas`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.asignaturasSignal.update((map) => ({ ...map, [planId]: res.datos }));
        }
      })
    );
  }

  crearAsignaturaPlan(planId: string, datos: Partial<AsignaturaPlanItem>): Observable<ApiResponse<AsignaturaPlanItem>> {
    return this.http.post<ApiResponse<AsignaturaPlanItem>>(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/asignaturas`, datos).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.asignaturasSignal.update((map) => ({
            ...map,
            [planId]: [...(map[planId] || []), res.datos],
          }));
          this.planesSignal.update((prev) =>
            prev.map((p) => (p.id === planId ? { ...p, totalAsignaturas: p.totalAsignaturas + 1 } : p))
          );
        }
      })
    );
  }

  actualizarAsignaturaPlan(planId: string, asigId: string, cambios: Partial<AsignaturaPlanItem>): Observable<ApiResponse<AsignaturaPlanItem>> {
    return this.http.put<ApiResponse<AsignaturaPlanItem>>(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/asignaturas/${asigId}`, cambios).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.asignaturasSignal.update((map) => {
            const list = map[planId] || [];
            return {
              ...map,
              [planId]: list.map((a) => (a.id === asigId ? res.datos : a)),
            };
          });
        }
      })
    );
  }

  eliminarAsignaturaPlan(planId: string, asigId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/asignaturas/${asigId}`).pipe(
      tap((res) => {
        if (res.exitoso) {
          this.asignaturasSignal.update((map) => ({
            ...map,
            [planId]: (map[planId] || []).filter((a) => a.id !== asigId),
          }));
          this.planesSignal.update((prev) =>
            prev.map((p) => (p.id === planId ? { ...p, totalAsignaturas: Math.max(0, p.totalAsignaturas - 1) } : p))
          );
        }
      })
    );
  }

  // --- PERÍODOS ACADÉMICOS ---
  getPeriodosAcademicos(): Observable<ApiResponse<PeriodoAcademicoItem[]>> {
    return this.http.get<ApiResponse<PeriodoAcademicoItem[]>>(`${environment.apiUrl}/coordinador/periodos-academicos`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.periodosSignal.set(res.datos);
        }
      })
    );
  }

  crearPeriodoAcademico(datos: Partial<PeriodoAcademicoItem>): Observable<ApiResponse<PeriodoAcademicoItem>> {
    return this.http.post<ApiResponse<PeriodoAcademicoItem>>(`${environment.apiUrl}/coordinador/periodos-academicos`, datos).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.periodosSignal.update((prev) => [res.datos, ...prev]);
        }
      })
    );
  }

  actualizarPeriodoAcademico(id: string, cambios: Partial<PeriodoAcademicoItem>): Observable<ApiResponse<PeriodoAcademicoItem>> {
    return this.http.put<ApiResponse<PeriodoAcademicoItem>>(`${environment.apiUrl}/coordinador/periodos-academicos/${id}`, cambios).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.periodosSignal.update((prev) => prev.map((p) => (p.id === id ? res.datos : p)));
        }
      })
    );
  }

  toggleEstadoPeriodoAcademico(id: string): Observable<ApiResponse<PeriodoAcademicoItem>> {
    return this.http.patch<ApiResponse<PeriodoAcademicoItem>>(`${environment.apiUrl}/coordinador/periodos-academicos/${id}/estado`, {});
  }

  agregarSemestrePlan(planId: string): Observable<ApiResponse<{ planEstudioId: string }>> {
    return this.http.post<ApiResponse<{ planEstudioId: string }>>(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/semestres`, {});
  }

  eliminarSemestrePlan(planId: string, semestreNumero: number): Observable<ApiResponse<{ planEstudioId: string; semestreEliminado: number }>> {
    return this.http.delete<ApiResponse<{ planEstudioId: string; semestreEliminado: number }>>(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/semestres/${semestreNumero}`);
  }

  // --- DIRECTORIO INSTITUCIONAL DE ESTUDIANTES ---
  getEstudiantesDirectorio(): Observable<ApiResponse<EstudianteDirectorioItem[]>> {
    return this.http.get<ApiResponse<EstudianteDirectorioItem[]>>(`${environment.apiUrl}/coordinador/estudiantes`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.estudiantesSignal.set(res.datos);
        }
      })
    );
  }

  getEstudiantesDirectorioPagina(
    query: DirectorioEstudiantesQuery
  ): Observable<EstudiantePaginaApiDto> {
    if (environment.useFrontendMocks) {
      return this.http
        .get<ApiResponse<EstudianteDirectorioItem[]>>(`${environment.apiUrl}/coordinador/estudiantes`)
        .pipe(
          map((response) => {
            const start = query.page * query.size;
            const filtered = (response.datos || [])
              .filter((item) => !query.nombre || item.nombreCompleto.toLowerCase().includes(query.nombre.toLowerCase()))
              .filter((item) => query.activo === undefined || (item.estadoMatricula === 'ACTIVO') === query.activo);
            const items = filtered
              .slice(start, start + query.size)
              .map((item) => ({
                id: item.id,
                idUsuario: item.id,
                tipoIdentificacionId: '',
                numeroIdentificacion: Number(item.documento) || 0,
                primerApellido: '',
                segundoApellido: '',
                primerNombre: item.nombreCompleto,
                segundoNombre: '',
                nombreCompleto: item.nombreCompleto,
                correo: item.correo,
                estaActivoUsuario: item.estadoMatricula === 'ACTIVO',
              }));
            const totalItems = filtered.length;
            return {
              items,
              totalItems,
              totalPages: Math.ceil(totalItems / query.size),
              page: query.page,
              size: query.size,
            };
          })
        );
    }

    const params: Record<string, string> = {
      page: String(query.page),
      size: String(query.size),
    };
    if (query.nombre) params['nombre'] = query.nombre;
    if (query.numeroIdentificacion) params['numeroIdentificacion'] = query.numeroIdentificacion;
    if (query.activo !== undefined) params['activo'] = String(query.activo);
    return this.http.get<EstudiantePaginaApiDto>(`${environment.apiUrl}/estudiantes`, { params });
  }

  getEstudiantesPorGrupo(grupoId: string): Observable<ApiResponse<EstudianteDirectorioItem[]>> {
    return this.http.get<ApiResponse<EstudianteDirectorioItem[]>>(`${environment.apiUrl}/grupos/${grupoId}/estudiantes`);
  }

  matricularEstudianteGrupo(grupoId: string, estudianteId: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/grupos/${grupoId}/estudiantes`, { estudianteId }).pipe(
      tap((res) => {
        if (res.exitoso) {
          this.estudiantesSignal.update((prev) =>
            prev.map((e) => {
              if (e.id === estudianteId) {
                const grupos = new Set(e.gruposInscritos || []);
                grupos.add(grupoId);
                return { ...e, gruposInscritos: Array.from(grupos) };
              }
              return e;
            })
          );
        }
      })
    );
  }

  retirarEstudianteGrupo(grupoId: string, estudianteId: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${environment.apiUrl}/grupos/${grupoId}/estudiantes/${estudianteId}`).pipe(
      tap((res) => {
        if (res.exitoso) {
          this.estudiantesSignal.update((prev) =>
            prev.map((e) => {
              if (e.id === estudianteId) {
                return {
                  ...e,
                  gruposInscritos: (e.gruposInscritos || []).filter((g) => g !== grupoId),
                };
              }
              return e;
            })
          );
        }
      })
    );
  }

  // --- SOLICITUDES DE INSCRIPCIÓN Y CUPO ---
  getSolicitudesMatricula(): Observable<ApiResponse<SolicitudMatriculaItem[]>> {
    return this.http.get<ApiResponse<SolicitudMatriculaItem[]>>(`${environment.apiUrl}/coordinador/solicitudes-matricula`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.solicitudesMatriculaSignal.set(res.datos);
        }
      })
    );
  }

  crearSolicitudMatricula(
    solicitud: Omit<SolicitudMatriculaItem, 'id' | 'fechaSolicitud' | 'estado'>
  ): Observable<ApiResponse<SolicitudMatriculaItem>> {
    return this.http.post<ApiResponse<SolicitudMatriculaItem>>(`${environment.apiUrl}/estudiante/solicitudes-matricula`, solicitud).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.solicitudesMatriculaSignal.update((prev) => [res.datos, ...prev]);
        }
      })
    );
  }

  resolverSolicitudMatricula(
    id: string,
    accion: 'APROBADA' | 'RECHAZADA',
    respuesta?: string
  ): Observable<ApiResponse<SolicitudMatriculaItem>> {
    return this.http.patch<ApiResponse<SolicitudMatriculaItem>>(`${environment.apiUrl}/coordinador/solicitudes-matricula/${id}`, {
      accion,
      respuesta,
    }).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.solicitudesMatriculaSignal.update((prev) => prev.map((s) => (s.id === id ? res.datos : s)));
        }
      })
    );
  }
}
