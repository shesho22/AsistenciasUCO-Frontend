import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * CULM-001 B.2: confirmacion de cierre de toma; los no marcados quedan ausentes (`marcarAusentes = true`).
 * ATA D9: en modo `nueva` confirma abrir una toma nueva, que cierra la abierta en el servidor; con cambios
 * sin guardar no deja confirmar (solo volver a la toma).
 */
@Component({
  selector: 'app-toma-cierre-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-warm-950/70 p-0 sm:p-6"
      role="alertdialog"
      aria-modal="true"
      [attr.aria-label]="modo() === 'nueva' ? 'Confirmar la apertura de una nueva toma' : 'Confirmar el cierre de la toma'"
    >
      <div class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4">
        <h3 class="font-serif font-bold text-lg text-warm-900">{{ titulo() }}</h3>
        <p class="text-sm text-warm-700">{{ mensaje() }}</p>
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            data-testid="cierre-cancelar"
            (click)="cancelar.emit()"
            class="min-h-[44px] px-5 rounded-xl border border-warm-300 text-sm font-semibold text-warm-700 hover:bg-warm-50"
          >
            Seguir en la toma
          </button>
          @if (!bloqueado()) {
          <button
            type="button"
            data-testid="cierre-confirmar"
            (click)="confirmar.emit(true)"
            class="min-h-[44px] px-5 rounded-xl bg-danger-600 text-white text-sm font-semibold hover:bg-danger-700"
          >
            {{ modo() === 'nueva' ? 'Cerrar y abrir nueva toma' : 'Cerrar toma' }}
          </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class TomaCierreDialogComponent {
  readonly numeroToma = input<number>(1);
  readonly modo = input<'cierre' | 'nueva'>('cierre');
  /** Solo en modo `nueva`: la toma abierta tiene marcas sin guardar. */
  readonly sinGuardar = input<boolean>(false);

  protected readonly bloqueado = computed(() => this.modo() === 'nueva' && this.sinGuardar());
  protected readonly titulo = computed(() =>
    this.modo() === 'nueva' ? 'Abrir una nueva toma' : `Cerrar la toma ${this.numeroToma()}`);
  protected readonly mensaje = computed(() => {
    const n = this.numeroToma();
    if (this.modo() === 'cierre') {
      return 'Al cerrar la toma, quienes no estén marcados quedan ausentes. Podrás corregirla mientras la sesión siga abierta.';
    }
    if (this.sinGuardar()) {
      return `La toma ${n} tiene cambios sin guardar. Guárdalos o descártalos antes de abrir una nueva toma.`;
    }
    return `Se cerrará la toma ${n}: quien no tenga marca quedará con falta. Podrás corregirla hasta que termine la sesión.`;
  });
  readonly confirmar = output<boolean>();
  readonly cancelar = output<void>();
}
