import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  model,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RevisionCancelacionService } from '../../../core/services/revision-cancelacion.service';
import { MarcaRevisionDocente } from '../../../core/models/revision-cancelacion.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ToastService } from '../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-revision-decision-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/60 backdrop-blur-xs animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-decision-titulo"
      >
        <div class="bg-white rounded-2xl shadow-warm-xl border border-warm-200 w-full max-w-lg overflow-hidden">
          <div class="p-6 border-b border-warm-100 flex items-center justify-between">
            <div>
              <h2 id="modal-decision-titulo" class="font-serif font-bold text-lg text-warm-900">
                Decisión de Inasistencia
              </h2>
              <p class="text-xs text-warm-500 mt-0.5">
                Estudiante: <strong class="text-warm-800">{{ estudianteNombre() }}</strong>
              </p>
            </div>
            <button
              type="button"
              (click)="cerrar()"
              class="p-2 text-warm-400 hover:text-warm-700 rounded-lg hover:bg-warm-100 transition-colors"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>

          @if (errorMensaje(); as err) {
            <div class="mx-6 mt-4 p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-xs text-danger-800" role="alert">
              {{ err }}
            </div>
          }

          @if (requiereConfirmacion()) {
            <div class="p-6 space-y-4">
              <div class="p-4 rounded-xl bg-warning-50 border border-warning-200 text-xs text-warning-900 space-y-2">
                <p class="font-bold">¿Confirmas la propuesta de cancelación?</p>
                <p>
                  Esta acción enviará la solicitud al coordinador o decano para que evalúe y decida sobre la cancelación de la matrícula de este estudiante en la asignatura.
                </p>
              </div>

              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="requiereConfirmacion.set(false)"
                  class="min-h-[44px] px-4 py-2 rounded-xl border border-warm-300 text-warm-700 text-xs font-semibold hover:bg-warm-50"
                >
                  Volver a editar
                </button>
                <button
                  type="button"
                  (click)="confirmarEnvio()"
                  [disabled]="enviando()"
                  class="min-h-[44px] px-5 py-2 bg-danger-700 hover:bg-danger-800 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {{ enviando() ? 'Enviando…' : 'Sí, proponer cancelación' }}
                </button>
              </div>
            </div>
          } @else {
            <form (submit)="onSubmit($event)" class="p-6 space-y-4">
              <div class="space-y-2">
                <label class="block text-xs font-bold text-warm-700 uppercase tracking-wider">
                  Acción a tomar
                </label>
                <div class="space-y-2">
                  @for (opcion of opciones(); track opcion.valor) {
                    <label
                      class="flex items-center gap-3 p-3 rounded-xl border border-warm-200 hover:bg-warm-50 cursor-pointer transition-colors"
                      [class.border-primary-500]="decision() === opcion.valor"
                      [class.bg-primary-50]="decision() === opcion.valor"
                    >
                      <input
                        type="radio"
                        name="decision"
                        [value]="opcion.valor"
                        [checked]="decision() === opcion.valor"
                        (change)="decision.set(opcion.valor)"
                        class="text-primary-700 focus:ring-primary-500"
                      />
                      <div>
                        <span class="block text-sm font-semibold text-warm-900">{{ opcion.etiqueta }}</span>
                        <span class="block text-xs text-warm-500">{{ opcion.descripcion }}</span>
                      </div>
                    </label>
                  }
                </div>
              </div>

              <div class="space-y-1.5">
                <label for="motivo-decision" class="block text-xs font-bold text-warm-700 uppercase tracking-wider">
                  Motivo de la decisión (obligatorio)
                </label>
                <textarea
                  id="motivo-decision"
                  rows="3"
                  [value]="motivo()"
                  (input)="onMotivoInput($event)"
                  placeholder="Explica detalladamente la razón o justificación académica..."
                  class="w-full px-3.5 py-2.5 bg-white border border-warm-300 rounded-xl text-xs text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>

              <div class="flex items-center justify-end gap-3 pt-2 border-t border-warm-100">
                <button
                  type="button"
                  (click)="cerrar()"
                  class="min-h-[44px] px-4 py-2 rounded-xl border border-warm-300 text-warm-700 text-xs font-semibold hover:bg-warm-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="isSubmitDisabled()"
                  class="min-h-[44px] px-5 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-warm-300 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {{ enviando() ? 'Guardando…' : 'Continuar' }}
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
})
export class RevisionDecisionModalComponent {
  private readonly service = inject(RevisionCancelacionService, { optional: true });
  private readonly toast = inject(ToastService, { optional: true });

  isOpen = model<boolean>(false);
  revision = input<MarcaRevisionDocente | any>(null);
  estudianteNombre = input<string>('');

  decisionRegistrada = output<void>();
  closed = output<void>();

  decision = signal<string>('MANTENER');
  motivo = signal<string>('');
  requiereConfirmacion = signal<boolean>(false);
  errorMensaje = signal<string | null>(null);
  enviando = signal<boolean>(false);

  opciones = computed(() => {
    const rev = this.revision();
    const permitidas: string[] = rev?.accionesPermitidas ?? ['MANTENER', 'PROPONER'];
    const resultado: Array<{ valor: string; etiqueta: string; descripcion: string }> = [];

    if (permitidas.includes('MANTENER')) {
      resultado.push({
        valor: 'MANTENER',
        etiqueta: 'Mantener matrícula activa',
        descripcion: 'El estudiante continúa con su matrícula regular en la asignatura.',
      });
    }
    if (permitidas.includes('PROPONER') || permitidas.includes('PROPONER_CANCELACION')) {
      resultado.push({
        valor: 'PROPONER',
        etiqueta: 'Proponer cancelación por inasistencia',
        descripcion: 'Escala a coordinación/decanatura para cancelar la matrícula.',
      });
    }
    return resultado;
  });

  isSubmitDisabled = computed(() => {
    return this.enviando() || this.motivo().trim().length === 0;
  });

  onMotivoInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.motivo.set(val);
  }

  onSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    if (this.isSubmitDisabled()) {
      return;
    }
    if (this.decision() === 'PROPONER' || this.decision() === 'PROPONER_CANCELACION') {
      this.requiereConfirmacion.set(true);
      return;
    }
    this.enviar();
  }

  confirmarEnvio(): void {
    this.enviar();
  }

  private enviar(): void {
    const revId = this.revision()?.id || this.revision()?.revision?.id || '';
    if (!revId) {
      return;
    }

    this.enviando.set(true);
    this.errorMensaje.set(null);

    if (!this.service) {
      this.enviando.set(false);
      this.decisionRegistrada.emit();
      this.cerrar();
      return;
    }

    this.service
      .decidir(revId, {
        decision: this.decision(),
        motivo: this.motivo().trim(),
      })
      .subscribe({
        next: (res: any) => {
          this.enviando.set(false);
          if (res?.mensajeUsuario && this.toast) {
            this.toast.success(res.mensajeUsuario);
          }
          this.decisionRegistrada.emit();
          this.cerrar();
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          const errorMsg =
            (err as any)?.error?.message ||
            (err as any)?.error?.mensajeUsuario ||
            getApiErrorMessage(err);
          this.errorMensaje.set(errorMsg);
        },
      });
  }

  cerrar(): void {
    this.isOpen.set(false);
    this.requiereConfirmacion.set(false);
    this.errorMensaje.set(null);
    this.motivo.set('');
    this.closed.emit();
  }
}
