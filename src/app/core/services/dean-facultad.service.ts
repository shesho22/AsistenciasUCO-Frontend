import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiPageResponse, ApiResponse } from '../models/api-response.model';
import { AsignaturaPlanItem, PlanEstudioItem } from '../models/role-management.model';
import { normalizarAsignaturaPlan } from './coordinator-management.service';
import {
  EstudianteFacultadItem,
  FacultadNodo,
  FichaEstudianteFacultad,
  SesionFacultadItem,
} from '../models/facultad-decano.model';

export type Filtro = Record<string, string | number | boolean | null | undefined>;

/**
 * HU104/HU105/HU108/HU109/HU119/HU145: consultas de solo lectura del decano sobre su facultad. El backend limita los
 * datos a la facultad del decano autenticado; los errores se propagan para que la UI muestre el mensaje.
 */
@Injectable({ providedIn: 'root' })
export class DeanFacultadService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/decano`;

  getEstudiantes(filtro: {
    busqueda?: string | null;
    idPrograma?: string | null;
    estaActivo?: boolean | null;
    pagina: number;
    tamano: number;
  }): Observable<ApiResponse<EstudianteFacultadItem[]>> {
    return this.http.get<ApiResponse<EstudianteFacultadItem[]>>(`${this.base}/estudiantes`, {
      params: parametros(filtro),
    });
  }

  getFichaEstudiante(idEstudiante: string): Observable<ApiResponse<FichaEstudianteFacultad>> {
    return this.http.get<ApiResponse<FichaEstudianteFacultad>>(`${this.base}/estudiantes/${idEstudiante}`);
  }

  getEstructura(): Observable<ApiResponse<FacultadNodo[]>> {
    return this.http.get<ApiResponse<FacultadNodo[]>>(`${this.base}/estructura`);
  }

  /**
   * HU108: malla (asignaturas) de un plan de un programa de la facultad del decano, paginada y filtrada en el servidor
   * (semestre, carácter y búsqueda). Un plan ajeno o inexistente responde 404 (PLA_002).
   */
  getAsignaturasPlan(
    idPlan: string,
    filtro: { semestre?: number | null; caracter?: string | null; busqueda?: string | null; pagina: number; tamano: number }
  ): Observable<ApiPageResponse<AsignaturaPlanItem>> {
    return this.http
      .get<ApiPageResponse<AsignaturaPlanItem>>(`${this.base}/planes-estudio/${idPlan}/asignaturas`, {
        params: parametros({ ...filtro, semestre: filtro.semestre || null }),
      })
      .pipe(map((page) => ({ ...page, elementos: (page.elementos ?? []).map(normalizarAsignaturaPlan) })));
  }

  getSesiones(filtro: {
    desde?: string | null;
    hasta?: string | null;
    idPrograma?: string | null;
    pagina: number;
    tamano: number;
  }): Observable<ApiResponse<SesionFacultadItem[]>> {
    return this.http.get<ApiResponse<SesionFacultadItem[]>>(`${this.base}/sesiones`, { params: parametros(filtro) });
  }
}

/**
 * HU108: los planes de los programas de la facultad (desde la estructura del decano) con la forma que usan las
 * pantallas de planes. Créditos y asignaturas no vienen en la estructura: la malla los calcula.
 */
export function planesDeLaEstructura(facultades: FacultadNodo[]): PlanEstudioItem[] {
  return facultades.flatMap((f) =>
    f.programas.flatMap((p) =>
      p.planes.map(
        (pl): PlanEstudioItem => ({
          id: pl.id,
          codigo: pl.inp != null ? `INP-${pl.inp}` : '',
          nombre: pl.inp != null ? `Plan ${pl.inp}` : 'Plan de estudio',
          anioVigencia: Number(String(pl.inp ?? '').slice(0, 4)) || 0,
          programa: p.nombre,
          facultad: f.nombre,
          totalCreditos: 0,
          totalSemestres: pl.totalSemestres ?? 0,
          totalAsignaturas: 0,
          estado: pl.activo ? 'VIGENTE' : 'INACTIVO',
          descripcion: '',
        })
      )
    )
  );
}

/** Omite los filtros vacios para que el backend aplique sus valores por defecto (tambien lo usan las consultas HU112-HU157). */
export function parametros(filtro: Filtro): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
      params = params.set(clave, String(valor).trim());
    }
  }
  return params;
}
