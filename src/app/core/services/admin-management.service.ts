import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import {
  DecanoItem,
  FacultadItem,
  AreaConocimientoItem,
  TipoProgramaItem,
  ParametroAdminDto,
  ParametroActualizadoDto,
  ActualizarParametroRequest,
  CierrePeriodoReporte,
  InstitucionItem,
} from '../models/role-management.model';

@Injectable({
  providedIn: 'root',
})
export class AdminManagementService {
  // Decanos
  private _decanos = signal<DecanoItem[]>([]);
  decanos = this._decanos.asReadonly();

  // Instituciones
  private _instituciones = signal<InstitucionItem[]>([]);
  instituciones = this._instituciones.asReadonly();

  // Facultades
  private _facultades = signal<FacultadItem[]>([]);
  facultades = this._facultades.asReadonly();

  // Áreas de Conocimiento
  private _areas = signal<AreaConocimientoItem[]>([]);
  areas = this._areas.asReadonly();

  // Tipos de Programa
  private _tiposPrograma = signal<TipoProgramaItem[]>([]);
  tiposPrograma = this._tiposPrograma.asReadonly();

  // Parámetros Institucionales
  private _parametros = signal<ParametroAdminDto[]>([]);
  parametros = this._parametros.asReadonly();

  // Auditoría

  // Reportes Cierre Masivo
  private _reportesCierre = signal<CierrePeriodoReporte[]>([]);
  reportesCierre = this._reportesCierre.asReadonly();

  constructor(private http: HttpClient) {}

