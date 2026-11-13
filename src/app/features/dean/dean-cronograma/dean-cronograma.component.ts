import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

import { FormsModule } from '@angular/forms';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { SesionEstadoBadgeComponent } from '../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { SesionFacultadItem } from '../../../core/models/facultad-decano.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { resolveSessionInstant } from '../../../core/time/session-timezone.util';
import { mensajeUi } from '../../../core/messages/mensajes-ui';

/** HU145: cronograma de las sesiones de clase programadas en la facultad, por rango de fechas. Solo lectura. */
@Component({
    selector: 'app-dean-cronograma',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [EmptyStateComponent, FormsModule, PaginationComponent, SesionEstadoBadgeComponent],
    template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        @if (!embebido()) {
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">Decanatura</span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Cronograma</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Sesiones de la Facultad</h1>
          <p class="text-sm text-warm-600 mt-1">Sesiones de clase programadas en los grupos de los programas de tu facultad.</p>
        </div>
        }
        <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">{{ total() }} Sesiones</span>
      </div>

      <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
        <div class="flex flex-wrap items-end gap-2 text-xs">
          <label class="flex flex-col text-warm-500">Desde
            <input type="date" aria-label="Desde" [ngModel]="desde()" (ngModelChange)="desde.set($event)" class="px-2 py-1.5 border border-warm-200 rounded-lg text-warm-900" />
          </label>
          <label class="flex flex-col text-warm-500">Hasta
            <input type="date" aria-label="Hasta" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" class="px-2 py-1.5 border border-warm-200 rounded-lg text-warm-900" />
          </label>
          <button type="button" class="px-3 py-1.5 rounded-lg bg-primary-600 text-white font-semibold" (click)="filtrar()">Filtrar</button>
        </div>

        @if (sesiones().length === 0 && !cargando()) {
          <app-empty-state
            variant="search"
            title="No hay sesiones programadas en el rango seleccionado."
            causa="Amplía el rango de fechas para ver más sesiones de la facultad."
          />
        } @else {
          <p class="text-xs text-warm-500" data-testid="zona-horaria-cronograma">
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
                  <th scope="col" class="py-2 pr-3">Fecha y hora</th>
                  <th scope="col" class="py-2 pr-3">Sesión</th>
                  <th scope="col" class="py-2 pr-3">Asignatura · Grupo</th>
                </tr>
              </thead>
              <tbody>
                @for (s of sesiones(); track s.id) {
                  <tr class="border-b border-warm-50" [attr.data-testid]="'sesion-fila-' + s.id">
                    <td class="py-2 pr-3 text-xs text-warm-600">{{ horario(s) }}</td>
                    <td class="py-2 pr-3 font-semibold text-warm-900">
                      {{ s.nombre }} <span class="text-warm-400 font-mono">{{ s.codigo }}</span>
                      <app-sesion-estado-badge class="block font-normal" [estado]="s.estado" [cancelacion]="s.cancelacion" />
                    </td>
                    <td class="py-2 pr-3 text-warm-700">{{ s.nombreAsignatura }} · {{ s.nombreGrupo }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <app-pagination
          [totalItems]="total()"
          [totalPages]="totalPaginas()"
          [pageSize]="tamano()"
          [currentPage]="pagina()"
          (pageChange)="onPagina($event)"
          (pageSizeChange)="onTamano($event)"
        ></app-pagination>
      </section>
    </div>
  `
})
export class DeanCronogramaComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly service = inject(DeanFacultadService);
  private readonly toast = inject(ToastService);
  readonly timeZone = inject(SessionTimeZoneService);

  sesiones = signal<SesionFacultadItem[]>([]);
  /**
   * APP-04: solo la sesion con procedencia CONFIRMADA trae un instante UTC (mismo criterio que el cronograma del
   * coordinador); el resto conserva el valor v1 sin zona, que se muestra literal e identificado.
   */
  sinZona = computed(() => this.timeZone.hasUnzonedValue(this.sesiones().map((s) => this.inicio(s))));
  total = signal(0);
  totalPaginas = signal(0);
  pagina = signal(1);
  tamano = signal(20);
  cargando = signal(false);
  desde = signal('');
  hasta = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  /** Horario de la sesion en la zona efectiva; el valor sin zona se muestra literal (APP-04). */
  horario(sesion: SesionFacultadItem): string {
    return this.timeZone.formatTemporalRange(this.inicio(sesion), this.fin(sesion));
  }

  private inicio(sesion: SesionFacultadItem): string | null {
    return resolveSessionInstant(sesion.fechaHoraInicio, sesion.fechaHoraInicioUtc, sesion.estadoTemporal);
  }

  private fin(sesion: SesionFacultadItem): string | null {
    return resolveSessionInstant(sesion.fechaHoraFin, sesion.fechaHoraFinUtc, sesion.estadoTemporal);
  }

  filtrar(): void {
    if (this.desde() && this.hasta() && this.desde() > this.hasta()) {
      this.toast.error(mensajeUi('UI_COORDINATOR_SESIONES_GRUPO_002'));
      return;
    }
    this.pagina.set(1);
    this.cargar();
  }

  onPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  onTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.service
      .getSesiones({ desde: this.desde(), hasta: this.hasta(), pagina: this.pagina(), tamano: this.tamano() })
      .subscribe({
        next: (res) => {
          this.sesiones.set(res.elementos ?? (res as any).datos ?? []);
          this.total.set(Number(res.totalElementos ?? (res as any).total ?? 0));
          this.totalPaginas.set(res.totalPaginas ?? Math.max(1, Math.ceil(this.total() / this.tamano())));
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.sesiones.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.cargando.set(false);
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }
}
