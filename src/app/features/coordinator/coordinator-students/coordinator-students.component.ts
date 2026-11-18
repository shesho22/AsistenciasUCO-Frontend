import { Component, OnInit, DestroyRef, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { EstudianteDirectorioItem } from '../../../core/models/role-management.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { Subject, EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EstudianteResumenApiDto } from '../../../core/api/models/estudiante-api-dto.model';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';
import { CoordinatorProgramSelectorComponent } from '../shared/coordinator-program-selector.component';
import { CoordinatorFichaModalComponent } from '../coordinator-indicators/components/coordinator-ficha-modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

type PestanaModulo = 'DIRECTORIO';

@Component({
    selector: 'app-coordinator-students',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent, 
    FormsModule,
    BadgeComponent,
    ButtonComponent,
    AvatarComponent,
    PaginationComponent,
    CoordinatorFichaModalComponent,
    CoordinatorProgramSelectorComponent,
    ErrorCargaComponent
],
    template: `
    <div class="space-y-6">
      <app-coordinator-program-selector (programaCambiado)="alCambiarPrograma()" />
      <!-- Header Bento -->
      <app-page-header
        [enTarjeta]="true"
        etiqueta="Coordinación de Programa"
        contexto="Padrón Estudiantil de la Carrera"
        titulo="Estudiantes del Programa"
        descripcion="Consulta la información académica e institucional de todos los estudiantes adscritos a la carrera."
      >
        <div cabecera-acciones class="flex flex-wrap items-center gap-3">
          <span class="px-3.5 py-2 rounded-xl bg-primary-50 text-primary-900 text-xs font-bold border border-primary-200">
            {{ totalDirectorio() }} Estudiantes Registrados
          </span>
          <app-button variant="secondary" size="sm" (clicked)="irAMaterias()">
            Ver Materias del Programa →
          </app-button>
        </div>
      </app-page-header>

      <!-- KPIs Rápidos del Padrón Estudiantil -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="superficie p-4">
          <span class="text-xs text-warm-500 font-medium">Total en el Programa</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ totalDirectorio() }}</p>
          <span class="text-[11px] text-warm-500">Estudiantes encontrados</span>
        </div>
        <div class="superficie p-4">
          <span class="text-xs text-warm-500 font-medium">Activos en el Programa</span>
          <p class="text-2xl font-serif font-bold text-success-700 mt-1">{{ totalActivos() }}</p>
          <span class="text-[11px] text-success-700">Matrícula académica vigente</span>
        </div>
        <div class="superficie p-4">
          <span class="text-xs text-warm-500 font-medium">Inactivos en el Programa</span>
          <p class="text-2xl font-serif font-bold text-warm-700 mt-1">{{ totalInactivos() }}</p>
          <span class="text-[11px] text-warm-500">Sin matrícula activa en el período</span>
        </div>
      </div>

      <!-- Filtros de Directorio -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2 relative">
          <input aria-label="Buscar estudiante por nombre, documento o correo"
            type="text"
            [ngModel]="searchDirectorio()"
            (ngModelChange)="onDirectorioSearchChange($event)"
            placeholder="Buscar estudiante por documento, código universitario o nombre..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-warm-sm"
          />
          <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div>
          <select aria-label="Filtrar estudiantes por estado"
            [ngModel]="filtroEstadoDirectorio()"
            (ngModelChange)="onDirectorioStatusChange($event)"
            class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Solo Activos</option>
            <option value="INACTIVO">Solo Inactivos</option>
          </select>
        </div>
      </div>

      <!-- Lista de estudiantes del programa -->
      @if (errorDirectorio() && !isLoadingDirectorio()) {
        <app-error-carga [error]="errorDirectorio()!" (reintentar)="cargarDatos()" />
      } @else if (paginatedDirectorio().length === 0 && !isLoadingDirectorio()) {
        <div class="bg-white rounded-2xl border border-warm-200 p-10 text-center text-sm text-warm-500">
          No hay estudiantes que coincidan con los filtros actuales.
        </div>
      } @else {
        <!-- MEJORAS-SERGIO 8: lista en tabla (una fila por estudiante) con la acción "Ver ficha"; sin estado financiero ni promedio,
             que el sistema no administra -->
        <div class="superficie overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-warm-800" data-testid="tabla-estudiantes">
              <thead class="bg-warm-50 border-b border-warm-200 text-[11px] font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left">Estudiante</th>
                  <th scope="col" class="px-4 py-3 text-left">Documento</th>
                  <th scope="col" class="px-4 py-3 text-left">Semestre</th>
                  <th scope="col" class="px-4 py-3 text-left">Programa</th>
                  <th scope="col" class="px-4 py-3 text-left">Estado</th>
                  <th scope="col" class="px-4 py-3 text-right"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (est of paginatedDirectorio(); track est.id) {
                  <tr class="hover:bg-warm-50/60 transition-colors" [attr.data-testid]="'fila-estudiante-' + est.id">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <app-avatar [name]="est.nombreCompleto" size="sm"></app-avatar>
                        <div class="min-w-0">
                          <p class="font-semibold text-warm-900 truncate">{{ est.nombreCompleto }}</p>
                          <p class="text-xs text-warm-500 truncate">{{ est.correo }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 font-mono text-xs text-warm-700 whitespace-nowrap">{{ est.documento }}</td>
                    <td class="px-4 py-3 text-xs whitespace-nowrap">{{ est.semestreActual ? est.semestreActual + '°' : 'No informado' }}</td>
                    <td class="px-4 py-3 text-xs max-w-[14rem] truncate" [title]="est.programa">{{ est.programa }}</td>
                    <td class="px-4 py-3">
                      <app-badge [variant]="est.estadoMatricula === 'ACTIVO' ? 'success' : (est.estadoMatricula === 'BLOQUEADO' ? 'danger' : 'neutral')">
                        {{ est.estadoMatricula }}
                      </app-badge>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                      <!-- HU159: la ficha (historial y "Corregir datos") también desde el padrón del programa -->
                      <button type="button" data-testid="ver-ficha-estudiante" (click)="abrirFicha(est)" class="min-h-[44px] px-3 text-xs text-primary-700 font-semibold hover:underline">
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (estudianteFicha(); as e) {
        <app-coordinator-ficha-modal [idEstudiante]="e.id" [nombre]="e.nombreCompleto" (cerrar)="estudianteFicha.set(null)" />
      }

      <!-- Paginador del Directorio -->
      <app-pagination
        [totalItems]="totalDirectorio()"
        [pageSize]="pageSizeDirectorio()"
        [currentPage]="currentPageDirectorio()"
        (pageChange)="onDirectorioPageChange($event)"
        (pageSizeChange)="onPageSizeDirectorioChange($event)"
      ></app-pagination>
    </div>
  `
})
export class CoordinatorStudentsComponent implements OnInit {
  abrirFicha(estudiante: EstudianteDirectorioItem): void {
    this.estudianteFicha.set(estudiante);
  }

