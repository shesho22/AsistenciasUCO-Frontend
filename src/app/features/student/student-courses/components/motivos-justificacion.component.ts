import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CategoriaJustificacionItem } from '../../../../core/models/consultas-transversales.model';

/**
 * HU016: motivos posibles para justificar una inasistencia o llegada tarde. Se cargan del catálogo de solo consulta
 * (`GET /categorias-justificacion`); el bloque se oculta si el catálogo no trae filas.
 */
@Component({
  selector: 'app-motivos-justificacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (categorias().length) {
      <details class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm group" data-testid="motivos-justificacion">
        <summary class="cursor-pointer list-none p-5 flex items-center justify-between gap-3">
          <div>
            <h3 class="font-serif font-bold text-lg text-warm-900">¿Por qué motivos puedo justificar una inasistencia?</h3>
            <p class="text-xs text-warm-500">Elige uno de estos motivos al radicar un reclamo sobre una sesión.</p>
          </div>
          <span class="text-xs font-semibold text-primary-700 group-open:hidden">Ver motivos</span>
          <span class="text-xs font-semibold text-primary-700 hidden group-open:inline">Ocultar</span>
        </summary>
        <ul class="px-5 pb-5 grid gap-3 sm:grid-cols-2">
          @for (categoria of categorias(); track categoria.id) {
            <li class="p-3 rounded-xl bg-warm-50 border border-warm-200">
              <p class="text-sm font-bold text-warm-900">{{ categoria.nombre }}</p>
              @if (categoria.descripcion) {
                <p class="text-xs text-warm-600 mt-0.5">{{ categoria.descripcion }}</p>
              }
            </li>
          }
        </ul>
      </details>
    }
  `,
})
export class MotivosJustificacionComponent {
  categorias = input<CategoriaJustificacionItem[]>([]);
}
