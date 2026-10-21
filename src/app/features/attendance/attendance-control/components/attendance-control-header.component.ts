import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormSelectComponent, SelectOption } from '../../../../shared/components/form-select/form-select.component';
import { Course } from '../../../../core/models/course.model';
import { ClassSession } from '../../../../core/models/attendance.model';

@Component({
  selector: 'app-attendance-control-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BadgeComponent, ButtonComponent, FormSelectComponent],
  host: {
    class: 'block w-full'
  },
  template: `
    <div class="space-y-4">
      @if (!sessionsEnabled() || !attendanceEnabled()) {
        <p class="text-xs text-warm-600 bg-warm-100 border border-warm-200 rounded-xl px-4 py-2" role="status">
          Las sesiones y la toma de asistencia están temporalmente deshabilitadas. La matrícula de estudiantes continúa disponible.
        </p>
      }

      <header class="bg-white p-4 sm:p-5 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
        <!-- Fila Superior: Título + Botones de Gestión -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-warm-100 pb-3.5">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              @if (showBackButton()) {
                <button
                  type="button"
                  (click)="backToOverview.emit()"
                  class="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-900 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg border border-primary-200 transition-colors shadow-2xs"
                  title="Volver a la información y cronograma de sesiones de este grupo"
                >
                  <svg class="w-3.5 h-3.5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Volver al Grupo</span>
                </button>
                <span class="text-xs text-warm-300">•</span>
              } @else {
                <!-- Botón Volver a la Lista de Todos los Grupos (Solo en vista Overview) -->
                <button
                  type="button"
                  (click)="backToGroups.emit()"
                  class="inline-flex items-center gap-1.5 text-xs font-bold text-warm-700 hover:text-warm-950 bg-warm-100 hover:bg-warm-200 px-2.5 py-1 rounded-lg border border-warm-200 transition-colors shadow-2xs"
                  title="Volver a la vista general de todos los grupos"
                >
                  <svg class="w-3.5 h-3.5 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Ver Todos los Grupos</span>
                </button>
                <span class="text-xs text-warm-300">•</span>
              }
              @if (!sessionsEnabled() || !attendanceEnabled()) {
                <app-badge variant="neutral" size="sm">Sesiones deshabilitadas</app-badge>
              }
              <span class="text-xs font-bold text-warm-500 uppercase tracking-widest">
                {{ currentCourse()?.code ? currentCourse()?.code + ' • ' : '' }}{{ currentCourse()?.section }}
              </span>
            </div>
            <h1 class="font-serif text-xl sm:text-2xl font-bold text-warm-900 tracking-tight">
              Control de Asistencia
            </h1>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Botones contextuales de la sesión activa: Visibles SOLO en modo DETALLE -->
            @if (isDetailMode()) {
              <app-button
                variant="accent"
                size="sm"
                [disabled]="bulkDisabled()"
                (clicked)="markAllPresent.emit()"
              >
                <svg class="w-4 h-4 mr-1 text-warm-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Todos Presentes
              </app-button>

              <app-button
                variant="danger"
                size="sm"
                [disabled]="bulkDisabled()"
                (clicked)="markAllAbsent.emit()"
              >
                <svg class="w-4 h-4 mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Todos Ausentes
              </app-button>

              <app-button
                variant="secondary"
                size="sm"
                [disabled]="!selectedCourseId() || !selectedSessionId()"
                (clicked)="openProjection.emit()"
              >
                <svg class="w-4 h-4 mr-1 text-emerald-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Proyectar QR
              </app-button>
            }
          </div>
        </div>

        <!-- Fila Inferior: Selectores de Curso y Sesión contextualmente adaptados -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          <!-- Selector de Grupo / Asignatura -->
          <div [class]="isDetailMode() ? 'md:col-span-6' : 'md:col-span-9'">
            <app-form-select
              [options]="courseOptions()"
              [value]="selectedCourseId()"
              (valueChange)="courseChange.emit($event)"
            ></app-form-select>
          </div>

          <!-- Selector de Sesión: Visible SOLO en modo DETALLE para saltos rápidos entre clases -->
          @if (isDetailMode()) {
            <div class="md:col-span-6">
              <app-form-select
                [options]="sessionOptions()"
                [value]="selectedSessionId()"
                [disabled]="!sessionsEnabled()"
                (valueChange)="sessionChange.emit($event)"
              ></app-form-select>
            </div>
          }

          <!-- Botón Nueva Sesión: Visible SOLO en modo OVERVIEW (en detalle de sesión no se crean sesiones) -->
          @if (!isDetailMode()) {
            <div class="md:col-span-3 flex justify-end">
              <app-button
                variant="primary"
                size="sm"
                [disabled]="!selectedCourseId()"
                (clicked)="openNewSession.emit()"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                + Sesión
              </app-button>
            </div>
          }
        </div>
      </header>

      @if (sessions().length === 0 && selectedCourseId() && !isLoadingSession()) {
        <div class="bg-white p-8 rounded-2xl border border-dashed border-warm-300 text-center space-y-3 shadow-warm-xs">
          <div class="w-12 h-12 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center mx-auto">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="font-serif font-bold text-base text-warm-900">No hay sesiones programadas para este grupo</h3>
          <p class="text-xs text-warm-600 max-w-md mx-auto">
            Programa la primera sesión de clase ahora mismo para comenzar a registrar la asistencia de tus alumnos.
          </p>
          <app-button variant="primary" size="md" (clicked)="openNewSession.emit()">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Programar Primera Sesión
          </app-button>
        </div>
      }
    </div>
  `,
})
export class AttendanceControlHeaderComponent {
  sessionsEnabled = input<boolean>(true);
  attendanceEnabled = input<boolean>(true);
  isSaving = input<boolean>(false);
  currentCourse = input<Course | null | undefined>(null);
  currentSession = input<ClassSession | null | undefined>(null);
  courseOptions = input<SelectOption[]>([]);
  sessionOptions = input<SelectOption[]>([]);
  selectedCourseId = input<string>('');
  selectedSessionId = input<string>('');
  sessions = input<ClassSession[]>([]);
  isLoadingSession = input<boolean>(false);
  showBackButton = input<boolean>(false);
  isDetailMode = input<boolean>(false);

  // Marcado masivo: features + guardado en curso + existencia de sesión. Sin estado sintético de sesión.
  bulkDisabled = computed(
    () =>
      !this.sessionsEnabled() ||
      !this.attendanceEnabled() ||
      this.isSaving() ||
      !this.currentSession()
  );

  markAllPresent = output<void>();
  markAllAbsent = output<void>();
  openEnrollment = output<void>();
  openNewSession = output<void>();
  openProjection = output<void>();
  exportExcel = output<void>();
  courseChange = output<string>();
  sessionChange = output<string>();
  backToOverview = output<void>();
  backToGroups = output<void>();
}
