import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  input,
  signal,
  computed,
  inject,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { RevisionCancelacionService } from '../../../core/services/revision-cancelacion.service';
import {
  DecisionResolutor,
  EstadoRevisionCancelacion,
  FiltroRevisionesCancelacion,
  RevisionCancelacion,
} from '../../../core/models/revision-cancelacion.model';
import { nombreEstudianteRevision, porcentajeRevision } from '../../../core/models/revision-cancelacion.util';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SemaforoAsistenciaComponent } from '../../../shared/components/semaforo-asistencia/semaforo-asistencia.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { FechaCortaPipe } from '../../../shared/pipes/fecha-hora.pipes';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ApiPageResponse } from '../../../core/api/models/api-page-response.model';
import { ApiDataResponse } from '../../../core/api/models/api-data-response.model';

/** Estados que el decano puede filtrar en su consulta (códigos del catálogo del backend). */
export const ESTADOS_FILTRABLES: ReadonlyArray<{ codigo: EstadoRevisionCancelacion; etiqueta: string }> = [
  { codigo: 'PENDIENTE_DOCENTE', etiqueta: 'Pendiente de decisión del docente' },
  { codigo: 'MANTENIDA', etiqueta: 'Mantenida por el docente' },
  { codigo: 'PROPUESTA', etiqueta: 'Cancelación propuesta al coordinador' },
  { codigo: 'APROBADA', etiqueta: 'Cancelación aprobada' },
  { codigo: 'RECHAZADA', etiqueta: 'Cancelación rechazada' },
];

/**
 * Revisiones de cancelación por inasistencia. El coordinador del programa decide (aprobar o rechazar la
 * propuesta del docente); el decano solo consulta las de su facultad (DEC-065).
 */
