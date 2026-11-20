import { Component, ChangeDetectionStrategy, effect, input, output, signal, untracked } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { ProgramaElegibleMatriculaQr } from '../../../../../core/models/matricula-qr.model';

/** Lo que envia el modal: el PIN tecleado, o la credencial con el programa elegido (DEC-078). */
export type EnvioMatriculaCodigo = string | { token?: string; pin?: string; idPrograma?: string };

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

        <!-- DEC-078: grupo compartido: el estudiante elige el programa al que pertenece. -->
        @if (programas().length > 0) {
          <div class="space-y-1.5">
            <label for="matricula-programa-select" class="block text-xs font-semibold text-warm-700 uppercase tracking-wider text-center">
              Programa al que perteneces
            </label>
            <select id="matricula-programa-select" data-testid="matricula-programa" [ngModel]="programaId()" (ngModelChange)="programaId.set($event)"
              class="w-full py-3 px-4 min-h-[44px] bg-warm-50 border-2 border-warm-300 rounded-2xl text-sm text-warm-900 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/20">
              <option value="">Seleccione...</option>
              @for (p of programas(); track p.idPrograma) {
                <option [value]="p.idPrograma">{{ p.nombre }}</option>
              }
            </select>
          </div>
        }

        @if (error(); as mensaje) {
          <p role="alert" data-testid="matricula-error" class="text-sm font-semibold text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2 text-center">
            {{ mensaje }}
          </p>
        }

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
          [disabled]="!pinValido() || !programaListo() || processing()"
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
  /** Mensaje del backend cuando la matrícula fue rechazada (p. ej. MQR_001): se ve dentro del modal. */
  error = input<string | null>(null);
  /** Token de QR inicial (F-EST-012). */
  tokenInicial = input<string>('');
  /** PIN que ya conoce el flujo (p. ej. viene del login); se copia al campo al abrir el modal. */
  codigoInicial = input<string>('');
  /** DEC-078: programas del grupo compartido entre los que elige el estudiante (vacío si no aplica). */
  programas = input<ProgramaElegibleMatriculaQr[]>([]);
  codigo = signal<string>('');
  programaId = signal<string>('');
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
    return /^\d{6}$/.test(this.codigo().trim());
  }

  programaListo(): boolean {
    return this.programas().length === 0 || this.programaId() !== '';
  }

  /** El PIN es numerico: se descartan letras y simbolos al teclear o pegar. */
  onCodigoChange(valor: string): void {
    this.codigo.set((valor ?? '').replace(/\D/g, '').slice(0, 6));
  }

  submitted = output<EnvioMatriculaCodigo>();
  closed = output<void>();

  onSubmit(): void {
    const idPrograma = this.programaId() || undefined;
    if (this.tokenInicial()) {
      this.submitted.emit(idPrograma ? { token: this.tokenInicial(), idPrograma } : { token: this.tokenInicial() });
      return;
    }
    this.submitted.emit(idPrograma ? { pin: this.codigo().trim(), idPrograma } : this.codigo().trim());
  }
}
