import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  InjectionToken,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { mount, MessageAdminHandle, MessageAdminOptions } from 'minifront-mensajes';
import { AuthService } from '../../../core/services/auth.service';
import { hasAnyRole } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';

export type MessageAdminMount = (element: Element, options?: MessageAdminOptions) => MessageAdminHandle;

/** Punto de montaje del micro frontend de MessageUcoLab; se inyecta para poder sustituirlo en las pruebas. */
export const MESSAGE_ADMIN_MOUNT = new InjectionToken<MessageAdminMount>('MESSAGE_ADMIN_MOUNT', {
  providedIn: 'root',
  factory: () => mount,
});

type ViewState = 'loading' | 'ready' | 'error' | 'unauthorized' | 'forbidden';

const ROUTE = '/app/admin/mensajes';

@Component({
  selector: 'app-message-administration',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-2xl border border-warm-200 bg-white p-6 shadow-warm-sm">
      <div class="mb-5">
        <p class="text-xs font-bold uppercase tracking-wider text-primary-700">MessageUcoLab</p>
        <h1 class="mt-1 text-2xl font-bold text-warm-900">Administración de mensajes</h1>
        <p class="mt-2 text-sm text-warm-600">
          Catálogo de mensajes institucionales de <strong>AsistenciasUCO</strong>: consulta, edición, traducción e
          importación por Excel.
        </p>
      </div>

      @if (state() === 'loading') {
        <p class="rounded-xl bg-warm-50 p-4 text-sm text-warm-700" role="status">Cargando la administración de mensajes…</p>
      }

      @if (state() === 'unauthorized' || state() === 'forbidden' || state() === 'error') {
        <div class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          <p>{{ message() }}</p>
          <div class="mt-3 flex gap-2">
            @if (state() === 'unauthorized') {
              <button type="button" class="rounded-lg bg-primary-700 px-3 py-2 font-semibold text-white" (click)="signIn()">
                Iniciar sesión institucional
              </button>
            }
            @if (state() !== 'forbidden') {
              <button type="button" class="rounded-lg border border-rose-300 px-3 py-2 font-semibold" (click)="load()">
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
export class MessageAdministrationComponent implements AfterViewInit, OnDestroy {
  private readonly mountPoint = viewChild.required<ElementRef<HTMLElement>>('mountPoint');
  private readonly authService = inject(AuthService);
  private readonly mountAdmin = inject(MESSAGE_ADMIN_MOUNT);
  private handle?: MessageAdminHandle;

  readonly state = signal<ViewState>('loading');
  readonly message = signal('');

  ngAfterViewInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.unmountAdmin();
  }

  load(): void {
    this.unmountAdmin();
    this.state.set('loading');
    this.message.set('');

    if (!this.authService.isBaselineMode()) {
      this.fail('forbidden', 'Esta pantalla requiere SECURITY_PROVIDER=baseline: MessageUcoLab usa la sesión del componente de seguridad.');
      return;
    }

    const user = this.authService.currentUser();
    if (!user || !hasAnyRole(user, ['ADMINISTRADOR', 'ADMIN'])) {
      this.fail('forbidden', 'La ruta está reservada a ADMINISTRADOR. La interfaz no concede permisos por sí sola.');
      return;
    }

    try {
      this.handle = this.mountAdmin(this.mountPoint().nativeElement, {
        apiBaseUrl: environment.messages.apiBaseUrl,
        applicationName: environment.messages.applicationName,
        environmentName: environment.messages.environmentName,
        loginUrl: `${window.location.origin}/login`,
        lockContext: true,
        allowApplicationCreation: false,
        theme: { accent: '#087443', radius: '12px' },
        onUnauthorized: () => this.fail('unauthorized', 'La sesión institucional no está activa o venció. Inicia sesión para continuar.'),
      });
      this.state.set('ready');
    } catch {
      this.fail('error', 'No se pudo cargar la administración de mensajes. Verifica que MessageUcoLab esté activo y que el proxy /messageucolab apunte a su gateway.');
    }
  }

  signIn(): void {
    this.authService.startBaselineLogin(ROUTE);
  }

  private unmountAdmin(): void {
    this.handle?.unmount();
    this.handle = undefined;
  }

  private fail(state: Exclude<ViewState, 'loading' | 'ready'>, message: string): void {
    this.state.set(state);
    this.message.set(message);
  }
}
