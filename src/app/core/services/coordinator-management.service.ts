import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  ActualizarDocentePayload,
  DocenteCandidato,
  DocentePrograma,
  DocentesProgramaFiltro,
  FichaDocente,
  FichaDocenteFiltro,
  ResumenDocentesPrograma,
  TipoVinculacionItem,
  VincularDocentePayload,
} from '../models/docente-programa.model';
import {
  DocenteItem,
  PlanEstudioItem,
  AsignaturaPlanItem,
  EstudianteDirectorioItem,
  SolicitudMatriculaItem,
  PeriodoAcademicoItem,
} from '../models/role-management.model';
import { EstudiantePaginaApiDto } from '../api/models/estudiante-api-dto.model';
import { AsistenciaSesionItem, GrupoProgramaItem, SesionGrupoItem } from '../models/asistencia-programa.model';

/**
 * HU081-HU083: el backend devuelve el plan con `inp`, `nombrePrograma`, `estaActivoPlanEstudio` y `totalSemestres`;
 * la pantalla trabaja con `PlanEstudioItem`. Los campos que ya vienen con la forma de la pantalla se conservan.
 */
export function normalizarPlanEstudio(raw: any): PlanEstudioItem {
  const inp = raw?.inp != null ? String(raw.inp) : '';
  return {
    id: raw?.id,
    codigo: raw?.codigo ?? (inp ? `INP-${inp}` : ''),
    nombre: raw?.nombre ?? (inp ? `Plan ${inp}` : 'Plan de estudio'),
    anioVigencia: raw?.anioVigencia ?? (Number(inp) || 0),
    programa: raw?.programa ?? raw?.nombrePrograma ?? '',
    facultad: raw?.facultad ?? '',
    totalCreditos: raw?.totalCreditos ?? 0,
    totalSemestres: raw?.totalSemestres ?? 0,
    totalAsignaturas: raw?.totalAsignaturas ?? 0,
    estado: raw?.estado ?? (raw?.estaActivoPlanEstudio === false ? 'INACTIVO' : 'VIGENTE'),
    descripcion: raw?.descripcion ?? raw?.justificacionEstado ?? '',
  };
}

/**
 * HU096-HU098: el backend devuelve el período con `nombre` (p. ej. 2026-2), `codigo` numérico y fechas; la pantalla
 * muestra el nombre como código y calcula el estado con las fechas (sin columna de estado en la DB).
 */
export function normalizarPeriodoAcademico(raw: any, hoy: Date = new Date()): PeriodoAcademicoItem {
  const fechaInicio = String(raw?.fechaInicio ?? '');
  const fechaFin = String(raw?.fechaFin ?? '');
  const dia = hoy.toISOString().slice(0, 10);
  const calculado: PeriodoAcademicoItem['estado'] =
    fechaInicio && dia < fechaInicio ? 'PLANEACION' : fechaFin && dia > fechaFin ? 'CERRADO' : 'ACTIVO';
  const estado = raw?.estado ?? calculado;
  return {
    id: raw?.id,
    codigo: raw?.idInstitucion !== undefined ? String(raw?.nombre ?? '') : String(raw?.codigo ?? raw?.nombre ?? ''),
    nombre: raw?.idInstitucion !== undefined ? `Período ${raw?.nombre ?? ''}` : String(raw?.nombre ?? ''),
    fechaInicio,
    fechaFin,
    fechaLimiteNotas: raw?.fechaLimiteNotas,
    estado,
    esActual: raw?.esActual ?? estado === 'ACTIVO',
  };
}

/**
 * HU082/HU083: la malla agrupa por número de semestre. El backend envía `codigoSemestre` (p. ej. "S8"),
 * `credito`, `nombreArea` y `nombreComponente`; se adaptan a `AsignaturaPlanItem` conservando lo que ya venga.
 */
