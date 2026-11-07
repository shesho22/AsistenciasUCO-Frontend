import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import {
  AsistenciasTomaActualizadasRealtimePayload,
  REALTIME_EVENT_TYPE,
} from '../../../../core/realtime/model/realtime-event.model';
import { TomaAsistenciaService } from '../../../../core/services/toma-asistencia.service';
import { FaltanteToma } from '../../../../core/models/toma-asistencia.model';
import { getApiErrorCode, getApiErrorMessage } from '../../../../core/api/errors/api-error.util';

export const TAMANO_PAGINA_FALTANTES = 50;

/**
 * CULM-001 B.2: estudiantes sin lectura al cerrar una toma, con marcacion manual de presentes (AN), individual o en
 * lote. La lista y los mensajes vienen del backend; se actualiza con la respuesta y con `ASISTENCIAS_TOMA_ACTUALIZADAS`.
 */
@Component({
  selector: 'app-toma-faltantes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaginationComponent],
  template: `
    <section class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm p-4 sm:p-5 space-y-4" aria-label="Estudiantes sin lectura">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Faltantes de la toma</h3>
          <p class="text-xs text-warm-500">Marca presente a quien sí asistió pero no registró su lectura.</p>
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

      @if (!ventanaAbierta()) {
        <p class="text-xs text-warm-600" data-testid="faltantes-ventana-cerrada">
          La ventana de la sesión está cerrada: ya no se puede marcar asistencia desde aquí.
        </p>
      }
      @if (error()) {
        <p class="rounded-xl bg-danger-100 text-danger-900 px-4 py-2 text-sm font-medium" role="alert" data-testid="faltantes-error">
          {{ error() }}
        </p>
      }

      @if (cargando()) {
        <div class="h-16 rounded-xl bg-warm-100 animate-pulse"></div>
      } @else if (faltantes().length === 0) {
        <p class="text-sm text-warm-500 text-center py-6" data-testid="faltantes-vacio">
          No hay estudiantes pendientes en esta toma.
        </p>
      } @else {
        <ul class="grid gap-2">
          @for (f of faltantes(); track f.estudianteId) {
            <li
              class="rounded-xl border border-warm-200 p-3 flex items-center justify-between gap-3"
              [attr.data-testid]="'faltante-' + f.estudianteId"
            >
              <label class="flex items-center gap-3 min-w-0 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  class="w-5 h-5 shrink-0 accent-primary-700"
                  [attr.data-testid]="'seleccionar-' + f.estudianteId"
                  [checked]="seleccionados().has(f.estudianteId)"
                  [disabled]="!puedeMarcar()"
                  (change)="alternar(f.estudianteId)"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-semibold text-warm-900 truncate">{{ f.nombreCompleto }}</span>
                  <span class="block text-xs text-warm-500">{{ f.tieneRegistro || f.marcadoAlCerrar ? 'Ausente' : 'Sin lectura' }}</span>
                </span>
              </label>
              <button
                type="button"
                [attr.data-testid]="'marcar-presente-' + f.estudianteId"
                (click)="marcarPresente(f)"
                [disabled]="!puedeMarcar()"
                class="min-h-[44px] min-w-[44px] px-4 rounded-xl border border-primary-300 bg-primary-50 text-primary-900 text-sm font-semibold hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                Marcar presente
              </button>
            </li>
          }
        </ul>
        <app-pagination
          [totalItems]="totalElementos()"
          [pageSize]="tamano"
          [currentPage]="pagina()"
          [showPageSizeSelector]="false"
          (pageChange)="cambiarPagina($event)"
        />
      }
    </section>
  `,
})
export class TomaFaltantesComponent {
  private readonly tomas = inject(TomaAsistenciaService);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tomaId = input.required<string>();
  readonly ventanaAbierta = input<boolean>(true);
  /** Se emite tras una marcacion exitosa para que el contenedor refresque conteos. */
  readonly actualizado = output<void>();

  protected readonly tamano = TAMANO_PAGINA_FALTANTES;
  protected readonly faltantes = signal<FaltanteToma[]>([]);
  protected readonly pagina = signal(1);
  protected readonly totalElementos = signal(0);
  protected readonly cargando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seleccionados = signal<ReadonlySet<string>>(new Set());

  /** SES_008: el backend cerró la ventana (ERR_SESION_CERRADA) aunque la pantalla aún la viera abierta. */
  private readonly cerradaPorBackend = signal(false);
  protected readonly puedeMarcar = computed(() => this.ventanaAbierta() && !this.cerradaPorBackend() && !this.enviando());

  constructor() {
    effect((onCleanup) => {
      const tomaId = this.tomaId();
      untracked(() => {
        this.pagina.set(1);
        this.cargar();
      });
      const sub = this.realtime
        .listenType<AsistenciasTomaActualizadasRealtimePayload>(REALTIME_EVENT_TYPE.ASISTENCIAS_TOMA_ACTUALIZADAS)
        .subscribe((evento) => {
          if (evento.payload?.toma === tomaId) this.cargar();
        });
      onCleanup(() => sub.unsubscribe());
    });
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  protected alternar(estudianteId: string): void {
    this.seleccionados.update((actual) => {
      const siguiente = new Set(actual);
      if (!siguiente.delete(estudianteId)) siguiente.add(estudianteId);
      return siguiente;
    });
  }

  protected marcarPresente(faltante: FaltanteToma): void {
    this.enviar([faltante.estudianteId]);
  }

  protected marcarSeleccionados(): void {
    const ids = this.faltantes()
      .map((f) => f.estudianteId)
      .filter((id) => this.seleccionados().has(id));
    if (ids.length > 0) this.enviar(ids);
  }

  private enviar(ids: string[]): void {
    this.enviando.set(true);
    this.error.set(null);
    this.tomas
      .registrarAsistencias(this.tomaId(), ids.map((estudianteId) => ({ estudianteId, estado: 'AN' as const })))
      .pipe(finalize(() => this.enviando.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.seleccionados.set(new Set());
          this.actualizado.emit();
          this.cargar();
        },
        error: (err: unknown) => {
          if (getApiErrorCode(err) === 'ERR_SESION_CERRADA') this.cerradaPorBackend.set(true);
          this.error.set(getApiErrorMessage(err));
        },
      });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.tomas
      .consultarFaltantes(this.tomaId(), this.pagina(), TAMANO_PAGINA_FALTANTES)
      .pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.faltantes.set(respuesta.elementos);
          this.totalElementos.set(respuesta.totalElementos);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err)),
      });
  }
}
