import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  DecanoItem,
  SedeInstitucionalItem,
  EspacioFisicoItem,
  FacultadItem,
  AreaConocimientoItem,
  ParametroInstitucionalItem,
  RegistroAuditoriaItem,
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

  // Sedes
  private _sedes = signal<SedeInstitucionalItem[]>([]);
  sedes = this._sedes.asReadonly();

  // Espacios Físicos
  private _espacios = signal<EspacioFisicoItem[]>([]);
  espacios = this._espacios.asReadonly();

  // Facultades
  private _facultades = signal<FacultadItem[]>([]);
  facultades = this._facultades.asReadonly();

  // Áreas de Conocimiento
  private _areas = signal<AreaConocimientoItem[]>([]);
  areas = this._areas.asReadonly();

  // Parámetros Institucionales
  private _parametros = signal<ParametroInstitucionalItem[]>([]);
  parametros = this._parametros.asReadonly();

  // Auditoría
  private _auditoria = signal<RegistroAuditoriaItem[]>([]);
  auditoria = this._auditoria.asReadonly();

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

          const normalizados: DecanoItem[] = Array.from(decanosMap.values()).map((raw) => {
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
              estado: raw.estado || (raw.estaActivoDecano === false ? 'INACTIVO' : 'ACTIVO'),
              estaActivoDecano: raw.estaActivoDecano ?? true,
            };
          });

          this._decanos.set(normalizados);
          return { ...res, datos: normalizados };
        }
        return res as unknown as ApiResponse<DecanoItem[]>;
      })
    );
  }

  createDecano(nuevoDecano: Omit<DecanoItem, 'id'> | Record<string, unknown>): Observable<ApiResponse<DecanoItem>> {
    return this.http.post<ApiResponse<DecanoItem>>(`${environment.apiUrl}/admin/decanos`, nuevoDecano);
  }

  toggleDecanoStatus(id: string): Observable<ApiResponse<DecanoItem | null>> {
    return this.http.patch<ApiResponse<DecanoItem | null>>(`${environment.apiUrl}/admin/decanos/${id}/toggle`, {});
  }

  // ================= SEDES =================
  cargarSedes(): Observable<ApiResponse<SedeInstitucionalItem[]>> {
    return this.http.get<ApiResponse<SedeInstitucionalItem[]>>(`${environment.apiUrl}/admin/sedes`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._sedes.set(res.datos);
        }
      })
    );
  }

  crearSede(item: Omit<SedeInstitucionalItem, 'id'>): void {
    this.http.post<ApiResponse<SedeInstitucionalItem>>(`${environment.apiUrl}/admin/sedes`, item).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._sedes.update((prev) => [res.datos, ...prev]);
        }
      })
    ).subscribe();
  }

  actualizarSede(id: string, cambios: Partial<SedeInstitucionalItem>): void {
    this.http.put<ApiResponse<SedeInstitucionalItem>>(`${environment.apiUrl}/admin/sedes/${id}`, cambios).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._sedes.update((prev) => prev.map((s) => (s.id === id ? res.datos : s)));
        }
      })
    ).subscribe();
  }

  cambiarEstadoSede(id: string): void {
    this.http.patch<ApiResponse<SedeInstitucionalItem>>(`${environment.apiUrl}/admin/sedes/${id}/estado`, {}).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._sedes.update((prev) => prev.map((s) => (s.id === id ? res.datos : s)));
        }
      })
    ).subscribe();
  }

  // ================= ESPACIOS FÍSICOS =================
  cargarEspacios(): Observable<ApiResponse<EspacioFisicoItem[]>> {
    return this.http.get<ApiResponse<EspacioFisicoItem[]>>(`${environment.apiUrl}/admin/espacios-fisicos`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._espacios.set(res.datos);
        }
      })
    );
  }

  crearEspacio(item: Omit<EspacioFisicoItem, 'id'>): void {
    this.http.post<ApiResponse<EspacioFisicoItem>>(`${environment.apiUrl}/admin/espacios-fisicos`, item).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._espacios.update((prev) => [res.datos, ...prev]);
        }
      })
    ).subscribe();
  }

  actualizarEspacio(id: string, cambios: Partial<EspacioFisicoItem>): void {
    this.http.put<ApiResponse<EspacioFisicoItem>>(`${environment.apiUrl}/admin/espacios-fisicos/${id}`, cambios).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._espacios.update((prev) => prev.map((e) => (e.id === id ? res.datos : e)));
        }
      })
    ).subscribe();
  }

  cambiarEstadoEspacio(id: string): void {
    this.http.patch<ApiResponse<EspacioFisicoItem>>(`${environment.apiUrl}/admin/espacios-fisicos/${id}/estado`, {}).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._espacios.update((prev) => prev.map((e) => (e.id === id ? res.datos : e)));
        }
      })
    ).subscribe();
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

  actualizarFacultad(id: string, cambios: Partial<FacultadItem>): void {
    this.http.put<ApiResponse<FacultadItem>>(`${environment.apiUrl}/admin/facultades/${id}`, cambios).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._facultades.update((prev) => prev.map((f) => (f.id === id ? res.datos : f)));
        }
      })
    ).subscribe();
  }

  cambiarEstadoFacultad(id: string): void {
    this.http.patch<ApiResponse<FacultadItem>>(`${environment.apiUrl}/admin/facultades/${id}/estado`, {}).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._facultades.update((prev) => prev.map((f) => (f.id === id ? res.datos : f)));
        }
      })
    ).subscribe();
  }

  asignarDecanoFacultad(facultadId: string, idDecano: string, decanoNombre: string): Observable<boolean> {
    // Actualización reactiva optimista del estado de la facultad
    this._facultades.update((prev) =>
      prev.map((f) => (f.id === facultadId ? { ...f, decanoId: idDecano, decanoNombre } : f))
    );

    return this.http.put<ApiResponse<any>>(`${environment.apiUrl}/admin/facultades/${facultadId}`, {
      idDecano,
    }).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  desvincularDecanoFacultad(facultadId: string): Observable<boolean> {
    // Desvinculación reactiva optimista
    this._facultades.update((prev) =>
      prev.map((f) => (f.id === facultadId ? { ...f, decanoId: undefined, decanoNombre: 'Sin asignar' } : f))
    );

    return this.http.put<ApiResponse<any>>(`${environment.apiUrl}/admin/facultades/${facultadId}`, {
      idDecano: null,
    }).pipe(
      map(() => true),
      catchError(() => of(true))
    );
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

  crearArea(item: Omit<AreaConocimientoItem, 'id'>): void {
    this.http.post<ApiResponse<AreaConocimientoItem>>(`${environment.apiUrl}/admin/areas`, item).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._areas.update((prev) => [res.datos, ...prev]);
        }
      })
    ).subscribe();
  }

  actualizarArea(id: string, cambios: Partial<AreaConocimientoItem>): void {
    this.http.put<ApiResponse<AreaConocimientoItem>>(`${environment.apiUrl}/admin/areas/${id}`, cambios).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._areas.update((prev) => prev.map((a) => (a.id === id ? res.datos : a)));
        }
      })
    ).subscribe();
  }

  cambiarEstadoArea(id: string): void {
    this.http.patch<ApiResponse<AreaConocimientoItem>>(`${environment.apiUrl}/admin/areas/${id}/estado`, {}).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._areas.update((prev) => prev.map((a) => (a.id === id ? res.datos : a)));
        }
      })
    ).subscribe();
  }

  // ================= PARÁMETROS INSTITUCIONALES =================
  cargarParametros(): Observable<ApiResponse<ParametroInstitucionalItem[]>> {
    return this.http.get<ApiResponse<ParametroInstitucionalItem[]>>(`${environment.apiUrl}/admin/parametros`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._parametros.set(res.datos);
        }
      })
    );
  }

  actualizarParametro(id: string, nuevoValor: string): void {
    this.http.patch<ApiResponse<ParametroInstitucionalItem>>(`${environment.apiUrl}/admin/parametros/${id}`, { valor: nuevoValor }).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._parametros.update((prev) => prev.map((p) => (p.id === id ? res.datos : p)));
        }
      })
    ).subscribe();
  }

  // ================= AUDITORÍA =================
  cargarAuditoria(): Observable<ApiResponse<RegistroAuditoriaItem[]>> {
    return this.http.get<ApiResponse<RegistroAuditoriaItem[]>>(`${environment.apiUrl}/admin/auditoria`).pipe(
      tap((res) => {
        if (res.exitoso && res.datos) {
          this._auditoria.set(res.datos);
        }
      })
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

  crearInstitucion(data: Partial<InstitucionItem>): Observable<ApiResponse<InstitucionItem>> {
    return this.http.post<ApiResponse<InstitucionItem>>(`${environment.apiUrl}/admin/instituciones`, data);
  }

  actualizarInstitucion(id: string, data: Partial<InstitucionItem>): Observable<ApiResponse<InstitucionItem>> {
    return this.http.put<ApiResponse<InstitucionItem>>(`${environment.apiUrl}/admin/instituciones/${id}`, data);
  }

  toggleEstadoInstitucion(id: string): Observable<ApiResponse<{ id: string }>> {
    return this.http.patch<ApiResponse<{ id: string }>>(`${environment.apiUrl}/admin/instituciones/${id}/toggle-estado`, {});
  }
}
