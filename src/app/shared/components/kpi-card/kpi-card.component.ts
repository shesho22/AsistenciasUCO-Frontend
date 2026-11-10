import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SentidoMejora = 'menor-mejor' | 'mayor-mejor';

/**
 * Tarjeta KPI: valor, unidad, descripcion corta y variacion frente al periodo anterior
 * (flecha + color + texto). Sin dato previo la variacion se oculta.
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-2xl border border-warm-200 bg-white p-4 shadow-warm-sm" data-testid="kpi-card">
      <p class="text-xs text-warm-600" data-testid="kpi-etiqueta">{{ etiqueta() }}</p>
      <p class="text-2xl font-semibold" data-testid="kpi-valor">{{ valorTexto() }}@if (unidad() && valorTexto() !== sinDato) {<span class="text-base font-medium text-warm-600" data-testid="kpi-unidad">{{ unidad() }}</span>}</p>
      @if (descripcion()) {
        <p class="text-xs text-warm-600" data-testid="kpi-descripcion">{{ descripcion() }}</p>
      }
      @if (variacionVista(); as v) {
        <p class="mt-1 inline-flex items-center gap-1 text-xs font-semibold" [class]="v.clases" data-testid="kpi-variacion" [attr.data-tono]="v.tono" [attr.aria-label]="v.aria">
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
    const direccion = d > 0 ? 'sube' : d < 0 ? 'baja' : 'igual';
    const mejora = this.sentido() === 'menor-mejor' ? d < 0 : d > 0;
    const tono = d === 0 ? 'neutro' : mejora ? 'mejora' : 'empeora';
    const clases = tono === 'mejora' ? 'text-success-700' : tono === 'empeora' ? 'text-danger-700' : 'text-warm-600';
    const magnitud = `${Math.abs(d).toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${this.unidadVariacion()}`;
    const texto = d === 0 ? 'Sin cambio vs período anterior' : `${magnitud} vs período anterior`;
    const verbo = d === 0 ? 'sin cambio' : `${direccion === 'sube' ? 'sube' : 'baja'} ${magnitud}, ${mejora ? 'mejora' : 'empeora'}`;
    return { direccion, tono, clases, texto, aria: `Variación frente al período anterior: ${verbo}` };
  });
}
