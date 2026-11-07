import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModoToma } from '../../../../core/models/toma-asistencia.model';

/** CULM-001 B.2: el docente elige el modo de cada toma (dos tarjetas grandes, tactiles). */
@Component({
  selector: 'app-toma-modo-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-warm-950/70 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Elegir el modo de la toma"
    >
      <div class="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 space-y-5 max-h-full overflow-y-auto">
        <div>
          <h3 class="font-serif font-bold text-xl text-warm-900">¿Cómo tomarás la asistencia?</h3>
          <p class="text-sm text-warm-600">Elige el modo de esta toma. Puedes abrir otra después con un modo distinto.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            data-testid="modo-manual"
            (click)="modoElegido.emit('MANUAL')"
            class="min-h-[44px] text-left rounded-2xl border-2 border-warm-200 hover:border-primary-500 hover:bg-primary-50 p-5 space-y-1 transition-colors"
          >
            <span class="block text-lg font-bold text-warm-900">Manual</span>
            <span class="block text-sm text-warm-600">Marcas presentes, ausentes y excusas en la lista del grupo.</span>
          </button>
          <button
            type="button"
            data-testid="modo-qr"
            (click)="modoElegido.emit('QR')"
            [disabled]="!qrHabilitado()"
            class="min-h-[44px] text-left rounded-2xl border-2 border-warm-200 hover:border-primary-500 hover:bg-primary-50 p-5 space-y-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="block text-lg font-bold text-warm-900">Código QR</span>
            <span class="block text-sm text-warm-600">Proyectas un QR y un PIN; los estudiantes se registran solos desde la red del campus.</span>
          </button>
        </div>
        <button
          type="button"
          data-testid="modo-cancelar"
          (click)="cancelar.emit()"
          class="min-h-[44px] w-full sm:w-auto px-5 rounded-xl border border-warm-300 text-sm font-semibold text-warm-700 hover:bg-warm-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  `,
})
export class TomaModoSelectorComponent {
  readonly qrHabilitado = input<boolean>(true);
  readonly modoElegido = output<ModoToma>();
  readonly cancelar = output<void>();
}
