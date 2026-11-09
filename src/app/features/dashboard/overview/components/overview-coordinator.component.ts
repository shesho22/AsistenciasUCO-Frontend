import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DocenteItem, PlanEstudioItem } from '../../../../core/models/role-management.model';

@Component({
  selector: 'app-overview-coordinator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, CardComponent, BadgeComponent, ButtonComponent],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="space-y-6">
      <!-- KPIs Coordinador -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Planta Docente Activa</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ docentes().length }}</p>
          <span class="text-[11px] text-success-700 font-medium">100% con carga asignada</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Grupos en Curso</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ totalGrupos() }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Periodo 2026-II</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Estudiantes Registrados</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ totalEstudiantes() }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Padrón del programa</span>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between h-full min-h-[120px]">
          <span class="text-xs text-warm-500 font-medium">Estudiantes en Riesgo</span>
          <p class="text-2xl font-serif font-bold text-accent-700 mt-1" data-testid="estudiantes-riesgo">{{ estudiantesRiesgo() === null ? 'Sin datos' : estudiantesRiesgo() }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Indicador del programa</span>
        </div>
      </section>

      <!-- Planes de Estudio del Programa -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-xl sm:text-2xl font-bold text-warm-900">Planes de Estudio del Programa</h2>
            <p class="text-xs text-warm-500">Malla curricular, créditos aprobados y asignaturas de la carrera</p>
          </div>
          <a routerLink="/app/coordinador/planes-estudio">
            <app-button variant="secondary" size="sm">Ver Malla Completa →</app-button>
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          @for (plan of planesEstudio(); track plan.id) {
            <app-card [hoverable]="true" [title]="plan.nombre" [subtitle]="plan.codigo + ' • Vigencia ' + plan.anioVigencia">
              <div class="space-y-3 my-2 text-xs text-warm-700">
                <div class="grid grid-cols-3 gap-2 bg-warm-50 p-3 rounded-xl">
                  <div class="text-center">
                    <span class="block text-warm-400 text-[10px]">Créditos</span>
                    <span class="font-bold text-warm-900 text-sm">{{ plan.totalCreditos }}</span>
                  </div>
                  <div class="text-center">
                    <span class="block text-warm-400 text-[10px]">Duración</span>
                    <span class="font-bold text-warm-900 text-sm">{{ plan.totalSemestres }} Sem.</span>
                  </div>
                  <div class="text-center">
                    <span class="block text-warm-400 text-[10px]">Estado</span>
                    <span class="font-bold text-xs" [ngClass]="plan.estado === 'VIGENTE' ? 'text-success-700' : 'text-warning-700'">
                      {{ plan.estado }}
                    </span>
                  </div>
                </div>
                <p class="text-[11px] text-warm-500 italic">
                  {{ plan.descripcion }}
                </p>
              </div>

              <div card-footer class="mt-4 pt-3 border-t border-warm-100 flex items-center justify-end">
                <a routerLink="/app/coordinador/planes-estudio" class="w-full">
                  <app-button variant="secondary" size="sm" [fullWidth]="true">
                    Explorar Malla Curricular
                  </app-button>
                </a>
              </div>
            </app-card>
          } @empty {
            <div class="col-span-2 bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-3">
              <p class="text-xs text-warm-500">No hay planes de estudio registrados para este programa.</p>
            </div>
          }
        </div>
      </section>

      <!-- Planta Docente Adscrita -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-xl sm:text-2xl font-bold text-warm-900">Planta Docente Adscrita</h2>
            <p class="text-xs text-warm-500">Profesores vinculados y asignación de grupos de la carrera</p>
          </div>
          <a routerLink="/app/coordinador/docentes">
            <app-button variant="secondary" size="sm">Gestionar Planta Docente →</app-button>
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          @for (docente of docentes().slice(0, 3); track docente.id) {
            <div class="bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm flex flex-col justify-between space-y-4">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-warm-900 text-sm">{{ docente.nombres }} {{ docente.apellidos }}</span>
                  <app-badge variant="success">{{ docente.estado }}</app-badge>
                </div>
                <p class="text-xs text-primary-700 font-medium">{{ docente.especialidad }}</p>
                <p class="text-xs text-warm-500">{{ docente.correo }}</p>
                <p class="text-xs text-warm-600 bg-warm-50 px-2.5 py-1 rounded-md inline-block">
                  Grupos a cargo: <strong class="text-warm-900">{{ docente.totalGruposAsignados }}</strong>
                </p>
              </div>
              <a routerLink="/app/coordinador/docentes" class="w-full">
                <app-button variant="ghost" size="sm" [fullWidth]="true">
                  Ver Perfil y Carga
                </app-button>
              </a>
            </div>
          } @empty {
            <div class="col-span-3 bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-3">
              <p class="text-xs text-warm-500">No hay docentes vinculados actualmente al programa.</p>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class OverviewCoordinatorComponent {
  docentes = input<DocenteItem[]>([]);
  planesEstudio = input<PlanEstudioItem[]>([]);
  totalGrupos = input<number>(0);
  totalEstudiantes = input<number>(0);
  /** `estudiantesRiesgo` de GET /coordinador/indicadores; `null` = sin dato (el KPI no entrega % de asistencia). */
  estudiantesRiesgo = input<number | null>(null);
}
