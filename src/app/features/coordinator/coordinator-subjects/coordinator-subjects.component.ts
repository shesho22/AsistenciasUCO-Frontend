import { Component, DestroyRef, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, tap } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';
import {
  AsignaturaPlanItem,
  CaracterAsignatura,
  EstudianteDirectorioItem,
} from '../../../core/models/role-management.model';
import { BadgeComponent, BadgeVariant } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ListadoPaginado } from '../../../shared/utils/listado-paginado';
import { ToastService } from '../../../shared/components/toast/toast.component';

@Component({
    selector: 'app-coordinator-subjects',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent, 
    FormsModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    AvatarComponent,
    ErrorCargaComponent,
    PaginationComponent
],
    template: `
    <div class="space-y-6">
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        [conTitulo]="!embebido()"
        etiqueta="Coordinación de Programa"
        contexto="Oferta Académica de la Carrera"
        titulo="Materias del Programa"
        descripcion="Consulta todas las materias y grupos activos de la carrera, sus horarios y el listado de estudiantes inscritos por grupo."
      >
        <div cabecera-acciones class="flex flex-wrap items-center gap-2">
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
      </app-page-header>

      <!-- KPIs de Materias del Programa -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="superficie p-4">
          <span class="text-xs text-warm-500 font-medium">Grupos / Materias Ofertadas</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ listado.total() }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Activos en el período</span>
        </div>
        <div class="superficie p-4">
          <span class="text-xs text-warm-500 font-medium">Asignaturas en Malla Curricular</span>
          <p class="text-2xl font-serif font-bold text-success-700 mt-1">{{ listadoAsignaturas.total() }}</p>
          <span class="text-[11px] text-warm-500">En {{ totalPlanes() }} planes de estudio</span>
        </div>
        <div class="superficie p-4">
          <span class="text-xs text-warm-500 font-medium">Ocupación de Cupos de la página</span>
          <p class="text-2xl font-serif font-bold text-info-800 mt-1">
            {{ totalInscritosGrupos() }} / {{ totalCapacidadGrupos() }}
          </p>
          <span class="text-[11px] text-warm-500">Matrícula gestionada por cada docente</span>
        </div>
      </div>

      <!-- Barra de Búsqueda de Materias -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2 relative">
          <input aria-label="Buscar asignatura por código o nombre"
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="onBusqueda($event)"
            placeholder="Buscar materia por código, nombre o grupo..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm"
          />
          <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div>
          <select aria-label="Filtrar asignaturas por tipo"
            [ngModel]="filtroTipoAsignatura()"
            (ngModelChange)="onCaracter($event)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          >
            <option value="">Todos los caracteres</option>
            @for (c of caracteres(); track c.codigo) {
              <option [value]="c.codigo">{{ c.nombre }}</option>
            }
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
            {{ listado.total() }} grupos
          </span>
        </div>

        @if (errorCarga()) {
          <app-error-carga [error]="errorCarga()!" (reintentar)="cargarDatos()" />
        } @else if (listado.filas().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-10 text-center text-sm text-warm-500">
            No se encontraron grupos ofertados que coincidan con la búsqueda.
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (curso of courses(); track curso.id) {
              <div class="superficie p-6 flex flex-col h-full justify-between gap-3">
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
                  </div>
                </div>

                <div class="pt-3 border-t border-warm-100 flex items-center justify-between gap-2">
                  <span class="text-xs text-warm-500">
                    Cupos: <strong class="text-warm-900">{{ curso.enrolledStudentsCount }} / {{ cupoTexto(curso) }}</strong>
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
          <app-pagination
            [totalItems]="listado.total()"
            [totalPages]="listado.totalPaginas()"
            [pageSize]="listado.tamano()"
            [currentPage]="listado.pagina()"
            (pageChange)="listado.irAPagina($event)"
            (pageSizeChange)="listado.cambiarTamano($event)"
          />
        }
      </div>

      <!-- Detalle de Estudiantes Inscritos en el Grupo Seleccionado (Solo Consulta) -->
      @if (selectedCourse(); as cursoActual) {
        <div class="superficie overflow-hidden">
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
              {{ enrolledStudents().length }} / {{ cupoTexto(cursoActual) }} estudiantes
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
            {{ listadoAsignaturas.total() }} asignaturas
          </span>
        </div>

        @if (listadoAsignaturas.filas().length === 0) {
          <div class="bg-white rounded-2xl border border-warm-200 p-10 text-center text-sm text-warm-500">
            No hay asignaturas curriculares que coincidan con los filtros seleccionados.
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (asig of listadoAsignaturas.filas(); track clavePlan(asig)) {
              <div class="superficie p-6 flex flex-col h-full justify-between gap-3">
                <div>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-800">
                      {{ asig.codigo }}
                    </span>
                    <div class="flex flex-wrap items-center justify-end gap-1">
                      @if (asig.compartida) {
                        <app-badge variant="info">Compartida</app-badge>
                      }
                      <app-badge [variant]="getTipoBadgeVariant(asig.nombreCaracter ?? asig.componente)">
                        {{ asig.nombreCaracter ?? asig.componente }}
                      </app-badge>
                    </div>
                  </div>

                  <h3 class="font-serif font-bold text-base text-warm-900 leading-snug">
                    {{ asig.nombre }}
                  </h3>
                  @if (asig.nombrePrograma) {
                    <p class="text-xs text-warm-500 mt-1">
                      {{ asig.nombrePrograma }}@if (asig.inpPlanEstudio) { · Plan {{ asig.inpPlanEstudio }} }
                    </p>
                  }

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

                <div class="pt-2 border-t border-warm-100 flex items-center justify-end text-xs">
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
          <app-pagination
            [totalItems]="listadoAsignaturas.total()"
            [totalPages]="listadoAsignaturas.totalPaginas()"
            [pageSize]="listadoAsignaturas.tamano()"
            [currentPage]="listadoAsignaturas.pagina()"
            (pageChange)="listadoAsignaturas.irAPagina($event)"
            (pageSizeChange)="listadoAsignaturas.cambiarTamano($event)"
          />
        }
      </div>
    </div>
  `
})
export class CoordinatorSubjectsComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly coordinatorService = inject(CoordinatorManagementService);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);

  /** Los grupos del programa se buscan y paginan en el servidor (CIERRE-W2A); `total` es el del filtro. */
  readonly listado = new ListadoPaginado<Course>(
    (pagina, tamano) =>
      this.courseService
        .getCoordinatorCoursesPage({ busqueda: this.searchQuery().trim() || null, pagina, tamano })
        .pipe(tap((res) => this.seleccionarInicial(res.elementos ?? []))),
    (mensaje) => this.toast.error(mensaje)
  );
  /** Asignaturas del catálogo curricular del programa: búsqueda, carácter y paginación en el servidor. */
  readonly listadoAsignaturas = new ListadoPaginado<AsignaturaPlanItem>(
    (pagina, tamano) =>
      this.coordinatorService.getAsignaturasPrograma({
        busqueda: this.searchQuery().trim() || null,
        caracter: this.filtroTipoAsignatura() || null,
        pagina,
        tamano,
      }),
    (mensaje) => this.toast.error(mensaje)
  );
  courses = this.listado.filas;
  selectedCourseId = signal<string>('');
  enrolledStudents = signal<EstudianteDirectorioItem[]>([]);

  /** Total de planes de estudio del programa (`total` del servidor). */
  totalPlanes = signal(0);
  /** Caracteres del catálogo (código y nombre), no los que aparecen en las filas cargadas. */
  caracteres = signal<CaracterAsignatura[]>([]);

  searchQuery = signal<string>('');
  /** Código del carácter elegido ('' = todos). */
  filtroTipoAsignatura = signal<string>('');
  private readonly busqueda$ = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly errorAuxiliar = signal<LoadErrorState | null>(null);

  selectedCourse = computed(() => {
    return this.courses().find((c) => c.id === this.selectedCourseId()) || null;
  });

  /** B2NM: la misma asignatura aparece una vez por plan donde está vinculada. */
  clavePlan(a: AsignaturaPlanItem): string {
    return `${a.id}|${a.planEstudioId}`;
  }

  totalInscritosGrupos = computed(() =>
    this.courses().reduce((acc, c) => acc + (c.enrolledStudentsCount || 0), 0)
  );

  /** Capacidad total de los grupos que informan cupo; un grupo sin cupo del backend no entra en la suma. */
  totalCapacidadGrupos = computed(() => {
    const conCupo = this.courses().filter((c) => this.tieneCupo(c));
    return conCupo.length === 0 ? '—' : String(conCupo.reduce((acc, c) => acc + (c.cupoMaximo ?? 0), 0));
  });

  private tieneCupo(curso: Course): boolean {
    return typeof curso.cupoMaximo === 'number' && curso.cupoMaximo > 0;
  }

  /** Cupo máximo del backend; «—» (no disponible) cuando no viene: no se inventa un número. */
  cupoTexto(curso: Course): string {
    return this.tieneCupo(curso) ? String(curso.cupoMaximo) : '—';
  }

  readonly errorCarga = computed(() => this.listado.error() ?? this.listadoAsignaturas.error() ?? this.errorAuxiliar());

  constructor() {
    this.listado.tamano.set(12);
    this.listadoAsignaturas.tamano.set(12);
    this.busqueda$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.listado.buscar();
      this.listadoAsignaturas.buscar();
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.errorAuxiliar.set(null);
    this.listado.buscar();
    this.listadoAsignaturas.buscar();

    this.coordinatorService.getPlanesEstudio().subscribe({
      next: (res) => this.totalPlanes.set(Number(res.total ?? res.datos?.length ?? 0)),
      error: (error: unknown) => this.errorAuxiliar.set(classifyLoadError(error)),
    });
    this.coordinatorService.getCaracteresAsignatura().subscribe({
      next: (res) => this.caracteres.set(res.datos ?? []),
      error: (error: unknown) => this.errorAuxiliar.set(classifyLoadError(error)),
    });
  }

  onBusqueda(valor: string): void {
    this.searchQuery.set(valor);
    this.busqueda$.next();
  }

  onCaracter(codigo: string): void {
    this.filtroTipoAsignatura.set(codigo);
    this.listadoAsignaturas.buscar();
  }

  private seleccionarInicial(grupos: Course[]): void {
    if (grupos.length > 0 && !this.selectedCourseId()) {
      this.onSelectCourse(grupos[0].id);
    }
  }

  onSelectCourse(cursoId: string): void {
    this.selectedCourseId.set(cursoId);
    this.coordinatorService.getEstudiantesPorGrupo(cursoId).subscribe({
      next: (res) => this.enrolledStudents.set(res.datos || []),
    });
  }

  irAMallaPlan(planId: string): void {
    void this.router.navigate(['/app/coordinador/planes-estudio', planId, 'malla']);
  }

  getTipoBadgeVariant(componente: string): BadgeVariant {
    switch (componente) {
      case 'Obligatoria':
        return 'info';
      case 'Optativa':
        return 'success';
      case 'Electiva':
        return 'success';
      case 'Complementaria':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
