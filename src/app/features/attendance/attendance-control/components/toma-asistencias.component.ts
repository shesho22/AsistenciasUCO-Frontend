import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concatMap, from, last, finalize } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { TomaAsistenciaService } from '../../../../core/services/toma-asistencia.service';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';
import {
  AsistenciaToma,
  EstadoRegistroToma,
  RegistroTomaRequest,
  TomaAsistencia,
} from '../../../../core/models/toma-asistencia.model';
import { getApiErrorCode, getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { isAttendanceWindowErrorCode } from '../../../../core/utils/session-attendance-window.util';
import { ActionMenuComponent, ActionMenuItem } from '../../../../shared/components/action-menu/action-menu.component';
import { FiltrosPlegablesComponent } from '../../../../shared/components/filtros-plegables/filtros-plegables.component';
import { TomaFaltantesComponent } from './toma-faltantes.component';
import { TAMANO_PAGINA_TOMA, cargarTodasLasPaginas } from './toma-paginas.util';
import { ClaveEstadoToma, ETIQUETA_ESTADO_TOMA, EstadoFilaToma, claveEstadoToma } from './toma-estado';

/** Máximo de registros por lote de `POST /tomas/{id}/asistencias` (CONTRACT 3.2.5). */
export const MAXIMO_REGISTROS_LOTE_TOMA = 200;

export interface NotificacionToma {
  tipo: 'success' | 'info' | 'warning' | 'error';
  texto: string;
}

type AccionMasiva = 'PRESENTES' | 'FALTANTES';
type FiltroEstado = 'TODOS' | ClaveEstadoToma;

interface FilaToma {
  estudianteId: string;
  nombre: string;
  estado: EstadoFilaToma;
  /** El estado actual aún no se guardó. */
  pendiente: boolean;
  origen: string | null;
  hora: string | null;
}

interface ConfirmacionMasiva {
  accion: AccionMasiva;
  cantidad: number;
}

const FILTROS: readonly { clave: FiltroEstado; etiqueta: string }[] = [
  { clave: 'TODOS', etiqueta: 'Todos' },
  { clave: 'AN', etiqueta: 'Presentes' },
  { clave: 'SJC', etiqueta: 'Faltas' },
  { clave: 'EX', etiqueta: 'Excusas' },
  { clave: 'SIN', etiqueta: 'Sin registro' },
];

const OPCIONES_ESTADO: readonly EstadoRegistroToma[] = ['AN', 'SJC', 'EX'];

/**
 * UX de la toma: una toma = un panel. Dentro va SU lista de estudiantes con estado, origen y hora; la barra de
 * acciones fija (marcar, contador y Guardar) queda siempre a la vista, y los pendientes de validar del QR viven
 * en la misma toma. Los estados, el origen y la hora vienen del backend; lo marcado y no guardado es local.
 */
@Component({
  selector: 'app-toma-asistencias',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent, AvatarComponent, TomaFaltantesComponent, ActionMenuComponent, FiltrosPlegablesComponent],
  // La barra queda fija bajo la barra superior de escritorio (4 rem) y al tope en móvil, sin sumar CSS global.
  styles: ['.barra-fija { top: 0; } @media (min-width: 768px) { .barra-fija { top: 4rem; } }'],
  template: `
    <div class="space-y-4" [attr.data-testid]="'toma-' + toma().idToma">
      <!-- Cabecera de la toma -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-testid="toma-cabecera">
        <div class="min-w-0 space-y-0.5">
          <p class="text-sm font-bold text-warm-900">
            Toma {{ toma().numero }}
            <span class="font-medium text-warm-600">· {{ toma().modo === 'QR' ? 'Código QR' : 'Manual' }}</span>
            <span
              class="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
              [class]="toma().estado === 'ABIERTA' ? 'bg-attendance-present-soft text-attendance-present' : 'bg-warm-100 text-warm-700'"
            >
              {{ toma().estado === 'ABIERTA' ? 'Abierta' : 'Cerrada' }}
            </span>
          </p>
          <p class="text-xs text-warm-600">
            {{ toma().horasToma }} h · {{ toma().totalPresentes }} presentes · {{ toma().totalAusentes }} ausentes ·
            {{ toma().totalExcusas }} excusas
          </p>
        </div>
      </div>

      @if (!ventanaAbierta()) {
        <p
          class="text-xs font-medium text-warning-900 bg-warning-50 border border-warning-200 rounded-xl px-3.5 py-2.5"
          role="status"
          data-testid="toma-ventana-cerrada"
        >
          La ventana de asistencia de la sesión está cerrada: la lista es solo de consulta.
        </p>
      }

      <!-- Barra de acciones fija: siempre visible, con Guardar a mano -->
      <div
        class="barra-fija sticky z-10 px-3 py-2.5 rounded-2xl bg-white/95 border border-warm-200 shadow-warm-sm flex flex-wrap items-center gap-2"
        data-testid="barra-acciones"
        role="toolbar"
        aria-label="Acciones de la toma"
      >
        <button
          type="button"
          data-testid="marcar-todos-presentes"
          (click)="solicitarMasiva('PRESENTES')"
          [disabled]="bloqueado()"
          class="min-h-[44px] px-3 rounded-xl bg-attendance-present-soft text-attendance-present text-xs font-bold hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Marcar todos presentes
        </button>
        <div class="flex-1 min-w-[8rem] text-xs leading-tight">
          <p class="font-semibold text-warm-900" data-testid="contador-marcados">
            {{ marcados() }} de {{ filas().length }} marcados
          </p>
          <p
            data-testid="indicador-sin-guardar"
            [class]="pendientes() > 0 ? 'font-bold text-warning-800' : 'text-warm-600'"
            aria-live="polite"
          >
            @if (pendientes() > 0) {
              <span aria-hidden="true">● </span>{{ pendientes() }} sin guardar
            } @else {
              Todo guardado
            }
          </p>
        </div>
        <app-action-menu
          label="Más acciones de la toma"
          [items]="accionesMenu()"
          (selected)="alElegirAccion($event)"
        />
        <button
          type="button"
          data-testid="guardar-toma"
          (click)="guardar()"
          [disabled]="!puedeGuardar()"
          [attr.aria-busy]="guardando()"
          class="min-h-[44px] px-5 rounded-xl bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ guardando() ? 'Guardando…' : pendientes() > 0 ? 'Guardar (' + pendientes() + ')' : 'Guardar' }}
        </button>
      </div>

      <!-- Busqueda siempre visible; los filtros por estado se pliegan -->
      <app-filtros-plegables [activos]="filtro() === 'TODOS' ? 0 : 1">
        <input
          buscar
          type="search"
          data-testid="buscar-estudiante"
          aria-label="Buscar estudiante en la toma"
          placeholder="Buscar por nombre…"
          [value]="busqueda()"
          (input)="busqueda.set(valorDe($event))"
          class="w-full md:w-72 bg-warm-50 text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div class="flex items-center bg-warm-100/80 p-1 rounded-xl gap-1 overflow-x-auto max-w-full" role="group" aria-label="Filtrar por estado">
          @for (f of filtros; track f.clave) {
            <button
              type="button"
              [attr.data-testid]="'filtro-' + f.clave"
              [attr.aria-pressed]="filtro() === f.clave"
              (click)="filtro.set(f.clave)"
              class="whitespace-nowrap shrink-0 min-h-[36px] px-3 rounded-lg text-xs transition-all"
              [class]="filtro() === f.clave ? 'font-bold bg-white text-warm-900 shadow-xs' : 'font-medium text-warm-600 hover:text-warm-900'"
            >
              {{ f.etiqueta }}
            </button>
          }
        </div>
      </app-filtros-plegables>

      @if (error()) {
        <p class="rounded-xl bg-danger-100 text-danger-900 px-4 py-2 text-sm font-medium" role="alert" data-testid="toma-error">
          {{ error() }}
        </p>
      }

      <!-- Lista de la toma -->
      @if (cargando() && filas().length === 0) {
        <div class="h-24 rounded-xl bg-warm-100 animate-pulse" data-testid="toma-cargando"></div>
      } @else if (filasVisibles().length === 0) {
        <p class="text-sm text-warm-500 text-center py-6" data-testid="toma-vacia">
          {{ filas().length === 0 ? 'No hay estudiantes matriculados en esta toma.' : 'Ningún estudiante coincide con el filtro.' }}
        </p>
      } @else {
        <ul class="grid gap-2">
          @for (f of filasVisibles(); track f.estudianteId) {
            <li
              class="rounded-xl border bg-white p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
              [class]="f.pendiente ? 'border-warning-300' : 'border-warm-200'"
              [attr.data-testid]="'fila-' + f.estudianteId"
            >
              <div class="flex items-center gap-3 min-w-0">
                <app-avatar [name]="f.nombre"></app-avatar>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-warm-900 truncate">{{ f.nombre }}</p>
                  <p class="text-xs text-warm-600 flex flex-wrap gap-x-2">
                    <span [class]="f.estado === null ? 'font-semibold text-warning-800' : ''">{{ etiqueta(f.estado) }}</span>
                    @if (f.origen) {
                      <span [attr.data-testid]="'origen-' + f.estudianteId">· {{ f.origen }}</span>
                    }
                    @if (f.hora) {
                      <span [attr.data-testid]="'hora-' + f.estudianteId">· {{ f.hora }}</span>
                    }
                  </p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-1.5 md:w-72 shrink-0" role="group" [attr.aria-label]="'Estado de ' + f.nombre">
                @for (opcion of opciones; track opcion) {
                  <button
                    type="button"
                    [attr.data-testid]="'estado-' + f.estudianteId + '-' + opcion"
                    [attr.aria-pressed]="f.estado === opcion"
                    [disabled]="bloqueado()"
                    (click)="fijar(f.estudianteId, opcion)"
                    class="min-h-[44px] px-2 rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    [class]="clasesOpcion(f.estado, opcion)"
                  >
                    {{ etiquetaOpcion(opcion) }}
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }

      <!-- Pendientes de validar (estudiantes que no lograron usar el QR / PIN) -->
      @if (mostrarPendientes()) {
        <div data-testid="seccion-pendientes">
          <app-toma-faltantes
            [tomaId]="toma().idToma"
            [ventanaAbierta]="ventanaAbierta()"
            [version]="version()"
            (actualizado)="actualizado.emit()"
          />
        </div>
      }
    </div>

    <app-confirm-dialog
      [isOpen]="confirmacion() !== null"
      [title]="confirmacion()?.accion === 'PRESENTES' ? 'Marcar todos presentes' : 'Marcar faltantes'"
      [message]="mensajeConfirmacion()"
      [confirmLabel]="confirmacion()?.accion === 'PRESENTES' ? 'Marcar presentes' : 'Marcar faltas'"
      [destructive]="confirmacion()?.accion === 'FALTANTES'"
      (confirmed)="aplicarMasiva()"
      (cancelled)="confirmacion.set(null)"
    />
  `,
})
export class TomaAsistenciasComponent {
  private readonly tomas = inject(TomaAsistenciaService);
  private readonly zona = inject(SessionTimeZoneService);
  private readonly destroyRef = inject(DestroyRef);

