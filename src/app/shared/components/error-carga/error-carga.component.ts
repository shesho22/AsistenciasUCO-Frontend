import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LoadErrorState } from '../../../core/api/errors/load-error.util';
import { ButtonComponent } from '../button/button.component';

/**
 * Fallo de carga de una lista, distinguible de una lista vacía (`role="alert"`). Ofrece «Reintentar» solo cuando
 * reintentar puede cambiar el resultado: no ante un identificador inválido, una autorización denegada ni una funcionalidad no implementada (501).
 */
@Component({
    selector: 'app-error-carga',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonComponent],
    template: `
    <div class="bg-danger-50 border border-danger-200 rounded-2xl p-6 text-center space-y-3" role="alert" data-testid="error-carga">
      <p class="text-sm font-bold text-danger-800">{{ error().titulo }}</p>
      <p class="text-xs text-danger-900">{{ error().mensaje }}</p>
      @if (permiteReintento()) {
        <app-button variant="secondary" size="sm" (clicked)="reintentar.emit()">Reintentar</app-button>
      }
    </div>
  `
})
export class ErrorCargaComponent {
  readonly error = input.required<LoadErrorState>();
  readonly reintentar = output<void>();

  protected readonly permiteReintento = computed(() => {
    const tipo = this.error().kind;
    return tipo !== 'IDENTIFICADOR' && tipo !== 'AUTORIZACION' && tipo !== 'NO_IMPLEMENTADO';
  });
}
