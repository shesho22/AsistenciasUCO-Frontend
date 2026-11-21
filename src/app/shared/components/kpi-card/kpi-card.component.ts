import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SentidoMejora = 'menor-mejor' | 'mayor-mejor';

/**
 * Tarjeta KPI: valor, unidad, descripcion corta y variacion frente al periodo anterior
 * (flecha + color + texto). Sin dato previo la variacion se oculta.
 */
@Component({
  selector: 'app-kpi-card',
  host: { class: 'block h-full' },
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="superficie h-full px-3 py-2 sm:px-4" data-testid="kpi-card">
      <p class="text-xs leading-snug text-warm-600" data-testid="kpi-etiqueta">{{ etiqueta() }}</p>
      <p class="text-lg font-semibold leading-tight" data-testid="kpi-valor">{{ valorTexto() }}@if (unidad() && valorTexto() !== sinDato) {<span class="text-base font-medium text-warm-600" data-testid="kpi-unidad">{{ unidad() }}</span>}</p>
      @if (descripcion()) {
        <p class="text-xs text-warm-600" data-testid="kpi-descripcion">{{ descripcion() }}</p>
      }
      <ng-content />
      @if (variacionVista(); as v) {
        <p class="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold" [class]="v.clases" data-testid="kpi-variacion" [attr.data-tono]="v.tono" [attr.aria-label]="v.aria">
          @if (v.direccion === 'sube') {
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 4l6 9H4z" /></svg>
          } @else if (v.direccion === 'baja') {
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 16L4 7h12z" /></svg>
          } @else {
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4 9h12v2H4z" /></svg>
          }
          <span>{{ v.texto }}</span>
        </p>
      }
    </article>
  `,
})
export class KpiCardComponent {
  protected readonly sinDato = 'Sin datos';

  readonly etiqueta = input.required<string>();
  readonly valor = input<number | string | null | undefined>(null);
  readonly unidad = input<string>('');
  readonly descripcion = input<string>('');
  /** Variacion absoluta frente al periodo anterior; null/undefined oculta la variacion. */
  readonly variacion = input<number | null | undefined>(null);
  readonly unidadVariacion = input<string>('pp');
  readonly sentido = input<SentidoMejora>('menor-mejor');

  protected readonly valorTexto = computed(() => {
    const v = this.valor();
    return v === null || v === undefined || v === '' ? this.sinDato : String(v);
  });

  protected readonly variacionVista = computed(() => {
    const d = this.variacion();
    if (d === null || d === undefined || Number.isNaN(d)) return null;
    let direccion: 'sube' | 'baja' | 'igual' = 'igual';
    if (d > 0) direccion = 'sube';
    else if (d < 0) direccion = 'baja';
    const mejora = this.sentido() === 'menor-mejor' ? d < 0 : d > 0;
    const veredicto = mejora ? 'mejora' : 'empeora';
    const tono = d === 0 ? 'neutro' : veredicto;
    let clases = 'text-warm-600';
    if (tono === 'mejora') clases = 'text-success-700';
    else if (tono === 'empeora') clases = 'text-danger-700';
    const magnitud = `${Math.abs(d).toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${this.unidadVariacion()}`;
    const texto = d === 0 ? 'Sin cambio vs período anterior' : `${magnitud} vs período anterior`;
    const verboDireccion = direccion === 'sube' ? 'sube' : 'baja';
    const verbo = d === 0 ? 'sin cambio' : `${verboDireccion} ${magnitud}, ${veredicto}`;
    return { direccion, tono, clases, texto, aria: `Variación frente al período anterior: ${verbo}` };
  });
}
