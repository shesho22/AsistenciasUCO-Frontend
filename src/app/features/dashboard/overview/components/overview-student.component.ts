import { HorasMinutosPipe } from '../../../../shared/pipes/horas-minutos.pipe';
import { RangoHorarioPipe } from '../../../../shared/pipes/fecha-hora.pipes';
import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { AttendanceStatusBadgeComponent } from '../../../../shared/components/attendance-status-badge/attendance-status-badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { MateriaEstudianteItem, ResumenMateriasEstudiante } from '../../../../core/models/role-management.model';
import { ProximaClaseInfo } from '../utils/proxima-clase.util';

@Component({
    selector: 'app-overview-student',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RangoHorarioPipe, HorasMinutosPipe, CommonModule, RouterLink, BadgeComponent, ButtonComponent, AttendanceStatusBadgeComponent],
    host: {
        class: 'block w-full',
    },
    template: `
    <div class="space-y-4">
      <!-- KPIs Estudiante -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="text-xs text-warm-500 font-medium">Materias Matriculadas</span>
          @if (resumen(); as r) {
            <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="resumen-total-materias">{{ r.totalMaterias }}</p>
          } @else {
            <p class="text-base font-serif font-bold text-warm-500 mt-1" data-testid="materias-no-disponible">No disponible</p>
          }
          <span class="text-[11px] text-primary-700 font-medium">Semestre 2026-II</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="text-xs text-warm-500 font-medium">Materias en riesgo</span>
          @if (materiasEnRiesgo() !== null) {
            <p class="text-xl font-serif font-bold text-warm-900 mt-0.5">{{ materiasEnRiesgo() }}</p>
            <span class="text-[11px] text-warm-500 font-medium">Según la inasistencia por horas</span>
          } @else {
            <p class="text-base font-serif font-bold text-warm-500 mt-1" data-testid="riesgo-no-disponible">No disponible</p>
            <span class="text-[11px] text-warm-500 font-medium">Sin datos de asistencia consolidados</span>
          }
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="text-xs text-warm-500 font-medium">Horas de falta</span>
          @if (resumen(); as r) {
            <p class="text-xl font-serif font-bold text-warm-900 mt-0.5">{{ r.totalHorasFalta | horasMinutos }}</p>
            <span class="text-[11px] text-warm-500 font-medium">En todo el periodo</span>
          } @else {
            <p class="text-base font-serif font-bold text-warm-500 mt-1" data-testid="horas-falta-no-disponible">No disponible</p>
            <span class="text-[11px] text-warm-500 font-medium">Sin datos de asistencia consolidados</span>
          }
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full"
             [ngClass]="{'border-primary-300 bg-primary-50/30 ring-1 ring-primary-400/20': $safeNavigationMigration(proximaClase()?.enCurso), 'border-primary-200/60': proximaClase() && !proximaClase()?.enCurso}">
          <div class="flex items-center justify-between">
            <span class="text-xs text-warm-500 font-medium">Próxima Clase</span>
            @if (proximaClase()?.enCurso) {
              <span class="inline-flex items-center gap-1 text-[10px] font-bold text-success-700 bg-success-100 px-2 py-0.5 rounded-full animate-pulse">
                <span class="w-1.5 h-1.5 rounded-full bg-success-600"></span>
                En curso
              </span>
            } @else if (proximaClase()) {
              <span class="text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                Programada
              </span>
            }
          </div>
          @if (proximaClase(); as pc) {
            <div>
              <p class="text-lg font-serif font-bold text-warm-900 mt-1" [title]="pc.materia">
                {{ pc.tiempoRestanteTexto }}
              </p>
              <p class="text-xs font-semibold text-primary-800 truncate mt-0.5" [title]="pc.materia">{{ pc.materia }}</p>
              <span class="text-[11px] text-warm-500 font-medium block truncate mt-0.5">{{ pc.tiempoDetalleBadge }}</span>
            </div>
          } @else {
            <div>
              <p class="text-sm font-semibold text-warm-500 mt-2">Sin clases próximas</p>
              <span class="text-[11px] text-warm-400 font-medium">Horario despejado</span>
            </div>
          }
        </div>
      </section>

      <!-- Widget Destacado de Próxima Clase con Cuenta Regresiva (Estudiante) -->
      @if (proximaClase(); as pc) {
        <div class="rounded-2xl p-5 border transition-all duration-300 shadow-warm-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
             [ngClass]="pc.enCurso 
               ? 'bg-gradient-to-r from-primary-50 via-primary-50 to-warm-50 border-primary-300 ring-1 ring-primary-400/30' 
               : 'bg-gradient-to-r from-warm-50 via-white to-primary-50/40 border-primary-200/80'">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                 [ngClass]="pc.enCurso ? 'bg-success-600 text-white shadow-warm-sm' : 'bg-primary-900 text-white shadow-warm-sm'">
              @if (pc.enCurso) {
                <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              } @else {
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md"
                      [ngClass]="pc.enCurso ? 'bg-success-100 text-success-800' : 'bg-primary-100 text-primary-900'">
                  {{ pc.codigo }}
                </span>
                <span class="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      [ngClass]="pc.enCurso ? 'bg-success-600 text-white animate-pulse' : 'bg-warm-200 text-warm-800'">
                  {{ pc.tiempoRestanteTexto }}
                </span>
                <span class="text-xs text-warm-500 font-medium">| {{ pc.dia }} {{ pc.horaInicio | rangoHorario: pc.horaFin }}</span>
              </div>
              <h3 class="font-serif font-bold text-warm-900 text-base sm:text-lg mt-1">
                {{ pc.materia }}
              </h3>
              <p class="text-xs text-warm-600 flex flex-wrap items-center gap-2 mt-0.5">
                <span>{{ pc.subtitulo }}</span>
                <span>•</span>
                <span class="text-primary-700 font-medium">{{ pc.tiempoDetalleBadge }}</span>
              </p>
            </div>
          </div>

          <div class="shrink-0 w-full sm:w-auto flex items-center justify-end gap-2">
            <a routerLink="/app/estudiante/horarios" class="w-full sm:w-auto">
              <app-button variant="accent" size="sm" [fullWidth]="true">
                Ver Horario Completo →
              </app-button>
            </a>
          </div>
        </div>
      }

      <!-- Sección de Materias Matriculadas con % de Asistencia -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-xl sm:text-2xl font-bold text-warm-900">Mis Materias y Resumen de Asistencia</h2>
            <p class="text-xs text-warm-500">Monitoreo en tiempo real de asistencias, inasistencias y solicitudes de revisión</p>
          </div>
          <a routerLink="/app/estudiante/materias">
            <app-button variant="secondary" size="sm">Ver Todas las Materias →</app-button>
          </a>
        </div>

        @if (materias().length > 0) {
          <div class="tabla-scroll" role="region" tabindex="0" aria-label="Mis materias y resumen de asistencia">
            <table class="tabla-tarjetas tabla-tarjetas-compacta w-full min-w-[44rem] text-sm" data-testid="dashboard-materias-tabla">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="col-fija py-2 pr-3">Materia</th>
                  <th scope="col" class="py-2 pr-3">Grupo</th>
                  <th scope="col" class="py-2 pr-3">Docente</th>
                  <th scope="col" class="py-2 pr-3">Inasistencia</th>
                  <th scope="col" class="py-2 pr-3">Estado</th>
                  <th scope="col" class="py-2 text-right"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (mat of materias(); track mat.claveGrupo) {
                  <tr class="border-b border-warm-50 align-top" data-testid="dashboard-materia-fila">
                    <td class="col-fija tc-ancho py-2 pr-3">
                      <span class="block font-semibold text-warm-900 leading-snug">{{ mat.nombre }}</span>
                      @if (mat.codigo) {
                        <span class="block text-xs text-warm-500 font-mono">{{ mat.codigo }}</span>
                      }
                    </td>
                    <td class="py-2 pr-3 text-warm-700 whitespace-nowrap" data-label="Grupo">{{ mat.grupo }}</td>
                    <td class="py-2 pr-3 text-warm-700" data-label="Docente">{{ mat.docente ?? 'No informado' }}</td>
                    <td class="py-2 pr-3 tc-ancho" data-label="Inasistencia">
                      <!-- Inasistencia por horas (solo con fuente autoritativa) -->
                      @if (mat.indicadores; as ind) {
                        <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          <span class="font-bold text-sm text-warm-900">{{ ind.porcentajeInasistencia }}% de inasistencia</span>
                          <app-attendance-status-badge [codigoPermanencia]="ind.codigoPermanencia" />
                        </span>
                        <span class="block text-xs text-warm-600">{{ ind.horasFalta | horasMinutos }} de falta de {{ ind.horasDictadas | horasMinutos }}</span>
                      } @else {
                        <span class="text-xs text-warm-500" data-testid="asistencia-no-disponible">
                          <span class="font-medium text-warm-600">Inasistencia:</span> No disponible
                        </span>
                      }
                    </td>
                    <td class="py-2 pr-3" data-label="Estado">
                      @if (mat.estado) {
                        <app-badge [variant]="mat.estado === 'Al día' ? 'success' : 'danger'">{{ mat.estado }}</app-badge>
                      }
                    </td>
                    <td class="py-2 text-right tc-ancho">
                      <a routerLink="/app/estudiante/materias" [queryParams]="{ materia: mat.id, grupo: mat.idGrupo }">
                        <app-button variant="secondary" size="sm">Ver Desglose de Sesiones y Reclamar</app-button>
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
            <div class="superficie px-4 py-6 text-center">
              @switch (estadoMaterias()) {
                @case ('CARGANDO') {
                  <p class="text-xs text-warm-500 animate-pulse" data-testid="materias-cargando">Cargando tus materias…</p>
                }
                @case ('ERROR') {
                  <p class="text-xs text-danger-800" role="alert" data-testid="materias-error">No fue posible cargar tus materias. Intenta nuevamente.</p>
                }
                @default {
                  <p class="text-xs text-warm-500" data-testid="materias-vacio">No tienes materias inscritas para este periodo.</p>
                }
              }
            </div>
        }
      </section>

      <!-- Acceso rápido a Horarios -->
      <section class="bg-warm-50 rounded-2xl p-6 border border-warm-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-800 shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 class="font-serif font-bold text-warm-900 text-lg">Consulta tu Horario Semanal</h3>
            <p class="text-xs text-warm-600">Revisa la distribución de tus clases por día, bloques horarios y salones de clase.</p>
          </div>
        </div>
        <a routerLink="/app/estudiante/horarios">
          <app-button variant="primary" size="md">
            Ver Mi Horario Completo →
          </app-button>
        </a>
      </section>
    </div>
  `
})
export class OverviewStudentComponent {
  materias = input<MateriaEstudianteItem[]>([]);
  /** El estado vacio solo se muestra con la consulta resuelta: pendiente o fallida no es "0 materias". */
  estadoMaterias = input<'CARGANDO' | 'LISTO' | 'ERROR'>('LISTO');
  /** Indicadores calculados por el backend con las mismas materias del listado; `null` = no disponibles (nunca un cero). */
  resumen = input<ResumenMateriasEstudiante | null>(null);
  /** Materias en riesgo del backend; `null` = sin resumen o sin umbrales configurados. */
  materiasEnRiesgo = computed(() => this.resumen()?.materiasEnRiesgo ?? null);
  proximaClase = input<ProximaClaseInfo | null>(null);
}
