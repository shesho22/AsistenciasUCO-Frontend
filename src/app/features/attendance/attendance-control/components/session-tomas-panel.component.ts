import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TomaAsistencia, TomasSesion } from '../../../../core/models/toma-asistencia.model';
import { detalleCancelacion, estaCancelada } from '../../../../core/models/sesion-estado.model';

/**
 * CULM-001 B.2: tomas de la sesion (numero, modo, estado, horas y conteos) y boton "Nueva toma". Presenta lo que
 * entrega el backend; la ventana de la sesion la calcula la BD, no el cliente.
 */
@Component({
  selector: 'app-session-tomas-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm p-4 sm:p-5 space-y-4"
      data-testid="panel-tomas"
      aria-label="Tomas de asistencia de la sesión"
    >
      @if (tomasSesion(); as datos) {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-serif font-bold text-lg text-warm-900">Tomas de asistencia</h3>
            <p class="text-xs text-warm-500">
              {{ datos.tomas.length }} de {{ datos.maximoTomas }} tomas · {{ datos.horasSesion }} h de sesión
              @if (cancelada()) {
                · <strong class="text-warning-800">Cancelada</strong>
                @if (detalle()) {
                  <span> ({{ detalle() }})</span>
                }
              }
            </p>
          </div>
          <div class="flex flex-col items-stretch sm:items-end gap-1">
            <button
              type="button"
              data-testid="nueva-toma"
              (click)="nuevaToma.emit()"
              [disabled]="!puedeAbrir()"
              class="min-h-[44px] px-5 rounded-xl bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ abriendo() ? 'Abriendo…' : 'Nueva toma' }}
            </button>
            @if (motivo()) {
              <p class="text-xs text-warm-600" data-testid="nueva-toma-motivo">{{ motivo() }}</p>
            }
          </div>
        </div>

        <ul class="grid gap-2">
          @for (toma of datos.tomas; track toma.idToma) {
            <li
              class="rounded-xl border border-warm-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              [attr.data-testid]="'toma-' + toma.idToma"
            >
              <div class="min-w-0 space-y-0.5">
                <p class="text-sm font-bold text-warm-900">
                  Toma {{ toma.numero }}
                  <span class="font-medium text-warm-600">· {{ toma.modo === 'QR' ? 'Código QR' : 'Manual' }}</span>
                  <span
                    class="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                    [class]="toma.estado === 'ABIERTA' ? 'bg-attendance-present-soft text-attendance-present' : 'bg-warm-100 text-warm-700'"
                  >
                    {{ toma.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada' }}
                  </span>
                </p>
                <p class="text-xs text-warm-600">
                  {{ toma.horasToma }} h · {{ toma.totalPresentes }} presentes · {{ toma.totalAusentes }} ausentes ·
                  {{ toma.totalExcusas }} excusas
                </p>
              </div>
              @if (toma.estado === 'ABIERTA') {
                <button
                  type="button"
                  [attr.data-testid]="'abrir-toma-' + toma.idToma"
                  (click)="seleccionarToma.emit(toma)"
                  class="min-h-[44px] px-4 rounded-xl border border-primary-300 bg-primary-50 text-primary-900 text-sm font-semibold hover:bg-primary-100"
                >
                  {{ toma.modo === 'QR' ? 'Ver proyección' : 'Continuar toma' }}
                </button>
              } @else {
                <button
                  type="button"
                  [attr.data-testid]="'ver-faltantes-' + toma.idToma"
                  (click)="verFaltantes.emit(toma)"
                  class="min-h-[44px] px-4 rounded-xl border border-warm-300 bg-warm-50 text-warm-800 text-sm font-semibold hover:bg-warm-100"
                >
                  Ver faltantes
                </button>
              }
            </li>
          } @empty {
            <li class="text-sm text-warm-500">Aún no hay tomas abiertas en esta sesión.</li>
          }
        </ul>
      } @else {
        <div class="h-16 rounded-xl bg-warm-100 animate-pulse" data-testid="panel-tomas-cargando"></div>
      }
    </section>
  `,
})
export class SessionTomasPanelComponent {
  readonly tomasSesion = input<TomasSesion | null>(null);
  readonly abriendo = input<boolean>(false);

  readonly nuevaToma = output<void>();
  readonly seleccionarToma = output<TomaAsistencia>();
  readonly verFaltantes = output<TomaAsistencia>();

  protected readonly cancelada = computed(() => estaCancelada({ estado: this.tomasSesion()?.estado }));
  protected readonly detalle = computed(() => detalleCancelacion(this.tomasSesion()?.cancelacion));

  protected readonly motivo = computed<string | null>(() => {
    const datos = this.tomasSesion();
    if (!datos) return null;
    if (this.cancelada()) return 'La sesión está cancelada; no se pueden abrir tomas.';
    if (datos.tomas.some((t) => t.estado === 'ABIERTA')) return 'Hay una toma abierta; ciérrala para abrir otra.';
    if (datos.tomas.length >= datos.maximoTomas) return `Se alcanzó el máximo de ${datos.maximoTomas} tomas por sesión.`;
    if (!datos.ventana.abierta) return 'La ventana de asistencia de la sesión está cerrada.';
    return null;
  });

  protected readonly puedeAbrir = computed(() => this.tomasSesion() !== null && this.motivo() === null && !this.abriendo());
}
