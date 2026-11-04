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
}
