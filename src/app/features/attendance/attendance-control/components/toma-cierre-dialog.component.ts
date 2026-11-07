import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** CULM-001 B.2: confirmacion de cierre de toma; los no marcados quedan ausentes (`marcarAusentes = true`). */
@Component({
  selector: 'app-toma-cierre-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-warm-950/70 p-0 sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirmar el cierre de la toma"
    >
      <div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4">
        <h3 class="font-serif font-bold text-lg text-warm-900">Cerrar la toma {{ numeroToma() }}</h3>
        <p class="text-sm text-warm-700">
          Al cerrar la toma, los estudiantes no marcados quedan ausentes. Después podrás marcar presentes a quienes
          falten mientras la ventana de la sesión siga abierta.
        </p>
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            data-testid="cierre-cancelar"
            (click)="cancelar.emit()"
            class="min-h-[44px] px-5 rounded-xl border border-warm-300 text-sm font-semibold text-warm-700 hover:bg-warm-50"
          >
            Seguir en la toma
          </button>
          <button
            type="button"
            data-testid="cierre-confirmar"
            (click)="confirmar.emit(true)"
            class="min-h-[44px] px-5 rounded-xl bg-danger-600 text-white text-sm font-semibold hover:bg-danger-700"
          >
            Cerrar toma
          </button>
        </div>
      </div>
    </div>
  `,
})
export class TomaCierreDialogComponent {
  readonly numeroToma = input<number>(1);
  readonly confirmar = output<boolean>();
  readonly cancelar = output<void>();
}
