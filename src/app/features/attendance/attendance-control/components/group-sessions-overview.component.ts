import { ResumenAsistenciaEstudiante } from '../../../../core/models/indicadores-asistencia.model';
import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Course } from '../../../../core/models/course.model';
import { ClassSession } from '../../../../core/models/attendance.model';
import { estaCancelada } from '../../../../core/models/sesion-estado.model';
import { ActionMenuComponent, ActionMenuItem } from '../../../../shared/components/action-menu/action-menu.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SesionEstadoBadgeComponent } from '../../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { findActiveOrUpcomingSession } from '../../../../core/utils/session-selection.util';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';

@Component({
    selector: 'app-group-sessions-overview',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonComponent, SesionEstadoBadgeComponent, ActionMenuComponent, EmptyStateComponent],
    host: {
        class: 'block w-full'
    },
    template: `
    <div class="space-y-6 animate-fade-in">
      <!-- 1. BENTO GRID DE KPIs GLOBALES DEL GRUPO -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- KPI 1: Sesiones Registradas -->
        <div class="bg-white p-5 rounded-2xl border border-warm-200/80 shadow-warm-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-warm-500 uppercase tracking-wider">Cronograma</span>
            <span class="w-8 h-8 rounded-xl bg-primary-50 text-primary-800 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
          </div>
          <div class="mt-4">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-serif font-bold text-warm-900 leading-none">
                {{ totalSesiones() }}
              </span>
              <span class="text-xs text-warm-500 font-medium">sesiones programadas</span>
            </div>
            <p class="text-[11px] text-warm-500 mt-1">
              Sesiones registradas en el período
            </p>
          </div>
        </div>

        <!-- KPI 2: Promedio de Asistencia Global -->
        <div class="bg-white p-5 rounded-2xl border border-warm-200/80 shadow-warm-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-warm-500 uppercase tracking-wider">Asistencia Promedio</span>
            <span class="w-8 h-8 rounded-xl bg-success-50 text-success-700 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div class="mt-4">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-serif font-bold text-warm-900 leading-none">
                {{ promedioAsistencia() === null ? '—' : promedioAsistencia() + '%' }}
              </span>
              @if (promedioAsistencia() !== null) {
                <span class="text-xs text-success-700 font-bold">Institucional</span>
              }
            </div>
            <p class="text-[11px] text-warm-500 mt-1">
              {{ promedioAsistencia() === null ? 'Sin registros de asistencia para calcular' : 'Promedio por horas del grupo' }}
            </p>
          </div>
        </div>

        <!-- KPI 3: Alumnos en riesgo o con pérdida según codigoPermanencia del backend (umbrales parametrizados) -->
        <div class="bg-white p-5 rounded-2xl border border-warm-200/80 shadow-warm-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-warm-500 uppercase tracking-wider">Alerta Inasistencia</span>
            <span class="w-8 h-8 rounded-xl bg-warning-50 text-warning-800 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div class="mt-4">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-serif font-bold text-warning-900 leading-none">
                {{ estudiantesEnRiesgo() }}
              </span>
              <span class="text-xs text-warning-800 font-semibold">Alumnos</span>
            </div>
            <p class="text-[11px] text-warning-700 mt-1">En riesgo o con pérdida por inasistencia (horas)</p>
          </div>
        </div>

        <!-- KPI 4: Próxima Sesión / Acción Rápida -->
        <div class="bg-gradient-to-br from-primary-950 via-warm-950 to-primary-900 text-white p-5 rounded-2xl shadow-warm-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-mono tracking-widest text-primary-200 uppercase font-semibold">
                Sesión Seleccionada
              </span>
              @if (sesionActivaHoy()) {
                <span class="px-2 py-0.5 rounded-full bg-success-500/20 text-success-300 text-[10px] font-bold border border-success-400/30">
                  Hoy
                </span>
              }
            </div>
            <h4 class="font-serif font-bold text-sm text-white mt-2 truncate">
              {{ sesionActivaHoy()?.title || (sesionReciente() ? '#' + sesionReciente()?.sessionNumber + ' ' + sesionReciente()?.title : 'Sin sesiones') }}
            </h4>
            <p class="text-[11px] text-warm-300 mt-0.5">
              {{ displayDate(sesionActivaHoy() || sesionReciente()) || 'Sin programar' }}
            </p>
          </div>

          <div class="mt-4">
            @if (sesionActivaHoy()) {
              <app-button
                variant="accent"
                size="sm"
                (clicked)="selectSession.emit(sesionActivaHoy()!.id)"
              >
                Tomar Lista Ahora
              </app-button>
            } @else if (sesionReciente()) {
              <app-button
                variant="secondary"
                size="sm"
                (clicked)="selectSession.emit(sesionReciente()!.id)"
              >
                Abrir Sesión #{{ sesionReciente()?.sessionNumber }}
              </app-button>
            }
          </div>
        </div>
      </div>

      <!-- 2. CABECERA DE LA TABLA PANORÁMICA DE SESIONES -->
      <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm overflow-hidden">
        <div class="p-5 border-b border-warm-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold text-warm-500 uppercase tracking-widest">
                {{ course()?.code ? course()?.code + ' • ' : '' }}{{ course()?.section }}
              </span>
              <span class="text-xs text-warm-400">•</span>
              <span class="text-xs text-warm-600 font-medium">{{ course()?.name }}</span>
            </div>
            <h2 class="font-serif font-bold text-xl text-warm-900 tracking-tight">
              Historial y Cronograma de Sesiones
            </h2>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto" data-testid="acciones-grupo">
            <app-button variant="primary" size="sm" (clicked)="openNewSession.emit()">
              + Nueva Sesión
            </app-button>
            <app-action-menu
              label="Más acciones del grupo"
              [texto]="textoMenu()"
              [items]="accionesGrupo()"
              (selected)="alElegirAccion($event)"
            />
          </div>
        </div>

        <!-- 3. TABLA PANORÁMICA DE SESIONES -->
        @if (sessions().length === 0) {
          <div class="p-4" data-testid="sesiones-vacio">
            <app-empty-state
              title="No hay sesiones registradas"
              description="Crea la primera sesión de clase para comenzar a registrar la asistencia académica del grupo."
            >
              <app-button empty-action variant="primary" size="sm" (clicked)="openNewSession.emit()">
                Programar Primera Sesión
              </app-button>
            </app-empty-state>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-warm-800">
              <thead class="bg-warm-50 border-b border-warm-200 text-[11px] font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3.5"># Sesión</th>
                  <th class="px-5 py-3.5">Fecha y Horario</th>
                  <th class="px-5 py-3.5">Título</th>
                  <th class="px-5 py-3.5 text-center">Asistentes</th>
                  <th class="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (s of sessions(); track s.id) {
                  <tr
                    (click)="selectSession.emit(s.id)"
                    class="hover:bg-primary-50/50 cursor-pointer transition-colors group"
                    title="Haz clic para abrir la toma de asistencia de esta sesión"
                  >
                    <td class="px-5 py-4 font-mono font-bold text-primary-800 group-hover:text-primary-950">
                      Sesión #{{ s.sessionNumber }}
                    </td>
                    <td class="px-5 py-4">
                      @if (s.estadoTemporal === 'INDETERMINADA') {
                        <div class="font-semibold text-warning-800">Horario no confirmado</div>
                      } @else {
                        <div class="font-semibold text-warm-900">{{ timeZone.displaySessionDate(s) }}{{ timeZone.displaySessionEndDate(s) !== timeZone.displaySessionDate(s) ? ' – ' + timeZone.displaySessionEndDate(s) : '' }}</div>
                        <div class="text-[11px] text-warm-500 font-mono">{{ timeZone.displaySessionStartTime(s) }} - {{ timeZone.displaySessionEndTime(s) }}</div>
                      }
                    </td>
                    <td class="px-5 py-4 max-w-xs">
                      <span class="font-medium text-warm-900 block truncate" [title]="s.title">
                        {{ s.title }}
                      </span>
                      <app-sesion-estado-badge [estado]="s.estado" [cancelacion]="s.cancelacion" />
                    </td>
                    <td class="px-5 py-4 text-center" [attr.data-testid]="'asistentes-sesion-' + s.sessionNumber">
                      <span class="font-bold text-warm-900">
                        {{ getPresentesCount(s) }}
                      </span>
                      <span class="text-warm-500 font-normal"> / {{ s.records ? s.records.length : 0 }}</span>
                      @if (getJustificadasCount(s) > 0) {
                        <span class="block text-[11px] font-semibold text-warning-700">
                          {{ getJustificadasCount(s) }} {{ getJustificadasCount(s) === 1 ? 'justificada' : 'justificadas' }}
                        </span>
                      }
                    </td>
                    <td class="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <app-button
                        variant="accent"
                        size="sm"
                        (clicked)="$event.stopPropagation(); selectSession.emit(s.id)"
                      >
                        Tomar Asistencia
                      </app-button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class GroupSessionsOverviewComponent {
  readonly timeZone = inject(SessionTimeZoneService);
  course = input<Course | undefined>(undefined);
  sessions = input<ClassSession[]>([]);
  totalReclamosPendientes = input<number>(0);

  selectSession = output<string>();
  openNewSession = output<void>();
  openEnrollment = output<void>();
  openMatriculaQr = output<void>();
  exportExcel = output<void>();
  verAlumnos = output<void>();
  /** HU051: abre el hub del grupo del docente (padrón con retiro). */
  gestionarPadron = output<void>();
  verReclamos = output<void>();

  /** Acciones secundarias del grupo: se agrupan en "Mas acciones" para dejar una sola accion primaria visible. */
  readonly accionesGrupo = computed<ActionMenuItem[]>(() => {
    const pendientes = this.totalReclamosPendientes();
    return [
      { id: 'matricula-qr', label: 'QR / PIN de matrícula', testid: 'grupo-matricula-qr' },
      { id: 'matricular', label: 'Matricular estudiante', testid: 'grupo-matricular' },
      { id: 'alumnos', label: 'Info y alumnos', testid: 'grupo-alumnos' },
      { id: 'padron', label: 'Padrón y retiros', testid: 'padron' },
      { id: 'reclamos', label: pendientes > 0 ? `Reclamos (${pendientes})` : 'Reclamos', testid: 'grupo-reclamos' },
    ];
  });
  readonly textoMenu = computed(() => (this.totalReclamosPendientes() > 0 ? `Más (${this.totalReclamosPendientes()})` : 'Más'));

  alElegirAccion(id: string): void {
    const acciones: Record<string, () => void> = {
      'matricula-qr': () => this.openMatriculaQr.emit(),
      matricular: () => this.openEnrollment.emit(),
      alumnos: () => this.verAlumnos.emit(),
      padron: () => this.gestionarPadron.emit(),
      reclamos: () => this.verReclamos.emit(),
    };
    acciones[id]?.();
  }

  /** Sesiones vigentes: una sesión cancelada no cuenta como clase dictada (CULM-001 B.1). */
  private vigentes = computed(() => this.sessions().filter((s) => !estaCancelada(s)));

  totalSesiones = computed(() => this.vigentes().length);

  /** CULM-001 B.2 (F-DOC-004): resumen por horas del grupo, entregado por el backend. */
  resumen = input<ResumenAsistenciaEstudiante[]>([]);

  /** Promedio de `porcentajeAsistencia` de filas ya calculadas por el backend; el cliente no aplica reglas de negocio. */
  promedioAsistencia = computed(() => {
    const filas = this.resumen();
    if (filas.length === 0) return null;
    return Math.round(filas.reduce((suma, r) => suma + r.porcentajeAsistencia, 0) / filas.length);
  });

  /** Cantidad de estudiantes con `codigoPermanencia` RIESGO o PERDIDA en el resumen. */
  estudiantesEnRiesgo = computed(
    () => this.resumen().filter((r) => r.codigoPermanencia === 'RIESGO' || r.codigoPermanencia === 'PERDIDA').length
  );

  sesionRecomendada = computed(() => {
    return findActiveOrUpcomingSession(this.sessions());
  });

  sesionActivaHoy = computed(() => {
    const hoy = this.timeZone.currentDate();
    const recomendada = this.sesionRecomendada();
    if (recomendada && (recomendada.date === hoy || this.timeZone.displaySessionDate(recomendada) === hoy)) {
      return recomendada;
    }
    return this.sessions().find((s) =>
      s.estadoTemporal !== 'INDETERMINADA' && this.timeZone.displaySessionDate(s) === hoy
    );
  });

  sesionReciente = computed(() => {
    return this.sesionRecomendada();
  });

  /** SES-05: solo AN es asistencia presencial; EX es una ausencia justificada y se informa aparte. */
  getPresentesCount(session: ClassSession): number {
    if (!session.records) return 0;
    return session.records.filter((r) => r.status === 'AN').length;
  }

  getJustificadasCount(session: ClassSession): number {
    if (!session.records) return 0;
    return session.records.filter((r) => r.status === 'EX').length;
  }

  displayDate(session: ClassSession | undefined): string {
    if (!session) return '';
    return session.estadoTemporal === 'INDETERMINADA'
      ? 'Horario no confirmado'
      : this.timeZone.displaySessionDate(session);
  }
}