  readonly toma = input.required<TomaAsistencia>();
  readonly ventanaAbierta = input<boolean>(true);

  readonly proyectarQr = output<TomaAsistencia>();
  readonly cerrarToma = output<TomaAsistencia>();
  /** Cambió algo en el backend desde esta toma: el contenedor refresca las tomas de la sesión. */
  readonly actualizado = output<void>();
  readonly notificacion = output<NotificacionToma>();
  /** Cantidad de estudiantes marcados y aún sin guardar. */
  readonly sinGuardar = output<number>();

  protected readonly filtros = FILTROS;
  protected readonly opciones = OPCIONES_ESTADO;

  private readonly registros = signal<AsistenciaToma[]>([]);
  private readonly locales = signal<ReadonlyMap<string, EstadoRegistroToma>>(new Map());
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtro = signal<FiltroEstado>('TODOS');
  protected readonly confirmacion = signal<ConfirmacionMasiva | null>(null);
  /** Se incrementa en cada recarga de la lista para refrescar también los pendientes de validar. */
  protected readonly version = signal(0);

  protected readonly bloqueado = computed(() => !this.ventanaAbierta() || this.guardando());

  /** Acciones secundarias de la toma (la barra fija conserva solo marcar todos presentes y Guardar). */
  protected readonly accionesMenu = computed<ActionMenuItem[]>(() => {
    const items: ActionMenuItem[] = [
      { id: 'faltantes', label: 'Marcar faltantes', testid: 'marcar-faltantes', disabled: this.bloqueado() },
    ];
    const toma = this.toma();
    if (toma.modo === 'QR' && toma.estado === 'ABIERTA') {
      items.push({ id: 'proyectar', label: 'Proyectar QR / PIN', testid: 'proyectar-qr', disabled: !this.ventanaAbierta() });
    }
    if (toma.estado === 'ABIERTA') {
      items.push({ id: 'cerrar', label: 'Cerrar toma', testid: 'cerrar-toma', danger: true });
    }
    return items;
  });

