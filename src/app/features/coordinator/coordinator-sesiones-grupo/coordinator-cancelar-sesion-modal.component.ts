import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { MotivoCancelacionCoordinador, OBSERVACION_CANCELACION_MAX } from '../../../core/models/coordinador-sesion-cancelacion.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

/**
 * CULM-001 / DEC-064: diálogo accesible (role=dialog) para que el coordinador cancele una sesión manual con un
 * motivo del catálogo y una observación opcional (≤ 250). El error del backend se muestra tal cual.
 */
@Component({
  selector: 'app-coordinator-cancelar-sesion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="tituloVisible()" (closed)="closed.emit()">
      <div class="space-y-4" data-testid="cancelar-sesion-coordinador">
        <p class="text-xs text-warm-600">
          {{ nota() ?? notaCancelacion }}
        </p>

        <label class="flex flex-col gap-1 text-xs font-semibold text-warm-700">
          Motivo
          <select
            data-testid="motivo-cancelacion"
            aria-label="Motivo de cancelación"
            [value]="codigoMotivo()"
            (change)="codigoMotivo.set($any($event.target).value)"
            class="px-3 py-2.5 bg-white border border-warm-200 rounded-xl text-sm font-normal text-warm-900"
          >
            <option value="">Selecciona un motivo</option>
            @for (m of motivos(); track m.codigo) {
              <option [value]="m.codigo">{{ m.nombre }}</option>
            }
          </select>
        </label>
        @if (errorMotivos(); as errorCarga) {
          <p role="alert" class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3 break-words">{{ errorCarga }}</p>
        }

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
        <p data-testid="contador-observacion" class="text-xs text-right" [class.text-danger-700]="excedida()" [class.text-warm-500]="!excedida()">
          {{ longitud() }}/{{ max }}
        </p>

        @if (errorMensaje(); as mensaje) {
          <p role="alert" data-testid="error-cancelacion" class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3 break-words">{{ mensaje }}</p>
        }
      </div>

      <div modal-footer class="flex items-center gap-3">
        <button type="button" data-accion="cerrar" (click)="closed.emit()" class="min-h-[44px] text-xs px-4 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-100 transition-colors">
          Cerrar
        </button>
        <button
          type="button"
          data-testid="confirmar-cancelacion-coordinador"
          [disabled]="!puedeConfirmar()"
          (click)="confirmar()"
          class="min-h-[44px] text-xs px-4 rounded-xl font-bold text-white bg-danger-700 hover:bg-danger-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ enviando() ? textoEnviando() : textoConfirmar() }}
        </button>
      </div>
    </app-modal>
  `,
})
export class CoordinatorCancelarSesionModalComponent {
  readonly max = OBSERVACION_CANCELACION_MAX;

  readonly isOpen = input<boolean>(false);
  readonly nombreSesion = input<string>('');
  /** DEC-065 (2): permite reutilizar el diálogo para rechazar una solicitud (título, nota y textos del botón). */
  readonly titulo = input<string | null>(null);
  readonly nota = input<string | null>(null);
  readonly textoConfirmar = input<string>('Confirmar cancelación');
  readonly textoEnviando = input<string>('Cancelando…');
  protected readonly notaCancelacion =
    'Solo se pueden cancelar sesiones creadas manualmente por el docente. Se notificará a los estudiantes del grupo.';
  protected readonly tituloVisible = computed(() => this.titulo() ?? 'Cancelar sesión ' + this.nombreSesion());
  readonly motivos = input<MotivoCancelacionCoordinador[]>([]);
  /** Error de la carga del catálogo, entregado por el backend. */
  readonly errorMotivos = input<string | null>(null);
  /** Error del backend (SES_018, SES_011, SES_012, SES_016...); se muestra tal cual. */
  readonly errorMensaje = input<string | null>(null);
  readonly enviando = input<boolean>(false);

  readonly confirmado = output<{ codigoMotivo: string; observacion?: string }>();
  readonly closed = output<void>();

  protected readonly codigoMotivo = signal('');
  protected readonly observacion = signal('');
  protected readonly longitud = computed(() => this.observacion().trim().length);
  protected readonly excedida = computed(() => this.longitud() > this.max);
  protected readonly puedeConfirmar = computed(
    () => !!this.codigoMotivo() && !this.excedida() && !this.enviando()
  );

  constructor() {
    effect(
      () => {
        if (!this.isOpen()) {
          this.codigoMotivo.set('');
          this.observacion.set('');
        }
      },
      { allowSignalWrites: true }
    );
  }

  confirmar(): void {
    if (!this.puedeConfirmar()) return;
    const observacion = this.observacion().trim();
    this.confirmado.emit(
      observacion ? { codigoMotivo: this.codigoMotivo(), observacion } : { codigoMotivo: this.codigoMotivo() }
    );
  }
}
