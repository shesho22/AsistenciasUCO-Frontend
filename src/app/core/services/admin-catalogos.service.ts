import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoriaJustificacionAdmin, ListaCatalogoAdmin, MotivoCancelacionSesionAdmin } from '../models/catalogo-admin.model';

/**
 * Catálogos predefinidos del sistema (solo ADMINISTRADOR, solo lectura): categorías de justificación y motivos de
 * cancelación de sesión. Los define el sistema; el administrador no los crea ni los modifica.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogosService {
  private readonly http = inject(HttpClient);

  listarCategorias(): Observable<ListaCatalogoAdmin<CategoriaJustificacionAdmin>> {
    return this.http.get<ListaCatalogoAdmin<CategoriaJustificacionAdmin>>(`${environment.apiUrl}/admin/categorias-justificacion`);
  }

  listarMotivos(): Observable<ListaCatalogoAdmin<MotivoCancelacionSesionAdmin>> {
    return this.http.get<ListaCatalogoAdmin<MotivoCancelacionSesionAdmin>>(`${environment.apiUrl}/admin/motivos-cancelacion-sesion`);
  }
}
