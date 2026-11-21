import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import {
  CatalogoEstadoResultado,
  CatalogoIdResultado,
  CategoriaJustificacionAdmin,
  CategoriaJustificacionCrear,
  CategoriaJustificacionEditar,
  ListaCatalogoAdmin,
  MotivoCancelacionCrear,
  MotivoCancelacionEditar,
  MotivoCancelacionSesionAdmin,
} from '../models/catalogo-admin.model';

/**
 * Catálogos administrables (solo ADMINISTRADOR): categorías de justificación y motivos de cancelación de sesión.
 * Los errores del backend (CTG_001..CTG_006, SEC_001, GEN_002) se propagan sin traducir: la pantalla muestra su `message`.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogosService {
  private readonly http = inject(HttpClient);

  private get rutaCategorias(): string {
    return `${environment.apiUrl}/admin/categorias-justificacion`;
  }

  private get rutaMotivos(): string {
    return `${environment.apiUrl}/admin/motivos-cancelacion-sesion`;
  }

  listarCategorias(): Observable<ListaCatalogoAdmin<CategoriaJustificacionAdmin>> {
    return this.http.get<ListaCatalogoAdmin<CategoriaJustificacionAdmin>>(this.rutaCategorias);
  }

  crearCategoria(body: CategoriaJustificacionCrear): Observable<ApiDataResponse<CatalogoIdResultado>> {
    return this.http.post<ApiDataResponse<CatalogoIdResultado>>(this.rutaCategorias, body);
  }

  editarCategoria(id: string, body: CategoriaJustificacionEditar): Observable<ApiDataResponse<CatalogoIdResultado>> {
    return this.http.put<ApiDataResponse<CatalogoIdResultado>>(`${this.rutaCategorias}/${id}`, body);
  }

  cambiarEstadoCategoria(id: string, estaActivo: boolean): Observable<ApiDataResponse<CatalogoEstadoResultado>> {
    return this.http.patch<ApiDataResponse<CatalogoEstadoResultado>>(`${this.rutaCategorias}/${id}/estado`, { estaActivo });
  }

  listarMotivos(): Observable<ListaCatalogoAdmin<MotivoCancelacionSesionAdmin>> {
    return this.http.get<ListaCatalogoAdmin<MotivoCancelacionSesionAdmin>>(this.rutaMotivos);
  }

  crearMotivo(body: MotivoCancelacionCrear): Observable<ApiDataResponse<CatalogoIdResultado>> {
    return this.http.post<ApiDataResponse<CatalogoIdResultado>>(this.rutaMotivos, body);
  }

  editarMotivo(id: string, body: MotivoCancelacionEditar): Observable<ApiDataResponse<CatalogoIdResultado>> {
    return this.http.put<ApiDataResponse<CatalogoIdResultado>>(`${this.rutaMotivos}/${id}`, body);
  }

  cambiarEstadoMotivo(id: string, estaActivo: boolean): Observable<ApiDataResponse<CatalogoEstadoResultado>> {
    return this.http.patch<ApiDataResponse<CatalogoEstadoResultado>>(`${this.rutaMotivos}/${id}/estado`, { estaActivo });
  }
}
