import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeanProgramasService } from '../../../../core/services/dean-programas.service';
import { DeanManagementService } from '../../../../core/services/dean-management.service';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import {
  CatalogoPrograma,
  CoordinadorOpcion,
  ProgramaAcademico,
  ProgramaPayload,
} from '../../../../core/models/programa-academico.model';
import { DeanProgramaFormModalComponent } from './dean-programa-form-modal.component';
import { DeanProgramaEstadoModalComponent } from './dean-programa-estado-modal.component';

/**
 * Gestión de programas académicos del decano (HU076, HU077, HU078, HU108): tabla paginada en servidor con filtros,
 * alta, edición y cambio de estado. No hay actualización optimista: toda mutación recarga desde el backend.
 */
@Component({
    selector: 'app-dean-programas-gestion',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, BadgeComponent, PaginationComponent, DeanProgramaFormModalComponent, DeanProgramaEstadoModalComponent],
    template: `
    <section class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 class="font-serif font-bold text-xl text-warm-900">Programas de la facultad</h2>
        <button type="button" (click)="abrirCrear()" class="px-3.5 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 text-xs font-bold text-white">
          + Nuevo programa
        </button>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          name="filtroNombre"
          aria-label="Buscar programa por nombre"
          placeholder="Buscar programa por nombre..."
          [ngModel]="filtroNombre()"
          (ngModelChange)="filtroNombre.set($event)"
          (keyup.enter)="aplicarFiltros()"
          class="flex-1 px-3.5 py-2 bg-white border border-warm-200 rounded-xl text-sm"
        />
        <select
          name="filtroEstado"
          aria-label="Filtrar programas por estado"
          [ngModel]="filtroEstado()"
          (ngModelChange)="filtroEstado.set($event); aplicarFiltros()"
          class="px-3.5 py-2 bg-white border border-warm-200 rounded-xl text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <button type="button" (click)="aplicarFiltros()" class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200">
          Buscar
        </button>
      </div>

      @if (service.programas().length === 0) {
        <div class="bg-white rounded-2xl border border-warm-200 p-8 text-center shadow-warm-sm" [attr.role]="service.cargando() ? 'status' : null">
          <p class="text-sm text-warm-500">
            {{ service.cargando() ? 'Cargando programas...' : 'No hay programas académicos para los filtros indicados.' }}
          </p>
        </div>
      } @else {
        <div class="relative overflow-x-auto bg-white rounded-2xl border border-warm-200 shadow-warm-sm">
          <table class="min-w-full text-sm">
            <thead class="bg-warm-50 text-xs uppercase text-warm-500">
              <tr>
                <th scope="col" class="text-left px-4 py-2.5">Programa</th>
                <th scope="col" class="text-left px-4 py-2.5">Tipo</th>
                <th scope="col" class="text-left px-4 py-2.5">Modalidad / Jornada</th>
                <th scope="col" class="text-left px-4 py-2.5">Coordinador</th>
                <th scope="col" class="text-left px-4 py-2.5">Estado</th>
                <th scope="col" class="px-4 py-2.5"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (p of service.programas(); track p.id) {
                <tr class="border-t border-warm-100">
                  <td class="px-4 py-2.5 font-semibold text-warm-900">{{ p.nombre }}</td>
                  <td class="px-4 py-2.5 text-warm-700">{{ p.nombreTipoPrograma ?? '—' }}</td>
                  <td class="px-4 py-2.5 text-warm-700">{{ p.nombreModalidad ?? '—' }} / {{ p.nombreJornada ?? '—' }}</td>
                  <td class="px-4 py-2.5 text-warm-700">{{ p.nombreCoordinador ?? '—' }}</td>
                  <td class="px-4 py-2.5">
                    <app-badge [variant]="p.estaActivo ? 'success' : 'neutral'" size="sm">{{ p.estaActivo ? 'ACTIVO' : 'INACTIVO' }}</app-badge>
                  </td>
                  <td class="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                    <button type="button" (click)="abrirEditar(p)" class="text-xs font-bold text-primary-700 hover:underline">Editar</button>
                    <button type="button" (click)="abrirEstado(p)" class="text-xs font-bold text-warm-700 hover:underline">
                      {{ p.estaActivo ? 'Desactivar' : 'Activar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-pagination
        [totalItems]="service.total()"
        [pageSize]="tamano"
        [currentPage]="pagina()"
        (pageChange)="onPageChange($event)"
      />
    </section>

    @if (formularioAbierto()) {
      <app-dean-programa-form-modal
        [programa]="programaEnEdicion()"
        [coordinadoresDisponibles]="coordinadoresDisponibles()"
        [tiposPrograma]="tipos()"
        [modalidades]="modalidades()"
        [jornadas]="jornadas()"
        [error]="errorFormulario()"
        [guardando]="guardando()"
        (guardar)="guardar($event)"
        (cerrar)="cerrarFormulario()"
      />
    }

    @if (programaEstado(); as p) {
      <app-dean-programa-estado-modal
        [programa]="p"
        [error]="errorEstado()"
        (confirmar)="confirmarEstado($event)"
        (cerrar)="cerrarEstado()"
      />
    }
  `
})
export class DeanProgramasGestionComponent implements OnInit {
  readonly service = inject(DeanProgramasService);
  private readonly deanService = inject(DeanManagementService);
  private readonly toast = inject(ToastService);

