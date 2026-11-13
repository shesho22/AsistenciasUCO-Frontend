import { RangoHorarioPipe } from '../../../../shared/pipes/fecha-hora.pipes';
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevisionesPendientesKpiComponent } from '../../../../shared/components/revisiones-pendientes-kpi/revisiones-pendientes-kpi.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Course } from '../../../../core/models/course.model';
import { ProximaClaseInfo } from '../utils/proxima-clase.util';

@Component({
  selector: 'app-overview-teacher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevisionesPendientesKpiComponent, RangoHorarioPipe, CommonModule, RouterLink, CardComponent, ButtonComponent],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="space-y-6">
      <!-- Revisiones de cancelación por inasistencia: conteo global con enlace directo (DEC-065) -->
      <div class="max-w-sm">
        <app-revisiones-pendientes-kpi rol="DOCENTE" />
      </div>

      <!-- KPIs Docente -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Asignaturas a Cargo</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ courses().length }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Semestre 2026-II</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Alumnos Matriculados</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ totalStudentsCount() }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Total en tus grupos</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Reclamos Pendientes</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1" [ngClass]="(pendingClaimsCount() ?? 0) > 0 ? 'text-warning-600' : 'text-warm-900'">
            {{ pendingClaimsCount() ?? '—' }}
          </p>
          @if (pendingClaimsCount() !== null) {
            <span class="text-[11px] font-medium" [ngClass]="pendingClaimsCount()! > 0 ? 'text-warning-600' : 'text-success-700'">
              {{ pendingClaimsCount()! > 0 ? 'Requieren revisión' : 'Bandeja al día' }}
            </span>
          }
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]"
             [ngClass]="{'border-primary-300 bg-primary-50/30 ring-1 ring-primary-400/20': proximaClase()?.enCurso, 'border-primary-200/60': proximaClase() && !proximaClase()?.enCurso}">
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

      <!-- Alerta destacada si hay reclamos pendientes -->
      @if ((pendingClaimsCount() ?? 0) > 0) {
        <div class="bg-warning-50 border border-warning-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-warning-100 flex items-center justify-center text-warning-700 shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-warning-900 text-sm">Tienes {{ pendingClaimsCount() }} reclamos de asistencia pendientes</h3>
              <p class="text-xs text-warning-700">Revisa las solicitudes radicadas por estudiantes antes de que expiren los plazos de corte.</p>
            </div>
          </div>
          <a routerLink="/app/docente/reclamos" class="shrink-0">
            <app-button variant="accent" size="sm">
              Revisar Reclamos Ahora →
            </app-button>
          </a>
        </div>
      }

      <!-- Widget Destacado de Próxima Clase con Cuenta Regresiva (Docente) -->
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
                <span class="font-semibold text-warm-800">{{ pc.subtitulo }}</span>
                <span>•</span>
                <span class="text-primary-700 font-medium">{{ pc.tiempoDetalleBadge }}</span>
              </p>
            </div>
          </div>

          <div class="shrink-0 w-full sm:w-auto flex items-center justify-end gap-2">
            <a routerLink="/app/asistencia" class="w-full sm:w-auto">
              <app-button variant="accent" size="sm" [fullWidth]="true">
                Tomar Asistencia →
              </app-button>
            </a>
          </div>
        </div>
      }

      <!-- Sección de Asignaturas Habilitadas -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-xl sm:text-2xl font-bold text-warm-900">Mis Asignaturas Habilitadas</h2>
            <p class="text-xs text-warm-500">Cursos asignados para la toma y control de asistencia de la jornada</p>
          </div>
          <a routerLink="/app/docente/grupos">
            <app-button variant="secondary" size="sm">Ver Todos los Grupos →</app-button>
          </a>
        </div>

        @if (isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (item of [1, 2, 3]; track item) {
              <div class="bg-white p-6 rounded-2xl border border-warm-200 animate-pulse space-y-4">
                <div class="h-4 w-3/4 bg-warm-200 rounded"></div>
                <div class="h-3 w-1/2 bg-warm-200 rounded"></div>
                <div class="h-10 w-full bg-warm-200 rounded-xl mt-4"></div>
              </div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (course of courses(); track course.id) {
              <app-card [hoverable]="true" [title]="course.name" [subtitle]="subtituloCurso(course)">
                <div class="space-y-3 my-2 text-xs text-warm-700">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-primary-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="font-medium text-warm-800">{{ course.schedule }}</span>
                  </div>

                  <div class="flex items-center justify-between pt-3 border-t border-warm-100">
                    <span class="text-warm-500 font-medium">Alumnos Matriculados:</span>
                    <span class="font-bold text-warm-900 bg-warm-100 px-2.5 py-0.5 rounded-full text-xs">
                      {{ course.enrolledStudentsCount }} alumnos
                    </span>
                  </div>
                </div>

                <div card-footer class="mt-4 pt-3 border-t border-warm-100 flex items-center justify-end">
                  <a routerLink="/app/asistencia" class="w-full">
                    <app-button variant="secondary" size="sm" [fullWidth]="true">
                      Acceder a Sesiones y Asistencia
                    </app-button>
                  </a>
                </div>
              </app-card>
            } @empty {
              <div class="md:col-span-3 bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-3">
                <p class="text-xs text-warm-500">No tienes asignaturas programadas para el día de hoy.</p>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class OverviewTeacherComponent {
  courses = input<Course[]>([]);
  totalStudentsCount = input<number>(0);
  pendingClaimsCount = input<number | null>(0);
  proximaClase = input<ProximaClaseInfo | null>(null);
  isLoading = input<boolean>(false);

  /** Codigo y grupo; sin codigo solo el grupo (nunca el literal "undefined"). */
  subtituloCurso(course: Course): string {
    return [course.code, course.section].filter((parte) => !!parte && parte !== '-').join(' • ');
  }
}
