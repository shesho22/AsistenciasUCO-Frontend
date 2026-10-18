import { Component, AfterViewInit, OnDestroy, signal, inject, ElementRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-security',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
            <span>Gobierno & Seguridad UCO</span>
            <span>/</span>
            <span class="text-primary-700">Security Baseline</span>
          </div>
          <h1 class="text-2xl font-serif font-bold text-warm-900">Administración de Seguridad y Accesos</h1>
          <p class="text-sm text-warm-600">
            Control centralizado de aplicaciones, recursos protegidos, roles, perfiles y asignaciones (Security UI).
          </p>
        </div>
      </div>

      @if (loading()) {
        <div class="p-8 text-center bg-white rounded-2xl border border-warm-200 shadow-sm">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-2"></div>
          <p class="text-xs text-warm-600 font-medium">Cargando consola de seguridad institucional...</p>
        </div>
      }

      @if (error()) {
        <div class="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>{{ error() }}</span>
          </div>
          <button
            type="button"
            (click)="loadSecurityUi()"
            class="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 rounded-lg text-amber-900 font-bold text-xs cursor-pointer transition-colors shrink-0"
          >
            Reintentar
          </button>
        </div>
      }

      <div class="bg-white rounded-2xl border border-warm-200 shadow-sm p-4 min-h-[700px]">
        <div #securityContainer id="security-ui" class="w-full h-full"></div>
      </div>
    </div>
  `
})
export class AdminSecurityComponent implements AfterViewInit, OnDestroy {
  @ViewChild('securityContainer') containerRef!: ElementRef<HTMLDivElement>;

  private authService = inject(AuthService);

  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  async ngAfterViewInit(): Promise<void> {
    await this.loadSecurityUi();
  }

  async loadSecurityUi(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      if (typeof (window as any).process === 'undefined') {
        (window as any).process = { env: { NODE_ENV: 'production' } };
      }
      const securityUiUrl = environment.securityUiUrl;
      // Carga dinámica del bundle ESM del microfrontend Security UI
      const remote = await (Function(`return import('${securityUiUrl}')`)());

      if (remote && typeof remote.mount === 'function' && this.containerRef?.nativeElement) {
        remote.mount(this.containerRef.nativeElement, {
          applicationName: environment.applicationName,
          apiBaseUrl: environment.pdpUrl,
          allowApplicationLifecycleManagement: false,
          theme: {
            accent: '#087443',
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            radius: '12px',
          },
        });
      }
      this.loading.set(false);
    } catch (err: any) {
      console.warn('Microfrontend Security UI no disponible aún:', err);
      this.loading.set(false);
      this.error.set(
        'El microfrontend Security UI en ' +
        environment.securityUiUrl +
        ' no respondió (' + (err?.message || 'Error desconocido') + '). Haz clic en "Reintentar" o verifica que el servicio esté activo en el puerto 5175.'
      );
    }
  }

  ngOnDestroy(): void {
    if (this.containerRef?.nativeElement) {
      this.containerRef.nativeElement.innerHTML = '';
    }
  }
}
