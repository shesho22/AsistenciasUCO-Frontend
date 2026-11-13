import { Component, ChangeDetectionStrategy, effect, input, output, signal, untracked } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';

@Component({
    selector: 'app-student-matricula-codigo-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonComponent, ModalComponent],
    template: `
    <app-modal [isOpen]="isOpen()" title="Matricúlate a un Grupo" (closed)="closed.emit()">
      <div class="space-y-5">
        <p class="text-sm text-warm-600 text-center">
          Ingresa el PIN de 6 dígitos que proyecta tu docente. También sirve el código institucional del grupo que aparece en el proyector de tu clase.
        </p>

        <div class="space-y-1.5">
          <label for="matricula-pin-input" class="block text-xs font-semibold text-warm-700 uppercase tracking-wider text-center">
            PIN de matrícula
          </label>
          <input
            id="matricula-pin-input"
            type="text"
            [ngModel]="codigo()"
            (ngModelChange)="onCodigoChange($event)"
            placeholder="000000"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            autocomplete="one-time-code"
            class="w-full text-center font-mono font-bold text-xl tracking-wider py-3 px-4 min-h-[44px] bg-warm-50 border-2 border-warm-300 rounded-2xl text-warm-900 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/20"
          />
        </div>

        <div class="p-3.5 rounded-xl bg-primary-50/50 border border-primary-100 text-xs text-warm-600 space-y-1">
          <p class="font-semibold text-primary-900">Inscripción inmediata</p>
          <p class="text-xs leading-relaxed">
            Al confirmar la matrícula, la asignatura aparecerá en tu lista de materias activas y quedarás habilitado para registrar tu asistencia en todas las sesiones.
          </p>
        </div>
      </div>

      <div modal-footer class="flex items-center justify-end gap-3 w-full">
        <app-button variant="secondary" size="sm" (clicked)="closed.emit()">Cancelar</app-button>
        <button
          type="button"
          [disabled]="!pinValido() || processing()"
          (click)="onSubmit()"
          class="px-5 py-2 min-h-[44px] text-sm font-bold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
        >
          @if (processing()) {
            <span class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
            Inscribiendo...
          } @else {
            Confirmar Matrícula
          }
        </button>
      </div>
    </app-modal>
  `
})
export class StudentMatriculaCodigoModalComponent {
  isOpen = input<boolean>(false);
  processing = input<boolean>(false);
  /** Token de QR inicial (F-EST-012). */
  tokenInicial = input<string>('');
  /** PIN que ya conoce el flujo (p. ej. viene del login); se copia al campo al abrir el modal. */
  codigoInicial = input<string>('');
  codigo = signal<string>('');
  readonly pinId = 'matricula-pin-input';

  constructor() {
    effect(() => {
      const inicial = this.codigoInicial();
      if (inicial) {
        untracked(() => this.codigo.set(inicial));
      }
    });
  }

  pinValido(): boolean {
    if (this.tokenInicial()) {
      return true;
    }
    return /^[0-9]{6}$/.test(this.codigo().trim());
  }

  /** El PIN es numerico: se descartan letras y simbolos al teclear o pegar. */
  onCodigoChange(valor: string): void {
    this.codigo.set((valor ?? '').replace(/\D/g, '').slice(0, 6));
  }

  submitted = output<string | { token: string }>();
  closed = output<void>();

  onSubmit(): void {
    if (this.tokenInicial()) {
      this.submitted.emit({ token: this.tokenInicial() });
      return;
    }
    this.submitted.emit(this.codigo().trim());
  }
}
