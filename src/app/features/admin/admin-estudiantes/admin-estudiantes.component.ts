import { Component, ElementRef, OnInit, computed, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CorreccionIdentidadService } from '../../../core/services/correccion-identidad.service';
import { EstudianteInstitucionItem, FichaUnificadaEstudiante } from '../../../core/models/consultas-transversales.model';
import { AdmisionEstudianteDto } from '../../../core/models/role-management.model';
import { CorregirIdentidadPayload, IdentidadActual } from '../../../core/models/correccion-identidad.model';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { FiltrosPlegablesComponent } from '../../../shared/components/filtros-plegables/filtros-plegables.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { HistorialEstudianteComponent } from '../../../shared/components/historial-estudiante/historial-estudiante.component';
import { AdmisionEstudianteModalComponent } from './admision-estudiante-modal.component';
import { CorreccionIdentidadModalComponent } from '../../../shared/components/correccion-identidad-modal/correccion-identidad-modal.component';
import { FiltroEstado, ListadoPaginado, estadoComoFiltro } from '../../../shared/utils/listado-paginado';

interface OpcionFacultad {
  id: string;
  nombre: string;
}

/**
 * HU157: el administrador busca estudiantes de su institución (nombre o documento, facultad y estado) y abre la ficha
 * unificada con su historial completo: programas, grupos por período y resumen de asistencia. Solo lectura.
 * HU156: admisión de estudiantes en programas institucionales y corrección de datos de identidad con auditoría.
 */
