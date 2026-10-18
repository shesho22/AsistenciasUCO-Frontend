import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { Course } from '../../../../../core/models/course.model';
import { ClassSession } from '../../../../../core/models/attendance.model';
import { SessionTimeZoneService } from '../../../../../core/services/session-timezone.service';

@Component({
  selector: 'app-teacher-proyeccion-qr-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-warm-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div class="bg-white rounded-3xl border border-warm-200 shadow-warm-2xl max-w-xl w-full overflow-hidden animate-scale-up">
          <!-- Header Modal Proyección -->
          <div class="p-6 border-b border-warm-100 flex items-center justify-between bg-warm-900 text-white">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-accent-400 text-warm-900 flex items-center justify-center font-bold">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h3 class="font-serif font-bold text-xl leading-tight">
                  Auto-Registro de Asistencia
                </h3>
                <p class="text-xs text-warm-300">
                  Proyección interactiva para el grupo {{ curso()?.code }}
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="closed.emit()"
              class="p-2 rounded-xl text-warm-300 hover:text-white hover:bg-warm-800 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-6 sm:p-8 space-y-6 text-center">
            <!-- Selector de Sesión si hay varias -->
            @if (sessions().length > 1) {
              <div class="flex items-center justify-center gap-2">
                <label class="text-xs font-semibold text-warm-600">Sesión Activa:</label>
                <select
                  [ngModel]="sesionActivaId()"
                  (ngModelChange)="cambiarSesion.emit($event)"
                  class="text-xs font-bold px-3 py-1.5 bg-warm-50 border border-warm-200 rounded-lg text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  @for (s of sessions(); track s.id) {
                    <option [value]="s.id">
                      #{{ s.sessionNumber }} — {{ s.title }} ({{ s.estadoTemporal === 'INDETERMINADA' ? 'Horario no confirmado' : timeZone.displaySessionDate(s) }})
                    </option>
                  }
                </select>
              </div>
            }

            <!-- Visualizador Bento: PIN Gigante & QR -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <!-- Tarjeta PIN Alfanumérico -->
              <div class="p-6 rounded-2xl bg-amber-50/70 border-2 border-amber-300 shadow-warm-sm space-y-2">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-800">
                  PIN de Registro Rápido (PC)
                </span>
                <div class="font-mono font-extrabold text-4xl sm:text-5xl text-amber-950 tracking-widest my-2 select-all">
                  {{ datosQr()?.codigoAcceso || '849201' }}
                </div>
                <p class="text-[11px] text-amber-800 leading-tight">
                  Digítalo en tu portal estudiantil sin necesidad de cámara.
                </p>
              </div>

              <!-- Tarjeta Código QR Dinámico -->
              <div class="p-5 rounded-2xl bg-warm-50 border-2 border-warm-200 shadow-warm-sm flex flex-col items-center space-y-2">
                <span class="text-xs font-bold uppercase tracking-wider text-warm-700">
                  Escaneo Móvil (Cámara)
                </span>
                <div class="w-36 h-36 bg-white p-2 rounded-xl border border-warm-300 shadow-inner flex items-center justify-center">
                  <img
                    [src]="'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + (datosQr()?.token || 'UCO-QR-DEMO')"
                    alt="Código QR de Asistencia"
                    class="w-full h-full object-contain"
                  />
                </div>
                <span class="text-[10px] font-mono text-warm-500 truncate max-w-[180px]">
                  {{ datosQr()?.token || 'UCO-QR-ACTIVO' }}
                </span>
              </div>
            </div>

            <!-- Contador de Expiración & Refresco -->
            <div class="p-4 rounded-2xl bg-warm-100/70 border border-warm-200 flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs text-warm-700 text-left">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Válido por: <strong class="font-mono font-bold text-warm-900">{{ segundosRestantes() }} segundos</strong></span>
              </div>

              <button
                type="button"
                (click)="refrescarQr.emit()"
                class="px-3 py-1.5 text-xs font-bold text-primary-800 hover:text-primary-950 bg-white hover:bg-warm-50 border border-warm-300 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refrescar PIN ahora
              </button>
            </div>
          </div>

          <div class="p-4 border-t border-warm-100 bg-warm-50/70 flex items-center justify-between">
            <span class="text-xs text-warm-500">
              Los estudiantes deben pertenecer al grupo para registrar asistencia.
            </span>
            <app-button variant="secondary" size="sm" (clicked)="closed.emit()">
              Cerrar Proyector
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class TeacherProyeccionQrModalComponent {
  readonly timeZone = inject(SessionTimeZoneService);
  isOpen = input.required<boolean>();
  curso = input<Course | null>(null);
  sessions = input<ClassSession[]>([]);
  sesionActivaId = input<string>('');
  datosQr = input<any>(null);
  segundosRestantes = input<number>(30);

  cambiarSesion = output<string>();
  refrescarQr = output<void>();
  closed = output<void>();
}
