import { Component, ChangeDetectionStrategy, effect, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';

@Component({
  selector: 'app-student-matricula-codigo-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-warm-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white rounded-3xl border border-warm-200 shadow-warm-2xl max-w-md w-full overflow-hidden animate-scale-up">
          <!-- Header Modal Matrícula -->
          <div class="p-6 border-b border-warm-100 flex items-center justify-between bg-primary-900 text-white">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary-700 text-white flex items-center justify-center font-bold">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 class="font-serif font-bold text-lg leading-tight">
                  Matricúlate a un Grupo
                </h3>
                <p class="text-xs text-primary-200">
                  Ingresa el PIN de 6 dígitos que proyecta tu docente
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="closed.emit()"
              class="p-2 rounded-xl text-primary-200 hover:text-white hover:bg-primary-800 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Cuerpo del Formulario de Matrícula -->
          <div class="p-6 sm:p-7 space-y-5">
            <div class="text-center space-y-1">
              <p class="text-xs font-semibold text-warm-500 uppercase tracking-wider">
                PIN de matrícula
              </p>
              <p class="text-xs text-warm-600">
                Digita el código institucional del grupo o el identificador que aparece en el proyector de tu clase.
              </p>
            </div>

            <!-- Input Código Matrícula Grande -->
            <div class="flex justify-center">
              <input
                type="text"
                [ngModel]="codigo()"
                (ngModelChange)="codigo.set($event)"
                placeholder="PIN de 6 dígitos"
                inputmode="numeric"
                maxlength="6"
                autocomplete="off"
                class="w-full text-center font-mono font-bold text-xl tracking-wider py-3 px-4 bg-warm-50 border-2 border-warm-300 rounded-2xl text-warm-900 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/20"
              />
            </div>

            <!-- Indicación de Regla de Negocio -->
            <div class="p-3.5 rounded-xl bg-primary-50/50 border border-primary-100 text-xs text-warm-600 space-y-1">
              <p class="font-semibold text-primary-900 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-primary-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Inscripción Inmediata
              </p>
              <p class="text-[11px] leading-relaxed">
                Al confirmar la matrícula, la asignatura aparecerá en tu lista de materias activas y quedarás habilitado para registrar tu asistencia en todas las sesiones.
              </p>
            </div>
          </div>

          <!-- Footer con Botón de Enviar -->
          <div class="p-4 border-t border-warm-100 bg-warm-50/60 flex items-center justify-end gap-3">
            <app-button variant="secondary" size="sm" (clicked)="closed.emit()">
              Cancelar
            </app-button>
            <button
              type="button"
              [disabled]="!pinValido() || processing()"
              (click)="onSubmit()"
              class="px-5 py-2 text-xs font-bold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
            >
              @if (processing()) {
                <span class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Inscribiendo...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Confirmar Matrícula
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class StudentMatriculaCodigoModalComponent {
  isOpen = input<boolean>(false);
  processing = input<boolean>(false);
  /** PIN que ya conoce el flujo (p. ej. viene del login); se copia al campo al abrir el modal. */
  codigoInicial = input<string>('');
  codigo = signal<string>('');

  constructor() {
    effect(() => {
      const inicial = this.codigoInicial();
      if (inicial) {
        untracked(() => this.codigo.set(inicial));
      }
    });
  }

  pinValido(): boolean {
    return /^[0-9]{6}$/.test(this.codigo().trim());
  }

  submitted = output<string>();
  closed = output<void>();

  onSubmit(): void {
    this.submitted.emit(this.codigo().trim());
  }
}
