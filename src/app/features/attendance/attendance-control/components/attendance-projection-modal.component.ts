import { Component, ChangeDetectionStrategy, input, output, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-attendance-projection-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-warm-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in">
        <div class="bg-white rounded-3xl border border-warm-200 shadow-warm-2xl max-w-2xl w-full overflow-hidden animate-scale-up flex flex-col">
          <!-- Cabecera Bento Dark Institucional -->
          <div class="p-6 bg-gradient-to-r from-primary-950 via-warm-950 to-primary-950 text-white flex items-center justify-between border-b border-primary-900/50">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-success-500/20 border border-success-400/40 text-success-300 flex items-center justify-center font-bold text-xl shadow-inner">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <span class="text-[11px] font-mono tracking-widest text-success-300 uppercase font-semibold block">
                  Proyección en Aula • {{ courseCode() }}
                </span>
                <h3 class="font-serif font-bold text-xl sm:text-2xl text-white tracking-tight">
                  Código de Asistencia Dinámico
                </h3>
              </div>
            </div>

            <button
              type="button"
              (click)="onClose()"
              class="p-2.5 rounded-xl text-warm-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar proyección"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Contenido Principal Bento -->
          <div class="p-6 sm:p-8 space-y-6 bg-warm-50/50">
            <!-- Badge de Validación Wi-Fi Campus Institucional -->
            <div class="flex items-center justify-between p-3.5 bg-success-50 border border-success-200 rounded-2xl text-xs text-success-900">
              <div class="flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full bg-success-500 animate-ping"></span>
                <span class="font-semibold">Válido exclusivamente en red Wi-Fi Campus UCO</span>
              </div>
              <span class="font-mono text-[11px] bg-white text-success-800 px-2.5 py-0.5 rounded-lg border border-success-200 font-bold">
                TTL: {{ countdown() }}s
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <!-- Bloque QR SVG Nativo (sin librerías pesadas) -->
              <div class="bg-white p-5 rounded-2xl border-2 border-warm-200 shadow-warm-sm flex flex-col items-center justify-center space-y-3">
                <div class="w-48 h-48 sm:w-52 sm:h-52 bg-white rounded-xl border border-warm-100 p-2 flex items-center justify-center">
                  <!-- SVG Representativo de QR Código con Patrón Estilizado -->
                  <svg class="w-full h-full text-warm-900" viewBox="0 0 100 100" fill="currentColor">
                    <!-- Esquinas de localización QR -->
                    <rect x="5" y="5" width="28" height="28" fill="currentColor" rx="4" />
                    <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                    <rect x="13" y="13" width="12" height="12" fill="currentColor" rx="1" />

                    <rect x="67" y="5" width="28" height="28" fill="currentColor" rx="4" />
                    <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                    <rect x="75" y="13" width="12" height="12" fill="currentColor" rx="1" />

                    <rect x="5" y="67" width="28" height="28" fill="currentColor" rx="4" />
                    <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                    <rect x="13" y="75" width="12" height="12" fill="currentColor" rx="1" />

                    <!-- Módulos de datos dinámicos simulados -->
                    <rect x="38" y="10" width="8" height="8" fill="currentColor" />
                    <rect x="50" y="15" width="8" height="8" fill="currentColor" />
                    <rect x="38" y="24" width="8" height="8" fill="currentColor" />
                    <rect x="10" y="40" width="8" height="8" fill="currentColor" />
                    <rect x="22" y="45" width="8" height="8" fill="currentColor" />
                    <rect x="42" y="42" width="16" height="16" fill="currentColor" rx="2" />
                    <rect x="68" y="40" width="8" height="8" fill="currentColor" />
                    <rect x="80" y="48" width="8" height="8" fill="currentColor" />
                    <rect x="40" y="68" width="8" height="8" fill="currentColor" />
                    <rect x="52" y="75" width="8" height="8" fill="currentColor" />
                    <rect x="68" y="68" width="8" height="8" fill="currentColor" />
                    <rect x="80" y="75" width="12" height="12" fill="currentColor" />
                  </svg>
                </div>
                <span class="text-[11px] font-mono text-warm-500 text-center">
                  Escanea con la app móvil estudiantil
                </span>
              </div>

              <!-- Bloque PIN Numérico Gigante -->
              <div class="bg-white p-6 rounded-2xl border-2 border-warm-200 shadow-warm-sm flex flex-col items-center justify-center space-y-4 text-center">
                <span class="text-xs uppercase tracking-widest font-bold text-warm-500">
                  O ingresa el PIN de acceso
                </span>

                <div class="w-full py-4 px-3 bg-success-50/70 border-2 border-success-300 rounded-2xl">
                  <span class="font-mono font-black text-4xl sm:text-5xl text-success-950 tracking-widest select-all">
                    {{ pinCode() }}
                  </span>
                </div>

                <div class="text-xs text-warm-600 space-y-1">
                  <p class="font-semibold text-warm-800">Instrucciones para los estudiantes:</p>
                  <p class="text-[11px] leading-relaxed">
                    1. Abre tu portal estudiantil.<br />
                    2. Pulsa en <strong>"Auto-Asistencia"</strong>.<br />
                    3. Ingresa los 6 caracteres anteriores.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Modal -->
          <div class="p-4 sm:p-5 bg-white border-t border-warm-200 flex items-center justify-between">
            <span class="text-xs text-warm-500 font-medium">
              Sesión activa: <strong class="text-warm-800">{{ sessionTitle() }}</strong>
            </span>
            <app-button variant="primary" size="md" (clicked)="onClose()">
              Cerrar Proyección
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AttendanceProjectionModalComponent {
  isOpen = input<boolean>(false);
  pinCode = input<string>('392-817');
  courseCode = input<string>('CURSO');
  sessionTitle = input<string>('Sesión de Clase');

  closed = output<void>();

  countdown = signal<number>(60);

  private timerInterval: any = null;
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.startTimer();
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  onClose(): void {
    this.clearTimer();
    this.closed.emit();
  }

  private startTimer(): void {
    this.clearTimer();
    this.countdown.set(60);
    this.timerInterval = setInterval(() => {
      if (this.countdown() > 1) {
        this.countdown.update((c) => c - 1);
      } else {
        this.countdown.set(60);
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
