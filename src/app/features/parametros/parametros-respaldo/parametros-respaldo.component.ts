import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { API_ERROR_CODE, getApiErrorCode, getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { CambioParametroDto, ParametroAdminDto } from '../../../core/models/role-management.model';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';

export const MOTIVO_MINIMO = 10;
export const MOTIVO_MAXIMO = 500;
const TAMANO_HISTORIAL = 10;

/**
 * Administración de parámetros de respaldo: lista paginada, edición e historial de cambios contra la API propia
 * (`/admin/parametros`). Solo se muestra cuando el micro frontend del Catálogo de Parámetros no está disponible, para que
 * el administrador nunca se quede sin ver ni ajustar los parámetros. El texto de cada resultado lo entrega el backend.
 */
@Component({
  selector: 'app-parametros-respaldo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, EmptyStateComponent, ErrorCargaComponent, ModalComponent, PaginationComponent],
  template: `
    <section class="mt-4 space-y-4" aria-labelledby="titulo-parametros-respaldo" data-testid="parametros-respaldo">
      <div>
        <h3 id="titulo-parametros-respaldo" class="text-base font-bold text-warm-900">Parámetros del sistema (vista de respaldo)</h3>
        <p class="mt-1 text-xs text-warm-600">
          Consulta y edición directa de los parámetros mientras el Catálogo de Parámetros no está disponible.
        </p>
      </div>

      <form class="flex flex-wrap items-end gap-3" (submit)="$event.preventDefault(); aplicarFiltros()">
        <div>
          <label for="respaldo-texto" class="mb-1 block text-xs font-bold text-warm-700">Buscar</label>
          <input
            id="respaldo-texto"
            type="search"
            data-testid="filtro-texto"
            [value]="texto()"
            (input)="texto.set($any($event.target).value)"
            placeholder="Clave, etiqueta o descripción"
            class="min-h-[44px] w-64 rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
          />
        </div>
        <div>
          <label for="respaldo-grupo" class="mb-1 block text-xs font-bold text-warm-700">Grupo</label>
          <input
            id="respaldo-grupo"
            type="text"
            data-testid="filtro-grupo"
            [value]="grupo()"
            (input)="grupo.set($any($event.target).value)"
            class="min-h-[44px] w-44 rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
          />
        </div>
        <label class="flex min-h-[44px] items-center gap-2 text-xs font-bold text-warm-700">
          <input
            type="checkbox"
            data-testid="filtro-editables"
            [checked]="soloEditables()"
            (change)="soloEditables.set($any($event.target).checked)"
          />
          Solo editables
        </label>
        <button type="submit" class="min-h-[44px] rounded-xl bg-primary-700 px-4 py-2 text-xs font-bold text-white hover:bg-primary-800">
          Buscar
        </button>
      </form>

      @if (errorCarga(); as error) {
        <app-error-carga [error]="error" (reintentar)="cargar()" />
      }

      <div class="superficie tabla-scroll">
        <table class="w-full text-left text-sm" [attr.aria-busy]="cargando()">
          <thead class="border-b border-warm-200 bg-warm-50 text-xs font-bold uppercase tracking-wider text-warm-600">
            <tr>
              <th scope="col" class="px-4 py-3">Grupo</th>
              <th scope="col" class="px-4 py-3">Clave</th>
              <th scope="col" class="px-4 py-3">Valor</th>
              <th scope="col" class="px-4 py-3">Descripción</th>
              <th scope="col" class="px-4 py-3">Editable</th>
              <th scope="col" class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-warm-100">
            @for (p of parametros(); track p.id) {
              <tr data-testid="fila-parametro">
                <td class="px-4 py-3 text-xs font-bold text-primary-800">{{ p.grupo }}</td>
                <td class="px-4 py-3 font-mono text-xs text-warm-900">{{ p.clave }}</td>
                <td class="px-4 py-3 font-semibold text-warm-900">{{ p.valor }}@if (p.unidad) { <span class="font-normal text-warm-500"> {{ p.unidad }}</span> }</td>
                <td class="px-4 py-3 text-xs text-warm-600">{{ p.etiqueta || p.descripcion }}</td>
                <td class="px-4 py-3 text-xs">{{ p.esEditable === false ? 'No' : 'Sí' }}</td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-2">
                    @if (p.esEditable !== false) {
                      <button
                        type="button"
                        data-testid="btn-editar"
                        class="min-h-[44px] rounded-lg border border-warm-300 px-3 py-2 text-xs font-bold text-warm-800 hover:bg-warm-50"
                        [attr.aria-label]="'Editar ' + p.clave"
                        (click)="abrirEdicion(p)"
                      >
                        Editar
                      </button>
                    }
                    <button
                      type="button"
                      data-testid="btn-historial"
                      class="min-h-[44px] rounded-lg border border-warm-300 px-3 py-2 text-xs font-bold text-warm-800 hover:bg-warm-50"
                      [attr.aria-label]="'Historial de cambios de ' + p.clave"
                      (click)="abrirHistorial(p)"
                    >
                      Historial de cambios
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              @if (!cargando() && !errorCarga()) {
                <tr>
                  <td colspan="6" class="px-4 py-4">
                    <app-empty-state title="Sin parámetros" description="No hay parámetros que coincidan con la búsqueda." />
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <app-pagination
        [totalItems]="totalElementos()"
        [pageSize]="tamano()"
        [currentPage]="pagina()"
        [totalPages]="totalPaginas()"
        (pageChange)="irAPagina($event)"
        (pageSizeChange)="cambiarTamano($event)"
      />

      <app-modal
        [isOpen]="edicion() !== null"
        title="Editar parámetro"
        [subtitulo]="edicion()?.clave ?? null"
        panelTestId="modal-edicion"
        (closed)="cerrarEdicion()"
      >
        @if (edicion(); as p) {
          @if (errorEdicion()) {
            <p role="alert" data-testid="error-edicion" class="mb-3 rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-800">
              {{ errorEdicion() }}
            </p>
          }
          <div class="space-y-4">
            <div>
              <label for="respaldo-valor" class="mb-1 block text-xs font-bold text-warm-700">Valor</label>
              @if (opcionesPermitidas().length > 0) {
                <select
                  id="respaldo-valor"
                  data-testid="input-valor"
                  [value]="valorEfectivo()"
                  (change)="nuevoValor.set($any($event.target).value)"
                  class="min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm"
                >
                  @for (opcion of opcionesPermitidas(); track opcion) {
                    <option [value]="opcion">{{ opcion }}</option>
                  }
                </select>
              } @else {
                <input
                  id="respaldo-valor"
                  data-testid="input-valor"
                  [type]="esNumerico() ? 'number' : 'text'"
                  [value]="valorEfectivo()"
                  (input)="nuevoValor.set($any($event.target).value)"
                  class="min-h-[44px] w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm"
                />
              }
            </div>
            <div>
              <label for="respaldo-motivo" class="mb-1 block text-xs font-bold text-warm-700">
                Motivo del cambio ({{ motivoMinimo }} a {{ motivoMaximo }} caracteres)
              </label>
              <textarea
                id="respaldo-motivo"
                rows="3"
                data-testid="input-motivo"
                [value]="motivo()"
                (input)="motivo.set($any($event.target).value)"
                class="w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-xs"
              ></textarea>
            </div>
          </div>
        }
        <div modal-footer class="contents">
          <button type="button" class="min-h-[44px] rounded-xl border border-warm-300 px-4 py-2 text-xs font-bold" [disabled]="guardando()" (click)="cerrarEdicion()">
            Cancelar
          </button>
          <button
            type="button"
            data-testid="btn-guardar"
            class="min-h-[44px] rounded-xl bg-primary-700 px-5 py-2 text-xs font-bold text-white disabled:bg-warm-300"
            [disabled]="!formularioValido() || guardando()"
            (click)="guardar(edicion()!)"
          >
            {{ guardando() ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </app-modal>

      <app-modal
        [isOpen]="historialDe() !== null"
        title="Historial de cambios"
        [subtitulo]="historialDe()?.clave ?? null"
        tamano="2xl"
        panelTestId="modal-historial"
        (closed)="cerrarHistorial()"
      >
        @if (errorHistorial(); as error) {
          <app-error-carga [error]="error" (reintentar)="cargarHistorial(historialPagina())" />
        } @else if (cambios().length === 0 && !cargandoHistorial()) {
          <app-empty-state title="Sin cambios registrados" description="Este parámetro todavía no ha sido modificado." />
        } @else {
          <div class="tabla-scroll">
            <table class="w-full text-left text-xs">
              <thead class="border-b border-warm-200 bg-warm-50 font-bold uppercase tracking-wider text-warm-600">
                <tr>
                  <th scope="col" class="px-3 py-2">Fecha (UTC)</th>
                  <th scope="col" class="px-3 py-2">Anterior</th>
                  <th scope="col" class="px-3 py-2">Nuevo</th>
                  <th scope="col" class="px-3 py-2">Motivo</th>
                  <th scope="col" class="px-3 py-2">Ejecutó</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (c of cambios(); track c.id) {
                  <tr data-testid="fila-cambio">
                    <td class="px-3 py-2">{{ c.fechaCambioUtc | date: 'dd/MM/yyyy HH:mm' : 'UTC' }}</td>
                    <td class="px-3 py-2 font-mono">{{ c.valorAnterior ?? '—' }}</td>
                    <td class="px-3 py-2 font-mono font-bold">{{ c.valorNuevo ?? '—' }}</td>
                    <td class="px-3 py-2">{{ c.motivo ?? '—' }}</td>
                    <td class="px-3 py-2">{{ c.nombreEjecutor ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        @if (historialTotalPaginas() > 1) {
          <app-pagination
            class="mt-3 block"
            [totalItems]="historialTotal()"
            [pageSize]="tamanoHistorial"
            [currentPage]="historialPagina()"
            [totalPages]="historialTotalPaginas()"
            [showPageSizeSelector]="false"
            (pageChange)="cargarHistorial($event)"
          />
        }
      </app-modal>
    </section>
  `,
})
export class ParametrosRespaldoComponent implements OnInit {
  private readonly admin = inject(AdminManagementService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly motivoMinimo = MOTIVO_MINIMO;
  protected readonly motivoMaximo = MOTIVO_MAXIMO;
  protected readonly tamanoHistorial = TAMANO_HISTORIAL;

  // Lista
  readonly parametros = signal<ParametroAdminDto[]>([]);
  readonly texto = signal('');
  readonly grupo = signal('');
  readonly soloEditables = signal(false);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly totalElementos = signal(0);
  readonly totalPaginas = signal(1);
  readonly cargando = signal(false);
  readonly errorCarga = signal<LoadErrorState | null>(null);

  // Edición
  readonly edicion = signal<ParametroAdminDto | null>(null);
  readonly nuevoValor = signal<string | null>(null);
  readonly motivo = signal('');
  readonly guardando = signal(false);
  readonly errorEdicion = signal<string | null>(null);

  // Historial
  readonly historialDe = signal<ParametroAdminDto | null>(null);
  readonly cambios = signal<CambioParametroDto[]>([]);
  readonly historialPagina = signal(1);
  readonly historialTotal = signal(0);
  readonly historialTotalPaginas = signal(1);
  readonly cargandoHistorial = signal(false);
  readonly errorHistorial = signal<LoadErrorState | null>(null);

  readonly valorEfectivo = computed(() => this.nuevoValor() ?? this.edicion()?.valor ?? '');
  readonly esNumerico = computed(() => ['INT', 'DECIMAL', 'NUMERO'].includes(this.edicion()?.tipoDato?.toUpperCase() ?? ''));
  readonly opcionesPermitidas = computed<string[]>(() => {
    const p = this.edicion();
    if (!p) return [];
    if (p.tipoDato?.toUpperCase() === 'BOOLEAN') return ['true', 'false'];
    const permitidos = p.valoresPermitidos;
    if (Array.isArray(permitidos)) return permitidos;
    if (typeof permitidos === 'string') return permitidos.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
    return [];
  });
  readonly formularioValido = computed(() => {
    const motivo = this.motivo().trim();
    return motivo.length >= MOTIVO_MINIMO && motivo.length <= MOTIVO_MAXIMO && this.valorEfectivo().trim().length > 0;
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.admin
      .cargarParametros({
        grupo: this.grupo().trim() || undefined,
        texto: this.texto().trim() || undefined,
        soloEditables: this.soloEditables() ? true : undefined,
        pagina: this.pagina(),
        tamano: this.tamano(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.cargando.set(false);
          this.parametros.set(res.elementos);
          this.totalElementos.set(res.totalElementos);
          this.totalPaginas.set(res.totalPaginas);
        },
        error: (err: unknown) => {
          this.cargando.set(false);
          this.parametros.set([]);
          this.errorCarga.set(classifyLoadError(err));
        },
      });
  }

  aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargar();
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
    this.cargar();
  }

  // ---- Edición ----
  abrirEdicion(parametro: ParametroAdminDto): void {
    this.nuevoValor.set(null);
    this.motivo.set('');
    this.errorEdicion.set(null);
    this.edicion.set(parametro);
  }

  cerrarEdicion(): void {
    if (this.guardando()) return;
    this.edicion.set(null);
  }

  guardar(parametro: ParametroAdminDto): void {
    if (!this.formularioValido() || this.guardando()) return;
    this.guardando.set(true);
    this.errorEdicion.set(null);
    this.admin
      .actualizarParametro(parametro.id, {
        valor: this.valorEfectivo().trim(),
        fechaModificacionEsperada: parametro.fechaModificacion || parametro.fechaUltimoCambioUtc || '',
        motivo: this.motivo().trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.guardando.set(false);
          this.toast.success(res?.mensajeUsuario || mensajeUi('UI_PARAMETRO_EDICION_MODAL_001'));
          this.edicion.set(null);
          this.cargar();
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.errorEdicion.set(getApiErrorMessage(err));
          // Conflicto de concurrencia optimista: otro usuario cambió el parámetro; se refresca la lista.
          if (getApiErrorCode(err) === API_ERROR_CODE.CONFLICT) {
            this.cargar();
          }
        },
      });
  }

  // ---- Historial ----
  abrirHistorial(parametro: ParametroAdminDto): void {
    this.historialDe.set(parametro);
    this.cambios.set([]);
    this.cargarHistorial(1);
  }

  cerrarHistorial(): void {
    this.historialDe.set(null);
  }

  cargarHistorial(pagina: number): void {
    const parametro = this.historialDe();
    if (!parametro) return;
    this.cargandoHistorial.set(true);
    this.errorHistorial.set(null);
    this.admin
      .consultarCambiosParametro(parametro.id, pagina, TAMANO_HISTORIAL)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.cargandoHistorial.set(false);
          this.cambios.set(res.elementos ?? []);
          this.historialPagina.set(res.numeroPagina ?? pagina);
          this.historialTotal.set(res.totalElementos ?? 0);
          this.historialTotalPaginas.set(res.totalPaginas ?? 1);
        },
        error: (err: unknown) => {
          this.cargandoHistorial.set(false);
          this.errorHistorial.set(classifyLoadError(err));
        },
      });
  }
}
