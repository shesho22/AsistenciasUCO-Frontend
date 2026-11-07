import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiDataResponse } from '../api/models/api-data-response.model';
import { ApiMessageResponse } from '../api/models/api-message-response.model';
import { QrToma, RegistroAsistenciaQr } from '../models/asistencia-qr.model';

/** CULM-001 B.2 (HU175 y HU176). Los mensajes de error los entrega el backend; no se traducen aqui. */
@Injectable({ providedIn: 'root' })
export class AsistenciaQrService {
  private readonly http = inject(HttpClient);

  private get api(): string {
    return environment.apiUrl;
  }

  abrirQr(tomaId: string): Observable<ApiDataResponse<QrToma>> {
    return this.http.post<ApiDataResponse<QrToma>>(`${this.api}/tomas/${tomaId}/qr`, null);
  }

  rotarQr(tomaId: string): Observable<ApiDataResponse<QrToma>> {
    return this.http.post<ApiDataResponse<QrToma>>(`${this.api}/tomas/${tomaId}/qr/rotacion`, null);
  }

  cerrarQr(tomaId: string): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.api}/tomas/${tomaId}/qr`);
  }

  registrarPorToken(token: string): Observable<ApiDataResponse<RegistroAsistenciaQr>> {
    return this.http.post<ApiDataResponse<RegistroAsistenciaQr>>(`${this.api}/estudiante/asistencia-qr`, { token });
  }

  registrarPorPin(pin: string): Observable<ApiDataResponse<RegistroAsistenciaQr>> {
    return this.http.post<ApiDataResponse<RegistroAsistenciaQr>>(`${this.api}/estudiante/asistencia-qr`, { pin });
  }
}
