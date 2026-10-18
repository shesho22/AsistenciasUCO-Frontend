import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { MateriaEstudianteItem } from '../../../../core/models/role-management.model';

@Component({
  selector: 'app-student-courses-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardComponent, BadgeComponent, ButtonComponent],
  template: `
    <div class="space-y-6">
      <!-- Header Bento -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-800 border border-primary-200">
              Portal Estudiantil
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Plan de Estudios</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Gestión de Mis Materias
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Selecciona una asignatura para abrir su vista completa de sesiones, revisar tu registro de asistencia y radicar justificaciones.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="openCodeEnrollment.emit()"
            class="px-3.5 py-2 text-xs font-bold text-white bg-primary-700 hover:bg-primary-800 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
            title="Matricularse a un grupo académico ingresando el código PIN o enlace provisto por el docente"
          >
            <svg class="w-4 h-4 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Matricularse con Código
          </button>

          <button
            type="button"
            (click)="openAutoAttendance.emit()"
            class="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
            title="HU176: Auto-registrar asistencia con código PIN de 6 dígitos o QR"
          >
            <svg class="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Auto-Registro Asistencia
          </button>
        </div>
      </div>

      <!-- Métricas Generales -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Materias Inscritas</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ materias().length }}</p>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Promedio de Asistencia</span>
            <p class="text-2xl font-serif font-bold text-emerald-700">{{ promedioAsistencia() }}%</p>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Fallas Registradas</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ totalFallas() }}</p>
          </div>
        </div>
      </div>

      <!-- Grid de Materias -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          @for (n of [1, 2, 3, 4]; track n) {
            <div class="h-52 bg-warm-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          @for (materia of materias(); track materia.id) {
            <app-card [hoverable]="true" padding="md">
              <div class="flex flex-col h-full justify-between gap-4">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-800">
                        {{ materia.codigo }}
                      </span>
                      <span class="text-xs text-warm-500 font-medium">Grupo {{ materia.grupo }}</span>
                    </div>

                    <app-badge [variant]="getBadgeVariant(materia.estado)">
                      {{ materia.estado }}
                    </app-badge>
                  </div>

                  <h3 class="font-serif font-bold text-lg text-warm-900 leading-snug">
                    {{ materia.nombre }}
                  </h3>
                  <p class="text-xs text-warm-500 mt-1">Docente: {{ materia.docente }}</p>
                </div>

                <!-- Barra de Progreso de Asistencia -->
                <div class="space-y-1.5 p-3 rounded-xl bg-warm-50 border border-warm-100">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-medium text-warm-600">Asistencia Registrada</span>
                    <span class="font-bold text-warm-900">{{ materia.porcentajeAsistencia }}%</span>
                  </div>
                  <div class="w-full h-2 bg-warm-200 rounded-full overflow-hidden">
                    <div
                      [class]="getProgressColor(materia.porcentajeAsistencia)"
                      [style.width.%]="materia.porcentajeAsistencia"
                      class="h-full rounded-full transition-all duration-500"
                    ></div>
                  </div>
                  <div class="flex items-center justify-between text-[11px] text-warm-500 pt-0.5">
                    <span>{{ materia.asistencias }} asistencias</span>
                    <span>{{ materia.inasistencias }} fallas de {{ materia.totalClases }} clases</span>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-warm-100">
                  <span class="text-xs text-warm-500">{{ materia.aula }}</span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="viewPrerequisites.emit(materia)"
                      class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-warm-700 hover:text-warm-900 bg-warm-100 hover:bg-warm-200 border border-warm-200 transition-colors inline-flex items-center gap-1"
                      title="Ver qué materias se necesitan cursar antes de otra"
                    >
                      <svg class="w-3.5 h-3.5 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Prerrequisitos
                    </button>
                    <app-button variant="secondary" size="sm" (clicked)="viewDetail.emit(materia)">
                      <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver Detalle
                    </app-button>
                  </div>
                </div>
              </div>
            </app-card>
          } @empty {
            <div class="col-span-2 bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-3">
              <p class="text-xs text-warm-500">No tienes asignaturas matriculadas actualmente.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class StudentCoursesListComponent {
  materias = input<MateriaEstudianteItem[]>([]);
  isLoading = input<boolean>(false);
  totalCreditos = input<number>(0);
  promedioAsistencia = input<string>('0.0');
  totalFallas = input<number>(0);

  openCodeEnrollment = output<void>();
  openAutoAttendance = output<void>();
  openEnrollmentRequest = output<void>();
  viewDetail = output<MateriaEstudianteItem>();
  viewPrerequisites = output<MateriaEstudianteItem>();

  getBadgeVariant(estado: MateriaEstudianteItem['estado']): BadgeVariant {
    switch (estado) {
      case 'Al día':
        return 'success';
      case 'Riesgo':
        return 'warning';
      case 'Crítico':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  getProgressColor(porcentaje: number): string {
    if (porcentaje >= 85) return 'bg-emerald-500';
    if (porcentaje >= 75) return 'bg-amber-500';
    return 'bg-red-500';
  }
}
