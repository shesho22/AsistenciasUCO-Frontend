import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { Course } from '../../../../core/models/course.model';
import { CatalogoPrograma } from '../../../../core/models/programa-academico.model';

@Component({
    selector: 'app-teacher-grupos-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, CardComponent, ButtonComponent, BadgeComponent, EmptyStateComponent],
    template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header Bento -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-50 text-success-800 border border-success-200">
              Portal Docente & Oferta Horaria
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Período Académico 2026-2</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Gestión Integral de Grupos y Sesiones
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Crea tus grupos con su horario inicial (los cambios posteriores los aprueba el coordinador), programa sesiones y toma asistencia.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <app-button variant="primary" size="md" data-testid="nuevo-grupo" (clicked)="nuevoGrupo.emit()">
            Nuevo grupo
          </app-button>
          <app-button variant="secondary" size="md" (clicked)="irAsistencia.emit()">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Toma de Asistencia
          </app-button>
        </div>
      </div>

      <!-- Resumen de Métricas Bento -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Grupos Habilitados</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ courses().length }}</p>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-accent-100 text-accent-800 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Estudiantes Registrados</span>
            <p class="text-2xl font-serif font-bold text-warm-900">{{ totalEstudiantes() }}</p>
          </div>
        </div>
      </div>

      <!-- Barra de Búsqueda y filtro por nivel formativo (HU058) -->
      <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <input
          type="text"
          aria-label="Buscar grupo por nombre o código de asignatura"
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
          placeholder="Buscar grupo por nombre o código de asignatura..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm transition-all"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      @if (tiposPrograma().length > 0) {
        <select
          aria-label="Nivel formativo"
          [ngModel]="nivelFormativo()"
          (ngModelChange)="nivelFormativo.set($event)"
          class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 shadow-warm-sm"
        >
          <option value="">Todos los niveles</option>
          @for (t of tiposPrograma(); track t.id) {
            <option [value]="t.id">{{ t.nombre }}</option>
          }
        </select>
      }
      </div>

      <!-- Tarjetas de Grupos -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          @for (n of [1, 2, 3, 4]; track n) {
            <div class="h-60 bg-warm-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      } @else if (filteredCourses().length === 0) {
        <div data-testid="grupos-vacio">
          @if (courses().length === 0) {
            <app-empty-state title="Aún no tienes grupos asignados" description="Cuando tengas grupos a tu cargo aparecerán aquí." />
          } @else {
            <app-empty-state
              variant="search"
              title="Ningún grupo coincide con tu búsqueda"
              description="Revisa el texto buscado o cambia el nivel formativo seleccionado."
            />
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          @for (course of filteredCourses(); track course.id) {
            <app-card
              [hoverable]="true"
              padding="md"
              (click)="seleccionarGrupo.emit(course)"
              class="cursor-pointer transition-all hover:border-primary-300 group block"
            >
              <div class="flex flex-col h-full justify-between gap-4">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <div class="flex items-center gap-2">
                      @if (course.code) {
                        <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800 group-hover:bg-primary-50 group-hover:text-primary-800 transition-colors">
                          {{ course.code }}
                        </span>
                      }
                      <app-badge variant="neutral">{{ course.section }}</app-badge>
                      @if (course.nombreTipoPrograma) {
                        <span class="text-xs font-semibold uppercase text-warm-500">{{ course.nombreTipoPrograma }}</span>
                      }
                    </div>

                    @if (course.enrolledStudentsCount === undefined) {
                      <!-- Total de estudiantes desconocido: no se muestra un conteo inventado -->
                    } @else if (course.cupoMaximo) {
                      <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-success-50 text-success-700 border border-success-200">
                        {{ course.enrolledStudentsCount }} / {{ course.cupoMaximo }} cupos
                      </span>
                    } @else {
                      <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-warm-100 text-warm-700 border border-warm-200">
                        {{ course.enrolledStudentsCount }} inscritos
                      </span>
                    }
                  </div>

                  <h3 class="font-serif font-bold text-xl text-warm-900 group-hover:text-primary-950 transition-colors leading-snug">
                    {{ course.name }}
                  </h3>
                </div>

                <!-- Información del Horario -->
                <div class="p-3 rounded-xl bg-warm-50 border border-warm-100 text-xs text-warm-700 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="font-medium">{{ course.schedule || 'Sin horario asignado' }}</span>
                  </div>
                  <span class="text-xs font-semibold text-primary-700 group-hover:underline">
                    Ver Grupo →
                  </span>
                </div>
              </div>
            </app-card>
          }
        </div>
      }
    </div>
  `
})
export class TeacherGruposListComponent {
  courses = input<Course[]>([]);
  /** HU058: catálogo real de tipos de programa; sin opciones no se muestra el filtro. */
  tiposPrograma = input<CatalogoPrograma[]>([]);
  isLoading = input<boolean>(false);
  // OUT_OF_GOLDEN_PATH: QR de asistencia por sesión sin contrato backend; oculto salvo feature explícita.
  sessionQrEnabled = input<boolean>(false);

  irAsistencia = output<void>();
  nuevoGrupo = output<void>();
  seleccionarGrupo = output<Course>();
  matricular = output<Course>();
  proyectarQr = output<Course>();
  tomarAsistencia = output<Course>();

  searchQuery = signal<string>('');
  nivelFormativo = signal<string>('');

  totalEstudiantes = computed(() =>
    this.courses().reduce((acc, c) => acc + (c.enrolledStudentsCount || 0), 0)
  );

  filteredCourses = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const nivel = this.nivelFormativo();
    const delNivel = nivel ? this.courses().filter((c) => c.idTipoPrograma === nivel) : this.courses();
    if (!q) return delNivel;
    return delNivel.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code ?? '').toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q)
    );
  });

  getPorcentajeCupo(course: Course): number {
    // Sin cupo máximo informado no se inventa uno (antes 35): la barra queda en 0.
    const max = course.cupoMaximo;
    if (!max) return 0;
    const actuales = course.enrolledStudentsCount || 0;
    return Math.min(Math.round((actuales / max) * 100), 100);
  }
}
