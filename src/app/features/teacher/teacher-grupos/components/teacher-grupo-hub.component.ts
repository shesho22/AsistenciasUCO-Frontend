import { Component, ChangeDetectionStrategy, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { Course } from '../../../../core/models/course.model';
import { ClassSession } from '../../../../core/models/attendance.model';
import { TeacherGrupoSesionesComponent } from './teacher-grupo-sesiones.component';
import { TeacherGrupoHorariosComponent } from './teacher-grupo-horarios.component';
import { TeacherGrupoEstudiantesComponent } from './teacher-grupo-estudiantes.component';
import { TeacherGrupoReclamosComponent } from './teacher-grupo-reclamos.component';
import { TeacherGrupoSabanaComponent } from './teacher-grupo-sabana.component';

@Component({
  selector: 'app-teacher-grupo-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    BadgeComponent,
    TeacherGrupoSesionesComponent,
    TeacherGrupoHorariosComponent,
    TeacherGrupoEstudiantesComponent,
    TeacherGrupoReclamosComponent,
    TeacherGrupoSabanaComponent,
  ],
  template: `
    @if (selectedCourse()) {
      <div class="space-y-4">
        <!-- Barra Superior de Retorno -->
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <button
            type="button"
            (click)="volver.emit()"
            class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a Mis Grupos
          </button>

          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
              {{ selectedCourse()?.code ? selectedCourse()?.code + ' • ' : '' }}{{ selectedCourse()?.section }}
            </span>
            <app-badge variant="success">Grupo Activo</app-badge>
          </div>
        </div>

        <!-- Ficha de Encabezado Bento del Grupo -->
        <div class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              @if (selectedCourse()?.code) {
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-800 border border-primary-200">
                  {{ selectedCourse()?.code }}
                </span>
              }
              <span class="text-xs font-bold text-warm-600">{{ selectedCourse()?.section }}</span>
              <span class="text-xs text-warm-400">•</span>
              <span class="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {{ selectedCourse()?.enrolledStudentsCount || estudiantes().length }} alumnos matriculados
              </span>
            </div>
            <h2 class="font-serif font-bold text-2xl text-warm-900">{{ selectedCourse()?.name }}</h2>
            <p class="text-xs text-warm-600">
              Horario Regular: <strong class="text-warm-900">{{ selectedCourse()?.schedule }}</strong>
            </p>
          </div>

          <!-- Acciones Rápidas del Docente -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              (click)="matricular.emit(selectedCourse()!)"
              class="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3.5 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <svg class="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              QR / PIN Matrícula
            </button>

            @if (sessionQrEnabled()) {
              <button
                type="button"
                (click)="proyectarQr.emit(selectedCourse()!)"
                class="text-xs font-bold text-primary-900 hover:text-primary-950 bg-accent-200 hover:bg-accent-300 border border-accent-400 px-3.5 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <svg class="w-4 h-4 text-primary-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Proyectar Auto-Registro
              </button>
            }

            <button
              type="button"
              (click)="irAsistencia.emit(selectedCourse()!)"
              class="text-xs font-bold text-white bg-primary-800 hover:bg-primary-900 px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <svg class="w-4 h-4 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tomar Asistencia Hoy
            </button>
          </div>
        </div>

        <!-- Navegación por Sub-Pestañas del Hub -->
        <div class="flex border-b border-warm-200 gap-2 bg-white px-4 pt-2 rounded-t-2xl shadow-xs overflow-x-auto">
          <button
            type="button"
            (click)="subPestanaHub.set('SESIONES')"
            [class]="subPestanaHub() === 'SESIONES' ? 'border-primary-700 text-primary-900 font-bold' : 'border-transparent text-warm-500 hover:text-warm-800 font-medium'"
            class="px-4 py-3 text-xs sm:text-sm border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Sesiones de Clase
            <span class="px-2 py-0.5 rounded-full text-[11px] bg-warm-100 text-warm-700">{{ sessions().length }}</span>
          </button>

          <button
            type="button"
            (click)="subPestanaHub.set('HORARIOS')"
            [class]="subPestanaHub() === 'HORARIOS' ? 'border-primary-700 text-primary-900 font-bold' : 'border-transparent text-warm-500 hover:text-warm-800 font-medium'"
            class="px-4 py-3 text-xs sm:text-sm border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Horario
          </button>

          <button
            type="button"
            (click)="subPestanaHub.set('ESTUDIANTES')"
            [class]="subPestanaHub() === 'ESTUDIANTES' ? 'border-primary-700 text-primary-900 font-bold' : 'border-transparent text-warm-500 hover:text-warm-800 font-medium'"
            class="px-4 py-3 text-xs sm:text-sm border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Alumnos Matriculados
            <span class="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800">{{ estudiantes().length }}</span>
          </button>

          <button
            type="button"
            (click)="subPestanaHub.set('RECLAMOS')"
            [class]="subPestanaHub() === 'RECLAMOS' ? 'border-primary-700 text-primary-900 font-bold' : 'border-transparent text-warm-500 hover:text-warm-800 font-medium'"
            class="px-4 py-3 text-xs sm:text-sm border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reclamos & Novedades
            <span class="px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800">{{ reclamos().length }}</span>
          </button>

          <button
            type="button"
            (click)="subPestanaHub.set('SABANA')"
            [class]="subPestanaHub() === 'SABANA' ? 'border-primary-700 text-primary-900 font-bold' : 'border-transparent text-warm-500 hover:text-warm-800 font-medium'"
            class="px-4 py-3 text-xs sm:text-sm border-b-2 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Sábana de Asistencia
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-900">Matriz</span>
          </button>
        </div>

        <!-- Renderizado de la Sub-Pestaña Activa -->
        @if (subPestanaHub() === 'SESIONES') {
          <app-teacher-grupo-sesiones
            [sessions]="sessions()"
            [loading]="loadingSessions()"
            [qrEnabled]="sessionQrEnabled()"
            [cancelEnabled]="sessionCancelEnabled()"
            (programarExtraordinaria)="programarExtraordinaria.emit()"
            (tomarAsistencia)="tomarAsistenciaSesion.emit($event)"
            (proyectar)="proyectarSesion.emit($event)"
            (verDetalle)="verDetalleSesion.emit($event)"
            (ajustarHorario)="ajustarHorarioSesion.emit($event)"
            (cancelar)="cancelarSesion.emit($event)"
          />
        }

        @if (subPestanaHub() === 'HORARIOS') {
          <app-teacher-grupo-horarios
            [curso]="selectedCourse()"
            [totalMatriculados]="estudiantes().length"
          />
        }

        @if (subPestanaHub() === 'ESTUDIANTES') {
          <app-teacher-grupo-estudiantes
            [estudiantes]="estudiantes()"
            [cargando]="cargandoEstudiantes()"
            [curso]="selectedCourse()"
          />
        }

        @if (subPestanaHub() === 'RECLAMOS') {
          <app-teacher-grupo-reclamos
            [reclamos]="reclamos()"
            [cargando]="cargandoReclamos()"
            (irAReclamos)="irReclamos.emit()"
          />
        }

        @if (subPestanaHub() === 'SABANA') {
          <app-teacher-grupo-sabana
            [estudiantes]="estudiantes()"
            [sessions]="sessions()"
            [cargando]="cargandoEstudiantes() || loadingSessions()"
          />
        }
      </div>
    }
  `,
})
export class TeacherGrupoHubComponent {
  selectedCourse = input<Course | null>(null);
  sessions = input<ClassSession[]>([]);
  loadingSessions = input<boolean>(false);
  estudiantes = input<any[]>([]);
  cargandoEstudiantes = input<boolean>(false);
  reclamos = input<any[]>([]);
  cargandoReclamos = input<boolean>(false);
  // OUT_OF_GOLDEN_PATH: acciones de sesión sin contrato backend; ocultas salvo feature explícita.
  sessionQrEnabled = input<boolean>(false);
  sessionCancelEnabled = input<boolean>(false);

  subPestanaHub = model<'SESIONES' | 'HORARIOS' | 'ESTUDIANTES' | 'RECLAMOS' | 'SABANA'>('SESIONES');

  volver = output<void>();
  irAsistencia = output<Course>();
  tomarAsistenciaSesion = output<ClassSession>();
  proyectarQr = output<Course>();
  matricular = output<Course>();
  programarExtraordinaria = output<void>();
  proyectarSesion = output<ClassSession>();
  verDetalleSesion = output<ClassSession>();
  ajustarHorarioSesion = output<ClassSession>();
  cancelarSesion = output<ClassSession>();
  irReclamos = output<void>();
}
