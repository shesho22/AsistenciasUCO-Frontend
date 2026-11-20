import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, input } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { EMPTY, catchError, debounceTime, switchMap, tap } from 'rxjs';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CatalogService, TipoIdentificacionItem } from '../../../core/services/catalog.service';
import {
  ActualizarDocentePayload,
  DocenteCandidato,
  DocentePrograma,
  ResumenDocentesPrograma,
  VincularDocenteExistentePayload,
  VincularDocenteNuevoPayload,
  VincularDocentePayload,
} from '../../../core/models/docente-programa.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AccountAccessStatusComponent } from '../../../shared/components/account-access-status/account-access-status.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { CoordinatorDocenteFormModalComponent } from './components/coordinator-docente-form-modal.component';
import { CoordinatorDocenteEditModalComponent } from './components/coordinator-docente-edit-modal.component';
import { CoordinatorDocenteFichaModalComponent } from './components/coordinator-docente-ficha-modal.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

type FiltroEstado = 'TODOS' | 'ACTIVO' | 'INACTIVO';

const DEBOUNCE_MS = 300;
const MIN_CARACTERES_CANDIDATOS = 3;

@Component({
    selector: 'app-coordinator-docentes',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent, PageHeaderComponent, 
    FormsModule,
    BadgeComponent,
    ButtonComponent,
    PaginationComponent,
    AccountAccessStatusComponent,
    CoordinatorDocenteFormModalComponent,
    CoordinatorDocenteEditModalComponent,
    CoordinatorDocenteFichaModalComponent,
    ErrorCargaComponent
],
    template: `
    <div class="space-y-4 animate-fade-in">
      <app-page-header
        [enTarjeta]="true"
        [conTitulo]="!embebido()"
        etiqueta="Coordinación de Programa"
        titulo="Gestión de Docentes"
        descripcion="Directorio de docentes vinculados a su programa y sus grupos asignados."
      >
        <div cabecera-acciones class="flex flex-wrap items-center gap-3">
          <app-button variant="primary" size="md" (clicked)="abrirFormulario()">Vincular docente</app-button>
        </div>
      </app-page-header>


      <!-- Estado de acceso de la ultima cuenta docente creada (verificado por el backend, nunca por la SPA) -->
      <app-account-access-status [correo]="ultimaCuentaRegistrada()" />

      <!-- HU095: consolidado del directorio del programa (servidor), por estado -->
      @if (resumen(); as r) {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="resumen-docentes">
          <div class="superficie p-4">
            <p class="text-xs font-semibold text-warm-500 uppercase">Docentes vinculados</p>
            <p class="text-2xl font-bold text-warm-900">{{ r.totalDocentes }}</p>
          </div>
          <div class="superficie p-4">
            <p class="text-xs font-semibold text-success-700 uppercase">Activos</p>
            <p class="text-2xl font-bold text-success-800">{{ r.totalActivos }}</p>
          </div>
          <div class="superficie p-4">
            <p class="text-xs font-semibold text-warm-500 uppercase">Inactivos</p>
            <p class="text-2xl font-bold text-warm-700">{{ r.totalInactivos }}</p>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2">
          <input aria-label="Buscar docente por nombre, documento o correo"
            type="text"
            [ngModel]="busqueda()"
            (ngModelChange)="onBusquedaChange($event)"
            name="busquedaDocentes"
            maxlength="50"
            placeholder="Buscar por cédula o nombre..."
            class="w-full px-4 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
          />
        </div>
        <select aria-label="Filtrar docentes por estado"
          [ngModel]="filtroEstado()"
          (ngModelChange)="onEstadoChange($event)"
          name="estadoDocentes"
          class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-warm-sm"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Solo activos</option>
          <option value="INACTIVO">Solo inactivos</option>
        </select>
      </div>

      @if (isLoading()) {
        <div class="space-y-2">
          @for (n of [1, 2, 3, 4]; track n) {
            <div class="h-12 bg-warm-100 rounded-xl animate-pulse"></div>
          }
        </div>
      } @else if (errorCarga()) {
        <app-error-carga [error]="errorCarga()!" (reintentar)="reintentarCarga()" />
      } @else if (docentes().length === 0) {
        <div class="superficie p-12 text-center">
          <h3 class="text-base font-semibold text-warm-900">No se encontraron docentes</h3>
          <p class="text-xs text-warm-500 mt-1">Ajuste la búsqueda o vincule un docente al programa.</p>
        </div>
      } @else {
        <!-- MEJORAS-SERGIO 12: lista en tabla (una fila por docente) con las acciones; sin tipo de vinculación -->
        <div class="superficie overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-warm-800" data-testid="tabla-docentes">
              <thead class="bg-warm-50 border-b border-warm-200 text-[11px] font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left">Docente</th>
                  <th scope="col" class="px-4 py-3 text-left">Documento</th>
                  <th scope="col" class="px-4 py-3 text-center">Grupos</th>
                  <th scope="col" class="px-4 py-3 text-left">Estado</th>
                  <th scope="col" class="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (docente of docentes(); track docente.idDocentePrograma) {
                  <tr class="hover:bg-warm-50/60 transition-colors" [attr.data-testid]="'fila-docente-' + docente.idDocente">
                    <td class="px-4 py-3">
                      <p class="font-semibold text-warm-900">{{ docente.nombreCompleto }}</p>
                      <p class="text-xs text-warm-500 truncate max-w-[18rem]">{{ docente.correo }}</p>
                    </td>
                    <td class="px-4 py-3 font-mono text-xs text-warm-700 whitespace-nowrap">{{ docente.codigoTipoIdentificacion }} {{ docente.numeroIdentificacion }}</td>
                    <td class="px-4 py-3 text-center">
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-800 border border-primary-200" title="Grupos asignados en el programa">
                        {{ docente.totalGruposPrograma }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <app-badge [variant]="docente.estaActivo ? 'success' : 'neutral'">{{ docente.estaActivo ? 'ACTIVO' : 'INACTIVO' }}</app-badge>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          data-testid="ver-ficha-docente"
                          (click)="verFichaDocente(docente)"
                          [attr.aria-label]="'Ver ficha de ' + docente.nombreCompleto"
                          class="min-h-[36px] text-xs font-semibold text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 py-1.5 px-3 rounded-lg transition-colors"
                        >
                          Ver ficha
                        </button>
                        <button
                          type="button"
                          data-testid="editar-docente"
                          (click)="abrirEdicion(docente)"
                          [attr.aria-label]="'Editar datos de ' + docente.nombreCompleto"
                          class="min-h-[36px] text-xs font-semibold text-warm-800 bg-white hover:bg-warm-50 border border-warm-200 py-1.5 px-3 rounded-lg transition-colors"
                        >
                          Editar datos
                        </button>
                        <button
                          type="button"
                          data-testid="toggle-estado"
                          (click)="solicitarCambioEstado(docente)"
                          [attr.aria-label]="(docente.estaActivo ? 'Desactivar a ' : 'Reactivar a ') + docente.nombreCompleto"
                          [title]="docente.estaActivo ? 'Inactivar la vinculación con el programa' : 'Reactivar la vinculación con el programa'"
                          class="min-h-[36px] text-xs px-3 py-1.5 rounded-lg border border-warm-200 text-warm-700 hover:bg-warm-100 transition-colors"
                        >
                          {{ docente.estaActivo ? 'Desactivar' : 'Reactivar' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        <app-pagination
          [totalItems]="totalDocentes()"
          [pageSize]="tamano()"
          [currentPage]="pagina()"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)"
        />
      }

      @if (docenteSeleccionado(); as seleccionado) {
        @defer (on immediate) {
          <app-coordinator-docente-ficha-modal [docente]="seleccionado" (cerrar)="cerrarFichaDocente()" />
        } @placeholder {
          <span role="status" class="sr-only">Abriendo ficha del docente...</span>
        }
      }

      @if (docentePendienteEstado(); as pendiente) {
        @defer (on immediate) {
          <app-modal
            [isOpen]="true"
            [title]="pendiente.estaActivo ? 'Inactivar vinculación' : 'Reactivar vinculación'"
            tamano="md"
            (closed)="cancelarCambioEstado()"
          >
            <p class="text-sm text-warm-700">
              {{ pendiente.estaActivo
                  ? 'El docente ' + pendiente.nombreCompleto + ' dejará de poder ser asignado como titular de nuevos grupos de este programa. Sus grupos actuales y su cuenta de acceso no cambian.'
                  : 'El docente ' + pendiente.nombreCompleto + ' volverá a poder ser asignado como titular de grupos de este programa.' }}
            </p>
            <button modal-footer type="button" (click)="cancelarCambioEstado()" class="px-4 py-2 rounded-xl text-sm font-semibold bg-warm-100 text-warm-800 hover:bg-warm-200">Cancelar</button>
            <button modal-footer type="button" data-testid="confirmar-estado" (click)="confirmarCambioEstado()" class="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-700 text-white hover:bg-primary-800">
              {{ pendiente.estaActivo ? 'Inactivar' : 'Reactivar' }}
            </button>
          </app-modal>
        } @placeholder {
          <span role="status" class="sr-only">Abriendo confirmación...</span>
        }
      }

      @if (docenteEnEdicion(); as enEdicion) {
        @defer (on immediate) {
          <app-coordinator-docente-edit-modal
            [docente]="enEdicion"
            (guardar)="guardarEdicion($event)"
            (cerrar)="cerrarEdicion()"
          />
        } @placeholder {
          <span role="status" class="sr-only">Abriendo formulario de edición...</span>
        }
      }

      @if (formularioAbierto()) {
        @defer (on immediate) {
          <app-coordinator-docente-form-modal
            [tiposIdentificacion]="tiposIdentificacion()"
            [candidatos]="candidatos()"
            (guardarNuevo)="guardarNuevo($event)"
            (guardarExistente)="guardarExistente($event)"
            (buscarCandidatos)="buscarCandidatos($event)"
            (cerrar)="cerrarFormulario()"
          />
        } @placeholder {
          <span role="status" class="sr-only">Abriendo formulario de vinculación...</span>
        }
      }
    </div>
  `
})
export class CoordinatorDocentesComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly catalogService = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly docentes = this.coordService.docentes;
  readonly totalDocentes = this.coordService.totalDocentes;

  readonly busqueda = signal('');
  readonly filtroEstado = signal<FiltroEstado>('TODOS');
  readonly resumen = signal<ResumenDocentesPrograma | null>(null);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  /** Correo de la ultima cuenta docente creada: el panel consulta su estado de acceso real. */
  readonly ultimaCuentaRegistrada = signal<string | null>(null);
  private readonly recarga = signal(0);

  readonly isLoading = signal(true);
  readonly errorCarga = signal<LoadErrorState | null>(null);
  readonly formularioAbierto = signal(false);
  readonly tiposIdentificacion = signal<TipoIdentificacionItem[]>([]);
  readonly candidatos = signal<DocenteCandidato[]>([]);
  readonly docenteSeleccionado = signal<DocentePrograma | null>(null);
  readonly docenteEnEdicion = signal<DocentePrograma | null>(null);
  readonly docentePendienteEstado = signal<DocentePrograma | null>(null);

  private readonly consulta = computed(() => ({
    pagina: this.pagina(),
    tamano: this.tamano(),
    busqueda: this.busqueda().trim() || undefined,
    estaActivo: this.estaActivoDe(this.filtroEstado()),
    recarga: this.recarga(),
  }));

  constructor() {
    // Reactividad por signals: cada cambio de filtro/pagina reconsulta al servidor (sin timers de polling).
    toObservable(this.consulta)
      .pipe(
        debounceTime(DEBOUNCE_MS),
        tap(() => {
          this.isLoading.set(true);
          this.errorCarga.set(null);
        }),
        switchMap(({ pagina, tamano, busqueda, estaActivo }) =>
          this.coordService.getDocentesPrograma({ pagina, tamano, busqueda, estaActivo }).pipe(
            catchError((error: unknown) => {
              this.errorCarga.set(classifyLoadError(error));
              this.toast.error(getApiErrorMessage(error));
              this.isLoading.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.isLoading.set(false));

    // HU095: el consolidado se relee al entrar y tras cada vinculacion, edicion o cambio de estado (recarga).
    toObservable(this.recarga)
      .pipe(
        switchMap(() => this.coordService.getResumenDocentes().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => this.resumen.set(res.datos ?? null));
  }

  ngOnInit(): void {
    this.catalogService.getTiposIdentificacion().subscribe({
      next: (res) => this.tiposIdentificacion.set(res.datos ?? []),
      error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
    });
  }

  reintentarCarga(): void {
    this.recarga.update((n) => n + 1);
  }

  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor ?? '');
    this.pagina.set(1);
  }

  onEstadoChange(estado: FiltroEstado): void {
    this.filtroEstado.set(estado);
    this.pagina.set(1);
  }

  onPageChange(pagina: number): void {
    this.pagina.set(pagina);
  }

  onPageSizeChange(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
  }

  abrirFormulario(): void {
    this.candidatos.set([]);
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  buscarCandidatos(texto: string): void {
    const busqueda = (texto ?? '').trim();
    if (busqueda.length < MIN_CARACTERES_CANDIDATOS) {
      this.candidatos.set([]);
      return;
    }
    this.coordService.getCandidatosDocente(busqueda).subscribe({
      next: (res) => this.candidatos.set(res.datos ?? []),
      error: (error: unknown) => {
        this.candidatos.set([]);
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }

  guardarNuevo(payload: VincularDocenteNuevoPayload): void {
    this.vincular(payload);
  }

  guardarExistente(payload: VincularDocenteExistentePayload): void {
    this.vincular(payload);
  }

  solicitarCambioEstado(docente: DocentePrograma): void {
    this.docentePendienteEstado.set(docente);
  }

  cancelarCambioEstado(): void {
    this.docentePendienteEstado.set(null);
  }

  /** HU093. Sin actualizacion optimista: se espera la respuesta y se recarga la pagina desde el servidor. */
  confirmarCambioEstado(): void {
    const docente = this.docentePendienteEstado();
    if (!docente) {
      return;
    }
    this.docentePendienteEstado.set(null);
    this.coordService.cambiarEstadoDocente(docente.idDocente, !docente.estaActivo).subscribe({
      next: (res) => {
        this.toast.success(res.mensajeUsuario || mensajeUi('UI_COORDINATOR_DOCENTES_001'));
        this.recarga.update((n) => n + 1);
      },
      error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
    });
  }

  abrirEdicion(docente: DocentePrograma): void {
    this.docenteEnEdicion.set(docente);
  }

  cerrarEdicion(): void {
    this.docenteEnEdicion.set(null);
  }

  /** HU092. Sin actualizacion optimista: se espera la respuesta y se recarga la pagina desde el servidor. */
  guardarEdicion(payload: ActualizarDocentePayload): void {
    const docente = this.docenteEnEdicion();
    if (!docente) {
      return;
    }
    this.coordService.actualizarDocente(docente.idDocente, payload).subscribe({
      next: (res) => {
        this.toast.success(res.mensajeUsuario || mensajeUi('UI_COORDINATOR_DOCENTES_002'));
        this.docenteEnEdicion.set(null);
        this.recarga.update((n) => n + 1);
      },
      error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
    });
  }

  /** HU094: la ficha (resumen e historial de grupos) la consulta el modal al servidor. */
  verFichaDocente(docente: DocentePrograma): void {
    this.docenteSeleccionado.set(docente);
  }

  cerrarFichaDocente(): void {
    this.docenteSeleccionado.set(null);
  }


  /** Sin actualizacion optimista: se espera la respuesta del backend y se recarga la pagina desde el servidor. */
  private vincular(payload: VincularDocentePayload): void {
    this.coordService.vincularDocente(payload).subscribe({
      next: (res) => {
        this.toast.success(res.mensajeUsuario || mensajeUi('UI_COORDINATOR_DOCENTES_003'));
        if ('correo' in payload) {
          this.ultimaCuentaRegistrada.set(payload.correo);
        }
        this.formularioAbierto.set(false);
        this.recarga.update((n) => n + 1);
      },
      error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
    });
  }

  private estaActivoDe(estado: FiltroEstado): boolean | undefined {
    if (estado === 'ACTIVO') {
      return true;
    }
    return estado === 'INACTIVO' ? false : undefined;
  }
}
