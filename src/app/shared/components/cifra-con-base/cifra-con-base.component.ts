import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Cifra con su base: un solo componente para dos numeros del mismo concepto
 * ("13 activos de 16 registrados") en lugar de mostrar dos cifras sueltas que parecen contradecirse.
 * `soloBase` imprime unicamente "de 16 registrados" cuando el valor ya se destaca en otro lugar (p. ej. KPI).
 */
@Component({
  selector: 'app-cifra-con-base',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span data-testid="cifra-con-base" [attr.aria-label]="frase()">
      @if (!soloBase()) {<strong data-testid="cifra-valor">{{ valor() }}</strong> {{ etiquetaValor() }} }de <span data-testid="cifra-base">{{ base() }}</span> {{ etiquetaBase() }}
    </span>
  `,
})
export class CifraConBaseComponent {
  readonly valor = input.required<number>();
  readonly base = input.required<number>();
  readonly etiquetaValor = input<string>('activos');
  readonly etiquetaBase = input<string>('registrados');
  readonly soloBase = input<boolean>(false);

  protected readonly frase = computed(() => {
    const parteBase = `de ${this.base()} ${this.etiquetaBase()}`;
    return this.soloBase() ? parteBase : `${this.valor()} ${this.etiquetaValor()} ${parteBase}`;
  });
}
