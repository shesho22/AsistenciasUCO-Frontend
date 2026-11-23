import { ChangeDetectionStrategy, Component, computed, inject, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EstadoCanalNotificacionDto,
  TipoPlantillaAdminDto,
} from '../../../core/services/admin-email-notification.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { etiquetaPlantilla } from './admin-email-formato.util';

export interface ResultadoPruebaCorreo {
  exitoso: boolean;
  mensaje: string;
}

/** Estado del servicio de notificaciones y envío de un correo de prueba. */
@Component({
  selector: 'app-admin-email-canal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="space-y-4">
      <div class="superficie p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-warm-100">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-primary-700">Canal de envío</span>
            <h3 class="text-lg font-serif font-bold text-warm-900 mt-0.5">{{ mensaje('UI_ADMIN_EMAIL_MANAGEMENT_014') }}</h3>
          </div>
          <span
            data-testid="servicio-estado"
            [class]="claseEstado()"
            class="px-3 py-1 rounded-full text-xs font-bold border"
          >
            {{ textoEstado() }}
          </span>
        </div>

        @if (servicioNoDisponible(); as aviso) {
          <div role="alert" class="p-4 rounded-xl bg-danger-50 border border-danger-200 text-xs text-danger-900 leading-relaxed" data-testid="servicio-no-disponible">
            <p class="font-bold">{{ mensaje('UI_ADMIN_EMAIL_MANAGEMENT_015') }}</p>
            <p class="mt-0.5" data-testid="servicio-no-disponible-mensaje">{{ aviso }}</p>
            <p class="mt-0.5">{{ mensaje('UI_ADMIN_EMAIL_MANAGEMENT_019') }}</p>
          </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="estado-canal">
          <div class="p-4 rounded-xl bg-warm-50 border border-warm-200">
            <span class="text-[10px] font-bold text-warm-500 uppercase block mb-1">{{ mensaje('UI_ADMIN_EMAIL_MANAGEMENT_014') }}</span>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="w-2.5 h-2.5 rounded-full" [class]="estado()?.canalActivo ? 'bg-success-500' : 'bg-danger-500'"></span>
              <span class="text-xs font-bold" data-testid="canal-activo" [class]="estado()?.canalActivo ? 'text-success-800' : 'text-danger-800'">
                {{ estado()?.canalActivo ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-warm-50 border border-warm-200">
            <span class="text-[10px] font-bold text-warm-500 uppercase block mb-1">Último envío</span>
            <span class="text-sm font-mono font-bold text-warm-900 block" data-testid="canal-ultimo-envio">{{ ultimoEnvio() }}</span>
          </div>

          <div class="p-4 rounded-xl bg-warm-50 border border-warm-200">
            <span class="text-[10px] font-bold text-warm-500 uppercase block mb-1">Último error</span>
            <span class="text-sm font-mono font-bold text-warm-900 block" data-testid="canal-ultimo-error">{{ estado()?.ultimoError || 'Sin errores' }}</span>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-primary-50/60 border border-primary-200 text-xs text-warm-800 leading-relaxed">
          <p>{{ mensaje('UI_ADMIN_EMAIL_MANAGEMENT_016') }}</p>
        </div>
      </div>

      <div class="superficie p-5 space-y-4">
        <div class="pb-3 border-b border-warm-100">
          <h4 class="text-sm font-bold text-warm-900 uppercase tracking-wider">Probar Envío de Correo en Vivo</h4>
          <p class="text-xs text-warm-600 mt-0.5">
            Envía un correo de comprobación por el servicio institucional de notificaciones.
          </p>
        </div>

        <div class="space-y-3">
          <div>
            <label for="correo-prueba-tipo" class="text-xs font-bold text-warm-700 block mb-1">Tipo de Plantilla de Prueba</label>
            <select
              id="correo-prueba-tipo"
              [ngModel]="pruebaTipo()"
              (ngModelChange)="pruebaTipo.set($event)"
              class="w-full text-xs font-semibold py-2 px-3 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              @for (tpl of plantillas(); track tpl.tipo) {
                <option [value]="tpl.tipo">{{ opcionTipo(tpl) }}</option>
              }
            </select>
          </div>

          <div>
            <label for="correo-prueba-destino" class="text-xs font-bold text-warm-700 block mb-1">Correo Electrónico de Destino</label>
            <input
              id="correo-prueba-destino"
              type="email"
              [ngModel]="pruebaCorreoDestino()"
              (ngModelChange)="pruebaCorreoDestino.set($event)"
              placeholder="admin@uco.edu.co"
              class="w-full text-xs py-2 px-3 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span class="text-[10px] text-warm-400 mt-1 block">
              Por defecto se enviará a tu correo de administrador conectado.
            </span>
          </div>

          <div class="pt-2">
            <button
              type="button"
              (click)="enviar.emit()"
              [disabled]="enviando()"
              class="w-full min-h-10 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg class="w-4 h-4" [class.animate-spin]="enviando()" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              <span>{{ enviando() ? 'Enviando correo de prueba...' : 'Enviar Correo de Prueba en Vivo' }}</span>
            </button>
          </div>

          @if (resultado(); as res) {
            <div
              role="status"
              [class]="res.exitoso ? 'bg-success-50 border-success-200 text-success-900' : 'bg-danger-50 border-danger-200 text-danger-900'"
              class="p-3 rounded-xl border text-xs"
            >
              <p class="font-bold">{{ res.exitoso ? '¡Envío Exitoso!' : 'Error de Envío' }}</p>
              <p class="mt-0.5 text-[11px]">{{ res.mensaje }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminEmailCanalComponent {
  private readonly timeZone = inject(SessionTimeZoneService);

  readonly estado = input<EstadoCanalNotificacionDto | null>(null);
  /** Mensaje del backend cuando el servicio de notificaciones no responde; null si responde. */
  readonly servicioNoDisponible = input<string | null>(null);
  readonly plantillas = input<readonly TipoPlantillaAdminDto[]>([]);
  readonly enviando = input<boolean>(false);
  readonly resultado = input<ResultadoPruebaCorreo | null>(null);
  readonly pruebaTipo = model<string>('');
  readonly pruebaCorreoDestino = model<string>('');
  readonly enviar = output<void>();

  readonly mensaje = mensajeUi;

  readonly ultimoEnvio = computed(() => this.timeZone.formatTemporal(this.estado()?.ultimoEnvioUtc));

  readonly textoEstado = computed(() => {
    if (this.servicioNoDisponible()) return mensajeUi('UI_ADMIN_EMAIL_MANAGEMENT_015');
    return this.estado()?.canalActivo ? 'Operativo' : 'Inactivo';
  });

  readonly claseEstado = computed(() => {
    if (this.servicioNoDisponible() || !this.estado()?.canalActivo) {
      return 'bg-danger-100 text-danger-800 border-danger-200';
    }
    return 'bg-success-100 text-success-800 border-success-200';
  });

  opcionTipo(tpl: TipoPlantillaAdminDto): string {
    const etiqueta = etiquetaPlantilla(tpl);
    return etiqueta === tpl.tipo ? tpl.tipo : `${tpl.tipo} — ${etiqueta}`;
  }
}
