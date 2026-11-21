import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { PaginationComponent } from '../pagination/pagination.component';

/** Tamano de pagina por defecto de las tablas paginadas en el cliente. */
export const TAMANO_PAGINA_TABLA = 15;
/** Tamanos de pagina que ofrece el selector de las tablas. */
export const TAMANOS_PAGINA_TABLA: readonly number[] = [15, 30, 50];

/** Devuelve la porcion de `items` de la pagina indicada (pagina empieza en 1). */
export function paginarEnCliente<T>(items: readonly T[], pagina: number, tamano: number): T[] {
  const inicio = Math.max(0, (pagina - 1) * tamano);
  return items.slice(inicio, inicio + tamano);
}

/**
 * Tabla de datos compartida (bloque E, 2026-11-19).
 *
 * Uso:
 * ```html
 * <app-tabla-datos etiqueta="Festivos" [columnas]="4" anchoMinimo="44rem"
 *   [cargando]="cargando()" [vacio]="festivos().length === 0" mensajeVacio="No hay festivos."
 *   [totalItems]="festivos().length" [pagina]="pagina()" [tamanoPagina]="tamano()"
 *   (paginaChange)="pagina.set($event)" (tamanoPaginaChange)="cambiarTamano($event)">
 *   <thead><tr><th scope="col">Fecha</th>...</tr></thead>
 *   <tbody>
 *     @for (f of festivosPagina(); track f.id) { <tr data-testid="festivo-fila">...</tr> }
 *   </tbody>
 * </app-tabla-datos>
 * ```
 *
 * - Cabecera fija mientras se desplaza la tabla (contenedor con altura maxima).
 * - Desplazamiento horizontal en pantallas angostas: `anchoMinimo` evita que el texto se encoja.
 * - Mientras `cargando` muestra filas de esqueleto y conserva la altura que tenia, para que la vista no salte
 *   al cambiar de pagina, filtrar o recargar.
 * - `tarjetasEnMovil`: bajo md las filas se apilan como tarjetas; `col-acciones` en el th y el td mantiene visibles las acciones.
 * - Paginacion opcional (15 por defecto, 15/30/50) con `app-pagination`; se muestra si `totalItems` > 0
 *   y `paginada` es verdadero.
 */
@Component({
  selector: 'app-tabla-datos',
  imports: [PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-2' },
  template: `
    <div
      #marco
      class="tabla-contenedor"
      role="region"
      tabindex="0"
      [attr.aria-label]="etiqueta()"
      [attr.aria-busy]="cargando() ? 'true' : null"
      [style.max-height]="alturaMaxima()"
      [style.min-height]="alturaReservada()"
    >
      <table class="tabla" [class.table-fixed]="fija()" [class.tabla-tarjetas]="tarjetasEnMovil()" [style.min-width]="anchoMinimo()">
        @if (etiquetaVisible()) {
          <caption class="sr-only">{{ etiqueta() }}</caption>
        }
        <ng-content select="colgroup" />
        <ng-content select="thead" />
        @if (cargando()) {
          <tbody data-testid="tabla-datos-esqueleto" aria-hidden="true">
            @for (fila of filasEsqueletoLista(); track fila) {
              <tr>
                @for (col of columnasLista(); track col) {
                  <td><div class="h-4 my-1 rounded-md bg-warm-200/80 animate-pulse"></div></td>
                }
              </tr>
            }
          </tbody>
        } @else if (vacio()) {
          <tbody>
            <tr>
              <td [attr.colspan]="columnas()" class="py-8 text-center text-sm text-warm-600" data-testid="tabla-datos-vacia">
                {{ mensajeVacio() }}
              </td>
            </tr>
          </tbody>
        }
        <ng-content />
      </table>
    </div>
    @if (paginada() && totalItems() > 0) {
      <app-pagination
        [totalItems]="totalItems()"
        [currentPage]="pagina()"
        [pageSize]="tamanoPagina()"
        [totalPages]="totalPaginas()"
        [pageSizeOptions]="tamanosPagina()"
        [showPageSizeSelector]="mostrarSelectorTamano()"
        (pageChange)="paginaChange.emit($event)"
        (pageSizeChange)="tamanoPaginaChange.emit($event)"
      />
    }
  `,
})
export class TablaDatosComponent {
  /** Nombre accesible de la region desplazable (y caption para lectores de pantalla). */
  readonly etiqueta = input<string>('Tabla de datos');
  readonly etiquetaVisible = input<boolean>(true);
  /** Numero de columnas: dimensiona las filas de esqueleto y la celda de "sin resultados". */
  readonly columnas = input<number>(4);
  readonly filasEsqueleto = input<number>(5);
  readonly cargando = input<boolean>(false);
  readonly vacio = input<boolean>(false);
  readonly mensajeVacio = input<string>('No hay registros para mostrar.');
  /** Ancho minimo de la tabla; por debajo de el aparece desplazamiento horizontal. */
  readonly anchoMinimo = input<string>('40rem');
  /**
   * Altura maxima del marco; por encima de ella la tabla se desplaza con la cabecera fija (sticky).
   * Por defecto usa el token --tabla-alto-max; pasar 'none' para no limitar el alto (sin desplazamiento vertical propio).
   */
  readonly alturaMaxima = input<string>('var(--tabla-alto-max)');
  /** Usa table-layout fixed (anchos de columna estables definidos en colgroup o en los th). */
  readonly fija = input<boolean>(false);
  /** Bajo md cada fila se muestra como tarjeta apilada (las celdas llevan `data-label` con su rotulo). */
  readonly tarjetasEnMovil = input<boolean>(false);

  readonly paginada = input<boolean>(false);
  readonly totalItems = input<number>(0);
  readonly pagina = input<number>(1);
  readonly tamanoPagina = input<number>(TAMANO_PAGINA_TABLA);
  readonly totalPaginas = input<number | undefined>(undefined);
  readonly tamanosPagina = input<number[]>([...TAMANOS_PAGINA_TABLA]);
  readonly mostrarSelectorTamano = input<boolean>(true);

  readonly paginaChange = output<number>();
  readonly tamanoPaginaChange = output<number>();

  private readonly marco = viewChild<ElementRef<HTMLElement>>('marco');
  /** Altura que tenia la tabla justo antes de empezar a cargar; se reserva mientras dura la carga. */
  private readonly alturaPrevia = signal<number | null>(null);

  readonly alturaReservada = computed(() => {
    const previa = this.alturaPrevia();
    return this.cargando() && previa ? `${previa}px` : null;
  });

  readonly columnasLista = computed(() => Array.from({ length: Math.max(1, this.columnas()) }, (_, i) => i));
  readonly filasEsqueletoLista = computed(() => Array.from({ length: Math.max(1, this.filasEsqueleto()) }, (_, i) => i));

  constructor() {
    effect(() => {
      const cargando = this.cargando();
      untracked(() => {
        if (cargando) {
          const alto = this.marco()?.nativeElement.offsetHeight ?? 0;
          this.alturaPrevia.set(alto > 0 ? alto : null);
        } else {
          this.alturaPrevia.set(null);
        }
      });
    });
  }
}