export function normalizarAsignaturaPlan(raw: any): AsignaturaPlanItem {
  const semestre = raw?.semestre ?? Number(String(raw?.codigoSemestre ?? '').replace(/\D/g, '') || 0);
  return {
    ...raw,
    planEstudioId: raw?.planEstudioId ?? raw?.idPlanEstudio,
    creditos: raw?.creditos ?? raw?.credito ?? 0,
    semestre,
    area: raw?.area ?? raw?.nombreArea ?? '',
    componente: raw?.componente ?? raw?.nombreComponente ?? '',
    prerrequisitos: raw?.prerrequisitos ?? [],
    horasSemanales: raw?.horasSemanales ?? 0,
  };
}

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
  private docentesSignal = signal<DocentePrograma[]>([]);
  public docentes = this.docentesSignal.asReadonly();

  private totalDocentesSignal = signal(0);
  public totalDocentes = this.totalDocentesSignal.asReadonly();

  private planesSignal = signal<PlanEstudioItem[]>([]);
  public planes = this.planesSignal.asReadonly();

  private asignaturasSignal = signal<Record<string, AsignaturaPlanItem[]>>({});

  private periodosSignal = signal<PeriodoAcademicoItem[]>([]);
  public periodos = this.periodosSignal.asReadonly();

  private estudiantesSignal = signal<EstudianteDirectorioItem[]>([]);
  public estudiantes = this.estudiantesSignal.asReadonly();

  private solicitudesMatriculaSignal = signal<SolicitudMatriculaItem[]>([]);
  public solicitudesMatricula = this.solicitudesMatriculaSignal.asReadonly();

  constructor(private http: HttpClient) {}

  /**
   * Carga planes de estudio y periodos academicos (endpoints /coordinador/**) bajo demanda.
   * Ya no se dispara desde el constructor: el servicio es `providedIn: 'root'` y un estudiante o docente
   * que lo inyecte no debe generar peticiones administrativas (403). Lo invocan solo las pantallas
   * de Coordinador, Decano y Administrador que consumen las senales `planes` / `periodos`.
   */
  cargarDatosAcademicosBase(): void {
    this.getPlanesEstudio().subscribe({ error: () => undefined });
    this.getPeriodosAcademicos().subscribe({ error: () => undefined });
  }

  // --- DOCENTES DEL PROGRAMA (HU062/HU063/HU089/HU090/HU091) ---
  getDocentesPrograma(filtro: DocentesProgramaFiltro): Observable<ApiResponse<DocentePrograma[]>> {
    let params = new HttpParams().set('pagina', filtro.pagina).set('tamano', filtro.tamano);
    const busqueda = filtro.busqueda?.trim();
    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }
    if (filtro.estaActivo !== undefined) {
      params = params.set('estaActivo', filtro.estaActivo);
    }
    if (filtro.idTipoVinculacion) {
      params = params.set('idTipoVinculacion', filtro.idTipoVinculacion);
    }
    return this.http
      .get<ApiResponse<DocentePrograma[]>>(`${environment.apiUrl}/coordinador/docentes`, { params })
      .pipe(
        tap((res) => {
          if (res.exitoso) {
            this.docentesSignal.set(res.datos ?? []);
            this.totalDocentesSignal.set(res.total ?? 0);
          }
        })
      );
  }

  /**
   * Compatibilidad para consumidores de solo lectura (resumen del dashboard y lista de respaldo del picker) que aun
   * trabajan con {@link DocenteItem}. Reutiliza el directorio paginado del servidor; no mantiene datos propios.
   */
  getDocentes(): Observable<ApiResponse<DocenteItem[]>> {
    return this.getDocentesPrograma({ pagina: 1, tamano: 100 }).pipe(
      map((res) => ({
        ...res,
        datos: (res.datos ?? []).map(
          (d): DocenteItem => ({
            id: d.idDocente,
            tipoIdentificacion: d.codigoTipoIdentificacion,
            numeroIdentificacion: String(d.numeroIdentificacion),
            primerNombre: d.primerNombre,
            segundoNombre: d.segundoNombre ?? '',
            primerApellido: d.primerApellido,
            segundoApellido: d.segundoApellido ?? '',
            nombres: [d.primerNombre, d.segundoNombre].filter(Boolean).join(' '),
            apellidos: [d.primerApellido, d.segundoApellido].filter(Boolean).join(' '),
            correo: d.correo,
            departamento: '',
            especialidad: d.nombreTipoVinculacion,
            estado: d.estaActivo ? 'ACTIVO' : 'INACTIVO',
            totalGruposAsignados: d.totalGruposPrograma,
          })
        ),
      }))
    );
  }

  getCandidatosDocente(busqueda: string): Observable<ApiResponse<DocenteCandidato[]>> {
    const params = new HttpParams().set('busqueda', busqueda);
    return this.http.get<ApiResponse<DocenteCandidato[]>>(`${environment.apiUrl}/coordinador/docentes/candidatos`, { params });
  }

  /** No actualiza la lista local: la pantalla recarga desde el servidor tras la respuesta (sin actualizacion optimista). */
  vincularDocente(payload: VincularDocentePayload): Observable<ApiResponse<DocentePrograma>> {
    return this.http.post<ApiResponse<DocentePrograma>>(`${environment.apiUrl}/coordinador/docentes`, payload);
  }

  /** HU092. Como en la vinculacion, la lista se recarga desde el servidor (sin actualizacion optimista). */
  actualizarDocente(idDocente: string, payload: ActualizarDocentePayload): Observable<ApiResponse<DocentePrograma>> {
    return this.http.put<ApiResponse<DocentePrograma>>(`${environment.apiUrl}/coordinador/docentes/${idDocente}`, payload);
  }

  /** HU093: activa/inactiva SOLO el vinculo con el programa. La lista se recarga desde el servidor. */
  cambiarEstadoDocente(idDocente: string, estaActivo: boolean): Observable<ApiResponse<DocentePrograma>> {
    return this.http.patch<ApiResponse<DocentePrograma>>(`${environment.apiUrl}/coordinador/docentes/${idDocente}/estado`, { estaActivo });
  }

  /** HU094: ficha del docente con su historial de grupos en el programa y el resumen de carga. */
  getFichaDocente(idDocente: string, filtro: FichaDocenteFiltro): Observable<ApiResponse<FichaDocente>> {
    let params = new HttpParams().set('pagina', filtro.pagina).set('tamano', filtro.tamano);
    if (filtro.idPeriodoAcademico) {
      params = params.set('idPeriodoAcademico', filtro.idPeriodoAcademico);
    }
    return this.http.get<ApiResponse<FichaDocente>>(`${environment.apiUrl}/coordinador/docentes/${idDocente}/ficha`, { params });
  }

  /** HU095: consolidado del directorio docente del programa (activos, inactivos y por tipo de vinculacion). */
  getResumenDocentes(): Observable<ApiResponse<ResumenDocentesPrograma>> {
    return this.http.get<ApiResponse<ResumenDocentesPrograma>>(`${environment.apiUrl}/coordinador/docentes/resumen`);
  }

  getTiposVinculacion(): Observable<TipoVinculacionItem[]> {
    return this.http.get<TipoVinculacionItem[]>(`${environment.apiUrl}/tipos-vinculacion`);
  }

  // --- PLANES DE ESTUDIO ---
  getAsignaturasPlan(planId: string): AsignaturaPlanItem[] {
    return this.asignaturasSignal()[planId] || [];
  }

  getPlanesEstudio(): Observable<ApiResponse<PlanEstudioItem[]>> {
    return this.http.get<ApiResponse<PlanEstudioItem[]>>(`${environment.apiUrl}/coordinador/planes-estudio`).pipe(
      map((res) => (res.datos ? { ...res, datos: res.datos.map(normalizarPlanEstudio) } : res)),
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

  /** HU081. El backend responde sin datos: la pantalla recarga la lista tras el exito. */
  toggleEstadoPlanEstudio(id: string): Observable<ApiResponse<PlanEstudioItem>> {
    return this.http.patch<ApiResponse<PlanEstudioItem>>(`${environment.apiUrl}/coordinador/planes-estudio/${id}/toggle-estado`, {}).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.planesSignal.update((prev) => prev.map((p) => (p.id === id ? res.datos : p)));
        }
      })
    );
  }

  getAsignaturasPorPlan(planId: string): Observable<ApiResponse<AsignaturaPlanItem[]>> {
    return this.http.get<ApiResponse<AsignaturaPlanItem[]>>(`${environment.apiUrl}/coordinador/planes-estudio/${planId}/asignaturas`).pipe(
      map((res) => (res.datos ? { ...res, datos: res.datos.map(normalizarAsignaturaPlan) } : res)),
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
      map((res) => (res.datos ? { ...res, datos: res.datos.map((p) => normalizarPeriodoAcademico(p)) } : res)),
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.periodosSignal.set(res.datos);
        }
      })
    );
  }

  crearPeriodoAcademico(datos: Partial<PeriodoAcademicoItem>): Observable<ApiResponse<PeriodoAcademicoItem>> {
    return this.http.post<ApiResponse<PeriodoAcademicoItem>>(`${environment.apiUrl}/admin/periodos-academicos`, datos).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.periodosSignal.update((prev) => [res.datos, ...prev]);
        }
      })
    );
  }

  actualizarPeriodoAcademico(id: string, cambios: Partial<PeriodoAcademicoItem>): Observable<ApiResponse<PeriodoAcademicoItem>> {
    return this.http.put<ApiResponse<PeriodoAcademicoItem>>(`${environment.apiUrl}/admin/periodos-academicos/${id}`, cambios).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this.periodosSignal.update((prev) => prev.map((p) => (p.id === id ? res.datos : p)));
        }
      })
    );
  }

  /** HU098. El backend rechaza con 409 si el período tiene grupos o sesiones; la pantalla recarga tras el éxito. */
  eliminarPeriodoAcademico(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/admin/periodos-academicos/${id}`).pipe(
      tap((res) => {
        if (res.exitoso) {
          this.periodosSignal.update((prev) => prev.filter((p) => p.id !== id));
        }
      })
    );
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

  // --- HU064/HU060/HU061: GRUPOS, SESIONES Y ASISTENCIAS DEL PROGRAMA (SOLO LECTURA) ---
  getGruposPrograma(filtro: {
    idPeriodo?: string | null;
    busqueda?: string | null;
    pagina: number;
    tamano: number;
  }): Observable<ApiResponse<GrupoProgramaItem[]>> {
    return this.http.get<ApiResponse<GrupoProgramaItem[]>>(`${environment.apiUrl}/coordinador/grupos`, {
      params: parametrosConsulta(filtro),
    });
  }

  getSesionesGrupo(
    grupoId: string,
    filtro: { desde?: string | null; hasta?: string | null; pagina: number; tamano: number }
  ): Observable<ApiResponse<SesionGrupoItem[]>> {
    return this.http.get<ApiResponse<SesionGrupoItem[]>>(`${environment.apiUrl}/coordinador/grupos/${grupoId}/sesiones`, {
      params: parametrosConsulta(filtro),
    });
  }

  getAsistenciasSesion(
    sesionId: string,
    filtro: { asistio?: boolean | null; pagina: number; tamano: number }
  ): Observable<ApiResponse<AsistenciaSesionItem[]>> {
    return this.http.get<ApiResponse<AsistenciaSesionItem[]>>(
      `${environment.apiUrl}/coordinador/sesiones/${sesionId}/asistencias`,
      { params: parametrosConsulta(filtro) }
    );
  }
}

/** Omite los filtros vacios para que el backend aplique sus valores por defecto. */
function parametrosConsulta(filtro: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
      params = params.set(clave, String(valor).trim());
    }
  }
  return params;
}
