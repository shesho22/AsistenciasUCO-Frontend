import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsistenciaQrService } from '../../../core/services/asistencia-qr.service';
import { RegistroAsistenciaQr } from '../../../core/models/asistencia-qr.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

const PIN_VALIDO = /^[0-9]{6}$/;

/**
 * CULM-001 B.2 (HU176): `/app/asistencia/qr?t=<token>` registra al cargar (la camara nativa del celular abre la URL) y
 * `/app/asistencia/pin` ofrece el formulario de PIN. Los mensajes de exito y de error los entrega el backend.
 */
@Component({
  selector: 'app-student-attendance-qr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-md mx-auto w-full space-y-5 px-0 py-2" aria-live="polite">
      <header class="space-y-1">
        <h1 class="font-serif font-bold text-2xl text-warm-900">Registrar asistencia</h1>
        <p class="text-sm text-warm-600">Solo funciona con la red Wi-Fi del campus UCO.</p>
      </header>

      @if (cargando()) {
        <div class="h-24 rounded-2xl bg-warm-100 animate-pulse" data-testid="registro-cargando"></div>
      }

      @if (resultado(); as r) {
        <article
          class="rounded-2xl border border-attendance-present bg-attendance-present-soft p-5 space-y-2"
          data-testid="resultado-card"
        >
          <p class="text-lg font-bold text-warm-900">{{ r.nombreAsignatura }}</p>
          <p class="text-sm text-warm-700">{{ r.nombreGrupo }} · Sesión {{ r.numeroSesion }} · Toma {{ r.numeroToma }}</p>
          @if (hora()) {
            <p class="text-sm text-warm-700">Registrada a las {{ hora() }}</p>
          }
          @if (r.yaRegistrado) {
            <p class="text-sm font-semibold text-warm-900" data-testid="ya-registrado">Tu asistencia ya estaba registrada.</p>
          } @else if (r.mensaje) {
            <p class="text-sm font-semibold text-warm-900">{{ r.mensaje }}</p>
          }
        </article>
      } @else if (!cargando()) {
        @if (error()) {
          <p class="rounded-xl bg-danger-100 text-danger-900 px-4 py-3 text-sm font-medium" role="alert" data-testid="qr-error">
            {{ error() }}
          </p>
        }
        <form class="space-y-3" (submit)="enviarPin($event)" novalidate>
          <label for="pin" class="block text-sm font-semibold text-warm-800">PIN de 6 dígitos que proyecta tu docente</label>
          <input
            id="pin"
            data-testid="pin-input"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="one-time-code"
            maxlength="6"
            enterkeyhint="send"
            [value]="pin()"
            (input)="onPin($event)"
            class="w-full min-h-[56px] rounded-2xl border-2 border-warm-300 px-4 text-center font-mono text-3xl tracking-widest focus:border-primary-600 focus:outline-none"
          />
          @if (pinInvalido()) {
            <p class="text-xs text-danger-700 font-medium" data-testid="pin-invalido">Ingresa los 6 dígitos del PIN.</p>
          }
          <button
            type="submit"
            data-testid="pin-enviar"
            [disabled]="enviando()"
            class="w-full min-h-[48px] rounded-2xl bg-primary-700 text-white font-bold hover:bg-primary-800 disabled:opacity-50"
          >
            Registrar asistencia
          </button>
        </form>
      }
    </section>
  `,
})
export class StudentAttendanceQrComponent implements OnInit {
  private readonly qr = inject(AsistenciaQrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly cargando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly resultado = signal<RegistroAsistenciaQr | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly pin = signal('');
  protected readonly pinInvalido = signal(false);

  protected readonly hora = computed(() => {
    const iso = this.resultado()?.fechaRegistroUtc;
    if (!iso) return '';
    const fecha = new Date(iso);
    return Number.isNaN(fecha.getTime())
      ? ''
      : fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('t');
    if (!token) return;
    // El token se lee una sola vez y sale de la barra de direcciones (historial y capturas).
    void this.router.navigate([], { queryParams: { t: null }, replaceUrl: true });
    this.cargando.set(true);
    this.qr.registrarPorToken(token).subscribe({
      next: (res) => this.alRegistrar(res.datos),
      error: (err: unknown) => {
        this.cargando.set(false);
        this.error.set(getApiErrorMessage(err));
      },
    });
  }

  protected onPin(evento: Event): void {
    this.pin.set((evento.target as HTMLInputElement).value);
    this.pinInvalido.set(false);
  }

  protected enviarPin(evento: Event): void {
    evento.preventDefault();
    if (this.enviando()) return;
    const pin = this.pin();
    if (!PIN_VALIDO.test(pin)) {
      this.pinInvalido.set(true);
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.qr.registrarPorPin(pin).subscribe({
      next: (res) => {
        this.enviando.set(false);
        this.alRegistrar(res.datos);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(getApiErrorMessage(err));
      },
    });
  }

  private alRegistrar(datos: RegistroAsistenciaQr): void {
    this.cargando.set(false);
    this.error.set(null);
    this.resultado.set(datos);
  }
}
