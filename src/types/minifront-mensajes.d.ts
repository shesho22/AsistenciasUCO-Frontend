/** El paquete minifront-mensajes (equipo de mensajería) se publica sin tipos: se declara solo lo que la SPA usa. */
declare module 'minifront-mensajes' {
  export interface MessageAdminOptions {
    apiBaseUrl?: string;
    applicationName?: string;
    environmentName?: string;
    loginUrl?: string;
    title?: string;
    lockContext?: boolean;
    lockEnvironment?: boolean;
    allowApplicationCreation?: boolean;
    pageSize?: number;
    theme?: 'auto' | 'none' | { accent?: string; radius?: string; background?: string; text?: string };
    onEvent?: (name: string, detail?: unknown) => void;
    onUnauthorized?: (error: unknown) => void;
  }

  export interface MessageAdminHandle {
    unmount: () => void;
    refresh: () => void;
    reload: () => void;
    refreshTheme: () => void;
  }

  export function mount(element: Element, options?: MessageAdminOptions): MessageAdminHandle;

  /** Cliente de mensajes para tiempo de ejecución (ruta pública; nunca lanza: si falla devuelve el respaldo). */
  export interface MessageClientOptions {
    apiBaseUrl?: string;
    applicationId?: string;
    environmentId?: string;
    language?: string;
    timeoutMs?: number;
    cacheTtlMs?: number;
    fallbacks?: Record<string, string | { title?: string; content?: string }>;
    onError?: (error: unknown, code: string) => void;
  }

  export interface MessageClientResult {
    code: string;
    title: string;
    content: string;
    source: 'api' | 'cache' | 'fallback';
    error?: unknown;
  }

  export interface MessageClient {
    get(code: string, vars?: Record<string, string | number>): Promise<MessageClientResult>;
  }

  export function createMessageClient(options?: MessageClientOptions): MessageClient;
}
