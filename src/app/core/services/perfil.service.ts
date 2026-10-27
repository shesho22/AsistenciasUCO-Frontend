import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';

export type RolVinculo = 'ESTUDIANTE' | 'DOCENTE' | 'COORDINADOR' | 'DECANO' | 'ADMINISTRADOR';

/** Vinculo institucional del usuario (HU006): programa, facultad o institucion segun el rol. */
export interface VinculoUsuario {
  rol: RolVinculo;
  idEntidad: string;
  nombreEntidad: string;
  /** Facultad del programa, tipo de vinculacion docente o institucion de la facultad. */
  detalle: string | null;
  estaActivo: boolean;
}

/** `datos` de GET /usuarios/perfil (HU006): perfil propio leido de la DB. Sin contrasena. */
export interface PerfilUsuario {
  idUsuario: string;
  codigoTipoIdentificacion: string | null;
  nombreTipoIdentificacion: string | null;
  numeroIdentificacion: number | null;
  primerNombre: string | null;
  segundoNombre: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  nombreCompleto: string | null;
  correo: string | null;
  correoConfirmado: boolean;
  estaActivo: boolean;
  vinculos: VinculoUsuario[];
}

/**
 * HU006: perfil del usuario autenticado (solo lectura; la edicion sigue pendiente del contrato backend). Los errores
 * HTTP se propagan sin toast global: la pantalla presenta el mensaje.
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);

  consultar(): Observable<ApiDataResponse<PerfilUsuario>> {
    return this.http.get<ApiDataResponse<PerfilUsuario>>(`${environment.apiUrl}/usuarios/perfil`, {
      context: new HttpContext().set(BYPASS_GLOBAL_ERROR_TOAST, true),
    });
  }
}