  private readonly coordinatorService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  private readonly programa = inject(CoordinatorProgramService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly directorioQuery$ = new Subject<string>();

  // Propiedades preservadas por compatibilidad con specs preexistentes (LB-001B.1B)
  pestanaActiva = signal<PestanaModulo>('DIRECTORIO');
  selectedCourseId = signal<string>('crs-1');

  /** HU159: estudiante cuya ficha (con "Corregir datos") está abierta. */
  estudianteFicha = signal<EstudianteDirectorioItem | null>(null);

  // Directorio Estudiantil del Programa
  directorio = signal<EstudianteDirectorioItem[]>([]);
  searchDirectorio = signal('');
  filtroEstadoDirectorio = signal('TODOS');
  totalDirectorio = signal(0);
  isLoadingDirectorio = signal(false);
  errorDirectorio = signal<LoadErrorState | null>(null);

  // Paginación Directorio
  currentPageDirectorio = signal(1);
  pageSizeDirectorio = signal(10);

  filteredDirectorio = computed(() => this.directorio());
  paginatedDirectorio = computed(() => this.directorio());

  /** Activos e inactivos del programa: los cuenta el servidor (filtro `activo`), no la página cargada. */
  totalActivos = signal(0);
  totalInactivos = signal(0);

  ngOnInit(): void {
    this.configureDirectorySearch();
    // S4: primero se conocen los programas del coordinador; las consultas viajan siempre con programaId.
    this.programa.cargar().subscribe({
      next: () => this.cargarDatos(),
      error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
    });
  }

  alCambiarPrograma(): void {
    this.currentPageDirectorio.set(1);
    this.cargarDatos();
  }

  private configureDirectorySearch(): void {
    this.directorioQuery$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(() => this.fetchDirectorioPage()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((page) => {
        this.directorio.set(page.items.map((item) => this.toDirectoryItem(item)));
        this.totalDirectorio.set(Number(page.totalItems || 0));
      });
  }

  private fetchDirectorioPage() {
    const query = this.searchDirectorio().trim();
    const isNumeric = /^\d+$/.test(query);
    const filtroBusqueda = isNumeric ? { numeroIdentificacion: query } : { nombre: query };
    this.isLoadingDirectorio.set(true);
    this.errorDirectorio.set(null);
    return this.coordinatorService
      .getEstudiantesDirectorioPagina({
        page: this.currentPageDirectorio() - 1,
        size: this.pageSizeDirectorio(),
        ...(query ? filtroBusqueda : {}),
        ...(this.filtroEstadoDirectorio() !== 'TODOS'
          ? { activo: this.filtroEstadoDirectorio() === 'ACTIVO' }
          : {}),
      })
      .pipe(
        catchError((error: unknown) => {
          this.directorio.set([]);
          this.totalDirectorio.set(0);
          this.errorDirectorio.set(classifyLoadError(error));
          this.toast.error(getApiErrorMessage(error));
          return EMPTY;
        }),
        finalize(() => this.isLoadingDirectorio.set(false))
      );
  }

  cargarDatos(): void {
    this.ejecutarCargaDirecta();
    this.cargarTotalesPorEstado();
  }

  private cargarTotalesPorEstado(): void {
    this.coordinatorService
      .getTotalEstudiantesPorEstado(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (total) => this.totalActivos.set(total), error: (error: unknown) => this.toast.error(getApiErrorMessage(error)) });
    this.coordinatorService
      .getTotalEstudiantesPorEstado(false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (total) => this.totalInactivos.set(total), error: (error: unknown) => this.toast.error(getApiErrorMessage(error)) });
  }

