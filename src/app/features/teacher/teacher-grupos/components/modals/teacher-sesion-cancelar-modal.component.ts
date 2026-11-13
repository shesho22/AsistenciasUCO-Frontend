import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormFieldComponent } from '../../../../../shared/components/form-field/form-field.component';
import { ClassSession } from '../../../../../core/models/attendance.model';
import { SessionTimeZoneService } from '../../../../../core/services/session-timezone.service';
import { MOTIVO_CANCELACION_MAX, MOTIVO_CANCELACION_MIN } from '../../../../../core/models/sesion-estado.model';

@Component({
    selector: 'app-teacher-sesion-cancelar-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormFieldComponent],
    template: `
    @if (isOpen() && sesion()) {
      <div class="fixed inset-0 bg-warm-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div data-testid="cancelar-panel" class="bg-white rounded-2xl border border-warm-200 shadow-warm-xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto animate-scale-up" role="dialog" aria-modal="true">
          <div class="p-6 border-b border-warm-100 flex items-start justify-between bg-danger-50/40">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-danger-100 text-danger-700 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 class="font-serif font-bold text-lg text-warm-900">Cancelar Sesión #{{ sesion()?.sessionNumber }}</h3>
                @if (sesion()?.estadoTemporal === 'INDETERMINADA') {
                  <p class="text-xs text-warning-800">Horario no confirmado</p>
                } @else {
                  <p class="text-xs text-warm-600">{{ timeZone.displaySessionDate(sesion()!) }}{{ timeZone.displaySessionEndDate(sesion()!) !== timeZone.displaySessionDate(sesion()!) ? ' – ' + timeZone.displaySessionEndDate(sesion()!) : '' }} • {{ timeZone.displaySessionStartTime(sesion()!) }} - {{ timeZone.displaySessionEndTime(sesion()!) }}</p>
                }
              </div>
            </div>
            <button
              type="button"
              (click)="closed.emit()"
              class="text-warm-400 hover:text-warm-700 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg hover:bg-warm-100 transition-colors"
              aria-label="Cerrar"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <p class="text-xs text-warm-600">
              Esta acción marcará la clase como cancelada en el historial institucional y notificará a los estudiantes matriculados.
            </p>

            <app-form-field label="Motivo de la Cancelación" [required]="true">
              <textarea
                [value]="motivo()"
                (input)="motivo.set($any($event.target).value)"
                rows="4"
                maxlength="500"
                placeholder="Explica el motivo institucional o académico y la fecha estimada de reposición..."
                class="w-full p-3 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              ></textarea>
            </app-form-field>
            <p data-testid="contador-motivo" class="text-xs text-right" [class.text-danger-700]="motivoFueraDeRango() && longitud() > 0" [class.text-warm-500]="!motivoFueraDeRango() || longitud() === 0">
              {{ longitud() }}/{{ max }} · mínimo {{ min }} caracteres
            </p>
            @if (errorMensaje(); as mensaje) {
              <p role="alert" class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3 break-words">{{ mensaje }}</p>
            }
          </div>

          <div class="p-4 border-t border-warm-100 bg-warm-50/50 flex items-center justify-end gap-2.5">
            <button
              type="button"
              (click)="closed.emit()"
              class="px-4 py-2 min-h-[44px] text-xs font-semibold text-warm-700 bg-warm-100 hover:bg-warm-200 border border-warm-200 rounded-xl transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              data-testid="confirmar-cancelacion"
              [disabled]="motivoFueraDeRango() || enviando()"
              (click)="confirmar()"
              class="px-4 py-2 min-h-[44px] text-xs font-bold text-white bg-danger-600 hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {{ enviando() ? 'Cancelando…' : 'Confirmar Cancelación' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class TeacherSesionCancelarModalComponent {
  readonly timeZone = inject(SessionTimeZoneService);
  readonly min = MOTIVO_CANCELACION_MIN;
  readonly max = MOTIVO_CANCELACION_MAX;

  isOpen = input.required<boolean>();
  sesion = input<ClassSession | null>(null);
  /** Mensaje de error entregado por el backend (SES_011/012/013/016); se muestra tal cual. */
  errorMensaje = input<string | null>(null);
  enviando = input<boolean>(false);
  motivo = signal<string>('');
  cancelar = output<string>();
  closed = output<void>();

  protected readonly longitud = computed(() => this.motivo().trim().length);
  protected readonly motivoFueraDeRango = computed(
    () => this.longitud() < this.min || this.longitud() > this.max
  );

  constructor() {
    effect(
      () => {
        if (!this.isOpen()) this.motivo.set('');
      },
      { allowSignalWrites: true }
    );
  }

  confirmar(): void {
    if (this.motivoFueraDeRango() || this.enviando()) return;
    this.cancelar.emit(this.motivo().trim());
  }
}
