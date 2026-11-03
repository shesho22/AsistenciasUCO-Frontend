import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { SesionFacultadItem } from '../../../core/models/facultad-decano.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';

/** HU145: cronograma de las sesiones de clase programadas en la facultad, por rango de fechas. Solo lectura. */
@Component({
  selector: 'app-dean-cronograma',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, PaginationComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">Decanatura</span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Cronograma</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Sesiones de la Facultad</h1>
          <p class="text-sm text-warm-600 mt-1">Sesiones de clase programadas en los grupos de los programas de tu facultad.</p>
        </div>
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
          <p class="text-sm text-warm-500 text-center py-6">No hay sesiones programadas en el rango seleccionado.</p>
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
                  <th class="py-2 pr-3">Fecha y hora</th>
                  <th class="py-2 pr-3">Sesión</th>
                  <th class="py-2 pr-3">Asignatura · Grupo</th>
                  <th class="py-2">Programa</th>
                </tr>
              </thead>
              <tbody>
                @for (s of sesiones(); track s.id) {
                  <tr class="border-b border-warm-50">
                    <td class="py-2 pr-3 text-xs text-warm-600">{{ timeZone.formatTemporalRange(s.fechaHoraInicio, s.fechaHoraFin) }}</td>
                    <td class="py-2 pr-3 font-semibold text-warm-900">{{ s.nombre }} <span class="text-warm-400 font-mono">{{ s.codigo }}</span></td>
                    <td class="py-2 pr-3 text-warm-700">{{ s.nombreAsignatura }} · {{ s.nombreGrupo }}</td>
                    <td class="py-2 text-warm-700">{{ s.nombrePrograma }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <app-pagination
          [totalItems]="total()"
          [pageSize]="tamano()"
          [currentPage]="pagina()"
          (pageChange)="onPagina($event)"
          (pageSizeChange)="onTamano($event)"
        ></app-pagination>
      </section>
    </div>
  `,
})
export class DeanCronogramaComponent implements OnInit {
  private readonly service = inject(DeanFacultadService);
  private readonly toast = inject(ToastService);
  readonly timeZone = inject(SessionTimeZoneService);

  sesiones = signal<SesionFacultadItem[]>([]);
  /** APP-04: el contrato v1 del decano entrega `LocalDateTime` sin zona; se muestra literal e identificado. */
  sinZona = computed(() => this.timeZone.hasUnzonedValue(this.sesiones().map((s) => s.fechaHoraInicio)));
  total = signal(0);
  pagina = signal(1);
  tamano = signal(20);
  cargando = signal(false);
  desde = signal('');
  hasta = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  filtrar(): void {
    if (this.desde() && this.hasta() && this.desde() > this.hasta()) {
      this.toast.error('La fecha desde no puede ser posterior a la fecha hasta.');
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
          this.sesiones.set(res.datos ?? []);
          this.total.set(Number(res.total ?? 0));
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.sesiones.set([]);
          this.total.set(0);
          this.cargando.set(false);
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }
}
