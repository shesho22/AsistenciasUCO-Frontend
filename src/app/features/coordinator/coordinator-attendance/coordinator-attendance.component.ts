import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import {
  AsistenciaSesionItem,
  GrupoProgramaItem,
  SesionGrupoItem,
} from '../../../core/models/asistencia-programa.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { SesionEstadoBadgeComponent } from '../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { resolveSessionInstant } from '../../../core/time/session-timezone.util';

type FiltroAsistio = 'TODOS' | 'ASISTIO' | 'NO_ASISTIO';

/**
 * HU064 (grupos del programa), HU060 (sesiones con registro de asistencia por grupo) y HU061 (detalle de la
 * asistencia de cada estudiante). Solo lectura: el backend limita los datos al programa del coordinador.
 */
@Component({
  selector: 'app-coordinator-attendance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent, SesionEstadoBadgeComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">
              Coordinación de Programa
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Seguimiento de Asistencia</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Asistencias del Programa</h1>
          <p class="text-sm text-warm-600 mt-1">
            Consulta los grupos de tu programa, sus sesiones y el detalle de asistencia de cada estudiante.
          </p>
        </div>
        <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
          {{ totalGrupos() }} Grupos
        </span>
      </div>

      <!-- HU064: grupos del programa -->
      <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
        <h2 class="font-serif font-bold text-lg text-warm-900">Grupos del programa</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            aria-label="Período académico"
            [ngModel]="idPeriodo()"
            (ngModelChange)="onPeriodoChange($event)"
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
          >
            <option value="">Todos los períodos</option>
            @for (p of periodos(); track p.id) {
              <option [value]="p.id">{{ p.nombre || p.codigo }}</option>
            }
          </select>
          <input
            type="text"
            aria-label="Buscar grupo"
            [ngModel]="busqueda()"
            (ngModelChange)="busqueda.set($event)"
            (keyup.enter)="buscarGrupos()"
            placeholder="Buscar por grupo o asignatura y presiona Enter..."
            class="sm:col-span-2 px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
          />
        </div>

        @if (grupos().length === 0 && !cargandoGrupos()) {
          <p class="text-sm text-warm-500 text-center py-6">No hay grupos para los filtros seleccionados.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Grupo</th>
                  <th scope="col" class="py-2 pr-3">Asignatura</th>
                  <th scope="col" class="py-2 pr-3">Período</th>
                  <th scope="col" class="py-2 pr-3">Cupo</th>
                  <th scope="col" class="py-2 pr-3">Estado</th>
                  <th scope="col" class="py-2"></th>
                </tr>
              </thead>
              <tbody>
                @for (g of grupos(); track g.id) {
                  <tr class="border-b border-warm-50" [class.bg-primary-50]="grupoSeleccionado()?.id === g.id">
                    <td class="py-2 pr-3 font-semibold text-warm-900">{{ g.nombre }} <span class="text-warm-400 font-mono">#{{ g.codigo }}</span></td>
                    <td class="py-2 pr-3 text-warm-700">{{ g.nombreAsignatura }}</td>
                    <td class="py-2 pr-3 text-warm-600 text-xs">{{ g.inicioPeriodo | date: 'dd/MM/yyyy' }} – {{ g.finPeriodo | date: 'dd/MM/yyyy' }}</td>
                    <td class="py-2 pr-3 text-warm-700">{{ g.estudiantesActivos ?? 0 }} / {{ g.capacidadMaxima ?? '—' }}</td>
                    <td class="py-2 pr-3">
                      <app-badge [variant]="g.habilitado ? 'success' : 'neutral'">{{ g.habilitado ? 'Habilitado' : 'Inhabilitado' }}</app-badge>
                    </td>
                    <td class="py-2 text-right">
                      <button type="button" class="text-xs font-semibold text-primary-700 hover:underline" (click)="seleccionarGrupo(g)">
                        Ver sesiones
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <app-pagination
          [totalItems]="totalGrupos()"
          [pageSize]="tamanoGrupos()"
          [currentPage]="paginaGrupos()"
          (pageChange)="onPaginaGrupos($event)"
          (pageSizeChange)="onTamanoGrupos($event)"
        ></app-pagination>
      </section>

      <!-- HU060: sesiones del grupo con registro de asistencia -->
      @if (grupoSeleccionado(); as grupo) {
        <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <h2 class="font-serif font-bold text-lg text-warm-900">Sesiones de {{ grupo.nombre }} · {{ grupo.nombreAsignatura }}</h2>
            <div class="flex flex-wrap items-end gap-2 text-xs">
              <label class="flex flex-col text-warm-500">Desde
                <input type="date" aria-label="Desde" [ngModel]="desde()" (ngModelChange)="desde.set($event)" class="px-2 py-1.5 border border-warm-200 rounded-lg text-warm-900" />
              </label>
              <label class="flex flex-col text-warm-500">Hasta
                <input type="date" aria-label="Hasta" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" class="px-2 py-1.5 border border-warm-200 rounded-lg text-warm-900" />
              </label>
              <button type="button" class="px-3 py-1.5 rounded-lg bg-primary-600 text-white font-semibold" (click)="filtrarSesiones()">Filtrar</button>
            </div>
          </div>
          @if (sesiones().length === 0 && !cargandoSesiones()) {
            <p class="text-sm text-warm-500 text-center py-6">El grupo no tiene sesiones en el rango seleccionado.</p>
          } @else {
            <p class="text-xs text-warm-500" data-testid="zona-horaria-sesiones">
              @if (sesionesSinZona()) {
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
                    <th scope="col" class="py-2 pr-3">Fecha y hora</th>
                    <th scope="col" class="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of sesiones(); track s.id) {
                    <tr class="border-b border-warm-50" [class.bg-primary-50]="sesionSeleccionada()?.id === s.id" [attr.data-testid]="'sesion-fila-' + s.id">
                      <td class="py-2 pr-3 font-semibold text-warm-900">
                        {{ s.nombre }} <span class="text-warm-400 font-mono">{{ s.codigo }}</span>
                        <app-sesion-estado-badge class="block font-normal" [estado]="s.estado" [cancelacion]="s.cancelacion" />
                      </td>
                      <td class="py-2 pr-3 text-warm-700">{{ s.numeroSemana ?? '—' }}</td>
                      <td class="py-2 pr-3 text-warm-600 text-xs">{{ horario(s) }}</td>
                      <td class="py-2 text-right">
                        <button type="button" class="text-xs font-semibold text-primary-700 hover:underline" (click)="seleccionarSesion(s)">
                          Ver asistencia
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <app-pagination
            [totalItems]="totalSesiones()"
            [pageSize]="tamanoSesiones()"
            [currentPage]="paginaSesiones()"
            (pageChange)="onPaginaSesiones($event)"
            (pageSizeChange)="onTamanoSesiones($event)"
          ></app-pagination>
        </section>
      }

      <!-- HU061: detalle de asistencia por estudiante -->
      @if (sesionSeleccionada(); as sesion) {
        <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 class="font-serif font-bold text-lg text-warm-900">Asistencia · {{ sesion.nombre }}</h2>
              <p class="text-xs text-warm-500">
                {{ horario(sesion) }} ·
                {{ presentesPagina() }} presentes / {{ ausentesPagina() }} ausentes en esta página
              </p>
            </div>
            <select
              aria-label="Filtro de asistencia"
              [ngModel]="filtroAsistio()"
              (ngModelChange)="onFiltroAsistio($event)"
              class="px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
            >
              <option value="TODOS">Todos</option>
              <option value="ASISTIO">Asistieron</option>
              <option value="NO_ASISTIO">No asistieron</option>
            </select>
          </div>
          @if (asistencias().length === 0 && !cargandoAsistencias()) {
            <p class="text-sm text-warm-500 text-center py-6">No hay registros de asistencia para esta sesión.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                    <th scope="col" class="py-2 pr-3">Estudiante</th>
                    <th scope="col" class="py-2 pr-3">Documento</th>
                    <th scope="col" class="py-2 pr-3">Asistencia</th>
                    <th scope="col" class="py-2">Razón / causa</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of asistencias(); track a.idDetalleAsistencia) {
                    <tr class="border-b border-warm-50">
                      <td class="py-2 pr-3 font-semibold text-warm-900">{{ a.nombreCompleto }}</td>
                      <td class="py-2 pr-3 text-warm-600 font-mono text-xs">{{ a.numeroIdentificacion || '—' }}</td>
                      <td class="py-2 pr-3">
                        <app-badge [variant]="a.asistio ? 'success' : 'danger'">{{ a.asistio ? 'Asistió' : 'No asistió' }}</app-badge>
                      </td>
                      <td class="py-2 text-warm-700 text-xs">{{ a.nombreRazonCausa || a.codigoRazonCausa || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <app-pagination
            [totalItems]="totalAsistencias()"
            [pageSize]="tamanoAsistencias()"
            [currentPage]="paginaAsistencias()"
            (pageChange)="onPaginaAsistencias($event)"
            (pageSizeChange)="onTamanoAsistencias($event)"
          ></app-pagination>
        </section>
      }
    </div>
  `,
})
export class CoordinatorAttendanceComponent implements OnInit {
  private readonly service = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  readonly timeZone = inject(SessionTimeZoneService);

  periodos = signal<PeriodoAcademicoItem[]>([]);
  idPeriodo = signal('');
  busqueda = signal('');

  grupos = signal<GrupoProgramaItem[]>([]);
  totalGrupos = signal(0);
  paginaGrupos = signal(1);
  tamanoGrupos = signal(10);
  cargandoGrupos = signal(false);
  grupoSeleccionado = signal<GrupoProgramaItem | null>(null);

  sesiones = signal<SesionGrupoItem[]>([]);
  totalSesiones = signal(0);
  paginaSesiones = signal(1);
  tamanoSesiones = signal(10);
  cargandoSesiones = signal(false);
  desde = signal('');
  hasta = signal('');
  sesionSeleccionada = signal<SesionGrupoItem | null>(null);

  asistencias = signal<AsistenciaSesionItem[]>([]);
  totalAsistencias = signal(0);
  paginaAsistencias = signal(1);
  tamanoAsistencias = signal(20);
  cargandoAsistencias = signal(false);
  filtroAsistio = signal<FiltroAsistio>('TODOS');

  /** APP-04: hay sesiones cuyo horario no es un instante confirmado (v1 sin zona o INDETERMINADA). */
  sesionesSinZona = computed(() =>
    this.timeZone.hasUnzonedValue(this.sesiones().map((s) => this.inicio(s)))
  );

  presentesPagina = computed(() => this.asistencias().filter((a) => a.asistio).length);
  ausentesPagina = computed(() => this.asistencias().filter((a) => !a.asistio).length);

  /** Horario de la sesión en la zona efectiva; el valor sin zona se muestra literal (APP-04). */
  horario(sesion: SesionGrupoItem): string {
    return this.timeZone.formatTemporalRange(this.inicio(sesion), this.fin(sesion));
  }

  private inicio(sesion: SesionGrupoItem): string | null {
    return resolveSessionInstant(sesion.fechaHoraInicio, sesion.fechaHoraInicioUtc, sesion.estadoTemporal);
  }

  private fin(sesion: SesionGrupoItem): string | null {
    return resolveSessionInstant(sesion.fechaHoraFin, sesion.fechaHoraFinUtc, sesion.estadoTemporal);
  }

  ngOnInit(): void {
    this.service.getPeriodosAcademicos().subscribe({
      next: (res) => this.periodos.set(res.datos ?? []),
      error: () => this.periodos.set([]),
    });
    this.cargarGrupos();
  }

  onPeriodoChange(idPeriodo: string): void {
    this.idPeriodo.set(idPeriodo);
    this.buscarGrupos();
  }

  buscarGrupos(): void {
    this.paginaGrupos.set(1);
    this.cargarGrupos();
  }

  onPaginaGrupos(pagina: number): void {
    this.paginaGrupos.set(pagina);
    this.cargarGrupos();
  }

  onTamanoGrupos(tamano: number): void {
    this.tamanoGrupos.set(tamano);
    this.buscarGrupos();
  }

  seleccionarGrupo(grupo: GrupoProgramaItem): void {
    this.grupoSeleccionado.set(grupo);
    this.sesionSeleccionada.set(null);
    this.asistencias.set([]);
    this.paginaSesiones.set(1);
    this.cargarSesiones();
  }

  filtrarSesiones(): void {
    if (this.desde() && this.hasta() && this.desde() > this.hasta()) {
      this.toast.error('La fecha desde no puede ser posterior a la fecha hasta.');
      return;
    }
    this.paginaSesiones.set(1);
    this.cargarSesiones();
  }

  onPaginaSesiones(pagina: number): void {
    this.paginaSesiones.set(pagina);
    this.cargarSesiones();
  }

  onTamanoSesiones(tamano: number): void {
    this.tamanoSesiones.set(tamano);
    this.paginaSesiones.set(1);
    this.cargarSesiones();
  }

  seleccionarSesion(sesion: SesionGrupoItem): void {
    this.sesionSeleccionada.set(sesion);
    this.paginaAsistencias.set(1);
    this.cargarAsistencias();
  }

  onFiltroAsistio(filtro: FiltroAsistio): void {
    this.filtroAsistio.set(filtro);
    this.paginaAsistencias.set(1);
    this.cargarAsistencias();
  }

  onPaginaAsistencias(pagina: number): void {
    this.paginaAsistencias.set(pagina);
    this.cargarAsistencias();
  }

  onTamanoAsistencias(tamano: number): void {
    this.tamanoAsistencias.set(tamano);
    this.paginaAsistencias.set(1);
    this.cargarAsistencias();
  }

  private cargarGrupos(): void {
    this.cargandoGrupos.set(true);
    this.service
      .getGruposPrograma({
        idPeriodo: this.idPeriodo(),
        busqueda: this.busqueda(),
        pagina: this.paginaGrupos(),
        tamano: this.tamanoGrupos(),
      })
      .subscribe({
        next: (res) => {
          this.grupos.set(res.datos ?? []);
          this.totalGrupos.set(Number(res.total ?? 0));
          this.cargandoGrupos.set(false);
        },
        error: (error: unknown) => {
          this.grupos.set([]);
          this.totalGrupos.set(0);
          this.cargandoGrupos.set(false);
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }

  private cargarSesiones(): void {
    const grupo = this.grupoSeleccionado();
    if (!grupo) {
      return;
    }
    this.cargandoSesiones.set(true);
    this.service
      .getSesionesGrupo(grupo.id, {
        desde: this.desde(),
        hasta: this.hasta(),
        pagina: this.paginaSesiones(),
        tamano: this.tamanoSesiones(),
      })
      .subscribe({
        next: (res) => {
          this.sesiones.set(res.datos ?? []);
          this.totalSesiones.set(Number(res.total ?? 0));
          this.cargandoSesiones.set(false);
        },
        error: (error: unknown) => {
          this.sesiones.set([]);
          this.totalSesiones.set(0);
          this.cargandoSesiones.set(false);
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }

  private cargarAsistencias(): void {
    const sesion = this.sesionSeleccionada();
    if (!sesion) {
      return;
    }
    const filtro = this.filtroAsistio();
    this.cargandoAsistencias.set(true);
    this.service
      .getAsistenciasSesion(sesion.id, {
        asistio: filtro === 'TODOS' ? null : filtro === 'ASISTIO',
        pagina: this.paginaAsistencias(),
        tamano: this.tamanoAsistencias(),
      })
      .subscribe({
        next: (res) => {
          this.asistencias.set(res.datos ?? []);
          this.totalAsistencias.set(Number(res.total ?? 0));
          this.cargandoAsistencias.set(false);
        },
        error: (error: unknown) => {
          this.asistencias.set([]);
          this.totalAsistencias.set(0);
          this.cargandoAsistencias.set(false);
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }
}
