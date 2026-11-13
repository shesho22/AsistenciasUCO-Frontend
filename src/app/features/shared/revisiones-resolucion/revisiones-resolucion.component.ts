import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  input,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RevisionCancelacionService } from '../../../core/services/revision-cancelacion.service';
import {
  DecisionResolutor,
  RevisionCancelacion,
} from '../../../core/models/revision-cancelacion.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

@Component({
    selector: 'app-revisiones-resolucion',
    imports: [EmptyStateComponent, CommonModule, FormsModule, BadgeComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
            <span>{{ rol() === 'DECANO' ? 'Decanatura' : 'Coordinación' }}</span>
            <span>/</span>
            <span class="text-primary-700">Seguimiento Académico</span>
          </div>
          <h1 class="text-2xl font-serif font-bold text-warm-900">Revisiones de Cancelación</h1>
          <p class="text-sm text-warm-600 mt-0.5">
            Gestión y resolución de solicitudes de cancelación de matrícula por pérdida de inasistencia.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-xs font-medium text-warm-700 cursor-pointer">
            <input
              type="checkbox"
              [ngModel]="filtroSoloPendientes()"
              (ngModelChange)="onTogglePendientes($event)"
              class="rounded text-primary-700 focus:ring-primary-500"
            />
            <span>Solo pendientes</span>
          </label>
          <span class="px-3 py-1.5 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ totalElementos() }} {{ totalElementos() === 1 ? 'registro' : 'registros' }}
          </span>
        </div>
      </div>

      @if (cargando()) {
        <div class="bg-white p-12 rounded-2xl border border-warm-200 text-center text-sm text-warm-500">
          Cargando revisiones…
        </div>
      } @else if (revisiones().length === 0) {
        <app-empty-state
          title="No hay revisiones para mostrar"
          [description]="filtroSoloPendientes() ? 'No tienes revisiones de cancelación pendientes en este momento.' : 'No se encontraron registros de revisión.'"
          [causa]="filtroSoloPendientes() ? 'Quita el filtro de pendientes para ver también las ya resueltas.' : ''"
        />
      } @else {
        <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" class="px-5 py-3.5">Estudiante</th>
                  <th scope="col" class="px-5 py-3.5">Asignatura / Grupo</th>
                  <th scope="col" class="px-5 py-3.5 text-center">Inasistencia</th>
                  <th scope="col" class="px-5 py-3.5">Docente Titular</th>
                  <th scope="col" class="px-5 py-3.5">Estado</th>
                  <th scope="col" class="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (rev of revisiones(); track rev.id) {
                  <tr class="hover:bg-warm-50/70 transition-colors">
                    <td class="px-5 py-4">
                      <span class="block font-bold text-warm-900">
                        {{ rev.estudiante?.nombreCompleto || rev.nombreEstudiante || 'Estudiante' }}
                      </span>
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
                    <td class="px-5 py-4 text-center font-bold text-danger-700">
                      {{ (rev.porcentajeActual ?? rev.porcentajeInasistencia ?? rev.porcentajeCreacion ?? 0) | number: '1.1-2' }}%
                    </td>
                    <td class="px-5 py-4 text-xs text-warm-700">
                      {{ rev.docente?.nombreCompleto || 'Docente' }}
                    </td>
                    <td class="px-5 py-4 space-y-1">
                      <app-badge variant="warning">
                        {{ rev.nombreEstado || rev.estado }}
                      </app-badge>
                      @if (rev.perfilResolutorActual === 'DECANO' && rev.fechaEscalamientoUtc) {
                        <span
                          data-testid="badge-escalada"
                          class="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-primary-50 text-primary-800 border border-primary-200"
                        >
                          Escalada a decanatura
                        </span>
                      }
                    </td>
                    <td class="px-5 py-4 text-right">
                      @if (rev.requiereAccionResolutor !== false) {
                        <button
                          type="button"
                          (click)="abrirModalResolucion(rev)"
                          class="min-h-[44px] px-3.5 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          Resolver
                        </button>
                      } @else {
                        <span class="text-xs text-warm-400">Resuelta</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
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
                <h2 id="modal-resolucion-titulo" class="font-serif font-bold text-lg text-warm-900">
                  Resolución de Cancelación
                </h2>
                <p class="text-xs text-warm-500 mt-0.5">
                  Estudiante: <strong class="text-warm-800">{{ revisionSeleccionada()?.estudiante?.nombreCompleto || revisionSeleccionada()?.nombreEstudiante }}</strong>
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
              <div class="mx-6 mt-4 p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-xs text-danger-800">
                {{ err }}
              </div>
            }

            <form (submit)="onSubmitResolucion($event)" class="p-6 space-y-4">
              <div class="space-y-2">
                <label class="block text-xs font-bold text-warm-700 uppercase tracking-wider">
                  Decisión de la resolución
                </label>
                <div class="space-y-2">
                  <label
                    class="flex items-center gap-3 p-3 rounded-xl border border-warm-200 hover:bg-warm-50 cursor-pointer transition-colors"
                    [class.border-danger-500]="decisionModal() === 'APROBAR'"
                    [class.bg-danger-50]="decisionModal() === 'APROBAR'"
                  >
                    <input
                      type="radio"
                      name="decisionModal"
                      value="APROBAR"
                      [checked]="decisionModal() === 'APROBAR'"
                      (change)="decisionModal.set('APROBAR')"
                      class="text-danger-700 focus:ring-danger-500"
                    />
                    <div>
                      <span class="block text-sm font-semibold text-danger-900">Aprobar cancelación</span>
                      <span class="block text-xs text-danger-700">Cancela definitivamente la matrícula del estudiante por inasistencia.</span>
                    </div>
                  </label>

                  <label
                    class="flex items-center gap-3 p-3 rounded-xl border border-warm-200 hover:bg-warm-50 cursor-pointer transition-colors"
                    [class.border-warm-500]="decisionModal() === 'RECHAZAR'"
                    [class.bg-warm-50]="decisionModal() === 'RECHAZAR'"
                  >
                    <input
                      type="radio"
                      name="decisionModal"
                      value="RECHAZAR"
                      [checked]="decisionModal() === 'RECHAZAR'"
                      (change)="decisionModal.set('RECHAZAR')"
                      class="text-warm-700 focus:ring-warm-500"
                    />
                    <div>
                      <span class="block text-sm font-semibold text-warm-900">Rechazar propuesta</span>
                      <span class="block text-xs text-warm-500">Mantiene la matrícula activa y desestima la cancelación.</span>
                    </div>
                  </label>

                  @if (rol() === 'COORDINADOR') {
                    <label
                      class="flex items-center gap-3 p-3 rounded-xl border border-warm-200 hover:bg-warm-50 cursor-pointer transition-colors"
                      [class.border-primary-500]="decisionModal() === 'ESCALAR'"
                      [class.bg-primary-50]="decisionModal() === 'ESCALAR'"
                    >
                      <input
                        type="radio"
                        name="decisionModal"
                        value="ESCALAR"
                        [checked]="decisionModal() === 'ESCALAR'"
                        (change)="decisionModal.set('ESCALAR')"
                        class="text-primary-700 focus:ring-primary-500"
                      />
                      <div>
                        <span class="block text-sm font-semibold text-primary-900">Escalar a decanatura</span>
                        <span class="block text-xs text-primary-700">Remite el caso a la decanatura para su resolución final.</span>
                      </div>
                    </label>
                  }
                </div>
              </div>

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
  `
})
export class RevisionesResolucionComponent implements OnInit {
  private readonly service = inject(RevisionCancelacionService);
  private readonly toast = inject(ToastService, { optional: true });

  rol = input<'COORDINADOR' | 'DECANO'>('COORDINADOR');

  revisiones = signal<RevisionCancelacion[]>([]);
  cargando = signal<boolean>(false);
  filtroSoloPendientes = signal<boolean>(true);
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

  ngOnInit(): void {
    this.cargarRevisiones();
  }

  onTogglePendientes(valor: boolean): void {
    this.filtroSoloPendientes.set(valor);
    this.pagina.set(1);
    this.cargarRevisiones();
  }

  cargarRevisiones(): void {
    this.cargando.set(true);
    const filtro = {
      soloPendientes: this.filtroSoloPendientes(),
      pagina: this.pagina(),
      tamano: this.tamano(),
    };

    const call$ =
      this.rol() === 'DECANO'
        ? this.service.consultarDecano(filtro)
        : this.service.consultarCoordinador(filtro);

    call$.subscribe({
      next: (res: any) => {
        this.revisiones.set(res.elementos ?? []);
        this.totalElementos.set(Number(res.totalElementos ?? 0));
        this.totalPaginas.set(Number(res.totalPaginas ?? 1));
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.revisiones.set([]);
        this.totalElementos.set(0);
        this.cargando.set(false);
        if (this.toast) {
          this.toast.error(getApiErrorMessage(err));
        }
      },
    });
  }

  abrirModalResolucion(rev: RevisionCancelacion): void {
    this.revisionSeleccionada.set(rev);
    this.decisionModal.set('APROBAR');
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
    this.enviandoResolucion.set(true);
    this.modalError.set(null);

    const call$ =
      this.rol() === 'DECANO'
        ? this.service.resolverDecano(id, { decision, motivo })
        : this.service.resolverCoordinador(id, { decision, motivo });

    call$.subscribe({
      next: (res: any) => {
        this.enviandoResolucion.set(false);
        this.cerrarModal();
        if (res?.mensajeUsuario && this.toast) {
          this.toast.success(res.mensajeUsuario);
        }
        this.cargarRevisiones();
      },
      error: (err: unknown) => {
        this.enviandoResolucion.set(false);
        const errorMsg =
          (err as any)?.error?.message ||
          (err as any)?.error?.mensajeUsuario ||
          getApiErrorMessage(err);
        this.modalError.set(errorMsg);
        if (this.toast) {
          this.toast.error(errorMsg);
        }
      },
    });
  }
}
