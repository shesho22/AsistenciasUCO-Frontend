import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import {
  AtribucionFestivos,
  DiaFestivo,
  FestivosAnio,
  RecargaFestivos,
  SesionFestivoConAsistencia,
} from '../../../core/models/festivo.model';
import { AdminFestivosService } from '../../../core/services/admin-festivos.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

type Pestana = 'FESTIVOS' | 'SESIONES';

/** Tamaño de página de las sesiones en festivo (la paginación la hace el servidor). */
const TAMANO_SESIONES = 20;

/** Atribución mínima mientras no hay respuesta del backend (la fuente de la atribución es `FESTIVOS/ATRIBUCION_*`). */
const ATRIBUCION_RESPALDO: AtribucionFestivos = {
  texto: 'Fuente: Calendarios Nacionales',
  url: 'https://calendariosnacionales.com',
};

const ANIO_VALIDO = /^\d{4}$/;

/**
 * CULM-001 B.1, pantalla 3.7: festivos del administrador. Consulta por año, recarga con confirmación y lista de
 * sesiones en festivo que conservaron asistencia. No hay edición manual de festivos ni polling.
 */
@Component({
    selector: 'app-admin-festivos',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PaginationComponent, ModalComponent],
    template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div class="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">Administración Institucional</div>
          <h2 class="text-2xl font-bold font-serif text-warm-900">Festivos</h2>
          <p class="text-sm text-warm-600">
            Días festivos de Colombia. Las sesiones que caen en festivo se cancelan automáticamente.
          </p>
        </div>
        <button
          type="button"
          data-testid="recargar-anio"
          (click)="abrirRecarga()"
          class="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-primary-700 hover:bg-primary-800 rounded-xl transition-colors"
        >
          Recargar año
        </button>
      </div>

      <!-- Selector de año -->
      <section class="bg-white border border-warm-200 rounded-2xl p-4 shadow-warm-sm space-y-3" aria-label="Selector de año">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex flex-col gap-1">
            <label for="festivos-anio" class="text-xs font-semibold text-warm-700">Año</label>
            <input
              id="festivos-anio"
              data-testid="anio-input"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="4"
              [value]="anioTexto()"
              (input)="anioTexto.set($any($event.target).value)"
              (keydown.enter)="aplicarAnioEscrito()"
              class="w-28 min-h-[44px] px-3 bg-warm-50 border border-warm-300 rounded-xl text-sm text-warm-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            />
          </div>
          <button
            type="button"
            data-testid="anio-ir"
            (click)="aplicarAnioEscrito()"
            class="min-h-[44px] px-4 text-sm font-semibold text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition-colors"
          >
            Consultar
          </button>
          <button
            type="button"
            data-testid="anio-actual"
            (click)="seleccionarAnio(anioActual)"
            [class]="chipAnio(anio() === anioActual)"
          >
            {{ anioActual }}
          </button>
          <button
            type="button"
            data-testid="anio-siguiente"
            (click)="seleccionarAnio(anioActual + 1)"
            [class]="chipAnio(anio() === anioActual + 1)"
          >
            {{ anioActual + 1 }}
          </button>
        </div>
        @if (anioInvalido()) {
          <p class="text-xs text-danger-700" role="alert">Escriba un año de 4 dígitos.</p>
        }
      </section>

      <!-- Pestañas -->
      <div class="flex gap-2 border-b border-warm-200 overflow-x-auto" role="tablist">
        <button
          type="button"
          role="tab"
          data-testid="tab-festivos"
          [attr.aria-selected]="pestana() === 'FESTIVOS'"
          (click)="seleccionarPestana('FESTIVOS')"
          [class]="claseTab(pestana() === 'FESTIVOS')"
        >
          Festivos del año
        </button>
        <button
          type="button"
          role="tab"
          data-testid="tab-sesiones"
          [attr.aria-selected]="pestana() === 'SESIONES'"
          (click)="seleccionarPestana('SESIONES')"
          [class]="claseTab(pestana() === 'SESIONES')"
        >
          Sesiones en festivo con asistencia
        </button>
      </div>

      @if (resumen()) {
        @let r = resumen()!;
        <div data-testid="resumen-recarga" role="status" class="bg-success-50 border border-success-200 text-success-900 rounded-2xl p-4 text-sm space-y-1">
          <p class="font-semibold">Año {{ r.anio }} recargado desde {{ r.fuente }}.</p>
          <p>
            Total: {{ r.totalFestivos }} · Insertados: {{ r.festivosInsertados }} · Actualizados: {{ r.festivosActualizados }} ·
            Desactivados: {{ r.festivosDesactivados }}
          </p>
          <p>
            Grupos procesados: {{ r.aplicacion.gruposProcesados }} · Sesiones canceladas: {{ r.aplicacion.sesionesCanceladas }} ·
            Sesiones con asistencia: {{ r.aplicacion.sesionesConAsistencia }}
          </p>
          @if (r.usoRespaldo) {
            <p class="text-warning-800 font-medium">Se usó el cálculo local de respaldo porque el proveedor no respondió.</p>
          }
        </div>
      }

      @if (pestana() === 'FESTIVOS') {
        @if (cargando()) {
          <div data-testid="estado-carga" role="status" class="space-y-3" aria-live="polite">
            <span class="sr-only">Cargando festivos…</span>
            @for (n of [1, 2, 3, 4]; track n) {
              <div class="h-14 bg-warm-100 rounded-xl animate-pulse"></div>
            }
          </div>
        } @else if (error()) {
          <div data-testid="estado-error" role="alert" class="bg-danger-50 border border-danger-200 text-danger-800 rounded-2xl p-5 space-y-3">
            <p class="font-semibold">No fue posible cargar los festivos.</p>
            <p class="text-sm break-words">{{ error() }}</p>
            <button
              type="button"
              data-testid="reintentar"
              (click)="cargarFestivos()"
              class="min-h-[44px] px-4 text-sm font-semibold text-danger-800 border border-danger-300 hover:bg-danger-100 rounded-xl transition-colors"
            >
              Reintentar
            </button>
          </div>
        } @else if (datos()) {
          @let d = datos()!;
          <div data-testid="festivos-cabecera" class="bg-white border border-warm-200 rounded-2xl p-4 text-sm text-warm-700 grid gap-1 sm:grid-cols-3">
            <div><span class="text-xs text-warm-500 block">Fuente</span>{{ d.fuenteUltimaCarga ?? 'Sin carga registrada' }}</div>
            <div>
              <span class="text-xs text-warm-500 block">Última carga</span>{{ d.fechaUltimaCargaUtc ? timeZone.formatTemporal(d.fechaUltimaCargaUtc) : '—' }}
            </div>
            <div>Diferencias con el cálculo local: {{ d.diferenciasCalculoLocal }}</div>
          </div>

          @if (d.festivos.length === 0) {
            <div data-testid="estado-vacio" role="status" class="p-10 text-center text-warm-600 bg-white border border-dashed border-warm-300 rounded-2xl">
              <p class="font-semibold text-warm-900">No hay festivos cargados para {{ d.anio }}.</p>
              <p class="text-sm mt-1">Use «Recargar año» para obtenerlos.</p>
            </div>
          } @else {
            <!-- Tabla (md en adelante) -->
            <div data-testid="festivos-tabla" class="hidden md:block bg-white border border-warm-200 rounded-2xl overflow-hidden">
              <table class="w-full text-left text-sm">
                <thead class="bg-warm-50 text-warm-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" class="px-4 py-3">Fecha</th>
                    <th scope="col" class="px-4 py-3">Día</th>
                    <th scope="col" class="px-4 py-3">Nombre</th>
                    <th scope="col" class="px-4 py-3">Fuente</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-warm-100">
                  @for (f of festivosPagina(); track f.fecha) {
                    <tr [attr.data-testid]="'festivo-fila-' + f.fecha" [class.opacity-60]="!f.estaActivo">
                      <td class="px-4 py-3 font-mono text-warm-900">{{ fechaLegible(f.fecha) }}</td>
                      <td class="px-4 py-3 text-warm-700 capitalize">{{ diaSemana(f.fecha) }}</td>
                      <td class="px-4 py-3 font-semibold text-warm-900">{{ f.nombre }}</td>
                      <td class="px-4 py-3 text-warm-600">{{ f.fuente }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <!-- Tarjetas (móvil) -->
            <div data-testid="festivos-tarjetas" class="md:hidden space-y-2">
              @for (f of festivosPagina(); track f.fecha) {
                <article [attr.data-testid]="'festivo-card-' + f.fecha" class="bg-white border border-warm-200 rounded-2xl p-4" [class.opacity-60]="!f.estaActivo">
                  <p class="font-semibold text-warm-900 break-words">{{ f.nombre }}</p>
                  <p class="text-sm text-warm-700">
                    <span class="capitalize">{{ diaSemana(f.fecha) }}</span>, {{ fechaLegible(f.fecha) }}
                  </p>
                  <p class="text-xs text-warm-500 mt-1">{{ f.fuente }}</p>
                </article>
              }
            </div>
            <app-pagination
              [totalItems]="d.festivos.length"
              [pageSize]="tamanoFestivos()"
              [currentPage]="paginaFestivos()"
              [pageSizeOptions]="[10, 20, 50]"
              (pageChange)="onPaginaFestivos($event)"
              (pageSizeChange)="onTamanoFestivos($event)"
            ></app-pagination>
          }
        }
      } @else {
        <section aria-label="Sesiones en festivo con asistencia registrada" class="space-y-3">
          <p class="text-sm text-warm-600">
            Sesiones en festivo con asistencia registrada (no se cancelaron). El docente titular decide cómo corregirlas.
          </p>
          @if (cargandoSesiones()) {
            <div data-testid="sesiones-cargando" role="status" class="space-y-3" aria-live="polite">
              <span class="sr-only">Cargando sesiones…</span>
              @for (n of [1, 2, 3]; track n) {
                <div class="h-14 bg-warm-100 rounded-xl animate-pulse"></div>
              }
            </div>
          } @else if (errorSesiones()) {
            <div data-testid="sesiones-error" role="alert" class="bg-danger-50 border border-danger-200 text-danger-800 rounded-2xl p-5 space-y-3">
              <p class="font-semibold">No fue posible cargar las sesiones.</p>
              <p class="text-sm break-words">{{ errorSesiones() }}</p>
              <button
                type="button"
                data-testid="sesiones-reintentar"
                (click)="cargarSesiones()"
                class="min-h-[44px] px-4 text-sm font-semibold text-danger-800 border border-danger-300 hover:bg-danger-100 rounded-xl transition-colors"
              >
                Reintentar
              </button>
            </div>
          } @else if (sesiones().length === 0) {
            <div data-testid="sesiones-vacio" role="status" class="p-10 text-center text-warm-600 bg-white border border-dashed border-warm-300 rounded-2xl">
              <p class="font-semibold text-warm-900">Ninguna sesión en festivo de {{ anio() }} tiene asistencia registrada.</p>
            </div>
          } @else {
            <div class="hidden md:block bg-white border border-warm-200 rounded-2xl overflow-hidden">
              <table class="w-full text-left text-sm">
                <thead class="bg-warm-50 text-warm-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" class="px-4 py-3">Fecha</th>
                    <th scope="col" class="px-4 py-3">Festivo</th>
                    <th scope="col" class="px-4 py-3">Asignatura · Grupo</th>
                    <th scope="col" class="px-4 py-3">Docente</th>
                    <th scope="col" class="px-4 py-3 text-right">Tomas</th>
                    <th scope="col" class="px-4 py-3 text-right">Registros</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-warm-100">
                  @for (s of sesiones(); track s.idSesion) {
                    <tr [attr.data-testid]="'sesion-festivo-fila-' + s.idSesion">
                      <td class="px-4 py-3 font-mono text-warm-900">{{ fechaLegible(s.fecha) }}</td>
                      <td class="px-4 py-3 text-warm-800">{{ s.nombreFestivo }}</td>
                      <td class="px-4 py-3 text-warm-900">{{ s.nombreAsignatura }} · {{ s.nombreGrupo }}</td>
                      <td class="px-4 py-3 text-warm-700">{{ s.nombreDocente }}</td>
                      <td class="px-4 py-3 text-right font-mono">{{ s.totalTomas }}</td>
                      <td class="px-4 py-3 text-right font-mono">{{ s.totalRegistros }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="md:hidden space-y-2">
              @for (s of sesiones(); track s.idSesion) {
                <article [attr.data-testid]="'sesion-festivo-card-' + s.idSesion" class="bg-white border border-warm-200 rounded-2xl p-4 space-y-1">
                  <p class="font-semibold text-warm-900 break-words">{{ s.nombreAsignatura }} · {{ s.nombreGrupo }}</p>
                  <p class="text-sm text-warm-700">{{ s.nombreFestivo }} · {{ fechaLegible(s.fecha) }}</p>
                  <p class="text-xs text-warm-600">{{ s.nombreDocente }}</p>
                  <p class="text-xs text-warm-600">Tomas: {{ s.totalTomas }} · Registros: {{ s.totalRegistros }}</p>
                </article>
              }
            </div>
            <app-pagination
              [totalItems]="totalSesiones()"
              [pageSize]="tamanoSesiones"
              [currentPage]="paginaSesiones()"
              [showPageSizeSelector]="false"
              (pageChange)="onPaginaSesiones($event)"
            ></app-pagination>
          }
        </section>
      }

      <p class="text-xs text-warm-500">
        <a
          data-testid="atribucion-enlace"
          [href]="atribucion().url"
          target="_blank"
          rel="noopener noreferrer"
          class="underline hover:text-primary-800 focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >{{ atribucion().texto }}</a>
      </p>
    </div>

    <app-modal [isOpen]="recargaAbierta()" title="Recargar festivos del año" (closed)="cerrarRecarga()">
      <p class="text-sm text-warm-700">
        Se volverán a obtener los festivos de <strong>{{ anio() }}</strong> y se aplicarán a las sesiones. Las sesiones con
        asistencia registrada no se cancelan. ¿Desea continuar?
      </p>
      @if (errorRecarga()) {
        <p data-testid="error-recarga" role="alert" class="mt-3 text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3 break-words">
          {{ errorRecarga() }}
        </p>
      }
      <div modal-footer class="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
        <button
          type="button"
          data-testid="cancelar-recarga"
          (click)="cerrarRecarga()"
          class="min-h-[44px] px-4 text-sm font-semibold text-warm-700 bg-warm-100 hover:bg-warm-200 border border-warm-200 rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          data-testid="confirmar-recarga"
          [disabled]="recargando()"
          (click)="confirmarRecarga()"
          class="min-h-[44px] px-4 text-sm font-semibold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
        >
          {{ recargando() ? 'Recargando…' : 'Recargar año' }}
        </button>
      </div>
    </app-modal>
  `
})
export class AdminFestivosComponent implements OnInit {
  private readonly service = inject(AdminFestivosService);
  private readonly destroyRef = inject(DestroyRef);
  readonly timeZone = inject(SessionTimeZoneService);

  readonly anioActual = new Date().getFullYear();
  readonly tamanoSesiones = TAMANO_SESIONES;

  readonly anio = signal<number>(this.anioActual);
  readonly anioTexto = signal<string>(String(this.anioActual));
  readonly anioInvalido = signal<boolean>(false);
  readonly pestana = signal<Pestana>('FESTIVOS');

  readonly datos = signal<FestivosAnio | null>(null);
  readonly cargando = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly paginaFestivos = signal<number>(1);
  readonly tamanoFestivos = signal<number>(10);

  readonly sesiones = signal<SesionFestivoConAsistencia[]>([]);
  readonly totalSesiones = signal<number>(0);
  readonly paginaSesiones = signal<number>(1);
  readonly cargandoSesiones = signal<boolean>(false);
  readonly errorSesiones = signal<string | null>(null);

  readonly recargaAbierta = signal<boolean>(false);
  readonly recargando = signal<boolean>(false);
  readonly errorRecarga = signal<string | null>(null);
  readonly resumen = signal<RecargaFestivos | null>(null);

  readonly atribucion = computed<AtribucionFestivos>(() => this.datos()?.atribucion ?? ATRIBUCION_RESPALDO);
  readonly festivosPagina = computed<DiaFestivo[]>(() => {
    const festivos = this.datos()?.festivos ?? [];
    const inicio = (this.paginaFestivos() - 1) * this.tamanoFestivos();
    return festivos.slice(inicio, inicio + this.tamanoFestivos());
  });

  private consulta: Subscription | null = null;
  private consultaSesiones: Subscription | null = null;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.consulta?.unsubscribe();
      this.consultaSesiones?.unsubscribe();
    });
    this.cargarFestivos();
  }

  chipAnio(activo: boolean): string {
    const base = 'min-h-[44px] px-4 text-sm font-semibold rounded-xl border transition-colors';
    return activo
      ? `${base} bg-primary-700 text-white border-primary-700`
      : `${base} bg-white text-warm-700 border-warm-300 hover:bg-warm-100`;
  }

  claseTab(activa: boolean): string {
    const base = 'min-h-[44px] px-4 text-sm whitespace-nowrap border-b-2 transition-colors';
    return activa
      ? `${base} border-primary-700 text-primary-900 font-bold`
      : `${base} border-transparent text-warm-500 hover:text-warm-800 font-medium`;
  }

  aplicarAnioEscrito(): void {
    const texto = this.anioTexto().trim();
    if (!ANIO_VALIDO.test(texto)) {
      this.anioInvalido.set(true);
      return;
    }
    this.seleccionarAnio(Number(texto));
  }

  seleccionarAnio(anio: number): void {
    this.anioInvalido.set(false);
    this.anio.set(anio);
    this.anioTexto.set(String(anio));
    this.paginaFestivos.set(1);
    this.paginaSesiones.set(1);
    this.resumen.set(null);
    this.cargarFestivos();
    if (this.pestana() === 'SESIONES') this.cargarSesiones();
  }

  seleccionarPestana(pestana: Pestana): void {
    if (this.pestana() === pestana) return;
    this.pestana.set(pestana);
    if (pestana === 'SESIONES') this.cargarSesiones();
  }

  cargarFestivos(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    this.consulta = this.service.consultar(this.anio()).subscribe({
      next: (res) => {
        this.datos.set(res.datos);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.datos.set(null);
        this.error.set(getApiErrorMessage(err));
        this.cargando.set(false);
      },
    });
  }

  cargarSesiones(): void {
    this.consultaSesiones?.unsubscribe();
    this.cargandoSesiones.set(true);
    this.errorSesiones.set(null);
    this.consultaSesiones = this.service
      .sesionesConAsistencia(this.anio(), this.paginaSesiones(), TAMANO_SESIONES)
      .subscribe({
        next: (res) => {
          this.sesiones.set(res.elementos);
          this.totalSesiones.set(res.totalElementos);
          this.cargandoSesiones.set(false);
        },
        error: (err: unknown) => {
          this.sesiones.set([]);
          this.totalSesiones.set(0);
          this.errorSesiones.set(getApiErrorMessage(err));
          this.cargandoSesiones.set(false);
        },
      });
  }

  onPaginaFestivos(pagina: number): void {
    this.paginaFestivos.set(pagina);
  }

  onTamanoFestivos(tamano: number): void {
    this.tamanoFestivos.set(tamano);
    this.paginaFestivos.set(1);
  }

  onPaginaSesiones(pagina: number): void {
    this.paginaSesiones.set(pagina);
    this.cargarSesiones();
  }

  abrirRecarga(): void {
    this.errorRecarga.set(null);
    this.recargaAbierta.set(true);
  }

  cerrarRecarga(): void {
    if (this.recargando()) return;
    this.recargaAbierta.set(false);
    this.errorRecarga.set(null);
  }

  confirmarRecarga(): void {
    if (this.recargando()) return;
    this.recargando.set(true);
    this.errorRecarga.set(null);
    this.service.recargar(this.anio()).subscribe({
      next: (res) => {
        this.recargando.set(false);
        this.recargaAbierta.set(false);
        this.resumen.set(res.datos);
        this.paginaFestivos.set(1);
        this.cargarFestivos();
        if (this.pestana() === 'SESIONES') {
          this.paginaSesiones.set(1);
          this.cargarSesiones();
        }
      },
      error: (err: unknown) => {
        this.recargando.set(false);
        this.errorRecarga.set(getApiErrorMessage(err));
      },
    });
  }

  /** `YYYY-MM-DD` como fecha civil local (sin desplazamiento por zona horaria). */
  private fechaCivil(fecha: string): Date {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }

  fechaLegible(fecha: string): string {
    return this.fechaCivil(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  diaSemana(fecha: string): string {
    return this.fechaCivil(fecha).toLocaleDateString('es-CO', { weekday: 'long' });
  }
}