  // ================= DECANOS =================
  getDecanos(): Observable<ApiResponse<DecanoItem[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/admin/decanos`).pipe(
      map((res) => {
        if (res && res.exitoso && Array.isArray(res.datos)) {
          // Deduplicar decanos por ID para que cada autoridad aparezca una única vez en el catálogo
          const decanosMap = new Map<string, any>();
          for (const item of res.datos) {
            if (item.id && !decanosMap.has(item.id)) {
              decanosMap.set(item.id, item);
            }
          }

          const normalizados: DecanoItem[] = Array.from(decanosMap.values()).map((raw) => this.normalizarDecano(raw));

          this._decanos.set(normalizados);
          return { ...res, datos: normalizados };
        }
        return res as unknown as ApiResponse<DecanoItem[]>;
      })
    );
  }

  /** Lleva el DecanoItemDTO del backend (o una fila ya normalizada) al modelo de presentación. */
  private normalizarDecano(raw: any): DecanoItem {
    const nombreCompleto = (raw.nombreCompleto || '').trim();
    let nombres = raw.nombres || '';
    let apellidos = raw.apellidos || '';

    if (!nombres && nombreCompleto) {
      const partes = nombreCompleto.split(/\s+/);
      if (partes.length <= 2) {
        nombres = partes[0] || '';
        apellidos = partes[1] || '';
      } else {
        nombres = partes.slice(0, 2).join(' ');
        apellidos = partes.slice(2).join(' ');
      }
    }

    const estaActivo = raw.estaActivoDecano ?? raw.estaActivo;
    return {
      id: raw.id,
      idUsuario: raw.idUsuario,
      tipoIdentificacion: raw.tipoIdentificacion || 'CC',
      tipoIdentificacionId: raw.tipoIdentificacionId,
      numeroIdentificacion: String(raw.numeroIdentificacion || ''),
      nombreCompleto: nombreCompleto || `${nombres} ${apellidos}`.trim(),
      nombres: nombres || nombreCompleto,
      apellidos: apellidos,
      correo: raw.correo || '',
      idFacultad: raw.idFacultad || undefined,
      facultad: raw.nombreFacultad || raw.facultad || 'Sin Facultad Asignada',
      nombreFacultad: raw.nombreFacultad || raw.facultad || 'Sin Facultad Asignada',
      telefono: raw.telefono || '',
      fechaAsignacion: raw.fechaAsignacion || '',
      estado: raw.estado || (estaActivo === false ? 'INACTIVO' : 'ACTIVO'),
      estaActivoDecano: estaActivo ?? true,
    };
  }

  createDecano(nuevoDecano: Omit<DecanoItem, 'id'> | Record<string, unknown>): Observable<ApiResponse<DecanoItem>> {
    return this.http.post<ApiResponse<DecanoItem>>(`${environment.apiUrl}/admin/decanos`, nuevoDecano);
  }

  /** A.2-8: cambia el estado del decano; `datos` llega como DecanoItemDTO y se normaliza para la tarjeta. */
  toggleDecanoStatus(id: string): Observable<ApiResponse<DecanoItem | null>> {
    return this.http
      .patch<ApiResponse<any | null>>(`${environment.apiUrl}/admin/decanos/${id}/toggle`, {})
      .pipe(map((res) => (res?.exitoso && res.datos ? { ...res, datos: this.normalizarDecano(res.datos) } : res)));
  }

  // ================= FACULTADES Y ÁREAS =================
  cargarFacultades(): Observable<ApiResponse<FacultadItem[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/admin/facultades`).pipe(
      map((res) => {
        if (res.exitoso && Array.isArray(res.datos)) {
          const items: FacultadItem[] = res.datos.map((dto: any) => ({
            id: dto.id,
            codigo: dto.codigo || (dto.nombreFacultad ? dto.nombreFacultad.substring(0, 4).toUpperCase() : 'FAC'),
            nombre: dto.nombreFacultad || dto.nombre || '',
            decanoId: dto.idDecano || dto.decanoId,
            decanoNombre: dto.nombreCompletoDecano || dto.decanoNombre || 'Sin asignar',
            estado: (dto.estaActivaFacultad ?? true) ? 'ACTIVO' : 'INACTIVO',
            totalProgramas: dto.totalProgramas || 0,
            totalEstudiantes: dto.totalEstudiantes || 0,
          }));
          this._facultades.set(items);
          return { ...res, datos: items };
        }
        return { ...res, datos: [] };
      })
    );
  }

  crearFacultad(item: { nombre: string; idDecano: string; idInstitucion?: string; codigo?: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/admin/facultades`, {
      nombre: item.nombre,
      idDecano: item.idDecano,
      idInstitucion: item.idInstitucion,
    }).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          const dto: any = res.datos;
          const decanoObj = this._decanos().find((d) => d.id === (dto.idDecano || item.idDecano));
          const nuevoItem: FacultadItem = {
            id: dto.id,
            codigo: '',
            nombre: dto.nombreFacultad || dto.nombre || item.nombre,
            decanoId: dto.idDecano || item.idDecano,
            decanoNombre: dto.nombreCompletoDecano || (decanoObj ? (decanoObj.nombreCompleto || `${decanoObj.nombres} ${decanoObj.apellidos}`.trim()) : 'Decano Titular'),
            estado: (dto.estaActivaFacultad ?? true) ? 'ACTIVO' : 'INACTIVO',
            totalProgramas: 0,
            totalEstudiantes: 0,
          };
          this._facultades.update((prev) => [nuevoItem, ...prev]);
        }
      })
    );
  }

  /** HU110 (nombre) y HU117 (decano): solo se envian los campos indicados y la señal refleja la respuesta del backend. */
  actualizarFacultad(
    id: string,
    cambios: { nombre?: string; idDecano?: string }
  ): Observable<ApiResponse<FacultadItem>> {
    return this.http
      .put<ApiResponse<any>>(`${environment.apiUrl}/admin/facultades/${id}`, cambios)
      .pipe(map((res) => this.aplicarFacultadRespuesta(id, res)));
  }

  /** HU111: recibe el estado deseado (idempotente); la señal solo cambia con la respuesta exitosa. */
  cambiarEstadoFacultad(id: string, activa: boolean): Observable<ApiResponse<FacultadItem>> {
    return this.http
      .patch<ApiResponse<any>>(`${environment.apiUrl}/admin/facultades/${id}/estado`, { activa })
      .pipe(map((res) => this.aplicarFacultadRespuesta(id, res)));
  }

  private aplicarFacultadRespuesta(id: string, res: ApiResponse<any>): ApiResponse<FacultadItem> {
    if (!res.exitoso || !res.datos) {
      return { ...res, datos: undefined as unknown as FacultadItem };
    }
    const dto: any = res.datos;
    const actual = this._facultades().find((f) => f.id === id);
    const item: FacultadItem = {
      ...actual,
      id: dto.id ?? id,
      codigo: actual?.codigo ?? '',
      nombre: dto.nombreFacultad || dto.nombre || actual?.nombre || '',
      decanoId: dto.idDecano ?? actual?.decanoId,
      decanoNombre: dto.nombreCompletoDecano || actual?.decanoNombre || 'Sin asignar',
      estado: (dto.estaActivaFacultad ?? true) ? 'ACTIVO' : 'INACTIVO',
    };
    this._facultades.update((prev) => prev.map((f) => (f.id === id ? item : f)));
    return { ...res, datos: item };
  }

  cargarAreas(): Observable<ApiResponse<AreaConocimientoItem[]>> {
    return this.http.get<ApiResponse<AreaConocimientoItem[]>>(`${environment.apiUrl}/admin/areas`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._areas.set(res.datos);
        }
      })
    );
  }

  // ================= TIPOS DE PROGRAMA (HU154, solo consulta) =================
  cargarTiposPrograma(): Observable<ApiResponse<TipoProgramaItem[]>> {
    return this.http.get<ApiResponse<TipoProgramaItem[]>>(`${environment.apiUrl}/admin/tipos-programa`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._tiposPrograma.set(res.datos);
        }
      })
    );
  }

  // ================= PARÁMETROS INSTITUCIONALES =================
  cargarParametros(filtro?: {
    grupo?: string;
    texto?: string;
    soloEditables?: boolean;
    pagina?: number;
    tamano?: number;
  }): Observable<ApiPageResponse<ParametroAdminDto> & { datos: ParametroAdminDto[] }> {
    let params = new HttpParams();
    if (filtro?.grupo) params = params.set('grupo', filtro.grupo);
    if (filtro?.texto) params = params.set('texto', filtro.texto);
    if (filtro?.soloEditables !== undefined && filtro?.soloEditables !== null) {
      params = params.set('soloEditables', String(filtro.soloEditables));
    }
    if (filtro?.pagina) params = params.set('pagina', String(filtro.pagina));
    if (filtro?.tamano) params = params.set('tamano', String(filtro.tamano));

    return this.http.get<any>(`${environment.apiUrl}/admin/parametros`, { params }).pipe(
      map((res: any) => {
        const elementos: ParametroAdminDto[] = res?.elementos ?? res?.datos ?? [];
        this._parametros.set(elementos);
        return {
          exitoso: res?.exitoso ?? true,
          elementos,
          datos: elementos,
          numeroPagina: res?.numeroPagina ?? filtro?.pagina ?? 1,
          tamanoPagina: res?.tamanoPagina ?? filtro?.tamano ?? elementos.length,
          totalElementos: res?.totalElementos ?? res?.total ?? elementos.length,
          totalPaginas: res?.totalPaginas ?? 1,
        };
      })
    );
  }

  actualizarParametro(
    id: string,
    payload: ActualizarParametroRequest
  ): Observable<ApiResponse<ParametroActualizadoDto>> {
    return this.http.put<ApiResponse<ParametroActualizadoDto>>(
      `${environment.apiUrl}/admin/parametros/${id}`,
      payload
    );
  }

  // ================= CIERRE MASIVO =================
  ejecutarCierreMasivo(idPeriodoAcademico: string, periodoCodigo: string = ''): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${environment.apiUrl}/admin/cierre-masivo`, {
      idPeriodoAcademico,
      periodoCodigo,
    });
  }

  // ================= INSTITUCIONES =================
  getInstituciones(): Observable<ApiResponse<InstitucionItem[]>> {
    return this.http.get<ApiResponse<InstitucionItem[]>>(`${environment.apiUrl}/admin/instituciones`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._instituciones.set(res.datos);
        }
      })
    );
  }

  // HU161/HU162/HU164 descartadas (decision de John 2026-11-05): Institucion es un catalogo de solo consulta.
}
