import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EstadoCanalNotificacionDto {
  provider: string;
  sender: string;
  dispatcherEnabled: boolean;
  disponible: boolean;
  host: string;
  port: number;
  username: string;
  tienePasswordConfigurado: boolean;
  fromAddress: string;
  fromName: string;
  starttls: boolean;
  ssl: boolean;
  maxBcc: number;
  ratePerMinute: number;
  ratePerDay: number;
  requireConfirmedEmail: boolean;
  platformUrl: string;
  testModeEnabled: boolean;
  testModeRedirectCount: number;
}

export interface MarcadorPlantillaDto {
  marcador: string;
  descripcion: string;
  ejemplo: string;
  obligatorio: boolean;
}

export interface VersionPlantillaDto {
  id: string;
  tipo: string;
  idioma: string;
  version: number;
  asunto: string;
  cuerpo: string;
  activa: boolean;
  creadoEn: string;
}

export interface TipoPlantillaAdminDto {
  tipo: string;
  idioma: string;
  versionActiva: number;
  asuntoActivo: string;
  cuerpoActivo: string;
  actualizadoEn: string;
  marcadores: MarcadorPlantillaDto[];
  versiones: VersionPlantillaDto[];
}

export interface VistaPreviaPlantillaRequest {
  asunto: string;
  cuerpo: string;
}

export interface VistaPreviaPlantillaResponse {
  asunto: string;
  textoPlano: string;
  html: string;
  origen: string;
}

export interface NotificacionSalienteAdminDto {
  id: string;
  tipo: string;
  asunto: string;
  codigoEstado: string;
  nombreEstado: string;
  esTerminal: boolean;
  cantidadDestinatarios: number;
  intentos: number;
  creadoEn: string;
  proximoIntentoEn?: string | null;
  entregadoEn?: string | null;
  codigoError?: string | null;
  detalleError?: string | null;
  idCorrelacion: string;
}

export interface ResumenColaNotificacionDto {
  pendientes: number;
  reservadas: number;
  entregadas: number;
  fallidasReintentables: number;
  fallidasDefinitivas: number;
}

export interface ConsultaColaNotificacionesResponse {
  elementos: NotificacionSalienteAdminDto[];
  numeroPagina: number;
  tamanoPagina: number;
  totalElementos: number;
  totalPaginas: number;
  resumen: ResumenColaNotificacionDto;
}

@Injectable({
  providedIn: 'root',
})
export class AdminEmailNotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/notificaciones`;

  obtenerEstadoCanal(): Observable<EstadoCanalNotificacionDto> {
    return this.http
      .get<{ exitoso: boolean; datos: EstadoCanalNotificacionDto }>(`${this.baseUrl}/estado-canal`)
      .pipe(map((res) => res.datos));
  }

  listarPlantillas(idioma = 'es'): Observable<TipoPlantillaAdminDto[]> {
    const params = new HttpParams().set('idioma', idioma);
    return this.http
      .get<{ exitoso: boolean; datos: TipoPlantillaAdminDto[] }>(`${this.baseUrl}/plantillas`, { params })
      .pipe(map((res) => res.datos));
  }

  guardarVersionPlantilla(
    tipo: string,
    payload: { idioma?: string; asunto: string; cuerpo: string }
  ): Observable<VersionPlantillaDto> {
    return this.http
      .post<{ exitoso: boolean; datos: VersionPlantillaDto }>(
        `${this.baseUrl}/plantillas/${encodeURIComponent(tipo)}/versiones`,
        payload
      )
      .pipe(map((res) => res.datos));
  }

  activarVersionPlantilla(
    tipo: string,
    version: number,
    idioma = 'es'
  ): Observable<{ exitoso: boolean; mensajeUsuario?: string }> {
    const params = new HttpParams().set('idioma', idioma);
    return this.http.patch<{ exitoso: boolean; mensajeUsuario?: string }>(
      `${this.baseUrl}/plantillas/${encodeURIComponent(tipo)}/versiones/${version}/activar`,
      {},
      { params }
    );
  }

  generarVistaPrevia(
    tipo: string,
    payload: VistaPreviaPlantillaRequest
  ): Observable<VistaPreviaPlantillaResponse> {
    return this.http
      .post<{ exitoso: boolean; datos: VistaPreviaPlantillaResponse }>(
        `${this.baseUrl}/plantillas/${encodeURIComponent(tipo)}/vista-previa`,
        payload
      )
      .pipe(map((res) => res.datos));
  }

  consultarCola(filtros: {
    estado?: string;
    tipo?: string;
    pagina?: number;
    tamano?: number;
  }): Observable<ConsultaColaNotificacionesResponse> {
    let params = new HttpParams();
    if (filtros.estado && filtros.estado !== 'TODOS') {
      params = params.set('estado', filtros.estado);
    }
    if (filtros.tipo && filtros.tipo !== 'TODOS') {
      params = params.set('tipo', filtros.tipo);
    }
    if (filtros.pagina != null) {
      params = params.set('pagina', filtros.pagina.toString());
    }
    if (filtros.tamano != null) {
      params = params.set('tamano', filtros.tamano.toString());
    }

    return this.http
      .get<{ exitoso: boolean; datos: ConsultaColaNotificacionesResponse }>(`${this.baseUrl}/cola`, { params })
      .pipe(map((res) => res.datos));
  }

  reintentarNotificacion(id: string): Observable<{ exitoso: boolean; mensajeUsuario?: string }> {
    return this.http.post<{ exitoso: boolean; mensajeUsuario?: string }>(
      `${this.baseUrl}/cola/${encodeURIComponent(id)}/reintentar`,
      {}
    );
  }

  enviarCorreoPrueba(payload: {
    tipo?: string;
    correoDestino?: string;
  }): Observable<{ exitoso: boolean; mensajeUsuario?: string }> {
    return this.http.post<{ exitoso: boolean; mensajeUsuario?: string }>(
      `${this.baseUrl}/prueba`,
      payload
    );
  }
}
