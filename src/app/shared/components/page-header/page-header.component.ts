import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Encabezado de pantalla compartido: un único `<h1>` con la tipografía del sistema, la descripción opcional,
 * la etiqueta de módulo y el contexto, y una zona de acciones a la derecha.
 *
 * Ranuras de contenido:
 * - `[cabecera-previa]`: lo que va encima del título cuando la etiqueta y el contexto no bastan (insignias propias).
 * - `[cabecera-detalle]`: texto enriquecido bajo el título cuando la descripción no es una cadena simple.
 * - `[cabecera-acciones]`: botones, filtros o contadores alineados a la derecha.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div [class]="contenedorClases()" data-testid="page-header">
      @if (conTitulo()) {
      <div class="min-w-0">
        @if (etiqueta() || contexto()) {
          <div class="flex flex-wrap items-center gap-2 mb-1">
            @if (etiqueta()) {
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">
                {{ etiqueta() }}
              </span>
            }
            @if (contexto()) {
              <span class="inline-flex items-center gap-2">
                @if (etiqueta()) {
                  <span class="text-xs text-warm-400" aria-hidden="true">•</span>
                }
                <span class="text-xs font-medium text-warm-500">{{ contexto() }}</span>
              </span>
            }
          </div>
        }
        <ng-content select="[cabecera-previa]" />
        <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight" [attr.data-testid]="tituloTestId()">
          {{ titulo() }}
        </h1>
        @if (descripcion()) {
          <p class="text-sm text-warm-600 mt-1">{{ descripcion() }}</p>
        }
        <ng-content select="[cabecera-detalle]" />
      </div>
      }
      <div class="flex flex-wrap items-center gap-3 empty:hidden">
        <ng-content select="[cabecera-acciones]" />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly titulo = input.required<string>();
  readonly descripcion = input<string | null>(null);
  /** Insignia del módulo (por ejemplo «Coordinación de Programa»). */
  readonly etiqueta = input<string | null>(null);
  /** Texto secundario junto a la etiqueta (por ejemplo «Calendario Académico»). */
  readonly contexto = input<string | null>(null);
  /** Envuelve el encabezado en la tarjeta blanca de sección. */
  readonly enTarjeta = input<boolean>(false);
  /** `final` alinea las acciones con la base del título, útil cuando son controles de formulario con etiqueta. */
  readonly alineacion = input<'centro' | 'final'>('centro');
  readonly tituloTestId = input<string | null>(null);
  /** `false` en pantallas embebidas en pestañas: se omite el bloque del título y se conservan las acciones. */
  readonly conTitulo = input<boolean>(true);

  protected readonly contenedorClases = computed(() => {
    const base = 'flex flex-col sm:flex-row sm:justify-between gap-4';
    const alinear = this.alineacion() === 'final' ? 'sm:items-end' : 'sm:items-center';
    const tarjeta = this.enTarjeta() ? 'bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm' : '';
    return `${base} ${alinear} ${tarjeta}`.trim();
  });
}