  onDirectorioSearchChange(value: string): void {
    this.searchDirectorio.set(value);
    this.currentPageDirectorio.set(1);
    this.cargarDirectorio();
  }

  onDirectorioStatusChange(value: string): void {
    this.filtroEstadoDirectorio.set(value);
    this.currentPageDirectorio.set(1);
    this.ejecutarCargaDirecta();
  }

  onDirectorioPageChange(page: number): void {
    this.currentPageDirectorio.set(page);
    this.ejecutarCargaDirecta();
  }

  onPageSizeDirectorioChange(newSize: number): void {
    this.pageSizeDirectorio.set(newSize);
    this.currentPageDirectorio.set(1);
    this.ejecutarCargaDirecta();
  }

  private ejecutarCargaDirecta(): void {
    this.fetchDirectorioPage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => {
        this.directorio.set(page.items.map((item) => this.toDirectoryItem(item)));
        this.totalDirectorio.set(Number(page.totalItems || 0));
      });
  }

  cargarDirectorio(): void {
    this.directorioQuery$.next(
      [
        this.currentPageDirectorio(),
        this.pageSizeDirectorio(),
        this.searchDirectorio().trim(),
        this.filtroEstadoDirectorio(),
      ].join('|')
    );
  }

  onSelectCourse(cursoId: string): void {
    this.selectedCourseId.set(cursoId);
  }

  irAMaterias(): void {
    void this.router.navigate(['/app/coordinador/programa/materias']);
  }

  private toDirectoryItem(item: EstudianteResumenApiDto): EstudianteDirectorioItem {
    return {
      id: item.id,
      documento: String(item.numeroIdentificacion),
      codigo: '',
      nombreCompleto: item.nombreCompleto,
      correo: item.correo,
      programa: 'No informado por el directorio',
      estadoMatricula: item.estaActivoUsuario ? 'ACTIVO' : 'INACTIVO',
    };
  }
}
