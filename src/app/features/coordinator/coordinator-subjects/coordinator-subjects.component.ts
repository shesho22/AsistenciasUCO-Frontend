import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';
import {
  AsignaturaPlanItem,
  EstudianteDirectorioItem,
  PlanEstudioItem,
} from '../../../core/models/role-management.model';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-coordinator-subjects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    AvatarComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header Bento -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
              Coordinación de Programa
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Oferta Académica de la Carrera</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Materias del Programa
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Consulta todas las materias y grupos activos de la carrera, sus horarios, aulas y el listado de estudiantes inscritos por grupo.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <a routerLink="/app/coordinador/estudiantes">
            <app-button variant="secondary" size="sm">
              Ver Estudiantes →
            </app-button>
          </a>
          <a routerLink="/app/coordinador/planes-estudio">
            <app-button variant="secondary" size="sm">
              Planes de Estudio →
            </app-button>
          </a>
        </div>
      </div>

      <!-- KPIs de Materias del Programa -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <span class="text-xs text-warm-500 font-medium">Grupos / Materias Ofertadas</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ courses().length }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Activos en el período</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <span class="text-xs text-warm-500 font-medium">Asignaturas en Malla Curricular</span>
          <p class="text-2xl font-serif font-bold text-emerald-700 mt-1">{{ asignaturasCurriculares().length }}</p>
          <span class="text-[11px] text-warm-500">En {{ planes().length }} planes de estudio</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <span class="text-xs text-warm-500 font-medium">Ocupación Total de Cupos</span>
          <p class="text-2xl font-serif font-bold text-sky-800 mt-1">
            {{ totalInscritosGrupos() }} / {{ totalCapacidadGrupos() }}
          </p>
          <span class="text-[11px] text-warm-500">Matrícula gestionada por cada docente</span>
        </div>
      </div>

      <!-- Barra de Búsqueda de Materias -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2 relative">
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Buscar materia por código, nombre, grupo o aula..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm"
          />
          <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div>
          <select
            [ngModel]="filtroTipoAsignatura()"
            (ngModelChange)="filtroTipoAsignatura.set($event)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          >
            <option value="TODOS">Todos los componentes</option>
            <option value="Obligatoria">Obligatorias</option>
            <option value="Electiva">Electivas</option>
            <option value="Complementaria">Complementarias</option>
          </select>
        </div>
      </div>

      <!-- 1. SECCIÓN: GRUPOS Y MATERIAS OFERTADAS EN EL PERÍODO -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif font-bold text-xl text-warm-900">
              Grupos y Materias Activas en el Período
            </h2>
            <p class="text-xs text-warm-500">
              Selecciona una materia para consultar su nómina de estudiantes inscritos.
            </p>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-warm-100 text-warm-700">
            {{ filteredCourses().length }} grupos
          </span>
        </div>

        @if (filteredCourses().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-10 text-center text-sm text-warm-500">
            No se encontraron grupos ofertados que coincidan con la búsqueda.
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (curso of filteredCourses(); track curso.id) {
              <div class="bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm flex flex-col h-full justify-between gap-3">
                <div>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-800">
                      {{ curso.code }}
                    </span>
                    <app-badge [variant]="selectedCourseId() === curso.id ? 'info' : 'neutral'">
                      {{ curso.section }}
                    </app-badge>
                  </div>

                  <h3 class="font-serif font-bold text-base text-warm-900 leading-snug">
                    {{ curso.name }}
                  </h3>

                  <div class="mt-3 space-y-1.5 text-xs text-warm-600">
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{{ curso.schedule }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                      </svg>
                      <span>Aula {{ curso.room }}</span>
                    </div>
                  </div>
                </div>

                <div class="pt-3 border-t border-warm-100 flex items-center justify-between gap-2">
                  <span class="text-xs text-warm-500">
                    Cupos: <strong class="text-warm-900">{{ curso.enrolledStudentsCount }} / {{ curso.cupoMaximo || 35 }}</strong>
                  </span>
                  <app-button
                    [variant]="selectedCourseId() === curso.id ? 'primary' : 'secondary'"
                    size="sm"
                    (clicked)="onSelectCourse(curso.id)"
                  >
                    {{ selectedCourseId() === curso.id ? 'Viendo Inscritos' : 'Ver Inscritos' }}
                  </app-button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Detalle de Estudiantes Inscritos en el Grupo Seleccionado (Solo Consulta) -->
      @if (selectedCourse(); as cursoActual) {
        <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm overflow-hidden">
          <div class="p-5 border-b border-warm-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-serif font-bold text-lg text-warm-900">
                  Estudiantes Inscritos en {{ cursoActual.name }}
                </h3>
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-700">
                  {{ cursoActual.code }} • {{ cursoActual.section }}
                </span>
              </div>
              <p class="text-xs text-warm-500 mt-0.5">
                Nómina oficial del grupo (la inscripción y retiro de alumnos en los grupos es administrada directamente por el docente titular).
              </p>
            </div>
            <span class="text-xs font-bold px-3 py-1 rounded-full bg-primary-50 text-primary-800 border border-primary-200 shrink-0">
              {{ enrolledStudents().length }} / {{ cursoActual.cupoMaximo || 35 }} estudiantes
            </span>
          </div>

          @if (enrolledStudents().length === 0) {
            <div class="p-10 text-center text-warm-400">
              <p class="text-sm">No hay estudiantes registrados en este grupo actualmente.</p>
            </div>
          } @else {
            <div class="divide-y divide-warm-100">
              @for (est of enrolledStudents(); track est.id) {
                <div class="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3 min-w-0">
                    <app-avatar [name]="est.nombreCompleto" size="md"></app-avatar>
                    <div class="min-w-0">
                      <h4 class="font-serif font-bold text-sm text-warm-900 truncate">
                        {{ est.nombreCompleto }}
                      </h4>
                      <p class="text-xs text-warm-500">
                        Cód. {{ est.codigo || est.documento }} • Doc. {{ est.documento }} • {{ est.programa }}
                      </p>
                    </div>
                  </div>

                  <app-badge [variant]="est.estadoMatricula === 'ACTIVO' ? 'success' : 'neutral'">
                    {{ est.estadoMatricula }}
                  </app-badge>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- 2. SECCIÓN: CATÁLOGO CURRICULAR DE MATERIAS DE LA CARRERA -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif font-bold text-xl text-warm-900">
              Catálogo Curricular de Materias de la Carrera
            </h2>
            <p class="text-xs text-warm-500">
              Todas las asignaturas registradas en los planes de estudio del programa académico.
            </p>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-warm-100 text-warm-700">
            {{ filteredAsignaturas().length }} asignaturas
          </span>
        </div>

        @if (filteredAsignaturas().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-10 text-center text-sm text-warm-500">
            No hay asignaturas curriculares que coincidan con los filtros seleccionados.
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (asig of filteredAsignaturas(); track asig.id) {
              <div class="bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm flex flex-col h-full justify-between gap-3">
                <div>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-800">
                      {{ asig.codigo }}
                    </span>
                    <app-badge [variant]="getTipoBadgeVariant(asig.componente)">
                      {{ asig.componente }}
                    </app-badge>
                  </div>

                  <h3 class="font-serif font-bold text-base text-warm-900 leading-snug">
                    {{ asig.nombre }}
                  </h3>

                  <div class="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-warm-50 text-xs border border-warm-100 mt-3 text-center">
                    <div>
                      <span class="text-warm-400 block text-[10px]">Semestre</span>
                      <span class="font-bold text-warm-900">{{ asig.semestre }}°</span>
                    </div>
                    <div>
                      <span class="text-warm-400 block text-[10px]">Créditos</span>
                      <span class="font-bold text-warm-900">{{ asig.creditos }}</span>
                    </div>
                    <div>
                      <span class="text-warm-400 block text-[10px]">Horas/Sem</span>
                      <span class="font-bold text-warm-900">{{ asig.horasSemanales }}h</span>
                    </div>
                  </div>
                </div>

                <div class="pt-2 border-t border-warm-100 flex items-center justify-between text-xs">
                  <span class="text-warm-500 truncate">
                    {{ asig.prerrequisitos.length > 0 ? asig.prerrequisitos.join(', ') : 'Sin prerrequisitos' }}
                  </span>
                  <button
                    type="button"
                    (click)="irAMallaPlan(asig.planEstudioId)"
                    class="text-primary-700 hover:text-primary-900 font-semibold shrink-0 ml-2"
                  >
                    Ver Malla →
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class CoordinatorSubjectsComponent implements OnInit {
  private readonly coordinatorService = inject(CoordinatorManagementService);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);

  courses = signal<Course[]>([]);
  selectedCourseId = signal<string>('');
  enrolledStudents = signal<EstudianteDirectorioItem[]>([]);

  planes = signal<PlanEstudioItem[]>([]);
  asignaturasCurriculares = signal<AsignaturaPlanItem[]>([]);

  searchQuery = signal<string>('');
  filtroTipoAsignatura = signal<string>('TODOS');

  selectedCourse = computed(() => {
    return this.courses().find((c) => c.id === this.selectedCourseId()) || null;
  });

  filteredCourses = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.courses();
    return this.courses().filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        (c.room || '').toLowerCase().includes(q)
    );
  });

  filteredAsignaturas = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const tipo = this.filtroTipoAsignatura();
    return this.asignaturasCurriculares().filter((a) => {
      const matchQuery =
        !q ||
        a.codigo.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q);
      const matchTipo = tipo === 'TODOS' || a.componente === tipo;
      return matchQuery && matchTipo;
    });
  });

  totalInscritosGrupos = computed(() =>
    this.courses().reduce((acc, c) => acc + (c.enrolledStudentsCount || 0), 0)
  );

  totalCapacidadGrupos = computed(() =>
    this.courses().reduce((acc, c) => acc + (c.cupoMaximo || 35), 0)
  );

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.courseService.getTeacherCourses().subscribe({
      next: (res) => {
        const list = res.datos || [];
        this.courses.set(list);
        if (list.length > 0 && !this.selectedCourseId()) {
          this.onSelectCourse(list[0].id);
        }
      },
    });

    this.coordinatorService.getPlanesEstudio().subscribe({
      next: (res) => {
        const planesList = res.datos || [];
        this.planes.set(planesList);
        this.asignaturasCurriculares.set([]);
        for (const plan of planesList) {
          this.coordinatorService.getAsignaturasPorPlan(plan.id).subscribe({
            next: (asigRes) => {
              const nuevas = asigRes.datos || [];
              this.asignaturasCurriculares.update((prev) => {
                const ids = new Set(prev.map((item) => item.id));
                return [...prev, ...nuevas.filter((item) => !ids.has(item.id))];
              });
            },
          });
        }
      },
    });
  }

  onSelectCourse(cursoId: string): void {
    this.selectedCourseId.set(cursoId);
    this.coordinatorService.getEstudiantesPorGrupo(cursoId).subscribe({
      next: (res) => this.enrolledStudents.set(res.datos || []),
    });
  }

  irAMallaPlan(planId: string): void {
    this.router.navigate(['/app/coordinador/planes-estudio', planId, 'malla']).catch(() => {});
  }

  getTipoBadgeVariant(componente: string): BadgeVariant {
    switch (componente) {
      case 'Obligatoria':
        return 'info';
      case 'Electiva':
        return 'success';
      case 'Complementaria':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