@Component({
  selector: 'app-revisiones-resolucion',
  imports: [
    EmptyStateComponent,
    DecimalPipe,
    FormsModule,
    BadgeComponent,
    SemaforoAsistenciaComponent,
    PaginationComponent,
    FechaCortaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
            <span>{{ esDecano() ? 'Decanatura' : 'Coordinación' }}</span>
            <span>/</span>
            <span class="text-primary-700">Seguimiento Académico</span>
          </div>
          <h1 class="text-2xl font-serif font-bold text-warm-900">
            {{ esDecano() ? 'Revisiones de cancelación de la facultad (consulta)' : 'Revisiones de Cancelación' }}
          </h1>
          <p class="text-sm text-warm-600 mt-0.5">
            @if (esDecano()) {
              Consulta de las revisiones de cancelación de matrícula por inasistencia de los grupos de tu facultad. La decisión final la toma el coordinador del programa.
            } @else {
              Decide si se cancela la matrícula de los estudiantes que el docente propuso cancelar por pérdida de inasistencia.
            }
          </p>
        </div>

        <div class="flex items-center gap-3">
          @if (esDecano()) {
            <label class="flex items-center gap-2 text-xs font-medium text-warm-700">
              <span>Estado</span>
              <select
                data-testid="filtro-estado"
                [ngModel]="filtroEstado()"
                (ngModelChange)="onCambiarEstado($event)"
                class="min-h-[44px] rounded-xl border border-warm-300 bg-white px-3 text-xs text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todos los estados</option>
                @for (e of estados; track e.codigo) {
                  <option [value]="e.codigo">{{ e.etiqueta }}</option>
                }
              </select>
            </label>
          } @else {
            <label class="flex items-center gap-2 text-xs font-medium text-warm-700 cursor-pointer">
              <input
                type="checkbox"
                data-testid="filtro-pendientes"
                [ngModel]="filtroSoloPendientes()"
                (ngModelChange)="onTogglePendientes($event)"
                class="rounded text-primary-700 focus:ring-primary-500"
              />
              <span>Solo pendientes</span>
            </label>
          }
          <span class="px-3 py-1.5 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ totalElementos() }} {{ totalElementos() === 1 ? 'registro' : 'registros' }}
          </span>
        </div>
      </div>

      @if (errorCarga(); as err) {
        <div class="p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-xs text-danger-800" role="alert">{{ err }}</div>
      }

      @if (cargando()) {
        <div class="bg-white p-12 rounded-2xl border border-warm-200 text-center text-sm text-warm-500">
          Cargando revisiones…
        </div>
      } @else if (revisiones().length === 0) {
        <app-empty-state
          title="No hay revisiones para mostrar"
          [description]="descripcionVacio()"
          [causa]="causaVacio()"
          [accionTexto]="accionVacio()"
          (accion)="alAccionVacio()"
        />
      } @else {
        <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" class="px-5 py-3.5">Estudiante</th>
                  <th scope="col" class="px-5 py-3.5">Asignatura / Grupo</th>
                  <th scope="col" class="px-5 py-3.5">Inasistencia</th>
                  <th scope="col" class="px-5 py-3.5">Docente y propuesta</th>
                  <th scope="col" class="px-5 py-3.5">Estado</th>
                  @if (!esDecano()) {
                    <th scope="col" class="px-5 py-3.5 text-right">Acción</th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (rev of revisiones(); track rev.id) {
                  <tr class="hover:bg-warm-50/70 transition-colors align-top">
                    <td class="px-5 py-4">
                      <span class="block font-bold text-warm-900">{{ nombre(rev) }}</span>
                      @if (rev.numeroIdentificacionEstudiante) {
                        <span class="block text-xs font-mono text-warm-500">{{ rev.numeroIdentificacionEstudiante }}</span>
                      }
                    </td>
                    <td class="px-5 py-4">
                      <span class="block font-medium text-warm-900">
                        {{ rev.asignatura?.nombre || rev.nombreAsignatura || '—' }}
                      </span>
                      <span class="block text-xs text-warm-500">
                        {{ rev.grupo?.nombre || rev.nombreGrupo || 'Grupo' }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex flex-col items-start gap-1">
                        <app-semaforo-asistencia [porcentaje]="porcentaje(rev)" [umbralPerdida]="rev.umbralPerdida" />
                        <span class="text-xs text-warm-600" data-testid="rev-porcentaje">
                          {{ porcentaje(rev) | number: '1.1-2' }} %
                          @if (rev.umbralPerdida != null) { (límite {{ rev.umbralPerdida }} %) }
                        </span>
                        @if (rev.fechaCreacionUtc) {
                          <span class="text-xs text-warm-500">Cruzó el umbral el {{ rev.fechaCreacionUtc | fechaCorta }}</span>
                        }
                      </div>
                    </td>
                    <td class="px-5 py-4 max-w-xs">
                      <span class="block text-xs text-warm-700">{{ rev.docente?.nombreCompleto || 'Docente' }}</span>
                      @if (rev.motivoDocente) {
                        <p
                          data-testid="rev-motivo-docente"
                          class="mt-1.5 rounded-lg border-l-4 border-primary-600 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-900"
                        >
                          <span class="block text-[11px] font-bold uppercase tracking-wider text-primary-700">Motivo del docente</span>
                          {{ rev.motivoDocente }}
                        </p>
                      }
                    </td>
                    <td class="px-5 py-4">
                      <app-badge variant="warning">
                        {{ rev.nombreEstado || rev.estado }}
                      </app-badge>
                    </td>
                    @if (!esDecano()) {
                      <td class="px-5 py-4 text-right">
                        @if (rev.requiereAccionResolutor !== false) {
                          <div class="inline-flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              data-testid="rev-aprobar"
                              (click)="abrirModalResolucion(rev, 'APROBAR')"
                              class="min-h-[44px] px-3.5 py-1.5 bg-danger-700 hover:bg-danger-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              data-testid="rev-rechazar"
                              (click)="abrirModalResolucion(rev, 'RECHAZAR')"
                              class="min-h-[44px] px-3.5 py-1.5 bg-white hover:bg-warm-50 text-warm-800 border border-warm-300 rounded-xl text-xs font-bold shadow-xs transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        } @else {
                          <span class="text-xs text-warm-400">Resuelta</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        <app-pagination
          [totalItems]="totalElementos()"
          [pageSize]="tamano()"
          [currentPage]="pagina()"
          [showPageSizeSelector]="false"
          (pageChange)="onCambiarPagina($event)"
        />
      }

      @if (modalAbierto()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-950/60 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-resolucion-titulo"
        >
          <div class="bg-white rounded-2xl shadow-warm-xl border border-warm-200 w-full max-w-lg overflow-hidden">
            <div class="p-6 border-b border-warm-100 flex items-center justify-between">
              <div>
                <h2 id="modal-resolucion-titulo" class="font-serif font-bold text-lg text-warm-900" data-testid="modal-titulo">
                  {{ decisionModal() === 'APROBAR' ? 'Aprobar cancelación' : 'Rechazar propuesta' }}
                </h2>
                <p class="text-xs text-warm-500 mt-0.5">
                  Estudiante: <strong class="text-warm-800">{{ revisionSeleccionada() ? nombre(revisionSeleccionada()!) : '' }}</strong>
                </p>
                <p class="text-xs text-warm-500 mt-0.5">
                  {{ decisionModal() === 'APROBAR'
                    ? 'Cancela definitivamente la matrícula del estudiante por inasistencia.'
                    : 'Mantiene la matrícula activa y desestima la cancelación.' }}
                </p>
              </div>
              <button
                type="button"
                (click)="cerrarModal()"
                class="p-2 text-warm-400 hover:text-warm-700 rounded-lg hover:bg-warm-100 transition-colors"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            @if (modalError(); as err) {
              <div class="mx-6 mt-4 p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-xs text-danger-800" role="alert">
                {{ err }}
              </div>
            }

            <form (submit)="onSubmitResolucion($event)" class="p-6 space-y-4">
              <div class="space-y-1.5">
                <label for="motivo-resolucion" class="block text-xs font-bold text-warm-700 uppercase tracking-wider">
                  Motivo o fundamento institucional (obligatorio)
                </label>
                <textarea
                  id="motivo-resolucion"
                  rows="3"
                  [value]="motivoModal()"
                  (input)="onMotivoInput($event)"
                  placeholder="Fundamenta tu resolución con base en el reglamento y la trazabilidad..."
                  class="w-full px-3.5 py-2.5 bg-white border border-warm-300 rounded-xl text-xs text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>

              <div class="flex items-center justify-end gap-3 pt-2 border-t border-warm-100">
                <button
                  type="button"
                  (click)="cerrarModal()"
                  class="min-h-[44px] px-4 py-2 rounded-xl border border-warm-300 text-warm-700 text-xs font-semibold hover:bg-warm-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="isModalSubmitDisabled()"
                  class="min-h-[44px] px-5 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-warm-300 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {{ enviandoResolucion() ? 'Procesando…' : 'Emitir resolución' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class RevisionesResolucionComponent implements OnInit {
  private readonly service = inject(RevisionCancelacionService);
  private readonly toast = inject(ToastService, { optional: true });

  rol = input<'COORDINADOR' | 'DECANO'>('COORDINADOR');
  protected readonly esDecano = computed(() => this.rol() === 'DECANO');
  protected readonly estados = ESTADOS_FILTRABLES;
  protected readonly nombre = nombreEstudianteRevision;
  protected readonly porcentaje = porcentajeRevision;

  revisiones = signal<RevisionCancelacion[]>([]);
  cargando = signal<boolean>(false);
  errorCarga = signal<string | null>(null);
  filtroSoloPendientes = signal<boolean>(true);
  filtroEstado = signal<string>('');
  pagina = signal<number>(1);
  tamano = signal<number>(20);
  totalElementos = signal<number>(0);
  totalPaginas = signal<number>(1);

  modalAbierto = signal<boolean>(false);
  revisionSeleccionada = signal<RevisionCancelacion | null>(null);
  decisionModal = signal<DecisionResolutor>('APROBAR');
  motivoModal = signal<string>('');
  enviandoResolucion = signal<boolean>(false);
  modalError = signal<string | null>(null);

  protected readonly descripcionVacio = computed(() => {
    if (this.esDecano()) {
      return this.filtroEstado()
        ? 'Ninguna revisión de tu facultad está en ese estado.'
        : 'Aún no hay revisiones de cancelación en los grupos de tu facultad.';
    }
    return this.filtroSoloPendientes()
      ? 'No tienes revisiones de cancelación por resolver en este momento.'
      : 'No se encontraron registros de revisión.';
  });
  protected readonly causaVacio = computed(() => {
    if (this.esDecano()) {
      return this.filtroEstado() ? 'Prueba con otro estado o muestra todos.' : 'Aparecerán cuando un estudiante supere el límite de inasistencia.';
    }
    return this.filtroSoloPendientes()
      ? 'Aparecerán aquí cuando un docente proponga cancelar la matrícula de un estudiante.'
      : 'Aparecerán cuando un estudiante supere el límite de inasistencia.';
  });
  protected readonly accionVacio = computed(() => {
    if (this.esDecano()) return this.filtroEstado() ? 'Ver todos los estados' : '';
    return this.filtroSoloPendientes() ? 'Ver también las resueltas' : '';
  });

  ngOnInit(): void {
    this.cargarRevisiones();
  }

  onTogglePendientes(valor: boolean): void {
    this.filtroSoloPendientes.set(valor);
    this.pagina.set(1);
    this.cargarRevisiones();
  }

  onCambiarEstado(valor: string): void {
    this.filtroEstado.set(valor);
    this.pagina.set(1);
    this.cargarRevisiones();
  }

  onCambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarRevisiones();
  }

  protected alAccionVacio(): void {
    if (this.esDecano()) this.onCambiarEstado('');
    else this.onTogglePendientes(false);
  }

  cargarRevisiones(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    const base: FiltroRevisionesCancelacion = { pagina: this.pagina(), tamano: this.tamano() };
    const call$: Observable<ApiPageResponse<RevisionCancelacion>> = this.esDecano()
      ? this.service.consultarDecano(this.filtroEstado() ? { ...base, estado: this.filtroEstado() } : base)
      : this.service.consultarCoordinador({ ...base, soloPendientes: this.filtroSoloPendientes() });

    call$.subscribe({
      next: (res) => {
        this.revisiones.set(res.elementos ?? []);
        this.totalElementos.set(Number(res.totalElementos ?? 0));
        this.totalPaginas.set(Number(res.totalPaginas ?? 1));
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        const mensaje = getApiErrorMessage(err);
        this.revisiones.set([]);
        this.totalElementos.set(0);
        this.cargando.set(false);
        this.errorCarga.set(mensaje);
        this.toast?.error(mensaje);
      },
    });
  }

  abrirModalResolucion(rev: RevisionCancelacion, decision: DecisionResolutor = 'APROBAR'): void {
    if (this.esDecano()) return;
    this.revisionSeleccionada.set(rev);
    this.decisionModal.set(decision);
    this.motivoModal.set('');
    this.modalError.set(null);
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.revisionSeleccionada.set(null);
    this.modalError.set(null);
  }

  onMotivoInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.motivoModal.set(val);
  }

  isModalSubmitDisabled(): boolean {
    return this.enviandoResolucion() || this.motivoModal().trim().length === 0;
  }

  onSubmitResolucion(event: Event): void {
    event.preventDefault();
    if (this.isModalSubmitDisabled()) {
      return;
    }
    const rev = this.revisionSeleccionada();
    if (!rev) {
      return;
    }
    this.ejecutarResolucion(rev.id, this.decisionModal(), this.motivoModal().trim());
  }

  ejecutarResolucion(id: string, decision: DecisionResolutor, motivo: string): void {
    if (this.esDecano()) return;
    this.enviandoResolucion.set(true);
    this.modalError.set(null);

    const call$: Observable<ApiDataResponse<RevisionCancelacion>> = this.service.resolverCoordinador(id, { decision, motivo });
    call$.subscribe({
      next: (res) => {
        this.enviandoResolucion.set(false);
        this.cerrarModal();
        if (res?.mensajeUsuario) {
          this.toast?.success(res.mensajeUsuario);
        }
        this.cargarRevisiones();
      },
      error: (err: unknown) => {
        this.enviandoResolucion.set(false);
        const errorMsg = getApiErrorMessage(err);
        this.modalError.set(errorMsg);
        this.toast?.error(errorMsg);
      },
    });
  }
}
