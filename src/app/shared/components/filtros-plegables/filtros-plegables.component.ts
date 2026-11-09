import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let siguienteId = 0;

/**
 * CULM-001 (UX de densidad): barra de filtros plegable. La busqueda (`[buscar]`) queda siempre visible y el resto de
 * los filtros (contenido por defecto) se despliega con el boton "Filtros", que informa cuantos hay activos.
 */
@Component({
  selector: 'app-filtros-plegables',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
      <div class="flex-1 min-w-0"><ng-content select="[buscar]" /></div>
      <button
        type="button"
        data-testid="filtros-toggle"
        [attr.aria-expanded]="abierto()"
        [attr.aria-controls]="idPanel"
        [attr.aria-label]="activos() > 0 ? etiqueta() + ', ' + activos() + ' activos' : etiqueta()"
        (click)="abierto.set(!abierto())"
        class="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-warm-300 bg-white text-sm font-semibold text-warm-800 hover:bg-warm-100 focus-visible:ring-2 focus-visible:ring-primary-600 outline-none"
      >
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M3 5h14l-5.5 6.5V16l-3-1.5v-3L3 5z" />
        </svg>
        <span>{{ etiqueta() }}</span>
        @if (activos() > 0) {
          <span data-testid="filtros-activos" class="min-w-[1.25rem] px-1.5 rounded-full bg-primary-700 text-white text-xs font-bold text-center">{{ activos() }}</span>
        }
      </button>
    </div>
    @if (abierto()) {
      <div [id]="idPanel" data-testid="filtros-panel" class="mt-2"><ng-content /></div>
    }
  `,
})
export class FiltrosPlegablesComponent {
  readonly etiqueta = input<string>('Filtros');
  /** Cantidad de filtros aplicados (sin contar la busqueda); 0 oculta la insignia. */
  readonly activos = input<number>(0);
  readonly abierto = model<boolean>(false);
  protected readonly idPanel = `filtros-panel-${siguienteId++}`;
}
