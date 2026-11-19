import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { AsistenciaQrService } from '../../../../../core/services/asistencia-qr.service';
import { RegistroAsistenciaQr } from '../../../../../core/models/asistencia-qr.model';
import { getApiErrorMessage } from '../../../../../core/api/errors/api-error.util';

const PIN_VALIDO = /^\d{6}$/;

/**
 * HU176: registro de asistencia con el PIN que proyecta el docente, en una ventana emergente igual a la de matrícula por
 * código. Los mensajes de éxito y de error los entrega el backend; el modal solo los presenta.
 */
@Component({
  selector: 'app-student-asistencia-pin-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonComponent, ModalComponent],
  template: `
    <app-modal [isOpen]="isOpen()" title="Registrar asistencia" (closed)="cerrar()">
      @if (resultado(); as r) {
        <article
          class="rounded-2xl border border-attendance-present bg-attendance-present-soft p-5 space-y-2 text-center"
          data-testid="asistencia-pin-resultado"
          aria-live="polite"
        >
          <p class="text-lg font-bold text-warm-900">{{ r.nombreAsignatura }}</p>
          <p class="text-sm text-warm-700">{{ r.nombreGrupo }} · Sesión {{ r.numeroSesion }} · Toma {{ r.numeroToma }}</p>
          @if (hora()) {
            <p class="text-sm text-warm-700">Registrada a las {{ hora() }}</p>
          }
          @if (r.yaRegistrado) {
            <p class="text-sm font-semibold text-warm-900" data-testid="asistencia-pin-ya-registrado">Tu asistencia ya estaba registrada.</p>
          } @else if (r.mensaje) {
            <p class="text-sm font-semibold text-warm-900">{{ r.mensaje }}</p>
          }
        </article>
      } @else {
        <div class="space-y-5">
          <p class="text-sm text-warm-600 text-center">
            Ingresa el PIN de 6 dígitos que proyecta tu docente. Solo funciona conectado a la red Wi-Fi del campus UCO.
          </p>

          <div class="space-y-1.5">
            <label for="asistencia-pin-input" class="block text-xs font-semibold text-warm-700 uppercase tracking-wider text-center">
              PIN de asistencia
            </label>
            <input
              id="asistencia-pin-input"
              data-testid="asistencia-pin-input"
              type="text"
              [ngModel]="codigo()"
              (ngModelChange)="onCodigoChange($event)"
              (keydown.enter)="onSubmit()"
              placeholder="000000"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              autocomplete="one-time-code"
              enterkeyhint="send"
              class="w-full text-center font-mono font-bold text-xl tracking-wider py-3 px-4 min-h-[44px] bg-warm-50 border-2 border-warm-300 rounded-2xl text-warm-900 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-500/20"
            />
          </div>

          @if (error(); as mensaje) {
            <p role="alert" data-testid="asistencia-pin-error" class="text-sm font-semibold text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2 text-center">
              {{ mensaje }}
            </p>
          }

          <div class="p-3.5 rounded-xl bg-primary-50/50 border border-primary-100 text-xs text-warm-600 space-y-1">
            <p class="font-semibold text-primary-900">Registro en la toma abierta</p>
            <p class="text-xs leading-relaxed">
              El PIN cambia cada pocos segundos: escríbelo tal como lo ves en el proyector. Tu asistencia queda en la toma que tu docente tiene abierta.
            </p>
          </div>
        </div>
      }

      <div modal-footer class="flex items-center justify-end gap-3 w-full">
        @if (resultado()) {
          <app-button variant="secondary" size="sm" (clicked)="cerrar()">Cerrar</app-button>
        } @else {
          <app-button variant="secondary" size="sm" (clicked)="cerrar()">Cancelar</app-button>
          <button
            type="button"
            data-testid="asistencia-pin-enviar"
            [disabled]="!pinValido() || enviando()"
            (click)="onSubmit()"
            class="px-5 py-2 min-h-[44px] text-sm font-bold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm inline-flex items-center gap-2"
          >
            @if (enviando()) {
              <span class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
              Registrando...
            } @else {
              Registrar asistencia
            }
          </button>
        }
      </div>
    </app-modal>
  `,
})
export class StudentAsistenciaPinModalComponent {
  private readonly qr = inject(AsistenciaQrService);

  isOpen = input<boolean>(false);
  /** Asistencia registrada (para refrescar la vista que abrió el modal). */
  registrado = output<RegistroAsistenciaQr>();
  closed = output<void>();

  readonly codigo = signal('');
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultado = signal<RegistroAsistenciaQr | null>(null);

  readonly pinValido = computed(() => PIN_VALIDO.test(this.codigo()));

  readonly hora = computed(() => {
    const iso = this.resultado()?.fechaRegistroUtc;
    if (!iso) return '';
    const fecha = new Date(iso);
    return Number.isNaN(fecha.getTime())
      ? ''
      : fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  constructor() {
    // Cada apertura empieza limpia: sin PIN, error ni resultado de la vez anterior.
    effect(() => {
      if (this.isOpen()) {
        untracked(() => {
          this.codigo.set('');
          this.error.set(null);
          this.resultado.set(null);
          this.enviando.set(false);
        });
      }
    });
  }

  /** El PIN es numérico: se descartan letras y símbolos al teclear o pegar. */
  onCodigoChange(valor: string): void {
    this.codigo.set((valor ?? '').replace(/\D/g, '').slice(0, 6));
    this.error.set(null);
  }

  onSubmit(): void {
    if (!this.pinValido() || this.enviando()) return;
    this.enviando.set(true);
    this.error.set(null);
    this.qr.registrarPorPin(this.codigo()).subscribe({
      next: (res) => {
        this.enviando.set(false);
        this.resultado.set(res.datos);
        this.registrado.emit(res.datos);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(getApiErrorMessage(err));
      },
    });
  }

  cerrar(): void {
    this.closed.emit();
  }
}
