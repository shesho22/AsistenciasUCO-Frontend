import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { OBSERVACION_CANCELACION_MAX } from '../../../core/models/coordinador-sesion-cancelacion.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

/**
 * DEC-065 (2): confirmación de la aprobación de una sesión extraordinaria con una observación opcional (máximo 250).
 * El error del backend se muestra tal cual.
 */
@Component({
  selector: 'app-coordinator-aprobar-solicitud-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="'Aprobar sesión ' + nombreSesion()" (closed)="closed.emit()">
      <div class="space-y-4" data-testid="aprobar-solicitud-sesion">
        <p class="text-xs text-warm-600">
          Al aprobarla, la sesión queda disponible para el docente y se notifica a los estudiantes del grupo.
        </p>
        <label class="flex flex-col gap-1 text-xs font-semibold text-warm-700">
          Observación (opcional)
          <textarea
            aria-label="Observación"
            rows="3"
            [value]="observacion()"
            (input)="observacion.set($any($event.target).value)"
            class="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-sm font-normal text-warm-900"
          ></textarea>
        </label>
        <p data-testid="contador-observacion-aprobar" class="text-xs text-right" [class.text-danger-700]="excedida()" [class.text-warm-500]="!excedida()">
          {{ longitud() }}/{{ max }}
        </p>
        @if (errorMensaje(); as mensaje) {
          <p role="alert" data-testid="error-aprobacion" class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3 break-words">{{ mensaje }}</p>
        }
      </div>

      <div modal-footer class="flex items-center gap-3">
        <button type="button" data-accion="cerrar" (click)="closed.emit()" class="min-h-[44px] text-xs px-4 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-100 transition-colors">
          Cerrar
        </button>
        <button
          type="button"
          data-testid="confirmar-aprobacion"
          [disabled]="!puedeConfirmar()"
          (click)="confirmar()"
          class="min-h-[44px] text-xs px-4 rounded-xl font-bold text-white bg-primary-800 hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ enviando() ? 'Aprobando…' : 'Aprobar sesión' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class CoordinatorAprobarSolicitudModalComponent {
  readonly max = OBSERVACION_CANCELACION_MAX;

  readonly isOpen = input<boolean>(false);
  readonly nombreSesion = input<string>('');
  readonly errorMensaje = input<string | null>(null);
  readonly enviando = input<boolean>(false);

  /** Emite la observación recortada, o `undefined` si quedó vacía. */
  readonly confirmado = output<string | undefined>();
  readonly closed = output<void>();

  protected readonly observacion = signal('');
  protected readonly longitud = computed(() => this.observacion().trim().length);
  protected readonly excedida = computed(() => this.longitud() > this.max);
  protected readonly puedeConfirmar = computed(() => !this.excedida() && !this.enviando());

  constructor() {
    effect(
      () => {
        if (!this.isOpen()) this.observacion.set('');
      },
      { allowSignalWrites: true }
    );
  }

  confirmar(): void {
    if (!this.puedeConfirmar()) return;
    this.confirmado.emit(this.observacion().trim() || undefined);
  }
}
