import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClassSession } from '../../../../core/models/attendance.model';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';

@Component({
  selector: 'app-teacher-grupo-sabana',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-b-2xl border-x border-b border-warm-200 shadow-warm-sm p-6 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-warm-100">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-900 border border-primary-200">
              Sábana Académica Institucional
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-semibold text-warm-600">Regla Oficial UCO 20% Inasistencias</span>
          </div>
          <h3 class="font-serif font-bold text-xl text-warm-900">Matriz General de Asistencia Semestral</h3>
          <p class="text-xs text-warm-500">
            Visualización consolidada de todos los estudiantes contra todas las sesiones del curso en una sola sábana.
          </p>
        </div>

        <!-- Leyenda Aurora & Semáforo UCO -->
        <div class="flex flex-wrap items-center gap-3 text-xs bg-warm-50 p-2.5 rounded-xl border border-warm-200">
          <span class="flex items-center gap-1.5 font-semibold text-emerald-800">
            <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            Presente (AN)
          </span>
          <span class="flex items-center gap-1.5 font-semibold text-amber-800">
            <span class="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
            Excusa (EX)
          </span>
          <span class="flex items-center gap-1.5 font-semibold text-red-800">
            <span class="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
            Falta Injustificada (SJC)
          </span>
          <span class="text-warm-300">|</span>
          <span class="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
            ≥20% = Pérdida de Asignatura
          </span>
        </div>
      </div>

      @if (cargando()) {
        <div class="p-8 space-y-3">
          <div class="h-8 bg-warm-100 rounded-lg animate-pulse"></div>
          <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
          <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
        </div>
      } @else if (estudiantes().length === 0) {
        <div class="p-12 text-center text-warm-400 bg-warm-50/50 rounded-2xl border border-dashed border-warm-200">
          <p class="text-sm font-medium">No hay estudiantes matriculados en este grupo para generar la sábana.</p>
        </div>
      } @else if (sessions().length === 0) {
        <div class="p-12 text-center text-warm-400 bg-warm-50/50 rounded-2xl border border-dashed border-warm-200">
          <p class="text-sm font-medium">No se han programado sesiones lectivas para este grupo todavía.</p>
        </div>
      } @else {
        <!-- Tabla Matriz con Scroll Horizontal Fluido -->
        <div class="overflow-x-auto border border-warm-200 rounded-2xl shadow-xs">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-warm-100/80 border-b border-warm-200 text-warm-800 uppercase tracking-wider text-[11px]">
                <th class="p-3.5 sticky left-0 z-20 bg-warm-100/95 font-bold min-w-[200px] border-r border-warm-200 shadow-xs">
                  Estudiante (Documento)
                </th>
                @for (ses of sessions(); track ses.id) {
                  <th class="p-2.5 text-center min-w-[70px] border-r border-warm-200" [title]="ses.title + ' - ' + displayDate(ses)">
                    <div class="font-mono font-bold text-primary-900">#{{ ses.sessionNumber }}</div>
                    @if (ses.estadoTemporal === 'INDETERMINADA') {
                      <div class="text-[10px] text-amber-700 font-semibold truncate">Sin fecha</div>
                    } @else {
                      <div class="text-[10px] text-warm-500 font-normal truncate">{{ displayDate(ses) | slice:5 }}</div>
                    }
                    <span
                      class="inline-block w-1.5 h-1.5 rounded-full mt-0.5 bg-emerald-500"
                      [title]="ses.estadoTemporal === 'INDETERMINADA' ? 'Horario no confirmado' : displayDate(ses)"
                    ></span>
                  </th>
                }
                <th class="p-3 text-center bg-warm-200/60 font-bold min-w-[80px] border-r border-warm-200">
                  Inasistencias (SJC)
                </th>
                <th class="p-3 text-center bg-warm-200/60 font-bold min-w-[90px] border-r border-warm-200">
                  % Inasistencia
                </th>
                <th class="p-3 text-center bg-warm-200/60 font-bold min-w-[110px]">
                  Estado Académico
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-warm-100 bg-white">
              @for (est of estudiantes(); track est.studentId || est.id) {
                <tr class="hover:bg-warm-50/60 transition-colors">
                  <!-- Nombre Estudiante Sticky -->
                  <td class="p-3.5 sticky left-0 z-10 bg-white group-hover:bg-warm-50/60 border-r border-warm-200 font-medium text-warm-900 shadow-xs">
                    <div class="font-bold text-xs">{{ est.studentName || est.nombres + ' ' + est.apellidos }}</div>
                    <div class="font-mono text-[11px] text-warm-500">ID: {{ est.studentCode || est.numeroIdentificacion || 'N/A' }}</div>
                  </td>

                  <!-- Columnas de Cada Sesión -->
                  @for (ses of sessions(); track ses.id) {
                    <td class="p-2 text-center border-r border-warm-100">
                      @let estado = getAsistenciaEstudianteEnSesion(est.studentId || est.id, ses);
                      @if (estado === 'AN') {
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]" title="Asistencia Normal (Presente)">
                          AN
                        </span>
                      } @else if (estado === 'EX') {
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]" title="Excusa Justificada">
                          EX
                        </span>
                      } @else if (estado === 'SJC') {
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 font-bold text-[10px]" title="Falta Injustificada">
                          SJC
                        </span>
                      } @else {
                        <span class="text-warm-300 font-mono text-xs" title="Sin registro o pendiente">
                          —
                        </span>
                      }
                    </td>
                  }

                  <!-- Inasistencias Acumuladas -->
                  <td class="p-3 text-center font-mono font-bold text-xs text-warm-800 bg-warm-50/40 border-r border-warm-100">
                    {{ getFaltasSjcEstudiante(est.studentId || est.id) }} / {{ sessions().length }}
                  </td>

                  <!-- Porcentaje UCO -->
                  <td class="p-3 text-center font-mono font-bold text-xs border-r border-warm-100 bg-warm-50/40"
                    [class]="getPorcentajeFaltasEstudiante(est.studentId || est.id) >= 20 ? 'text-red-700' : (getPorcentajeFaltasEstudiante(est.studentId || est.id) >= 10 ? 'text-amber-700' : 'text-emerald-700')">
                    {{ getPorcentajeFaltasEstudiante(est.studentId || est.id) }}%
                  </td>

                  <!-- Estado Académico UCO -->
                  <td class="p-3 text-center bg-warm-50/40">
                    @if (getPorcentajeFaltasEstudiante(est.studentId || est.id) >= 20) {
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                        <svg class="w-3 h-3 text-red-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Reprobado (20%)
                      </span>
                    } @else if (getPorcentajeFaltasEstudiante(est.studentId || est.id) >= 10) {
                      <span class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Alerta de Riesgo
                      </span>
                    } @else {
                      <span class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Regular Normal
                      </span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class TeacherGrupoSabanaComponent {
  readonly timeZone = inject(SessionTimeZoneService);
  estudiantes = input<any[]>([]);
  sessions = input<ClassSession[]>([]);
  cargando = input<boolean>(false);

  displayDate(session: ClassSession): string {
    return session.estadoTemporal === 'INDETERMINADA'
      ? 'Horario no confirmado'
      : this.timeZone.displaySessionDate(session);
  }

  getAsistenciaEstudianteEnSesion(estudianteId: string, sesion: ClassSession): string {
    if (!sesion.records || sesion.records.length === 0) {
      return '—';
    }
    const rec = sesion.records.find((r) => r.studentId === estudianteId);
    return rec?.status ?? '—';
  }

  getFaltasSjcEstudiante(estudianteId: string): number {
    const list = this.sessions();
    if (!list || list.length === 0) return 0;
    let faltas = 0;
    for (const ses of list) {
      const estado = this.getAsistenciaEstudianteEnSesion(estudianteId, ses);
      if (estado === 'SJC') {
        faltas++;
      }
    }
    return faltas;
  }

  getPorcentajeFaltasEstudiante(estudianteId: string): number {
    const total = this.sessions().length;
    if (total === 0) return 0;
    const faltas = this.getFaltasSjcEstudiante(estudianteId);
    return Math.round((faltas / total) * 100);
  }
}
