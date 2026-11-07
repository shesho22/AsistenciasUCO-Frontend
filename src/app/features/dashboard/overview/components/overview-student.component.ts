import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { AttendanceStatusBadgeComponent } from '../../../../shared/components/attendance-status-badge/attendance-status-badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { MateriaEstudianteItem } from '../../../../core/models/role-management.model';
import { ProximaClaseInfo } from '../utils/proxima-clase.util';

@Component({
  selector: 'app-overview-student',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, CardComponent, BadgeComponent, ButtonComponent, AttendanceStatusBadgeComponent],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="space-y-6">
      <!-- KPIs Estudiante -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Materias Matriculadas</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ materias().length }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Semestre 2026-II</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Materias en riesgo</span>
          @if (materiasEnRiesgo() !== null) {
            <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ materiasEnRiesgo() }}</p>
            <span class="text-[11px] text-warm-500 font-medium">Según la inasistencia por horas</span>
          } @else {
            <p class="text-base font-serif font-bold text-warm-500 mt-1" data-testid="riesgo-no-disponible">No disponible</p>
            <span class="text-[11px] text-warm-500 font-medium">Sin datos de asistencia consolidados</span>
          }
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Horas de falta</span>
          @if (horasFalta() !== null) {
            <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ horasFalta() }} h</p>
            <span class="text-[11px] text-warm-500 font-medium">En todo el periodo</span>
          } @else {
            <p class="text-base font-serif font-bold text-warm-500 mt-1" data-testid="horas-falta-no-disponible">No disponible</p>
            <span class="text-[11px] text-warm-500 font-medium">Sin datos de asistencia consolidados</span>
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
                <span class="text-xs text-warm-500 font-medium">| {{ pc.dia }} {{ pc.horaInicio }} - {{ pc.horaFin }}</span>
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          @for (mat of materias(); track mat.claveGrupo) {
            <app-card [hoverable]="true" [title]="mat.nombre" [subtitle]="mat.codigo ? mat.codigo + ' • ' + mat.grupo : mat.grupo">
              <div class="space-y-4 my-2 text-xs text-warm-700">
                <!-- Inasistencia por horas (solo con fuente autoritativa) -->
                @if (mat.indicadores; as ind) {
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-sm text-warm-900">{{ ind.porcentajeInasistencia }}% de inasistencia</span>
                    <app-attendance-status-badge [codigoPermanencia]="ind.codigoPermanencia" />
                  </div>
                } @else {
                  <div class="text-warm-500" data-testid="asistencia-no-disponible">
                    <span class="font-medium text-warm-600">Inasistencia:</span> No disponible
                  </div>
                }

                <!-- Ficha resumida -->
                <div class="grid grid-cols-2 gap-2 bg-warm-50 p-3 rounded-xl">
                  <div>
                    <span class="text-warm-400 text-[10px] block">Docente</span>
                    <span class="font-semibold text-warm-900 text-xs">{{ mat.docente ?? 'No informado' }}</span>
                  </div>
                  <div>
                    <span class="text-warm-400 text-[10px] block">Horario</span>
                    <span class="font-semibold text-warm-900 text-xs">{{ mat.horario ?? 'No informado' }}</span>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-warm-100">
                  @if (mat.indicadores; as ind) {
                    <span class="text-warm-700 font-semibold">{{ ind.horasFalta }} h de falta de {{ ind.horasDictadas }} h</span>
                  }
                  @if (mat.estado) {
                    <app-badge [variant]="mat.estado === 'Al día' ? 'success' : 'danger'">
                      {{ mat.estado }}
                    </app-badge>
                  }
                </div>
              </div>

              <div card-footer class="mt-4 pt-3 border-t border-warm-100 flex items-center justify-end">
                <a routerLink="/app/estudiante/materias" class="w-full">
                  <app-button variant="secondary" size="sm" [fullWidth]="true">
                    Ver Desglose de Sesiones y Reclamar
                  </app-button>
                </a>
              </div>
            </app-card>
          } @empty {
            <div class="col-span-2 bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-3">
              <p class="text-xs text-warm-500">No tienes materias inscritas para este periodo.</p>
            </div>
          }
        </div>
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
  `,
})
export class OverviewStudentComponent {
  materias = input<MateriaEstudianteItem[]>([]);
  materiasEnRiesgo = input<number | null>(null);
  horasFalta = input<number | null>(null);
  proximaClase = input<ProximaClaseInfo | null>(null);
}
