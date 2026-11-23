import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { mensajeUi } from '../../../core/messages/mensajes-ui';

/** Estado explícito de una pestaña cuando el servicio de notificaciones no responde (en lugar de un vacío engañoso). */
@Component({
  selector: 'app-admin-email-no-disponible',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="alert"
      class="superficie p-6 flex flex-col items-center text-center gap-3 border border-danger-200 bg-danger-50"
      data-testid="no-disponible"
    >
      <p class="text-sm font-bold text-danger-900">{{ mensaje('UI_ADMIN_EMAIL_MANAGEMENT_015') }}</p>
      <p class="text-xs text-danger-900 leading-relaxed" data-testid="no-disponible-mensaje">{{ aviso() }}</p>
      <button
        type="button"
        (click)="reintentar.emit()"
        data-testid="no-disponible-reintentar"
        class="min-h-10 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-600 outline-none"
      >
        {{ mensaje('UI_ADMIN_EMAIL_MANAGEMENT_020') }}
      </button>
    </div>
  `,
})
export class AdminEmailNoDisponibleComponent {
  /** Mensaje del backend que explica la caída del servicio. */
  readonly aviso = input.required<string>();
  readonly reintentar = output<void>();

  readonly mensaje = mensajeUi;
}
