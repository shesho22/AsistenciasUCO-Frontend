import { Component, OnInit, DestroyRef, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Subject, EMPTY } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EstudianteResumenApiDto } from '../../../core/api/models/estudiante-api-dto.model';

type PestanaModulo = 'DIRECTORIO' | 'MATRICULA_GRUPO' | 'SOLICITUDES';

@Component({
  selector: 'app-coordinator-students',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    BadgeComponent,
    ButtonComponent,
    AvatarComponent,
    PaginationComponent,
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
            <span class="text-xs font-medium text-warm-500">Padrón Estudiantil de la Carrera</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Estudiantes del Programa
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Consulta la información académica e institucional de todos los estudiantes adscritos a la carrera.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <span class="px-3.5 py-2 rounded-xl bg-primary-50 text-primary-900 text-xs font-bold border border-primary-200">
            {{ totalDirectorio() }} Estudiantes Registrados
          </span>
          <app-button variant="secondary" size="sm" (clicked)="irAMaterias()">
            Ver Materias del Programa →
          </app-button>
        </div>
      </div>

      <!-- KPIs Rápidos del Padrón Estudiantil -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <span class="text-xs text-warm-500 font-medium">Total en el Programa</span>
          <p class="text-2xl font-serif font-bold text-warm-900 mt-1">{{ totalDirectorio() }}</p>
          <span class="text-[11px] text-warm-500">Estudiantes encontrados</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <span class="text-xs text-warm-500 font-medium">Activos en Página Actual</span>
          <p class="text-2xl font-serif font-bold text-emerald-700 mt-1">{{ totalActivosPagina() }}</p>
          <span class="text-[11px] text-emerald-700">Matrícula académica vigente</span>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <span class="text-xs text-warm-500 font-medium">Inactivos en Página Actual</span>
          <p class="text-2xl font-serif font-bold text-warm-700 mt-1">{{ totalInactivosPagina() }}</p>
          <span class="text-[11px] text-warm-500">Sin matrícula activa en el período</span>
        </div>
      </div>

      <!-- Filtros de Directorio -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2 relative">
          <input
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
          <select
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

      <!-- Grid de Tarjetas de Estudiante -->
      @if (paginatedDirectorio().length === 0 && !isLoadingDirectorio()) {
        <div class="bg-white rounded-2xl border border-warm-200 p-10 text-center text-sm text-warm-500">
          No hay estudiantes que coincidan con los filtros actuales.
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          @for (est of paginatedDirectorio(); track est.id) {
            <div class="bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm flex flex-col h-full justify-between gap-3">
              <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-700">
                    Cód. {{ est.codigo || est.documento }}
                  </span>
                  <app-badge [variant]="est.estadoMatricula === 'ACTIVO' ? 'success' : (est.estadoMatricula === 'BLOQUEADO' ? 'danger' : 'neutral')">
                    {{ est.estadoMatricula }}
                  </app-badge>
                </div>

                <div class="flex items-center gap-3 my-2">
                  <app-avatar [name]="est.nombreCompleto" size="lg"></app-avatar>
                  <div class="min-w-0">
                    <h3 class="font-serif font-bold text-base text-warm-900 truncate">
                      {{ est.nombreCompleto }}
                    </h3>
                    <p class="text-xs text-warm-500 truncate">{{ est.correo }}</p>
                    <p class="text-xs text-warm-400 mt-0.5">Doc. {{ est.documento }}</p>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-warm-50 text-xs border border-warm-100 my-2">
                  <div>
                    <span class="text-warm-400 block text-[10px]">Semestre</span>
                    <span class="font-semibold text-warm-900">{{ est.semestreActual ? est.semestreActual + '° Semestre' : 'No informado' }}</span>
                  </div>
                  <div>
                    <span class="text-warm-400 block text-[10px]">Programa</span>
                    <span class="font-semibold text-warm-900 truncate block">{{ est.programa }}</span>
                  </div>
                </div>

                <div class="space-y-1 text-xs pt-1">
                  <div class="flex items-center justify-between">
                    <span class="text-warm-500">Estado Financiero</span>
                    <span class="font-semibold text-emerald-700">Al Día</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-warm-500">Promedio Ponderado</span>
                    <span class="font-bold text-primary-700">{{ est.promedioAcumulado ?? 'No informado' }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-warm-100 text-xs text-warm-500">
                <span>{{ est.gruposInscritos ? est.gruposInscritos.length + ' asignaturas matriculadas' : 'Matrícula gestionada por grupo docente' }}</span>
                <span class="text-primary-700 font-semibold">UCO Estudiante</span>
              </div>
            </div>
          }
        </div>
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
  `,
})
export class CoordinatorStudentsComponent implements OnInit {
  private readonly coordinatorService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly directorioQuery$ = new Subject<string>();

  // Propiedades preservadas por compatibilidad con specs preexistentes (LB-001B.1B)
  pestanaActiva = signal<PestanaModulo>('DIRECTORIO');
  selectedCourseId = signal<string>('crs-1');

  // Directorio Estudiantil del Programa
  directorio = signal<EstudianteDirectorioItem[]>([]);
  searchDirectorio = signal('');
  filtroEstadoDirectorio = signal('TODOS');
  totalDirectorio = signal(0);
  isLoadingDirectorio = signal(false);

  // Paginación Directorio
  currentPageDirectorio = signal(1);
  pageSizeDirectorio = signal(6);

  filteredDirectorio = computed(() => this.directorio());
  paginatedDirectorio = computed(() => this.directorio());

  totalActivosPagina = computed(
    () => this.directorio().filter((e) => e.estadoMatricula === 'ACTIVO').length
  );

  totalInactivosPagina = computed(
    () => this.directorio().filter((e) => e.estadoMatricula !== 'ACTIVO').length
  );

  ngOnInit(): void {
    this.configureDirectorySearch();
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
    this.isLoadingDirectorio.set(true);
    return this.coordinatorService
      .getEstudiantesDirectorioPagina({
        page: this.currentPageDirectorio() - 1,
        size: this.pageSizeDirectorio(),
        ...(query ? (isNumeric ? { numeroIdentificacion: query } : { nombre: query }) : {}),
        ...(this.filtroEstadoDirectorio() !== 'TODOS'
          ? { activo: this.filtroEstadoDirectorio() === 'ACTIVO' }
          : {}),
      })
      .pipe(
        catchError((error: unknown) => {
          this.directorio.set([]);
          this.totalDirectorio.set(0);
          this.toast.error(getApiErrorMessage(error));
          return EMPTY;
        }),
        finalize(() => this.isLoadingDirectorio.set(false))
      );
  }

  cargarDatos(): void {
    this.ejecutarCargaDirecta();
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
    void this.router.navigate(['/app/coordinador/materias']);
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
