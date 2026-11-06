import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse, ApiVoidDataResponse } from '../api/models/api-data-response.model';
import {
  CredencialMatricula,
  CursoMatriculaQr,
  MatriculaGrupoResultado,
  MatriculaQrResultado,
  RegistroMatriculaQrPayload,
  VentanaMatricula,
} from '../models/matricula-qr.model';

/**
 * HU176B: matricula por QR/PIN rotativo. El docente abre, regenera y cierra la ventana (JWT); la validacion y el registro
 * son publicos (sin JWT; la red del campus y el limite de intentos los aplica el backend). Todo texto de error proviene del
 * backend. El token jamas se guarda: ni en storage ni en el estado del servicio.
 */
@Injectable({ providedIn: 'root' })
export class MatriculaQrService {
  private readonly http = inject(HttpClient);

  private get baseGrupos(): string {
    return `${environment.apiUrl}/grupos`;
  }

  abrirVentana(grupoId: string): Observable<VentanaMatricula> {
    return this.http
      .post<ApiDataResponse<VentanaMatricula>>(`${this.baseGrupos}/${encodeURIComponent(grupoId)}/matricula-qr`, {})
      .pipe(map((response) => response.datos));
  }

  /** Genera de inmediato un codigo nuevo (boton "Generar nuevo codigo" y reconexion del SSE). */
  rotarVentana(grupoId: string): Observable<VentanaMatricula> {
    return this.http
      .post<ApiDataResponse<VentanaMatricula>>(`${this.baseGrupos}/${encodeURIComponent(grupoId)}/matricula-qr/rotacion`, {})
      .pipe(map((response) => response.datos));
  }

  cerrarVentana(grupoId: string): Observable<ApiVoidDataResponse> {
    return this.http.delete<ApiVoidDataResponse>(`${this.baseGrupos}/${encodeURIComponent(grupoId)}/matricula-qr`);
  }

  validar(credencial: CredencialMatricula): Observable<CursoMatriculaQr> {
    return this.http
      .post<ApiDataResponse<CursoMatriculaQr>>(`${environment.apiUrl}/public/matricula-qr/validar`, soloCredencial(credencial))
      .pipe(map((response) => response.datos));
  }

  registrar(payload: RegistroMatriculaQrPayload): Observable<MatriculaQrResultado> {
    return this.http
      .post<ApiDataResponse<MatriculaQrResultado>>(`${environment.apiUrl}/public/matricula-qr/registro`, payload)
      .pipe(map((response) => response.datos));
  }

  /** Estudiante con sesion iniciada: se matricula con el PIN (o token) de la ventana. */
  matricularAutenticado(credencial: CredencialMatricula): Observable<MatriculaGrupoResultado> {
    return this.http
      .post<ApiDataResponse<MatriculaGrupoResultado>>(`${environment.apiUrl}/estudiante/matricular-grupo`, soloCredencial(credencial))
      .pipe(map((response) => response.datos));
  }
}

/** Envia solo el campo informado: el backend exige exactamente uno entre token y PIN. */
function soloCredencial(credencial: CredencialMatricula): CredencialMatricula {
  return credencial.token ? { token: credencial.token } : { pin: credencial.pin };
}
