import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiPageResponse } from '../api/models/api-page-response.model';
import { paramsSinVacios } from '../api/pagination.util';
import { FiltroSolicitudesSesion, SolicitudSesionItem } from '../models/coordinador-solicitud-sesion.model';

/**
 * ATA D6: el docente consulta, solo en lectura, las solicitudes de sesión extraordinaria de los grupos que dicta.
 * Mismo registro que la bandeja del coordinador; los textos de estado los entrega el backend.
 */
@Injectable({ providedIn: 'root' })
export class DocenteSolicitudesSesionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/docente/sesiones/solicitudes`;

  consultar(filtro: Omit<FiltroSolicitudesSesion, 'programaId'>): Observable<ApiPageResponse<SolicitudSesionItem>> {
    const params = paramsSinVacios({
      soloPendientes: filtro.soloPendientes,
      grupoId: filtro.grupoId,
      pagina: filtro.pagina,
      tamano: filtro.tamano,
    });
    return this.http.get<ApiPageResponse<SolicitudSesionItem>>(this.url, { params });
  }

  /** Total de solicitudes pendientes: se pide una sola fila y solo interesa `totalElementos`. */
  contarPendientes(): Observable<number> {
    return this.consultar({ soloPendientes: true, pagina: 1, tamano: 1 }).pipe(
      map((pagina) => pagina.totalElementos ?? pagina.elementos?.length ?? 0)
    );
  }
}
