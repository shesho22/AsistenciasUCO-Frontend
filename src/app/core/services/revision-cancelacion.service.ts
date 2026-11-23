import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, EMPTY } from 'rxjs';
import { finalize, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DecisionDocentePayload,
  DecisionResolutorPayload,
  FiltroRevisionesCancelacion,
  RevisionCancelacion,
} from '../models/revision-cancelacion.model';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { ApiPageResponse } from '../api/models/api-page-response.model';

@Injectable({
  providedIn: 'root',
})
export class RevisionCancelacionService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly api = environment.apiUrl;

  private buildParams(filtro?: FiltroRevisionesCancelacion): HttpParams {
    let params = new HttpParams();
    if (filtro) {
      if (filtro.soloPendientes !== undefined && filtro.soloPendientes !== null) {
        params = params.set('soloPendientes', String(filtro.soloPendientes));
      }
      const prg = filtro.programaId || filtro.idPrograma;
      if (prg) {
        params = params.set('programaId', prg);
      }
      const grp = filtro.grupoId || filtro.idGrupo;
      if (grp) {
        params = params.set('grupoId', grp);
      }
      if (filtro.estado) {
        params = params.set('estado', filtro.estado);
      }
      if (filtro.pagina !== undefined && filtro.pagina !== null) {
        params = params.set('pagina', String(filtro.pagina));
      }
      if (filtro.tamano !== undefined && filtro.tamano !== null) {
        params = params.set('tamano', String(filtro.tamano));
      }
    }
    return params;
  }

  decidir(id: string, payload: DecisionDocentePayload): Observable<ApiDataResponse<RevisionCancelacion>> {
    if (!this.http) return EMPTY;
    return this.http.patch<ApiDataResponse<RevisionCancelacion>>(
      `${this.api}/docente/revisiones-cancelacion/${id}`,
      payload
    );
  }

  consultarDocente(filtro?: FiltroRevisionesCancelacion): Observable<ApiPageResponse<RevisionCancelacion>> {
    if (!this.http) return EMPTY;
    const params = this.buildParams(filtro);
    return this.http.get<ApiPageResponse<RevisionCancelacion>>(
      `${this.api}/docente/revisiones-cancelacion`,
      { params }
    );
  }

  consultarCoordinador(filtro?: FiltroRevisionesCancelacion): Observable<ApiPageResponse<RevisionCancelacion>> {
    if (!this.http) return EMPTY;
    const params = this.buildParams(filtro);
    return this.http.get<ApiPageResponse<RevisionCancelacion>>(
      `${this.api}/coordinador/revisiones-cancelacion`,
      { params }
    );
  }

  resolverCoordinador(id: string, payload: DecisionResolutorPayload): Observable<ApiDataResponse<RevisionCancelacion>> {
    if (!this.http) return EMPTY;
    return this.http.patch<ApiDataResponse<RevisionCancelacion>>(
      `${this.api}/coordinador/revisiones-cancelacion/${id}`,
      payload
    );
  }

  consultarDecano(filtro?: FiltroRevisionesCancelacion): Observable<ApiPageResponse<RevisionCancelacion>> {
    if (!this.http) return EMPTY;
    const params = this.buildParams(filtro);
    return this.http.get<ApiPageResponse<RevisionCancelacion>>(
      `${this.api}/decano/revisiones-cancelacion`,
      { params }
    );
  }

  /** Conteos en vuelo por rol: el menú y el KPI del panel piden lo mismo a la vez y comparten una sola petición. */
  private readonly conteosEnVuelo = new Map<'DOCENTE' | 'COORDINADOR', Observable<number>>();

  /** Revisiones que el rol debe atender (el decano solo consulta, no tiene pendientes propios). */
  contarPendientes(rol: 'DOCENTE' | 'COORDINADOR'): Observable<number> {
    const enVuelo = this.conteosEnVuelo.get(rol);
    if (enVuelo) return enVuelo;
    const consulta = rol === 'DOCENTE'
      ? this.consultarDocente({ soloPendientes: true, tamano: 1 })
      : this.consultarCoordinador({ soloPendientes: true, tamano: 1 });
    const compartido = consulta.pipe(
      map((res) => Number(res.totalElementos ?? 0)),
      finalize(() => this.conteosEnVuelo.delete(rol)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.conteosEnVuelo.set(rol, compartido);
    return compartido;
  }
}