@Component({
    selector: 'app-admin-estudiantes',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [
        CommonModule,
        FormsModule,
        BadgeComponent,
        PaginationComponent,
        HistorialEstudianteComponent,
        AdmisionEstudianteModalComponent,
        CorreccionIdentidadModalComponent,
        ErrorCargaComponent,
        FiltrosPlegablesComponent,
    ],
    template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">Administración</span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Gestión de Estudiantes</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Estudiantes de la Institución</h1>
          <p class="text-sm text-warm-600 mt-1">Busca estudiantes, consulta su ficha unificada, admite nuevos alumnos o corrige sus datos de identidad.</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="abrirAdmision()"
            class="min-h-[44px] px-4 py-2.5 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold transition-colors shadow-warm-sm flex items-center gap-2"
          >
            <span>+</span> Admitir estudiante
          </button>
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">{{ listado.cargando() && listado.filas().length === 0 ? '…' : listado.total() }} Estudiantes</span>
        </div>
      </div>

      <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
        <app-filtros-plegables [activos]="filtrosActivos()">
          <div buscar class="flex gap-2">
            <input
              type="search"
              aria-label="Buscar estudiante"
              [ngModel]="busqueda()"
              (ngModelChange)="busqueda.set($event)"
              (keyup.enter)="listado.buscar()"
              placeholder="Buscar por nombre o documento..."
              class="flex-1 min-w-0 px-3.5 py-2.5 min-h-[44px] bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
            />
            <button
              type="button"
              (click)="listado.buscar()"
              class="min-h-[44px] px-4 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold"
            >
              Buscar
            </button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              aria-label="Facultad"
              [ngModel]="idFacultad()"
              (ngModelChange)="onFacultad($event)"
              class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
            >
              <option value="">Todas las facultades</option>
              @for (f of facultades(); track f.id) {
                <option [value]="f.id">{{ f.nombre }}</option>
              }
            </select>
            <select
              aria-label="Estado"
              [ngModel]="estado()"
              (ngModelChange)="onEstado($event)"
              class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>
        </app-filtros-plegables>

        @if (listado.error() && !listado.cargando()) {
          <app-error-carga [error]="listado.error()!" (reintentar)="listado.reintentar()" />
        } @else if (listado.cargando() && listado.filas().length === 0) {
          <p role="status" class="text-sm text-warm-500 text-center py-6">Cargando estudiantes…</p>
        } @else if (listado.filas().length === 0) {
          <p class="text-sm text-warm-500 text-center py-6">No hay estudiantes que coincidan con la búsqueda.</p>
        } @else {
          <div class="relative overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Estudiante</th>
                  <th scope="col" class="py-2 pr-3">Documento</th>
                  <th scope="col" class="py-2 pr-3">Facultades y programas</th>
                  <th scope="col" class="py-2 pr-3">Grupos</th>
                  <th scope="col" class="py-2 pr-3">Estado</th>
                  <th scope="col" class="py-2 text-right"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (e of listado.filas(); track e.idEstudiante) {
                  <tr class="border-b border-warm-50" [class.bg-primary-50]="ficha()?.idEstudiante === e.idEstudiante">
                    <td class="py-2 pr-3">
                      <span class="font-semibold text-warm-900 block">{{ e.nombreCompleto }}</span>
                      <span class="text-xs text-warm-500">{{ e.correo || '—' }}</span>
                    </td>
                    <td class="py-2 pr-3 font-mono text-xs text-warm-600">{{ e.numeroIdentificacion || '—' }}</td>
                    <td class="py-2 pr-3">
                      <span class="text-warm-900 block">{{ e.programas || '—' }}</span>
                      <span class="text-xs text-warm-500">{{ e.facultades || '—' }}</span>
                    </td>
                    <td class="py-2 pr-3 text-warm-700">{{ e.totalGrupos }}</td>
                    <td class="py-2 pr-3">
                      <app-badge [variant]="e.activo ? 'success' : 'neutral'">{{ e.activo ? 'Activo' : 'Inactivo' }}</app-badge>
                    </td>
                    <td class="py-2 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        class="min-h-[44px] px-2 text-xs font-semibold text-primary-700 hover:underline"
                        (click)="abrirCorreccion(e)"
                      >
                        Corregir identidad
                      </button>
                      <button
                        type="button"
                        class="min-h-[44px] px-2 text-xs font-semibold text-warm-600 hover:underline"
                        (click)="verFicha(e)"
                      >
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <app-pagination
          [totalItems]="listado.total()"
          [totalPages]="listado.totalPaginas()"
          [pageSize]="listado.tamano()"
          [currentPage]="listado.pagina()"
          (pageChange)="listado.irAPagina($event)"
          (pageSizeChange)="listado.cambiarTamano($event)"
        ></app-pagination>
      </section>

      @if (ficha(); as f) {
        <section
          #fichaPanel
          tabindex="-1"
          role="region"
          aria-label="Ficha unificada del estudiante"
          class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4 outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-serif font-bold text-lg text-warm-900">{{ f.nombreCompleto }}</h2>
              <p class="text-xs text-warm-500">Historial completo · {{ f.matriculas.length }} matrículas</p>
            </div>
            <button type="button" class="text-xs font-semibold text-warm-600 hover:underline" (click)="ficha.set(null)">Cerrar</button>
          </div>
          <app-historial-estudiante [ficha]="f" />
        </section>
      }

      <!-- Modal de Admisión de Estudiantes (HU156) -->
      @if (modalAdmisionAbierto()) {
        <app-admision-estudiante-modal
          (cerrar)="cerrarAdmision()"
          (admitido)="onEstudianteAdmitido($event)"
        />
      }

      <!-- Modal de Corrección de Identidad (HU156 / HU159) -->
      @if (estudianteACorregir(); as ec) {
        <app-correccion-identidad-modal
          titulo="Corregir datos del estudiante"
          [actual]="identidadDe(ec)"
          [guardando]="guardandoCorreccion()"
          [error]="errorCorreccion()"
          (guardar)="corregirEstudiante(ec, $event)"
          (cancelar)="cerrarCorreccion()"
        />
      }
    </div>
  `
})
export class AdminEstudiantesComponent implements OnInit {
  private readonly service = inject(ConsultasTransversalesService);
  private readonly admin = inject(AdminManagementService);
  private readonly correccionIdentidad = inject(CorreccionIdentidadService);
  private readonly toast = inject(ToastService);

  busqueda = signal('');
  idFacultad = signal('');
  estado = signal<FiltroEstado>('TODOS');
  /** Filtros aplicados fuera de la busqueda: alimenta la insignia del boton "Filtros". */
  filtrosActivos = computed(() => (this.idFacultad() ? 1 : 0) + (this.estado() !== 'TODOS' ? 1 : 0));
  facultades = signal<OpcionFacultad[]>([]);
  ficha = signal<FichaUnificadaEstudiante | null>(null);
  private readonly fichaPanel = viewChild<ElementRef<HTMLElement>>('fichaPanel');

  // HU156: Admisión
  readonly modalAdmisionAbierto = signal(false);

  // HU156: Corrección de identidad
  readonly estudianteACorregir = signal<EstudianteInstitucionItem | null>(null);
  readonly guardandoCorreccion = signal(false);
  readonly errorCorreccion = signal<string | null>(null);

  readonly listado = new ListadoPaginado<EstudianteInstitucionItem>(
    (pagina, tamano) =>
      this.service.buscarEstudiantes({
        busqueda: this.busqueda(),
        idFacultad: this.idFacultad() || null,
        estaActivo: estadoComoFiltro(this.estado()),
        pagina,
        tamano,
      }),
    (mensaje) => this.toast.error(mensaje)
  );

  ngOnInit(): void {
    this.listado.cargar();
    this.admin.cargarFacultades().subscribe({
      next: (res) => this.facultades.set((res.datos ?? []).map((f) => ({ id: f.id, nombre: f.nombre }))),
      error: () => this.facultades.set([]),
    });
  }

  onFacultad(idFacultad: string): void {
    this.idFacultad.set(idFacultad);
    this.listado.buscar();
  }

  onEstado(estado: FiltroEstado): void {
    this.estado.set(estado);
    this.listado.buscar();
  }

  verFicha(estudiante: EstudianteInstitucionItem): void {
    this.service.getHistorialEstudiante(estudiante.idEstudiante, true).subscribe({
      next: (res) => {
        this.ficha.set(res.datos ?? null);
        setTimeout(() => this.fichaPanel()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      },
      error: (error: unknown) => {
        this.ficha.set(null);
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }

  // ================= ADMISIÓN (HU156) =================
  abrirAdmision(): void {
    this.modalAdmisionAbierto.set(true);
  }

  cerrarAdmision(): void {
    this.modalAdmisionAbierto.set(false);
  }

  onEstudianteAdmitido(dto: AdmisionEstudianteDto): void {
    this.modalAdmisionAbierto.set(false);
    this.listado.cargar();
  }

  // ================= CORRECCIÓN IDENTIDAD (HU156) =================
  abrirCorreccion(e: EstudianteInstitucionItem): void {
    this.estudianteACorregir.set(e);
    this.errorCorreccion.set(null);
  }

  cerrarCorreccion(): void {
    this.estudianteACorregir.set(null);
    this.errorCorreccion.set(null);
  }

  identidadDe(e: EstudianteInstitucionItem): IdentidadActual {
    const nombres = e.nombreCompleto?.trim().split(/\s+/).filter(Boolean) ?? [];
    let primerNombre = '';
    let segundoNombre: string | null = null;
    let primerApellido = '';
    let segundoApellido: string | null = null;

    if (nombres.length === 1) {
      primerNombre = nombres[0];
      primerApellido = nombres[0];
    } else if (nombres.length === 2) {
      primerNombre = nombres[0];
      primerApellido = nombres[1];
    } else if (nombres.length === 3) {
      primerNombre = nombres[0];
      primerApellido = nombres[1];
      segundoApellido = nombres[2];
    } else if (nombres.length >= 4) {
      primerNombre = nombres[0];
      segundoNombre = nombres.slice(1, nombres.length - 2).join(' ') || null;
      primerApellido = nombres[nombres.length - 2];
      segundoApellido = nombres[nombres.length - 1];
    }

    return {
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
      numeroIdentificacion: e.numeroIdentificacion,
      codigoTipoIdentificacion: null,
      idTipoIdentificacion: null,
    };
  }

  corregirEstudiante(e: EstudianteInstitucionItem, payload: CorregirIdentidadPayload): void {
    this.guardandoCorreccion.set(true);
    this.errorCorreccion.set(null);

    this.correccionIdentidad.corregirEstudiantePorAdmin(e.idEstudiante, payload).subscribe({
      next: (r) => {
        this.guardandoCorreccion.set(false);
        this.estudianteACorregir.set(null);
        if (r.datos?.sincronizacionIdentidad === 'PENDIENTE') {
          this.toast.warning(
            r.datos.mensajeUsuario ??
              'Los datos se corrigieron; la cuenta de acceso queda pendiente de sincronizar.'
          );
        } else {
          this.toast.success('Los datos del estudiante fueron corregidos.');
        }
        this.listado.cargar();
      },
      error: (err: unknown) => {
        this.guardandoCorreccion.set(false);
        this.errorCorreccion.set(getApiErrorMessage(err));
      },
    });
  }
}
