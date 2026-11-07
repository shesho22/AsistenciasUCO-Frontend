import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';

@Component({
  selector: 'app-student-auto-asistencia-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-warm-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white rounded-3xl border border-warm-200 shadow-warm-2xl max-w-md w-full overflow-hidden animate-scale-up">
          <!-- Header Modal -->
          <div class="p-6 border-b border-warm-100 flex items-center justify-between bg-primary-900 text-white">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-success-700 text-white flex items-center justify-center font-bold">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 class="font-serif font-bold text-lg leading-tight">
                  Auto-Registro de Asistencia
                </h3>
                <p class="text-xs text-success-200">
                  Ingresa el PIN proyectado por tu docente en clase
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

          <!-- Cuerpo del Formulario de Registro -->
          <div class="p-6 sm:p-7 space-y-5">
            <div class="text-center space-y-1">
              <p class="text-xs font-semibold text-warm-500 uppercase tracking-wider">
                Código de Acceso de 6 Dígitos
              </p>
              <p class="text-xs text-warm-600">
                Digita el PIN numérico o alfanumérico visible en el proyector de la clase.
              </p>
            </div>

            <!-- Input PIN Grande -->
            <div class="flex justify-center">
              <input
                type="text"
                maxlength="6"
                [ngModel]="pin()"
                (ngModelChange)="pin.set($event)"
                placeholder="000000"
                class="w-56 text-center font-mono font-extrabold text-3xl tracking-widest py-3 px-4 bg-warm-50 border-2 border-warm-300 rounded-2xl text-warm-900 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/20 uppercase"
              />
            </div>

            <!-- Opcional: Pegar Token QR Completo -->
            <div class="pt-2 border-t border-warm-100">
              <details class="text-xs text-warm-600">
                <summary class="cursor-pointer font-semibold text-warm-700 hover:text-warm-950 select-none">
                  ¿Tienes un enlace o token QR completo?
                </summary>
                <div class="mt-2.5 space-y-1">
                  <input
                    type="text"
                    [ngModel]="tokenQr()"
                    (ngModelChange)="tokenQr.set($event)"
                    placeholder="UCO-QR-..."
                    class="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-xs font-mono text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </details>
            </div>

            <!-- Indicación de Regla de Negocio -->
            <div class="p-3.5 rounded-xl bg-warm-50 border border-warm-200 text-xs text-warm-600 space-y-1">
              <p class="font-semibold text-warm-800 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-success-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Validación Automática de Matrícula
              </p>
              <p class="text-[11px] leading-relaxed">
                El sistema verificará que te encuentres matriculado en el grupo de la sesión activa y registrará tu estado como <strong>PRESENTE</strong> de manera inmediata.
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
              [disabled]="(!pin().trim() && !tokenQr().trim()) || processing()"
              (click)="onSubmit()"
              class="px-5 py-2 text-xs font-bold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
            >
              @if (processing()) {
                <span class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Validando...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Registrar mi Asistencia
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class StudentAutoAsistenciaModalComponent {
  isOpen = input<boolean>(false);
  processing = input<boolean>(false);

  pin = signal<string>('');
  tokenQr = signal<string>('');

  submitted = output<{ pin: string; token: string }>();
  closed = output<void>();

  onSubmit(): void {
    this.submitted.emit({
      pin: this.pin().trim().toUpperCase(),
      token: this.tokenQr().trim(),
    });
  }
}
