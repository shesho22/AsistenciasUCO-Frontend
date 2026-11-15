import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { esCodigoMensajeUi } from './mensajes-ui';
import { CODIGOS_REMOTOS_MENSAJES_UI } from './mensajes-ui-codigos-remotos';
import { registrarSolicitudCatalogo, registrarTextoCatalogo } from './catalogo-mensajes-ui';

/** Lo que la SPA usa del cliente de mensajes del minifront (`createMessageClient`). */
export interface ClienteMensajesUi {
  get(codigo: string): Promise<{ content: string; source: 'api' | 'cache' | 'fallback' }>;
}

export interface OpcionesClienteMensajesUi {
  apiBaseUrl: string;
  applicationId: string;
  environmentId: string;
  onError?: (error: unknown, codigo: string) => void;
}

/** Carga diferida del cliente oficial de MessageUcoLab; se exporta para sustituirla en las pruebas. */
export const fabricaClienteMensajesUi = {
  crear: async (opciones: OpcionesClienteMensajesUi): Promise<ClienteMensajesUi> => {
    const { createMessageClient } = await import('minifront-mensajes');
    return createMessageClient(opciones);
  },
};

/**
 * VAL MSG-06: lleva los textos de la interfaz al catálogo de MessageUcoLab con el cliente oficial del minifront
 * (Guía de integración de MessageUcoLab, pasos 9.5 y 9.8): cada texto se pide por su código remoto en la ruta pública
 * (`GET /messageucolab/v1/public/messages/MSG_UI###`, sin sesión), solo cuando la interfaz lo necesita, y el cliente lo
 * guarda en caché. Si MessageUcoLab no responde, el cliente devuelve el respaldo y la SPA conserva el texto local.
 *
 * Sin `MESSAGEUCOLAB_APPLICATION_ID` y `MESSAGEUCOLAB_ENVIRONMENT_ID` en `env.js` no se pide nada (textos locales).
 */
@Injectable({ providedIn: 'root' })
export class CatalogoMensajesUiService {
  private cliente: Promise<ClienteMensajesUi> | null = null;
  private readonly pedidos = new Set<string>();

  /** Activa la lectura del catálogo si la aplicación y el ambiente de MessageUcoLab están configurados. */
  iniciar(): boolean {
    const { apiBaseUrl, applicationId, environmentId } = environment.messages;
    if (!applicationId || !environmentId) {
      registrarSolicitudCatalogo(null);
      return false;
    }
    registrarSolicitudCatalogo((codigo) => this.pedir(codigo, { apiBaseUrl, applicationId, environmentId }));
    return true;
  }

  private pedir(codigo: string, opciones: OpcionesClienteMensajesUi): void {
    if (this.pedidos.has(codigo) || !esCodigoMensajeUi(codigo)) {
      return;
    }
    this.pedidos.add(codigo);
    const remoto = CODIGOS_REMOTOS_MENSAJES_UI[codigo];
    void this.obtenerCliente(opciones)
      .then((cliente) => cliente.get(remoto))
      .then((mensaje) => {
        if (mensaje.source !== 'fallback') {
          registrarTextoCatalogo(codigo, mensaje.content);
        }
      })
      .catch(() => {
        // Sin cliente (descarga fallida): se conserva el texto local; no se reintenta en esta sesión.
      });
  }

  private obtenerCliente(opciones: OpcionesClienteMensajesUi): Promise<ClienteMensajesUi> {
    this.cliente ??= fabricaClienteMensajesUi.crear({
      ...opciones,
      onError: (error, codigo) => console.warn(`[MensajesUi] ${codigo}: se usa el texto local.`, error),
    });
    return this.cliente;
  }
}
