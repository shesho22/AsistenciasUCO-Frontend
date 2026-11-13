import { InjectionToken } from '@angular/core';

/**
 * Contrato del micro frontend `parametros-administration.js` del equipo del Catálogo de Parámetros (versión 1.0.0;
 * GUIA-LIBERACION §8). El módulo se descarga en tiempo de ejecución y se publica sin tipos: se declara solo lo que la SPA
 * usa, comprobado contra el bundle.
 */
export interface ParametrosAdminOptions {
  /** UUID de la aplicación en el Catálogo (no el de Seguridad ni el de Mensajes). */
  applicationId: string;
  /** Base de la API del Catálogo; HTTPS, o HTTP solo en localhost. */
  apiBaseUrl: string;
  /**
   * Refresco periódico en milisegundos: 0 lo desactiva; si no es 0 debe estar entre 30000 y 86400000. Si se omite el
   * bundle usa 60000 (sondeo). AsistenciasUCO siempre envía 0: la actualización llega por los eventos SSE del Catálogo.
   */
  refreshIntervalMs: number;
  theme?: { accent?: string; fontFamily?: string; radius?: string };
  /** Se invoca sin argumentos cuando la API del Catálogo responde 401. */
  onAuthenticationRequired?: () => void;
  onChange?: (cambio: unknown) => void;
}

export interface ParametrosAdminHandle {
  readonly element: HTMLElement;
  /** Se resuelve tras la primera carga; se rechaza si el micro frontend no pudo iniciar. */
  readonly ready: Promise<void>;
  refresh: () => Promise<void>;
  unmount: () => void;
}

export interface ParametrosAdminModule {
  /** Lanza TypeError si las opciones no son válidas (UUID, apiBaseUrl, refreshIntervalMs, callbacks). */
  mount: (element: HTMLElement, options: ParametrosAdminOptions) => ParametrosAdminHandle;
  readonly PARAMETROS_UI_VERSION?: string;
}

export type ParametrosAdminLoader = (url: string) => Promise<ParametrosAdminModule>;

/**
 * Carga del módulo ESM remoto. Se inyecta para poder sustituirlo en las pruebas. El import es dinámico con URL de
 * runtime: los comentarios evitan que el empaquetador intente resolverlo en la compilación.
 */
export const PARAMETROS_ADMIN_LOADER = new InjectionToken<ParametrosAdminLoader>('PARAMETROS_ADMIN_LOADER', {
  providedIn: 'root',
  factory: () => (url: string) =>
    import(/* @vite-ignore */ /* webpackIgnore: true */ url) as Promise<ParametrosAdminModule>,
});
