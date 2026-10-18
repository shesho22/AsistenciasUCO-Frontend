import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Course } from '../../../../core/models/course.model';
import { ClassSession } from '../../../../core/models/attendance.model';
import { findActiveOrUpcomingSession } from '../../../../core/utils/session-selection.util';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';

@Component({
  selector: 'app-group-sessions-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent],
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
            <span class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div class="mt-4">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-serif font-bold text-warm-900 leading-none">
                {{ promedioAsistencia() }}%
              </span>
              <span class="text-xs text-emerald-700 font-bold">Institucional</span>
            </div>
            <p class="text-[11px] text-warm-500 mt-1">Promedio de registros en actas</p>
          </div>
        </div>

        <!-- KPI 3: Alumnos en Riesgo (>20% inasistencia) -->
        <div class="bg-white p-5 rounded-2xl border border-warm-200/80 shadow-warm-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-warm-500 uppercase tracking-wider">Alerta Inasistencia</span>
            <span class="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div class="mt-4">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl sm:text-3xl font-serif font-bold text-amber-900 leading-none">
                {{ estudiantesEnRiesgo() }}
              </span>
              <span class="text-xs text-amber-800 font-semibold">Alumnos</span>
            </div>
            <p class="text-[11px] text-amber-700 mt-1">Cercanos o superiores al límite del 20%</p>
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
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
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
            } @else {
              <app-button
                variant="primary"
                size="sm"
                (clicked)="openNewSession.emit()"
              >
                + Nueva Sesión
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
                {{ course()?.code }} • Grupo {{ course()?.section }}
              </span>
              <span class="text-xs text-warm-400">•</span>
              <span class="text-xs text-warm-600 font-medium">{{ course()?.name }}</span>
            </div>
            <h2 class="font-serif font-bold text-xl text-warm-900 tracking-tight">
              Historial y Cronograma de Sesiones
            </h2>
          </div>

          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              (click)="openMatriculaQr.emit()"
              class="text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              title="Ver código PIN y QR para que los estudiantes se matriculen al grupo"
            >
              <svg class="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>QR / PIN Matrícula</span>
            </button>

            <button
              type="button"
              (click)="openEnrollment.emit()"
              class="text-xs font-semibold text-warm-700 hover:text-warm-900 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              title="Registrar y matricular manualmente un nuevo alumno en este grupo"
            >
              <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>+ Matricular</span>
            </button>

            <button
              type="button"
              (click)="verAlumnos.emit()"
              class="text-xs font-semibold text-warm-700 hover:text-warm-900 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              title="Ver información del grupo y lista de alumnos matriculados"
            >
              <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Info & Alumnos</span>
            </button>

            <button
              type="button"
              (click)="verReclamos.emit()"
              class="text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              title="Ver justificaciones y reclamos de asistencia del grupo"
            >
              <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Reclamos</span>
              @if (totalReclamosPendientes() > 0) {
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  {{ totalReclamosPendientes() }}
                </span>
              }
            </button>

            <span class="hidden sm:inline-block h-4 w-px bg-warm-200 mx-0.5"></span>

            <app-button
              variant="primary"
              size="sm"
              (clicked)="openNewSession.emit()"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              + Nueva Sesión
            </app-button>
          </div>
        </div>

        <!-- 3. TABLA PANORÁMICA DE SESIONES -->
        @if (sessions().length === 0) {
          <div class="p-12 text-center">
            <div class="w-12 h-12 rounded-full bg-warm-100 text-warm-500 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="font-serif font-bold text-warm-900 text-base">No hay sesiones registradas</h3>
            <p class="text-xs text-warm-500 mt-1 max-w-sm mx-auto">
              Crea la primera sesión de clase para comenzar a registrar la asistencia académica del grupo.
            </p>
            <div class="mt-4">
              <app-button variant="primary" size="sm" (clicked)="openNewSession.emit()">
                Programar Primera Sesión
              </app-button>
            </div>
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
                        <div class="font-semibold text-amber-800">Horario no confirmado</div>
                      } @else {
                        <div class="font-semibold text-warm-900">{{ timeZone.displaySessionDate(s) }}{{ timeZone.displaySessionEndDate(s) !== timeZone.displaySessionDate(s) ? ' – ' + timeZone.displaySessionEndDate(s) : '' }}</div>
                        <div class="text-[11px] text-warm-500 font-mono">{{ timeZone.displaySessionStartTime(s) }} - {{ timeZone.displaySessionEndTime(s) }}</div>
                      }
                    </td>
                    <td class="px-5 py-4 max-w-xs truncate">
                      <span class="font-medium text-warm-900 block truncate" [title]="s.title">
                        {{ s.title }}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-center">
                      <span class="font-bold text-warm-900">
                        {{ getPresentesCount(s) }}
                      </span>
                      <span class="text-warm-500 font-normal"> / {{ s.records ? s.records.length : 0 }}</span>
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
  `,
})
export class GroupSessionsOverviewComponent {
  readonly timeZone = inject(SessionTimeZoneService);
  course = input<Course | undefined>(undefined);
  sessions = input<ClassSession[]>([]);
  totalReclamosPendientes = input<number>(0);

  selectSession = output<string>();
  openProjectionSesion = output<string>();
  openNewSession = output<void>();
  openEnrollment = output<void>();
  openMatriculaQr = output<void>();
  exportExcel = output<void>();
  verAlumnos = output<void>();
  verReclamos = output<void>();

  totalSesiones = computed(() => this.sessions().length);

  promedioAsistencia = computed(() => {
    const conRegistros = this.sessions().filter((s) => s.records && s.records.length > 0);
    if (conRegistros.length === 0) return 100;
    let sumPorcentajes = 0;
    for (const s of conRegistros) {
      const presentes = s.records.filter((r) => r.status === 'AN' || r.status === 'EX').length;
      sumPorcentajes += (presentes / s.records.length) * 100;
    }
    return Math.round(sumPorcentajes / conRegistros.length);
  });

  estudiantesEnRiesgo = computed(() => {
    const total = this.totalSesiones();
    if (total === 0) return 0;
    const faltasPorEstudiante = new Map<string, number>();
    for (const s of this.sessions()) {
      if (s.records) {
        for (const r of s.records) {
          if (r.status === 'SJC') {
            faltasPorEstudiante.set(r.studentId, (faltasPorEstudiante.get(r.studentId) || 0) + 1);
          }
        }
      }
    }
    let enRiesgo = 0;
    faltasPorEstudiante.forEach((faltas) => {
      if ((faltas / total) >= 0.2) enRiesgo++;
    });
    return enRiesgo;
  });

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

  getPresentesCount(session: ClassSession): number {
    if (!session.records) return 0;
    return session.records.filter((r) => r.status === 'AN' || r.status === 'EX').length;
  }

  displayDate(session: ClassSession | undefined): string {
    if (!session) return '';
    return session.estadoTemporal === 'INDETERMINADA'
      ? 'Horario no confirmado'
      : this.timeZone.displaySessionDate(session);
  }
}