  protected alElegirAccion(id: string): void {
    if (id === 'faltantes') this.solicitarMasiva('FALTANTES');
    else if (id === 'proyectar') this.proyectarQr.emit(this.toma());
    else if (id === 'cerrar') this.cerrarToma.emit(this.toma());
  }
  protected readonly pendientes = computed(() => this.locales().size);
  protected readonly puedeGuardar = computed(() => this.pendientes() > 0 && !this.bloqueado());
  protected readonly mostrarPendientes = computed(() => this.toma().modo === 'QR' || this.toma().estado === 'CERRADA');

  protected readonly filas = computed<FilaToma[]>(() => {
    const locales = this.locales();
    return this.registros().map((r) => {
      const local = locales.get(r.estudianteId);
      const pendiente = local !== undefined;
      const estado = pendiente ? local : r.estado;
      return {
        estudianteId: r.estudianteId,
        nombre: r.nombreCompleto,
        estado,
        pendiente,
        origen: pendiente ? 'Manual (sin guardar)' : this.origenDe(r),
        hora: !pendiente && r.estado !== null && r.fechaRegistroUtc ? this.zona.formatTemporal(r.fechaRegistroUtc, 'time') : null,
      };
    });
  });

  protected readonly marcados = computed(() => this.filas().filter((f) => f.estado !== null).length);

