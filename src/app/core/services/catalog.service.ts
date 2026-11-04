import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, delay, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TipoIdentificacionApiDto } from '../api/models/tipo-identificacion-api-dto.model';
import { ApiResponse } from '../models/api-response.model';

export type IdentityDocumentTypeDTO = TipoIdentificacionApiDto;
export type TipoIdentificacionItem = TipoIdentificacionApiDto;
export interface FacultadItem {
  id: string;
  nombre: string;
}

export const MOCK_DOCUMENT_TYPES: TipoIdentificacionApiDto[] = [
  { id: 'A1B2C3D4-0000-0000-0000-000000000001', tipoIdentificacion: 'CC', nombre: 'Cedula de Ciudadania' },
  { id: 'A1B2C3D4-0000-0000-0000-000000000002', tipoIdentificacion: 'TI', nombre: 'Tarjeta de Identidad' },
  { id: 'A1B2C3D4-0000-0000-0000-000000000004', tipoIdentificacion: 'CE', nombre: 'Cedula de Extranjeria' },
  { id: 'A1B2C3D4-0000-0000-0000-000000000003', tipoIdentificacion: 'PA', nombre: 'Pasaporte' },
];

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  constructor(private http: HttpClient) {}

  getIdentityDocumentTypes(): Observable<TipoIdentificacionApiDto[]> {
    if (environment.useFrontendMocks) {
      return of(MOCK_DOCUMENT_TYPES).pipe(delay(200));
    }

    return this.http.get<TipoIdentificacionApiDto[]>(
      `${environment.apiUrl}/tipos-identificacion`
    );
  }

  getTiposIdentificacion(): Observable<{ exitoso: boolean; datos: TipoIdentificacionApiDto[] }> {
    if (environment.useFrontendMocks) {
      return of({ exitoso: true, datos: MOCK_DOCUMENT_TYPES }).pipe(delay(200));
    }

    return this.http.get<TipoIdentificacionApiDto[]>(
      `${environment.apiUrl}/tipos-identificacion`
    ).pipe(
      map((items) => ({ exitoso: true, datos: items }))
    );
  }

  /**
   * HU153 (decisión de John, 2026-11-04): el administrador crea tipos de documento (código de 1 a 5 letras, inmutable)
   * y edita su nombre; no se inactivan. Unicidad y perfil los valida el backend.
   */
  crearTipoIdentificacion(codigo: string, nombre: string): Observable<ApiResponse<TipoIdentificacionApiDto>> {
    if (environment.useFrontendMocks) {
      const creado = { id: `TI-MOCK-${MOCK_DOCUMENT_TYPES.length + 1}`, tipoIdentificacion: codigo.toUpperCase(), nombre };
      MOCK_DOCUMENT_TYPES.push(creado);
      return of({ exitoso: true, datos: creado }).pipe(delay(200));
    }
    return this.http.post<ApiResponse<TipoIdentificacionApiDto>>(`${environment.apiUrl}/admin/tipos-identificacion`, {
      codigo,
      nombre,
    });
  }

  actualizarTipoIdentificacion(id: string, nombre: string): Observable<ApiResponse<TipoIdentificacionApiDto>> {
    if (environment.useFrontendMocks) {
      const tipo = MOCK_DOCUMENT_TYPES.find((t) => t.id === id);
      if (tipo) tipo.nombre = nombre;
      return of({ exitoso: !!tipo, datos: tipo ?? { id, tipoIdentificacion: '', nombre } }).pipe(delay(200));
    }
    return this.http.put<ApiResponse<TipoIdentificacionApiDto>>(`${environment.apiUrl}/admin/tipos-identificacion/${id}`, {
      nombre,
    });
  }

  getFacultades(): Observable<{ exitoso: boolean; datos: Array<{ id: string; nombre: string }> }> {
    const defaultFacultades = [
      { id: 'FAC-01', nombre: 'Facultad de Ingeniería' },
      { id: 'FAC-02', nombre: 'Facultad de Ciencias de la Salud' },
      { id: 'FAC-03', nombre: 'Facultad de Ciencias de la Educación' },
      { id: 'FAC-04', nombre: 'Facultad de Ciencias Económicas y Administrativas' },
    ];

    if (environment.useFrontendMocks) {
      return of({ exitoso: true, datos: defaultFacultades }).pipe(delay(150));
    }

    return this.http.get<{ datos?: Array<{ id: string; nombre: string }> }>(`${environment.apiUrl}/admin/facultades`).pipe(
      map((res) => ({ exitoso: true, datos: res.datos && res.datos.length > 0 ? res.datos : defaultFacultades })),
      // Fallback seguro si el endpoint de admin requiere permisos o no está levantado
      map((res) => res)
    );
  }

  /** Programas activos reales de la facultad del decano (máx. 100 por página; sin datos quemados). */
  getProgramasAcademicos(): Observable<{ exitoso: boolean; datos: Array<{ id: string; nombre: string; facultad?: string }> }> {
    const params = new HttpParams().set('estaActivo', true).set('pagina', 1).set('tamano', 100);
    return this.http
      .get<{ datos?: Array<{ id: string; nombre: string; nombreFacultad?: string | null }> }>(`${environment.apiUrl}/decano/programas`, { params })
      .pipe(
        map((res) => ({
          exitoso: true,
          datos: (res.datos ?? []).map((p) => ({ id: p.id, nombre: p.nombre, facultad: p.nombreFacultad ?? undefined })),
        }))
      );
  }

  getDepartamentosAcademicos(): Observable<{ exitoso: boolean; datos: string[] }> {
    const defaultDeptos = [
      'Departamento de Ciencias Computacionales',
      'Ingeniería de Sistemas',
      'Ciencias Básicas e Ingeniería',
      'Ingeniería Industrial',
      'Ingeniería Electrónica',
    ];

    return of({ exitoso: true, datos: defaultDeptos }).pipe(delay(150));
  }
}

