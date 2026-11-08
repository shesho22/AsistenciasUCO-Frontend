import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import {
  DestinoCargaMasiva,
  ResultadoCargaDTO,
  ResultadoValidacionCargaDTO,
} from '../models/carga-masiva.model';

@Injectable({ providedIn: 'root' })
export class CargaMasivaService {
  private readonly http = inject(HttpClient);

  descargarPlantilla(destino: DestinoCargaMasiva): Observable<Blob> {
    return throwError(() => new Error('No implementado'));
  }

  validarArchivo(
    destino: DestinoCargaMasiva,
    archivo: File
  ): Observable<ApiDataResponse<ResultadoValidacionCargaDTO>> {
    return throwError(() => new Error('No implementado'));
  }

  ejecutarCarga(
    destino: DestinoCargaMasiva,
    archivo: File,
    huella: string
  ): Observable<ApiDataResponse<ResultadoCargaDTO>> {
    return throwError(() => new Error('No implementado'));
  }
}