  readonly tamano = 10;
  readonly pagina = signal(1);
  readonly filtroNombre = signal('');
  readonly filtroEstado = signal('');

  readonly coordinadores = signal<
    Array<{ id: string; idPrograma?: string | null; nombreCompleto?: string; estaActivoCoordinador?: boolean; estaActivoRolCoordinador?: boolean }>
  >([]);
  readonly tipos = signal<CatalogoPrograma[]>([]);
  readonly modalidades = signal<CatalogoPrograma[]>([]);
  readonly jornadas = signal<CatalogoPrograma[]>([]);

  readonly formularioAbierto = signal(false);
  readonly programaEnEdicion = signal<ProgramaAcademico | null>(null);
  readonly errorFormulario = signal('');
  readonly guardando = signal(false);
  readonly programaEstado = signal<ProgramaAcademico | null>(null);
  readonly errorEstado = signal('');

  readonly coordinadoresDisponibles = computed<CoordinadorOpcion[]>(() =>
    this.coordinadores()
      // HU121/HU122: solo coordinadores libres con usuario y rol activos (el SP lo vuelve a validar).
      .filter((c) => !c.idPrograma && c.estaActivoCoordinador !== false && c.estaActivoRolCoordinador !== false)
      .map((c) => ({ id: c.id, nombre: c.nombreCompleto ?? c.id }))
  );

  ngOnInit(): void {
    this.cargar();
    this.cargarCoordinadores();
    this.service.getTiposPrograma().subscribe({ next: (r) => this.tipos.set(r), error: (e) => this.toast.error(getApiErrorMessage(e)) });
    this.service.getModalidades().subscribe({ next: (r) => this.modalidades.set(r), error: (e) => this.toast.error(getApiErrorMessage(e)) });
    this.service.getJornadas().subscribe({ next: (r) => this.jornadas.set(r), error: (e) => this.toast.error(getApiErrorMessage(e)) });
  }

  cargar(): void {
    const estado = this.filtroEstado();
    this.service
      .consultar({
        pagina: this.pagina(),
        tamano: this.tamano,
        nombre: this.filtroNombre().trim() || undefined,
        estaActivo: estado === '' ? undefined : estado === 'true',
      })
      .subscribe({ error: (e) => this.toast.error(getApiErrorMessage(e)) });
  }

  private cargarCoordinadores(): void {
    this.deanService.getCoordinadores().subscribe({
      next: (res) => this.coordinadores.set(res.datos ?? []),
      error: (e) => this.toast.error(getApiErrorMessage(e)),
    });
  }

  aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargar();
  }

  onPageChange(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  abrirCrear(): void {
    this.programaEnEdicion.set(null);
    this.errorFormulario.set('');
    this.formularioAbierto.set(true);
  }

  abrirEditar(programa: ProgramaAcademico): void {
    this.programaEnEdicion.set(programa);
    this.errorFormulario.set('');
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
    this.programaEnEdicion.set(null);
    this.errorFormulario.set('');
  }

  guardar(payload: ProgramaPayload): void {
    const enEdicion = this.programaEnEdicion();
    const operacion = enEdicion ? this.service.actualizar(enEdicion.id, payload) : this.service.crear(payload);
    this.guardando.set(true);
    operacion.subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.toast.success(res.mensajeUsuario || (enEdicion ? 'Programa actualizado.' : 'Programa creado.'));
        this.cerrarFormulario();
        this.cargar();
        this.cargarCoordinadores();
      },
      error: (e) => {
        this.guardando.set(false);
        const mensaje = getApiErrorMessage(e);
        this.errorFormulario.set(mensaje);
        this.toast.error(mensaje);
      },
    });
  }

  abrirEstado(programa: ProgramaAcademico): void {
    this.errorEstado.set('');
    this.programaEstado.set(programa);
  }

  cerrarEstado(): void {
    this.programaEstado.set(null);
    this.errorEstado.set('');
  }

  confirmarEstado(estaActivo: boolean): void {
    const programa = this.programaEstado();
    if (!programa) {
      return;
    }
    this.service.cambiarEstado(programa.id, estaActivo).subscribe({
      next: (res) => {
        this.toast.success(res.mensajeUsuario || 'Estado del programa actualizado.');
        this.cerrarEstado();
        this.cargar();
        this.cargarCoordinadores();
      },
      error: (e) => {
        const mensaje = getApiErrorMessage(e);
        this.errorEstado.set(mensaje);
        this.toast.error(mensaje);
      },
    });
  }
}
