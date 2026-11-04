import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AsignaturaInstitucionItem,
  ComponenteFormacionItem,
  ConsolidadoGrupoItem,
  DocenteFacultadItem,
  EstudianteInstitucionItem,
  EventoAuditoriaItem,
  FichaUnificadaEstudiante,
  FiltroAuditoria,
  FiltroConsolidado,
  FiltroListado,
  ProgramaCreditosItem,
} from '../models/consultas-transversales.model';
import { parametros } from './dean-facultad.service';

/**
 * HU112/HU128/HU143/HU157: consultas de solo lectura del decano (su facultad) y del administrador (su institución).
 * HU061 (consolidado de asistencia del coordinador y del decano), HU172 (auditoría del administrador) y HU147
 * (componentes de formación para el formulario de asignaturas) siguen el mismo esquema.
 * El backend limita los datos al ámbito del usuario autenticado; los errores se propagan para que la UI los muestre.
 */
@Injectable({ providedIn: 'root' })
export class ConsultasTransversalesService {
  private readonly http = inject(HttpClient);
  private readonly decano = `${environment.apiUrl}/decano`;
  private readonly admin = `${environment.apiUrl}/admin`;
  private readonly coordinador = `${environment.apiUrl}/coordinador`;

  /** HU112: una fila por programa y plan de la facultad, con semestres, asignaturas y suma de créditos. */
  getProgramasCreditos(filtro: FiltroListado): Observable<ApiResponse<ProgramaCreditosItem[]>> {
    return this.listar(`${this.decano}/programas-creditos`, filtro);
  }

  /** HU128: docentes de la facultad con vínculo activo, filtrables por programa. */
  getDocentesFacultad(filtro: FiltroListado): Observable<ApiResponse<DocenteFacultadItem[]>> {
    return this.listar(`${this.decano}/docentes`, filtro);
  }

  /** HU143: el decano busca en su facultad; el administrador, en su institución (con filtro opcional por facultad). */
  buscarAsignaturas(filtro: FiltroListado, comoAdministrador = false): Observable<ApiResponse<AsignaturaInstitucionItem[]>> {
    return this.listar(`${comoAdministrador ? this.admin : this.decano}/asignaturas`, filtro);
  }

  /** HU157: buscador de estudiantes de la institución del administrador. */
  buscarEstudiantes(filtro: FiltroListado): Observable<ApiResponse<EstudianteInstitucionItem[]>> {
    return this.listar(`${this.admin}/estudiantes`, filtro);
  }

  /** HU157: ficha unificada con historial; el decano la ve limitada a su facultad. */
  getHistorialEstudiante(idEstudiante: string, comoAdministrador = false): Observable<ApiResponse<FichaUnificadaEstudiante>> {
    const base = comoAdministrador ? this.admin : this.decano;
    return this.http.get<ApiResponse<FichaUnificadaEstudiante>>(`${base}/estudiantes/${idEstudiante}/historial`);
  }

  /** HU061: una fila por grupo con el consolidado de asistencia; el ámbito lo decide el rol del usuario. */
  getConsolidadoAsistencia(filtro: FiltroConsolidado, comoDecano = false): Observable<ApiResponse<ConsolidadoGrupoItem[]>> {
    return this.listar(`${comoDecano ? this.decano : this.coordinador}/consolidado-asistencia`, filtro);
  }

  /** HU172: rastro de auditoría del administrador, paginado y con rango de fechas. */
  getAuditoria(filtro: FiltroAuditoria): Observable<ApiResponse<EventoAuditoriaItem[]>> {
    return this.listar(`${this.admin}/auditoria`, filtro);
  }

  /** HU147: componentes de formación reales (BAS, INS, ESP) para el formulario de asignaturas. */
  getComponentesFormacion(): Observable<ApiResponse<ComponenteFormacionItem[]>> {
    return this.http.get<ApiResponse<ComponenteFormacionItem[]>>(`${this.coordinador}/componentes-formacion`);
  }

  private listar<T>(url: string, filtro: FiltroListado | FiltroConsolidado | FiltroAuditoria): Observable<ApiResponse<T[]>> {
    return this.http.get<ApiResponse<T[]>>(url, { params: parametros({ ...filtro }) });
  }
}
