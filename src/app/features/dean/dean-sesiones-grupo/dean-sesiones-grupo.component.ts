import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { SesionFacultadItem } from '../../../core/models/facultad-decano.model';
import { SesionEstadoBadgeComponent } from '../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { resolveSessionInstant } from '../../../core/time/session-timezone.util';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ToastService } from '../../../shared/components/toast/toast.component';

/**
 * CULM-001: sesiones de un grupo para la fila expandida del consolidado de asistencia del decano. Solo lectura: usa
 * `GET /decano/sesiones?idGrupo=` (ámbito forzado en el backend); `GET /sesiones/grupo/{id}` es del docente titular.
 */
@Component({
    selector: 'app-dean-sesiones-grupo',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SesionEstadoBadgeComponent, ErrorCargaComponent],
    template: `
    <section class="bg-white p-4 rounded-xl border border-warm-200 space-y-3" aria-label="Sesiones del grupo">
      @if (error(); as e) {
        <app-error-carga [error]="e" (reintentar)="cargar()" />
      } @else if (cargando()) {
        <p class="text-sm text-warm-500 text-center py-4" role="status">Cargando sesiones…</p>
      } @else if (sesiones().length === 0) {
        <p class="text-sm text-warm-500 text-center py-4">El grupo no tiene sesiones programadas.</p>
      } @else {
        <p class="text-xs text-warm-500" data-testid="zona-horaria-sesiones">
          @if (sinZona()) {
            Algunas horas están registradas sin zona horaria confirmada y se muestran tal como las informa el servidor.
          } @else {
            Horas en {{ timeZone.zoneLabel() }}.
          }
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                <th scope="col" class="py-2 pr-3">Sesión</th>
                <th scope="col" class="py-2 pr-3">Semana</th>
                <th scope="col" class="py-2">Fecha y hora</th>
              </tr>
            </thead>
            <tbody>
              @for (s of sesiones(); track s.id) {
                <tr class="border-b border-warm-50" [attr.data-testid]="'sesion-fila-' + s.id">
                  <td class="py-2 pr-3 font-semibold text-warm-900">
                    {{ s.nombre }} <span class="text-warm-400 font-mono">{{ s.codigo }}</span>
                    <app-sesion-estado-badge class="block font-normal" [estado]="s.estado" [cancelacion]="s.cancelacion" />
                  </td>
                  <td class="py-2 pr-3 text-warm-700">{{ s.numeroSemana ?? '—' }}</td>
                  <td class="py-2 text-xs text-warm-600">{{ horario(s) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `
})
export class DeanSesionesGrupoComponent implements OnInit {
  private readonly service = inject(DeanFacultadService);
  private readonly toast = inject(ToastService);
  readonly timeZone = inject(SessionTimeZoneService);

  readonly idGrupo = input.required<string>();

  readonly sesiones = signal<SesionFacultadItem[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<LoadErrorState | null>(null);
  /** APP-04: hay sesiones cuyo horario no es un instante confirmado. */
  readonly sinZona = computed(() => this.timeZone.hasUnzonedValue(this.sesiones().map((s) => this.inicio(s))));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.service.getSesiones({ idGrupo: this.idGrupo(), pagina: 1, tamano: 50 }).subscribe({
      next: (res) => {
        this.sesiones.set(res.elementos ?? []);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.sesiones.set([]);
        this.cargando.set(false);
        this.error.set(classifyLoadError(error));
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }

  horario(sesion: SesionFacultadItem): string {
    return this.timeZone.formatTemporalRange(this.inicio(sesion), this.fin(sesion));
  }

  private inicio(sesion: SesionFacultadItem): string | null {
    return resolveSessionInstant(sesion.fechaHoraInicio, sesion.fechaHoraInicioUtc, sesion.estadoTemporal);
  }

  private fin(sesion: SesionFacultadItem): string | null {
    return resolveSessionInstant(sesion.fechaHoraFin, sesion.fechaHoraFinUtc, sesion.estadoTemporal);
  }
}
