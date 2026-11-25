import { RangoHorarioPipe } from '../../../../shared/pipes/fecha-hora.pipes';
import { Component, ChangeDetectionStrategy, computed, effect, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevisionesPendientesKpiComponent } from '../../../../shared/components/revisiones-pendientes-kpi/revisiones-pendientes-kpi.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../../shared/components/tabla-datos/tabla-datos.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Course } from '../../../../core/models/course.model';
import { ProximaClaseInfo } from '../utils/proxima-clase.util';

@Component({
  selector: 'app-overview-teacher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevisionesPendientesKpiComponent, RangoHorarioPipe, CommonModule, RouterLink, TablaDatosComponent, ButtonComponent],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="space-y-4">
      <!-- Revisiones de cancelación por inasistencia: conteo global con enlace directo (DEC-065) -->
      <div class="max-w-sm">
        <app-revisiones-pendientes-kpi rol="DOCENTE" />
      </div>

      <!-- KPIs Docente -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Asignaturas a Cargo</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5">{{ courses().length }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Semestre 2026-II</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Alumnos Matriculados</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5">{{ totalStudentsCount() ?? '—' }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Total en tus grupos</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Reclamos Pendientes</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" [ngClass]="(pendingClaimsCount() ?? 0) > 0 ? 'text-warning-600' : 'text-warm-900'">
            {{ pendingClaimsCount() ?? '—' }}
          </p>
          @if (pendingClaimsCount() !== null) {
            <span class="text-[11px] font-medium" [ngClass]="pendingClaimsCount()! > 0 ? 'text-warning-600' : 'text-success-700'">
              {{ pendingClaimsCount()! > 0 ? 'Requieren revisión' : 'Bandeja al día' }}
            </span>
          }
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full"
             [ngClass]="{'border-primary-300 bg-primary-50/30 ring-1 ring-primary-400/20': $safeNavigationMigration(proximaClase()?.enCurso), 'border-primary-200/60': proximaClase() && !proximaClase()?.enCurso}">
          <div class="flex items-center justify-between">
            <span class="rotulo-uco">Próxima Clase</span>
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
          <a routerLink="/app/docente/reclamos" [queryParams]="{ estado: 'P' }" class="shrink-0">
            <app-button variant="primary" size="sm">
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
            <a routerLink="/app/asistencia" [queryParams]="pc.idGrupo ? { courseId: pc.idGrupo } : null" class="w-full sm:w-auto">
              <app-button variant="primary" size="sm" [fullWidth]="true">
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

        <app-tabla-datos
          etiqueta="Mis asignaturas habilitadas"
          [columnas]="5"
          anchoMinimo="48rem"
          [filasEsqueleto]="3"
          [cargando]="isLoading()"
          [vacio]="courses().length === 0"
          mensajeVacio="No tienes asignaturas programadas para el día de hoy."
          [paginada]="true"
          [totalItems]="courses().length"
          [pagina]="pagina()"
          [tamanoPagina]="tamanoPagina()"
          (paginaChange)="pagina.set($event)"
          (tamanoPaginaChange)="cambiarTamano($event)"
        >
          <thead>
            <tr>
              <th scope="col">Asignatura</th>
              <th scope="col">Código y grupo</th>
              <th scope="col">Horario</th>
              <th scope="col">Alumnos matriculados</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @if (!isLoading()) {
              @for (course of cursosPagina(); track course.id) {
                <tr data-testid="overview-docente-curso-fila">
                  <td class="font-semibold text-warm-900">{{ course.name }}</td>
                  <td class="text-warm-600 whitespace-nowrap">{{ subtituloCurso(course) }}</td>
                  <td class="text-warm-800">{{ course.schedule }}</td>
                  <td class="whitespace-nowrap">
                    <span class="font-bold text-warm-900 bg-warm-100 px-2.5 py-0.5 rounded-full text-xs">
                      {{ course.enrolledStudentsCount }} alumnos
                    </span>
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <a routerLink="/app/asistencia" [queryParams]="{ courseId: course.id }">
                      <app-button variant="secondary" size="sm">Acceder a Sesiones y Asistencia</app-button>
                    </a>
                  </td>
                </tr>
              }
            }
          </tbody>
        </app-tabla-datos>
      </section>
    </div>
  `,
})
export class OverviewTeacherComponent {
  courses = input<Course[]>([]);
  /** CIERRE-W3I: estudiantes activos de sus grupos habilitados (GET /docente/resumen-grupos); `null` mientras no llega o si falla. */
  totalStudentsCount = input<number | null>(null);
  pendingClaimsCount = input<number | null>(0);
  proximaClase = input<ProximaClaseInfo | null>(null);
  isLoading = input<boolean>(false);

  /** Paginacion en el cliente de la tabla de asignaturas (15 por defecto, 15/30/50). */
  readonly pagina = signal(1);
  readonly tamanoPagina = signal(TAMANO_PAGINA_TABLA);
  readonly cursosPagina = computed(() => paginarEnCliente(this.courses(), this.pagina(), this.tamanoPagina()));

  constructor() {
    // Si cambia la lista de cursos se vuelve a la primera pagina.
    effect(() => {
      this.courses();
      untracked(() => this.pagina.set(1));
    });
  }

  cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  /** Codigo y grupo; sin codigo solo el grupo (nunca el literal "undefined"). */
  subtituloCurso(course: Course): string {
    return [course.code, course.section].filter((parte) => !!parte && parte !== '-').join(' • ');
  }
}
