import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Fila de un catálogo base: código, nombre y si está activo. */
export interface FilaCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  /** Ausente en los catálogos sin estado activo/inactivo (p. ej. estados del sistema, HU155). */
  activo?: boolean;
}

/**
 * Tabla de un catálogo base de solo consulta (regla de John, 2026-11-04): áreas de conocimiento, tipos de programa y
 * los demás catálogos se cargan por seed; la app no los crea, edita ni cambia de estado.
 */
@Component({
  selector: 'app-catalogo-solo-consulta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in">
      @if (seccion()) {
        <div>
          <h2 class="text-lg font-bold font-serif text-warm-900">{{ titulo() }}</h2>
          <p class="text-sm text-warm-600">{{ descripcion() }}</p>
        </div>
      } @else {
        <div>
          <div class="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">Administración Institucional</div>
          <h1 class="text-2xl font-bold font-serif text-warm-900">{{ titulo() }}</h1>
          <p class="text-sm text-warm-600">{{ descripcion() }}</p>
          <p class="text-xs text-warm-500 mt-1">Catálogo de solo consulta: sus valores se cargan con la base de datos.</p>
        </div>
      }

      <div class="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-warm-50 text-xs uppercase text-warm-600">
            <tr>
              <th class="text-left px-4 py-3">Código</th>
              <th class="text-left px-4 py-3">Nombre</th>
              @if (conEstado()) {
                <th class="text-left px-4 py-3">Estado</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (fila of filas(); track fila.id) {
              <tr class="border-t border-warm-100">
                <td class="px-4 py-3 font-mono font-bold">{{ fila.codigo }}</td>
                <td class="px-4 py-3">{{ fila.nombre }}</td>
                @if (conEstado()) {
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-bold"
                    [class]="fila.activo ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'"
                  >
                    {{ fila.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="conEstado() ? 3 : 2" class="px-4 py-8 text-center text-warm-500">{{ cargando() ? 'Cargando…' : vacio() }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class CatalogoSoloConsultaComponent {
  titulo = input.required<string>();
  descripcion = input('');
  vacio = input('No hay registros.');
  filas = input<FilaCatalogo[]>([]);
  /** Muestra la columna Activo/Inactivo (los estados del sistema no la tienen). */
  conEstado = input(true);
  /** Encabezado de sección (h2) en lugar de encabezado de página, para varias tablas en una misma pantalla. */
  seccion = input(false);
  /** Mientras llega la primera respuesta no se afirma que el catálogo está vacío (certificación F3, HU154). */
  cargando = input(false);
}
