import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceStatusBadgeComponent } from '../../../../shared/components/attendance-status-badge/attendance-status-badge.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { MateriaEstudianteItem } from '../../../../core/models/role-management.model';
import { LoadErrorState } from '../../../../core/api/errors/load-error.util';

@Component({
  selector: 'app-student-courses-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardComponent, BadgeComponent, ButtonComponent, AttendanceStatusBadgeComponent, PaginationComponent],
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
            class="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-primary-700 hover:bg-primary-800 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
            title="Matricularse a un grupo académico ingresando el código PIN o enlace provisto por el docente"
          >
            <svg class="w-4 h-4 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Matricularse con Código
          </button>

          <button
            type="button"
            (click)="registrarConPin.emit()"
            data-testid="registrar-con-pin"
            class="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-primary-700 hover:bg-primary-800 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
            title="Registrar tu asistencia con el PIN de 6 dígitos que proyecta el docente"
          >
            <svg class="w-4 h-4 text-success-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Registrar asistencia con PIN
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
          <div class="w-11 h-11 rounded-xl bg-success-50 text-success-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Materias en riesgo</span>
            @if (materiasEnRiesgo() !== null) {
              <p class="text-2xl font-serif font-bold text-warm-900">{{ materiasEnRiesgo() }}</p>
            } @else {
              <p class="text-base font-serif font-bold text-warm-500" data-testid="riesgo-no-disponible">No disponible</p>
            }
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-warm-200 shadow-warm-sm flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-warning-50 text-warning-700 flex items-center justify-center shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <span class="text-xs text-warm-500 font-medium">Horas de falta</span>
            @if (totalHorasFalta() !== null) {
              <p class="text-2xl font-serif font-bold text-warm-900">{{ totalHorasFalta() }} h</p>
            } @else {
              <p class="text-base font-serif font-bold text-warm-500" data-testid="horas-falta-no-disponible">No disponible</p>
            }
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
      } @else if (error()) {
        <div class="bg-white p-8 rounded-2xl border border-danger-200 text-center space-y-3" role="alert" data-testid="materias-error">
          <p class="text-sm font-bold text-danger-800">{{ error()!.titulo }}</p>
          <p class="text-xs text-warm-600">{{ error()!.mensaje }}</p>
          <app-button variant="secondary" size="sm" (clicked)="retry.emit()">Reintentar</app-button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          @for (materia of materiasPagina(); track materia.claveGrupo) {
            <app-card [hoverable]="true" padding="md">
              <div class="flex flex-col h-full justify-between gap-4">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <div class="flex items-center gap-2">
                      @if (materia.codigo) {
                        <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-800">
                          {{ materia.codigo }}
                        </span>
                      }
                      <span class="text-xs text-warm-500 font-medium" data-testid="materia-grupo">{{ materia.grupo }}</span>
                    </div>

                    @if (materia.estado) {
                      <app-badge [variant]="getBadgeVariant(materia.estado)">
                        {{ materia.estado }}
                      </app-badge>
                    }
                  </div>

                  <h3 class="font-serif font-bold text-lg text-warm-900 leading-snug">
                    {{ materia.nombre }}
                  </h3>
                  <p class="text-xs text-warm-500 mt-1">Docente: {{ materia.docente ?? 'No informado' }}</p>
                  @if (materia.creditos || materia.caracter) {
                    <p class="text-xs text-warm-500 mt-0.5" data-testid="materia-creditos-caracter">
                      @if (materia.creditos) { <span>{{ materia.creditos }} créditos</span> }
                      @if (materia.creditos && materia.caracter) { <span> · </span> }
                      @if (materia.caracter) { <span>{{ materia.caracter }}</span> }
                    </p>
                  }
                </div>

                <!-- Indicadores por horas (solo con fuente autoritativa: los entrega el backend) -->
                @if (materia.indicadores; as ind) {
                  <div class="space-y-1.5 p-3 rounded-xl bg-warm-50 border border-warm-100">
                    <div class="flex items-center justify-between gap-2 text-xs">
                      <span class="font-bold text-warm-900" data-testid="porcentaje-inasistencia">{{ ind.porcentajeInasistencia }}% de inasistencia</span>
                      <app-attendance-status-badge [codigoPermanencia]="ind.codigoPermanencia" />
                    </div>
                    <p class="text-xs text-warm-600">{{ ind.horasFalta }} h de falta de {{ ind.horasDictadas }} h dictadas</p>
                    <p class="text-xs text-warm-500">Advertencia desde {{ ind.umbralAdvertencia }}% · pérdida desde {{ ind.umbralPerdida }}%</p>
                  </div>
                } @else {
                  <div class="p-3 rounded-xl bg-warm-50 border border-warm-100 text-xs text-warm-500" data-testid="asistencia-no-disponible">
                    <span class="font-medium text-warm-600">Asistencia:</span> No disponible
                  </div>
                }

                <div class="flex items-center justify-between pt-2 border-t border-warm-100">
                  <span class="text-xs text-warm-500">{{ materia.horario ?? 'Horario no informado' }}</span>
                  <div class="flex items-center gap-2">
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
            <div class="md:col-span-2 bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-3" data-testid="materias-vacio">
              <p class="text-xs text-warm-500">No tienes asignaturas matriculadas actualmente.</p>
            </div>
          }
        </div>
        <app-pagination
          [totalItems]="materias().length"
          [pageSize]="tamano()"
          [currentPage]="paginaEfectiva()"
          [pageSizeOptions]="[6, 12, 24]"
          (pageChange)="pagina.set($event)"
          (pageSizeChange)="cambiarTamano($event)"
        />
      }
    </div>
  `,
})
export class StudentCoursesListComponent {
  materias = input<MateriaEstudianteItem[]>([]);
  isLoading = input<boolean>(false);
  error = input<LoadErrorState | null>(null);
  totalCreditos = input<number>(0);
  /** `null` = sin fuente autoritativa de asistencia. */
  materiasEnRiesgo = input<number | null>(null);
  totalHorasFalta = input<number | null>(null);

  readonly pagina = signal(1);
  readonly tamano = signal(12);
  readonly paginaEfectiva = computed(() =>
    Math.min(this.pagina(), Math.max(1, Math.ceil(this.materias().length / this.tamano())))
  );
  readonly materiasPagina = computed(() => {
    const inicio = (this.paginaEfectiva() - 1) * this.tamano();
    return this.materias().slice(inicio, inicio + this.tamano());
  });

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
  }

  retry = output<void>();
  openCodeEnrollment = output<void>();
  registrarConPin = output<void>();
  viewDetail = output<MateriaEstudianteItem>();

  getBadgeVariant(estado: MateriaEstudianteItem['estado'] | null): BadgeVariant {
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
}