  protected readonly filasVisibles = computed(() => {
    const consulta = this.busqueda().trim().toLowerCase();
    const filtro = this.filtro();
    return this.filas().filter(
      (f) =>
        (filtro === 'TODOS' || claveEstadoToma(f.estado) === filtro) &&
        (consulta === '' || f.nombre.toLowerCase().includes(consulta))
    );
  });

  protected readonly mensajeConfirmacion = computed(() => {
    const c = this.confirmacion();
    if (!c) return '';
    return c.accion === 'PRESENTES'
      ? `Se marcarán como presentes ${c.cantidad} estudiante(s); esto reemplaza las faltas ya marcadas. Las excusas se respetan. Los cambios quedan sin guardar hasta que pulses Guardar.`
      : `Se marcarán como falta ${c.cantidad} estudiante(s) que aún no tienen registro. Los cambios quedan sin guardar hasta que pulses Guardar.`;
  });

  constructor() {
    // Cada vez que el contenedor entrega esta toma recargada (evento SSE, reconexión o guardado) se vuelve a consultar su lista.
    effect(() => {
      this.toma();
      untracked(() => this.cargar());
    });

    effect(() => {
      const cantidad = this.pendientes();
      untracked(() => this.sinGuardar.emit(cantidad));
    });

    // Con la ventana cerrada lo marcado y no guardado no se puede enviar: se descarta, como en la toma ordinaria.
    effect(() => {
      if (!this.ventanaAbierta() && untracked(() => this.locales().size) > 0) {
        untracked(() => {
          this.locales.set(new Map());
          this.notificacion.emit({
            tipo: 'warning',
            texto: 'La ventana de asistencia se cerró. Los cambios no guardados se descartaron.',
          });
        });
      }
    });
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected etiqueta(estado: EstadoFilaToma): string {
    return ETIQUETA_ESTADO_TOMA[claveEstadoToma(estado)];
  }

  protected etiquetaOpcion(opcion: EstadoRegistroToma): string {
    return ETIQUETA_ESTADO_TOMA[opcion];
  }

  protected clasesOpcion(actual: EstadoFilaToma, opcion: EstadoRegistroToma): string {
    if (actual !== opcion) return 'font-medium bg-warm-100 text-warm-700 hover:bg-warm-200';
    if (opcion === 'AN') return 'font-bold bg-success-600 text-white shadow-xs';
    if (opcion === 'SJC') return 'font-bold bg-danger-600 text-white shadow-xs';
    return 'font-bold bg-warning-600 text-white shadow-xs';
  }

  private origenDe(registro: AsistenciaToma): string | null {
    if (registro.estado === null) return null;
    return registro.registradoPorEstudiante ? 'QR / PIN' : 'Manual';
  }

  protected fijar(estudianteId: string, estado: EstadoRegistroToma): void {
    if (this.bloqueado()) return;
    this.aplicar([[estudianteId, estado]]);
  }

  private aplicar(cambios: readonly (readonly [string, EstadoRegistroToma])[]): void {
    const servidor = new Map(this.registros().map((r) => [r.estudianteId, r.estado] as const));
    this.locales.update((actual) => {
      const siguiente = new Map(actual);
      for (const [id, estado] of cambios) {
        if (servidor.get(id) === estado) siguiente.delete(id);
        else siguiente.set(id, estado);
      }
      return siguiente;
    });
  }

  protected solicitarMasiva(accion: AccionMasiva): void {
    if (this.bloqueado()) return;
    const filas = this.filas();
    if (accion === 'PRESENTES') {
      const afectados = filas.filter((f) => f.estado !== 'AN' && f.estado !== 'EX');
      if (afectados.length === 0) {
        this.notificacion.emit({ tipo: 'info', texto: 'No hay estudiantes por marcar como presentes.' });
        return;
      }
      if (afectados.some((f) => f.estado !== null)) {
        this.confirmacion.set({ accion, cantidad: afectados.length });
        return;
      }
      this.aplicarA(afectados, 'AN');
      return;
    }
    const sinRegistro = filas.filter((f) => f.estado === null);
    if (sinRegistro.length === 0) {
      this.notificacion.emit({ tipo: 'info', texto: 'No hay estudiantes sin registro por marcar como falta.' });
      return;
    }
    this.confirmacion.set({ accion, cantidad: sinRegistro.length });
  }

  protected aplicarMasiva(): void {
    const c = this.confirmacion();
    this.confirmacion.set(null);
    if (!c || this.bloqueado()) return;
    if (c.accion === 'PRESENTES') {
      this.aplicarA(this.filas().filter((f) => f.estado !== 'AN' && f.estado !== 'EX'), 'AN');
    } else {
      this.aplicarA(this.filas().filter((f) => f.estado === null), 'SJC');
    }
  }

  private aplicarA(filas: readonly FilaToma[], estado: EstadoRegistroToma): void {
    this.aplicar(filas.map((f) => [f.estudianteId, estado] as const));
  }

  protected guardar(): void {
    if (!this.puedeGuardar()) return;
    const locales = this.locales();
    const registros: RegistroTomaRequest[] = this.registros()
      .filter((r) => locales.has(r.estudianteId))
      .map((r) => ({ estudianteId: r.estudianteId, estado: locales.get(r.estudianteId) as EstadoRegistroToma }));
    const lotes: RegistroTomaRequest[][] = [];
    for (let i = 0; i < registros.length; i += MAXIMO_REGISTROS_LOTE_TOMA) {
      lotes.push(registros.slice(i, i + MAXIMO_REGISTROS_LOTE_TOMA));
    }
    const tomaId = this.toma().idToma;
    this.guardando.set(true);
    from(lotes)
      .pipe(
        concatMap((lote) => this.tomas.registrarAsistencias(tomaId, lote)),
        last(),
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (respuesta) => {
          this.registros.update((actuales) =>
            actuales.map((r) => {
              const local = this.locales().get(r.estudianteId);
              return local === undefined ? r : { ...r, estado: local, registradoPorEstudiante: false };
            })
          );
          this.locales.set(new Map());
          this.notificacion.emit({ tipo: 'success', texto: respuesta.mensajeUsuario || 'Asistencia de la toma guardada.' });
          this.actualizado.emit();
        },
        error: (err: unknown) => {
          this.notificacion.emit({ tipo: 'error', texto: getApiErrorMessage(err) || 'No fue posible guardar la asistencia.' });
          if (isAttendanceWindowErrorCode(getApiErrorCode(err))) {
            // El backend es la autoridad temporal: lo marcado vuelve al estado persistido.
            this.locales.set(new Map());
            this.actualizado.emit();
          }
        },
      });
  }

  private cargar(): void {
    const tomaId = this.toma().idToma;
    this.cargando.set(true);
    cargarTodasLasPaginas((pagina) => this.tomas.consultarAsistencias(tomaId, pagina, TAMANO_PAGINA_TOMA))
      .pipe(finalize(() => this.cargando.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (registros) => {
          this.error.set(null);
          this.registros.set(registros);
          // Lo que el servidor ya trae igual a lo marcado deja de ser un cambio pendiente.
          const servidor = new Map(registros.map((r) => [r.estudianteId, r.estado] as const));
          this.locales.update((actual) => {
            const siguiente = new Map([...actual].filter(([id, estado]) => servidor.has(id) && servidor.get(id) !== estado));
            return siguiente.size === actual.size ? actual : siguiente;
          });
          this.version.update((v) => v + 1);
        },
        error: (err: unknown) => this.error.set(getApiErrorMessage(err)),
      });
  }
}
