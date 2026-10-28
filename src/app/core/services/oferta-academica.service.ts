import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse } from '../api/models/api-list-response.model';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';

/** `datos` de GET /estudiante/oferta-academica (HU008). */
export interface GrupoOferta {
  idGrupo: string;
  codigoGrupo: number | null;
  nombreGrupo: string;
  idAsignatura: string;
  codigoAsignatura: string;
  nombreAsignatura: string;
  nombreDocente: string;
  idPeriodoAcademico: string;
  nombrePeriodoAcademico: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  estadoPeriodo: 'VIGENTE' | 'PROXIMO';
  horario: string | null;
  capacidadMaxima: number;
  estudiantesActivos: number;
  cuposDisponibles: number;
  matriculado: boolean;
  idSolicitudAbierta: string | null;
  estadoSolicitud: 'PENDIENTE' | 'EN_ESPERA' | null;
  /** ESPECIFICA (propia del programa), BASICA o INSTITUCIONAL (transversales). */
  tipoAsignatura: 'ESPECIFICA' | 'BASICA' | 'INSTITUCIONAL' | null;
  transversal: boolean;
}

export interface FiltroOfertaAcademica {
  busqueda?: string;
  pagina: number;
  tamano: number;
}

/**
 * HU008: oferta de grupos (con cupos) del estudiante en periodos vigentes o proximos: especificas de sus programas y
 * transversales (basicas e institucionales) de su institucion. Los errores
 * HTTP se propagan sin toast global: la pantalla presenta el mensaje del backend.
 */
@Injectable({ providedIn: 'root' })
export class OfertaAcademicaService {
  private readonly http = inject(HttpClient);

  consultar(filtro: FiltroOfertaAcademica): Observable<ApiListResponse<GrupoOferta>> {
    let params = new HttpParams().set('pagina', filtro.pagina).set('tamano', filtro.tamano);
    const busqueda = filtro.busqueda?.trim();
    if (busqueda) {
      params = params.set('busqueda', busqueda);
    }
    return this.http.get<ApiListResponse<GrupoOferta>>(`${environment.apiUrl}/estudiante/oferta-academica`, {
      params,
      context: new HttpContext().set(BYPASS_GLOBAL_ERROR_TOAST, true),
    });
  }
}
