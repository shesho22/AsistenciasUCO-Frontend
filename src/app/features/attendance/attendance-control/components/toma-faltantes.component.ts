import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TomaAsistenciaService } from '../../../../core/services/toma-asistencia.service';
import { EstadoRegistroToma, FaltanteToma } from '../../../../core/models/toma-asistencia.model';
import { getApiErrorCode, getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { TAMANO_PAGINA_TOMA, cargarTodasLasPaginas } from './toma-paginas.util';

/**
 * CULM-001 B.2 + UX de la toma: "Pendientes de validar". Estudiantes sin presencia en la toma (no lograron usar el
 * QR o el PIN, o quedaron ausentes al cerrar), con validación manual por fila (presente o falta), selección múltiple y
 * filtro por nombre. La lista y los mensajes vienen del backend; se recarga con la respuesta y cuando el contenedor
 * incrementa `version` (evento SSE, reconexión o guardado de la toma).
 */
@Component({
  selector: 'app-toma-faltantes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm p-4 sm:p-5 space-y-4" aria-label="Pendientes de validar">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Pendientes de validar ({{ faltantes().length }})</h3>
          <p class="text-xs text-warm-600">
            Estudiantes que no lograron registrarse con el QR o el PIN. Valida su asistencia manualmente: al marcar, pasan a la lista de la toma.
          </p>
        </div>
        <button
          type="button"
          data-testid="marcar-seleccionados"
          (click)="marcarSeleccionados()"
          [disabled]="!puedeMarcar() || seleccionados().size === 0"
          class="min-h-[44px] px-5 rounded-xl bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Marcar seleccionados ({{ seleccionados().size }})
        </button>
      </div>

      @if (!esEditable()) {
        <p class="text-xs text-warm-600" data-testid="faltantes-no-editable">
          Esta toma ya no se puede corregir: la lista es solo de consulta. Las correcciones se hacen por reclamo.
        </p>
      }
      @if (error()) {
        <p class="rounded-xl bg-danger-100 text-danger-900 px-4 py-2 text-sm font-medium" role="alert" data-testid="faltantes-error">
          {{ error() }}
        </p>
      }

      @if (cargando() && faltantes().length === 0) {
        <div class="h-16 rounded-xl bg-warm-100 animate-pulse"></div>
      } @else if (faltantes().length === 0) {
        <p class="text-sm text-warm-500 text-center py-6" data-testid="faltantes-vacio">
          No hay estudiantes pendientes en esta toma.
        </p>
      } @else {
        <input
          type="search"
          data-testid="buscar-pendiente"
          aria-label="Buscar entre los pendientes de validar"
          placeholder="Buscar pendiente por nombre…"
          [value]="busqueda()"
          (input)="busqueda.set(valorDe($event))"
          class="w-full md:w-72 bg-warm-50 text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        @if (visibles().length === 0) {
          <p class="text-sm text-warm-500 text-center py-4" data-testid="faltantes-sin-coincidencias">
            Ningún pendiente coincide con la búsqueda.
          </p>
        }
        <ul class="grid gap-2">
          @for (f of visibles(); track f.estudianteId) {
            <li
              class="rounded-xl border border-warm-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              [attr.data-testid]="'faltante-' + f.estudianteId"
            >
              <label class="flex items-center gap-3 min-w-0 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  class="w-5 h-5 shrink-0 accent-primary-700"
                  [attr.aria-label]="'Seleccionar a ' + f.nombreCompleto"
                  [attr.data-testid]="'seleccionar-' + f.estudianteId"
                  [checked]="seleccionados().has(f.estudianteId)"
                  [disabled]="!puedeMarcar()"
                  (change)="alternar(f.estudianteId)"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-semibold text-warm-900 truncate">{{ f.nombreCompleto }}</span>
                  <span class="block text-xs text-warm-600">{{ esAusente(f) ? 'Ausente' : 'Sin lectura' }}</span>
                </span>
              </label>
              <div class="grid grid-cols-2 gap-2 shrink-0">
                <button
                  type="button"
                  [attr.data-testid]="'marcar-presente-' + f.estudianteId"
                  (click)="marcarPresente(f)"
                  [disabled]="!puedeMarcar()"
                  class="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-primary-300 bg-primary-50 text-primary-900 text-xs font-semibold hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Marcar presente (manual)
                </button>
                <button
                  type="button"
                  [attr.data-testid]="'marcar-falta-' + f.estudianteId"
                  (click)="marcarFalta(f)"
                  [disabled]="!puedeMarcar() || esAusente(f)"
                  class="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-danger-300 bg-danger-50 text-danger-900 text-xs font-semibold hover:bg-danger-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Marcar falta
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class TomaFaltantesComponent {
  private readonly tomas = inject(TomaAsistenciaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tomaId = input.required<string>();
  /** El backend decide si la toma se puede corregir (`esEditable` del listado de tomas). */
  readonly esEditable = input<boolean>(true);
  /** El contenedor lo incrementa cuando la toma cambió en el backend: fuerza una nueva consulta. */
  readonly version = input<number>(0);
  /** Se emite tras una marcacion exitosa para que el contenedor refresque conteos. */
  readonly actualizado = output<void>();

  protected readonly faltantes = signal<FaltanteToma[]>([]);
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seleccionados = signal<ReadonlySet<string>>(new Set());

  protected readonly visibles = computed(() => {
    const consulta = this.busqueda().trim().toLowerCase();
    return consulta === ''
      ? this.faltantes()
      : this.faltantes().filter((f) => f.nombreCompleto.toLowerCase().includes(consulta));
  });

  /** El backend cerró la ventana (ERR_SESION_CERRADA) o la toma (TOM_012) aunque la pantalla aún la viera editable. */
  private readonly cerradaPorBackend = signal(false);
  protected readonly puedeMarcar = computed(() => this.esEditable() && !this.cerradaPorBackend() && !this.enviando());

  constructor() {
    effect(() => {
      this.tomaId();
      this.version();
      untracked(() => this.cargar());
    });
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected esAusente(faltante: FaltanteToma): boolean {
    return faltante.tieneRegistro || faltante.marcadoAlCerrar;
  }

  protected alternar(estudianteId: string): void {
    this.seleccionados.update((actual) => {
      const siguiente = new Set(actual);
      if (!siguiente.delete(estudianteId)) siguiente.add(estudianteId);
      return siguiente;
    });
  }

  protected marcarPresente(faltante: FaltanteToma): void {
    this.enviar([faltante.estudianteId], 'AN');
  }

  protected marcarFalta(faltante: FaltanteToma): void {
    this.enviar([faltante.estudianteId], 'SJC');
  }

  protected marcarSeleccionados(): void {
    const ids = this.faltantes()
      .map((f) => f.estudianteId)
      .filter((id) => this.seleccionados().has(id));
    if (ids.length > 0) this.enviar(ids, 'AN');
  }

  private enviar(ids: string[], estado: EstadoRegistroToma): void {
    this.enviando.set(true);
    this.error.set(null);
    this.tomas
      .registrarAsistencias(this.tomaId(), ids.map((estudianteId) => ({ estudianteId, estado })))
      .pipe(finalize(() => this.enviando.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.seleccionados.set(new Set());
          this.actualizado.emit();
          this.cargar();
        },
        error: (err: unknown) => {
          const codigo = getApiErrorCode(err);
          if (codigo === 'ERR_SESION_CERRADA' || codigo === 'TOM_012') {
            this.cerradaPorBackend.set(true);
            this.actualizado.emit();
          }
          this.error.set(getApiErrorMessage(err));
        },
      });
  }

  private cargar(): void {
    this.cargando.set(true);
    const tomaId = this.tomaId();
    cargarTodasLasPaginas((pagina) => this.tomas.consultarFaltantes(tomaId, pagina, TAMANO_PAGINA_TOMA))
      .pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (faltantes) => {
          this.faltantes.set(faltantes);
          this.seleccionados.update((actual) => {
            const vigentes = new Set(faltantes.map((f) => f.estudianteId));
            const siguiente = new Set([...actual].filter((id) => vigentes.has(id)));
            return siguiente.size === actual.size ? actual : siguiente;
          });
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err)),
      });
  }
}
