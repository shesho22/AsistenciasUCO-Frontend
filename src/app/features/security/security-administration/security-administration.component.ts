import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  InjectionToken,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { ComponentesExternosService } from '../../../core/services/componentes-externos.service';
import { hasAnyRole } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';
import { readDesignToken } from '../../../shared/utils/design-tokens';

interface SecurityUiOptions {
  applicationId: string;
  applicationName: string;
  apiBaseUrl: string;
  allowApplicationLifecycleManagement?: boolean;
  theme?: {
    accent?: string;
    fontFamily?: string;
    radius?: string;
  };
}

interface SecurityUiHandle {
  unmount: () => void;
}

interface SecurityUiModule {
  mount: (container: Element, options: SecurityUiOptions) => SecurityUiHandle;
}

export interface SecurityUiModuleLoader {
  load: (url: string) => Promise<SecurityUiModule>;
}

/**
 * El bundle publicado de Security UI (`security-administration.js`) referencia `process.env.NODE_ENV` y su build no lo
 * reemplaza, asi que en el navegador `import()` falla con "process is not defined". Se define de forma minima y solo si
 * falta; nunca pisa un `process` o un `NODE_ENV` existentes. Solucion provisional hasta que el equipo de seguridad
 * corrija el `vite.config.ts` de security-ui (`define: { 'process.env.NODE_ENV': '"production"' }`).
 */
export function ensureBrowserProcessShim(): void {
  const global = globalThis as { process?: { env?: Record<string, string> } };
  global.process ??= {};
  global.process.env ??= {};
  global.process.env['NODE_ENV'] ??= 'production';
}

export const SECURITY_UI_LOADER = new InjectionToken<SecurityUiModuleLoader>('SECURITY_UI_LOADER', {
  providedIn: 'root',
  factory: () => ({
    load: (url: string) => {
      ensureBrowserProcessShim();
      return import(/* @vite-ignore */ url) as Promise<SecurityUiModule>;
    },
  }),
});

type ViewState = 'loading' | 'ready' | 'error' | 'unauthorized' | 'forbidden';

@Component({
    selector: 'app-security-administration',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="rounded-2xl border border-warm-200 bg-white p-6 shadow-warm-sm">
      <div class="mb-5">
        <p class="text-xs font-bold uppercase tracking-wider text-primary-700">Security Baseline</p>
        <h1 class="mt-1 font-serif text-2xl font-bold text-warm-900">Administración de seguridad</h1>
        <p class="mt-2 text-sm text-warm-600">
          Recursos, roles, perfiles y asignaciones de <strong>AsistenciasUCO</strong>.
        </p>
      </div>

      @if (state() === 'loading') {
        <p class="rounded-xl bg-warm-50 p-4 text-sm text-warm-700" role="status">
          Validando la sesión BFF y cargando Security UI…
        </p>
      }

      @if (state() === 'unauthorized' || state() === 'forbidden' || state() === 'error') {
        <div class="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800" role="alert">
          <p>{{ message() }}</p>
          <div class="mt-3 flex gap-2">
            @if (state() === 'unauthorized') {
              <button type="button" class="rounded-lg bg-primary-700 px-3 py-2 font-semibold text-white" (click)="signInBff()">
                Iniciar sesión Security Baseline
              </button>
            }
            <button type="button" class="rounded-lg border border-danger-300 px-3 py-2 font-semibold" (click)="load()">
              Reintentar
            </button>
          </div>
        </div>
      }

      <div #mountPoint class="mt-4 max-w-full overflow-x-auto" [hidden]="state() !== 'ready'"></div>
    </section>
  `
})
export class SecurityAdministrationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mountPoint', { static: true }) private readonly mountPoint?: ElementRef<HTMLElement>;

  readonly state = signal<ViewState>('loading');
  readonly message = signal('');
  private handle?: SecurityUiHandle;
  private loadInFlight?: Promise<void>;
  private readonly authService = inject(AuthService);
  private readonly externos = inject(ComponentesExternosService);
  private readonly securityUiLoader = inject(SECURITY_UI_LOADER);

  ngAfterViewInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.handle?.unmount();
    this.handle = undefined;
  }

  async load(): Promise<void> {
    if (this.loadInFlight) return this.loadInFlight;
    this.loadInFlight = this.loadInternal().finally(() => {
      this.loadInFlight = undefined;
    });
    return this.loadInFlight;
  }

  signInBff(): void {
    this.authService.startBaselineLogin('/app/admin/seguridad');
  }

  private async loadInternal(): Promise<void> {
    this.handle?.unmount();
    this.handle = undefined;
    this.state.set('loading');
    this.message.set('');

    if (!this.authService.isBaselineMode()) {
      this.fail('forbidden', 'Esta pantalla requiere SECURITY_PROVIDER=baseline. El modo legacy se conserva para compatibilidad, pero no monta Security UI.');
      return;
    }

    const user = this.authService.currentUser();
    if (!user || !hasAnyRole(user, ['ADMINISTRADOR', 'ADMIN'])) {
      this.fail('forbidden', 'La ruta está reservada a ADMINISTRADOR. La interfaz no concede permisos por sí sola.');
      return;
    }

    let sessionResponse: Response;
    try {
      sessionResponse = await fetch(`${environment.security.baselineUrl}/api/v1/session`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } catch {
      this.fail('error', 'No fue posible contactar la sesión BFF del servicio de seguridad. Intenta de nuevo más tarde o avisa al administrador técnico.');
      return;
    }

    if (sessionResponse.status === 401) {
      this.fail('unauthorized', 'La sesión BFF de Security Baseline no está activa. Inicia sesión para continuar.');
      return;
    }
    if (sessionResponse.status === 403) {
      this.fail('forbidden', 'El PDP rechazó la sesión BFF para esta operación administrativa.');
      return;
    }
    if (!sessionResponse.ok) {
      this.fail('error', `El PDP no pudo validar la sesión BFF (HTTP ${sessionResponse.status}).`);
      return;
    }

    try {
      const module = await this.securityUiLoader.load(`${environment.security.securityUiUrl}/security-administration.js`);
      if (typeof module.mount !== 'function') {
        throw new TypeError('El bundle no expone mount().');
      }
      const mountPoint = this.mountPoint?.nativeElement;
      if (!mountPoint) throw new Error('No existe el contenedor de montaje.');
      this.handle = module.mount(mountPoint, {
        applicationId: environment.security.applicationId,
        applicationName: 'AsistenciasUCO',
        apiBaseUrl: environment.security.baselineUrl,
        allowApplicationLifecycleManagement: false,
        theme: {
          accent: readDesignToken('--color-primary-700'),
          fontFamily: readDesignToken('--font-sans'),
          radius: '12px',
        },
      });
      this.state.set('ready');
      this.externos.marcarDisponible('seguridad');
    } catch {
      this.fail('error', 'No se pudo cargar Security UI. El servicio de administración de seguridad no está disponible por ahora; avisa al administrador técnico.');
    }
  }

  private fail(state: Exclude<ViewState, 'loading' | 'ready'>, message: string): void {
    // Solo un fallo de conectividad (servicio externo que no responde) oculta la entrada del menu.
    if (state === 'error') this.externos.marcarNoDisponible('seguridad');
    this.state.set(state);
    this.message.set(message);
  }
}
