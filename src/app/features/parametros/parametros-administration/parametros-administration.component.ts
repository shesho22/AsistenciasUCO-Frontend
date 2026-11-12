import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { hasAnyRole } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';
import { readDesignToken } from '../../../shared/utils/design-tokens';
import { PARAMETROS_ADMIN_LOADER, ParametrosAdminHandle, ParametrosAdminModule } from './parametros-administration.contract';

export type ParametrosViewState = 'loading' | 'ready' | 'error' | 'unauthorized' | 'forbidden' | 'misconfigured';

/**
 * AGENTS.md prohíbe el sondeo periódico: el refresco por intervalo del micro frontend queda desactivado (0). Los cambios
 * remotos llegan por los eventos SSE que el propio micro frontend abre contra el Catálogo.
 */
export const PARAMETROS_REFRESH_INTERVAL_MS = 0;

const RUTA_POR_DEFECTO = '/app/admin/sistema';

/**
 * Administración de parámetros de AsistenciasUCO: monta el micro frontend `parametros-administration.js` del equipo del
 * Catálogo de Parámetros. Es la única administración de parámetros de la interfaz (decisión del responsable,
 * 2026-11-12); la pantalla propia que editaba `dbo.CatalogoParametro` se retiró.
 */
@Component({
  selector: 'app-parametros-administration',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-2xl border border-warm-200 bg-white p-6 shadow-warm-sm" aria-labelledby="titulo-parametros">
      <div class="mb-5">
        <p class="text-xs font-bold uppercase tracking-wider text-primary-700">Catálogo de Parámetros</p>
        <h2 id="titulo-parametros" class="mt-1 text-xl font-bold text-warm-900">Administración de parámetros</h2>
        <p class="mt-2 text-sm text-warm-600">
          Parámetros de <strong>AsistenciasUCO</strong> por ambiente: consulta, edición y vigencia. Los cambios se reflejan
          aquí en tiempo real.
        </p>
      </div>

      @if (state() === 'loading') {
        <p class="rounded-xl bg-warm-50 p-4 text-sm text-warm-700" role="status">Cargando la administración de parámetros…</p>
      }

      @if (state() !== 'loading' && state() !== 'ready') {
        <div class="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-800" role="alert">
          <p>{{ message() }}</p>
          <div class="mt-3 flex gap-2">
            @if (state() === 'unauthorized') {
              <button type="button" class="min-h-[44px] rounded-lg bg-primary-700 px-3 py-2 font-semibold text-white" (click)="signIn()">
                Iniciar sesión institucional
              </button>
            }
            @if (state() === 'unauthorized' || state() === 'error') {
              <button type="button" class="min-h-[44px] rounded-lg border border-danger-300 px-3 py-2 font-semibold" (click)="load()">
                Reintentar
              </button>
            }
          </div>
        </div>
      }

      <div #mountPoint class="mt-4" [hidden]="state() !== 'ready'"></div>
    </section>
  `,
})
export class ParametrosAdministrationComponent implements AfterViewInit, OnDestroy {
  private readonly mountPoint = viewChild.required<ElementRef<HTMLElement>>('mountPoint');
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly loadModule = inject(PARAMETROS_ADMIN_LOADER);
  private handle?: ParametrosAdminHandle;
  /** Cada carga invalida las anteriores: un import o un ready tardío no pisa un estado más nuevo. */
  private attempt = 0;
  private destroyed = false;

  readonly state = signal<ParametrosViewState>('loading');
  readonly message = signal('');

  ngAfterViewInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.attempt++;
    this.unmountAdmin();
  }

  async load(): Promise<void> {
    const attempt = ++this.attempt;
    this.unmountAdmin();
    this.state.set('loading');
    this.message.set('');

    if (!this.authService.isBaselineMode()) {
      this.fail('forbidden', 'Esta pantalla requiere SECURITY_PROVIDER=baseline: el Catálogo de Parámetros usa la sesión del componente de seguridad.');
      return;
    }
    const user = this.authService.currentUser();
    if (!user || !hasAnyRole(user, ['ADMINISTRADOR', 'ADMIN'])) {
      this.fail('forbidden', 'La administración de parámetros está reservada a ADMINISTRADOR. La interfaz no concede permisos por sí sola.');
      return;
    }
    const applicationId = environment.parametros.applicationId;
    if (!applicationId) {
      this.fail('misconfigured', 'Falta CATALOGO_PARAMETROS_APPLICATION_ID en la configuración de la aplicación (env.js). Avisa al administrador técnico.');
      return;
    }

    let remote: ParametrosAdminModule;
    try {
      remote = await this.loadModule(environment.parametros.uiUrl);
    } catch {
      if (this.isCurrent(attempt)) this.failUnavailable();
      return;
    }
    if (!this.isCurrent(attempt)) return;

    let handle: ParametrosAdminHandle;
    try {
      handle = remote.mount(this.mountPoint().nativeElement, {
        applicationId,
        apiBaseUrl: environment.parametros.apiBaseUrl,
        refreshIntervalMs: PARAMETROS_REFRESH_INTERVAL_MS,
        theme: { accent: readDesignToken('--color-primary-700'), radius: '12px' },
        onAuthenticationRequired: () => this.zone.run(() => this.onAuthenticationRequired(attempt)),
      });
    } catch {
      this.failUnavailable();
      return;
    }
    this.handle = handle;

    try {
      await handle.ready;
    } catch {
      // Un 401 en la carga inicial ya dejó el estado en 'unauthorized': no se reemplaza por un error genérico.
      if (this.isCurrent(attempt) && this.state() === 'loading') {
        this.unmountAdmin();
        this.failUnavailable();
      }
      return;
    }
    if (this.isCurrent(attempt) && this.state() === 'loading') {
      this.state.set('ready');
    }
  }

  signIn(): void {
    const url = this.router.url;
    this.authService.startBaselineLogin(url && url !== '/' ? url : RUTA_POR_DEFECTO);
  }

  private onAuthenticationRequired(attempt: number): void {
    if (!this.isCurrent(attempt)) return;
    this.fail('unauthorized', 'La sesión institucional no está activa o venció. Inicia sesión para continuar.');
    // Se desmonta fuera de la pila del micro frontend para cerrar su conexión de eventos sin interrumpir su manejo del 401.
    queueMicrotask(() => {
      if (this.isCurrent(attempt)) this.unmountAdmin();
    });
  }

  private isCurrent(attempt: number): boolean {
    return !this.destroyed && attempt === this.attempt;
  }

  private unmountAdmin(): void {
    const handle = this.handle;
    this.handle = undefined;
    try {
      handle?.unmount();
    } catch {
      // El micro frontend ya no está en el DOM; no hay nada más que liberar.
    }
  }

  private failUnavailable(): void {
    this.fail('error', 'No se pudo cargar la administración de parámetros. El Catálogo de Parámetros no está disponible por ahora; avisa al administrador técnico.');
  }

  private fail(state: Exclude<ParametrosViewState, 'loading' | 'ready'>, message: string): void {
    this.state.set(state);
    this.message.set(message);
  }
}
