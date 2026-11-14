import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountAccess } from '../models/account-access.model';
import { ApiResponse } from '../models/api-response.model';

/**
 * Estado de acceso y reconciliación de las cuentas que el usuario autenticado registra (Decano, Coordinador, Docente).
 * El correo viaja en el cuerpo, nunca en la URL. La reconciliación es idempotente y la ejecuta el backend: la SPA no
 * invoca ninguna API de administración del PDP.
 */
@Injectable({ providedIn: 'root' })
export class AccountAccessService {
  private http = inject(HttpClient);


  consult(correo: string): Observable<ApiResponse<AccountAccess>> {
    return this.http.post<ApiResponse<AccountAccess>>(`${environment.apiUrl}/identidad/cuentas/acceso/consultas`, { correo });
  }

  reconcile(correo: string): Observable<ApiResponse<AccountAccess>> {
    return this.http.post<ApiResponse<AccountAccess>>(`${environment.apiUrl}/identidad/cuentas/acceso/reconciliaciones`, { correo });
  }
}
