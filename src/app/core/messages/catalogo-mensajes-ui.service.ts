import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../interceptors/error.interceptor';
import { esCodigoMensajeUi } from './mensajes-ui';
import { CODIGOS_REMOTOS_MENSAJES_UI } from './mensajes-ui-codigos-remotos';
import { registrarSolicitudCatalogo, registrarTextoCatalogo } from './catalogo-mensajes-ui';

/** Respuesta de `GET /public/mensajes-interfaz/{codigo}` (`ApiDataResponse<MensajeInterfazResponse>`). */
interface MensajeInterfazRespuesta {
  exitoso: boolean;
  datos: { codigo: string; contenido: string } | null;
}

/**
 * VAL MSG-06 / INT-003 (MessageUcoLab 0.3.0, paso 12): lleva los textos de la interfaz al catálogo de mensajes. Cada texto
 * se pide al Backend por su código remoto (`GET /public/mensajes-interfaz/UI###`, sin sesión), solo cuando la interfaz lo
 * necesita y una vez por sesión del navegador; el Backend lo lee de MessageUcoLab con su identidad de servicio y su
 * caché. Si el Backend no lo tiene (404) o no responde, la SPA conserva el texto local, sin avisos al usuario.
 *
 * Con `MENSAJES_UI_DESDE_CATALOGO` distinto de `true` en `env.js` no se pide nada (textos locales).
 */
@Injectable({ providedIn: 'root' })
export class CatalogoMensajesUiService {
  private readonly http = inject(HttpClient);
  private readonly pedidos = new Set<string>();

  /** Activa la lectura del catálogo si está encendida en `env.js`. */
  iniciar(): boolean {
    if (!environment.messages.textosDesdeCatalogo) {
      registrarSolicitudCatalogo(null);
      return false;
    }
    registrarSolicitudCatalogo((codigo) => this.pedir(codigo));
    return true;
  }

  private pedir(codigo: string): void {
    if (this.pedidos.has(codigo) || !esCodigoMensajeUi(codigo)) {
      return;
    }
    this.pedidos.add(codigo);
    const remoto = CODIGOS_REMOTOS_MENSAJES_UI[codigo];
    const url = `${environment.apiUrl}/public/mensajes-interfaz/${encodeURIComponent(remoto)}`;
    void firstValueFrom(
      this.http.get<MensajeInterfazRespuesta>(url, {
        // Un texto que el catálogo no tiene es normal (se usa el local): ningún aviso global por esta petición.
        context: new HttpContext().set(BYPASS_GLOBAL_ERROR_TOAST, true),
      })
    )
      .then((respuesta) => {
        const contenido = respuesta?.datos?.contenido;
        if (respuesta?.exitoso && typeof contenido === 'string') {
          registrarTextoCatalogo(codigo, contenido);
        }
      })
      .catch(() => {
        // Sin texto en el catálogo o Backend sin respuesta: se conserva el texto local; no se reintenta en esta sesión.
      });
  }
}
