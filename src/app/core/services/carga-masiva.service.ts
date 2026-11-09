import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import {
  DestinoCargaMasiva,
  ResultadoCargaDTO,
  ResultadoValidacionCargaDTO,
} from '../models/carga-masiva.model';

/**
 * HU171 (CULM-001 D.5): Servicio para la carga masiva CSV de roles no estudiantes
 * (Coordinador -> Docentes, Decano -> Coordinadores, Administrador -> Decanos).
 */
@Injectable({ providedIn: 'root' })
export class CargaMasivaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  private resolverRutaRol(destino: DestinoCargaMasiva): string {
    switch (destino) {
      case 'DOCENTE':
        return 'coordinador';
      case 'COORDINADOR':
        return 'decano';
      case 'DECANO':
        return 'admin';
    }
  }

  descargarPlantilla(destino: DestinoCargaMasiva): Observable<Blob> {
    const rolRuta = this.resolverRutaRol(destino);
    return this.http.get(`${this.api}/${rolRuta}/cargas/plantilla`, {
      responseType: 'blob',
    });
  }

  validarArchivo(
    destino: DestinoCargaMasiva,
    archivo: File
  ): Observable<ApiDataResponse<ResultadoValidacionCargaDTO>> {
    const rolRuta = this.resolverRutaRol(destino);
    const formData = new FormData();
    formData.append('archivo', archivo);

    return this.http.post<ApiDataResponse<ResultadoValidacionCargaDTO>>(
      `${this.api}/${rolRuta}/cargas/validacion`,
      formData
    );
  }

  ejecutarCarga(
    destino: DestinoCargaMasiva,
    archivo: File,
    huella: string
  ): Observable<ApiDataResponse<ResultadoCargaDTO>> {
    const rolRuta = this.resolverRutaRol(destino);
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('huella', huella);

    return this.http.post<ApiDataResponse<ResultadoCargaDTO>>(
      `${this.api}/${rolRuta}/cargas`,
      formData
    );
  }
}
