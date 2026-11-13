import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface OpcionModo<T extends string = string> {
  valor: T;
  etiqueta: string;
}

/** Selector de modo en segmentos (radiogroup accesible) para formularios con alternativas excluyentes. */
@Component({
  selector: 'app-selector-modo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="radiogroup" [attr.aria-label]="etiqueta()" class="inline-flex flex-wrap gap-1 p-1 bg-warm-100 border border-warm-200 rounded-xl">
      @for (opcion of opciones(); track opcion.valor) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="opcion.valor === valor()"
          [attr.tabindex]="opcion.valor === valor() ? 0 : -1"
          (click)="valor.set(opcion.valor)"
          (keydown)="alTeclear($event)"
          class="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          [class.bg-white]="opcion.valor === valor()"
          [class.text-primary-800]="opcion.valor === valor()"
          [class.shadow-warm-sm]="opcion.valor === valor()"
          [class.text-warm-600]="opcion.valor !== valor()"
        >
          {{ opcion.etiqueta }}
        </button>
      }
    </div>
  `,
})
export class SelectorModoComponent<T extends string = string> {
  readonly opciones = input.required<OpcionModo<T>[]>();
  readonly etiqueta = input<string>('Modo');
  readonly valor = model.required<T>();

  alTeclear(evento: KeyboardEvent): void {
    const paso = evento.key === 'ArrowRight' || evento.key === 'ArrowDown' ? 1 : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp' ? -1 : 0;
    if (paso === 0) {
      return;
    }
    evento.preventDefault();
    const lista = this.opciones();
    const actual = lista.findIndex((o) => o.valor === this.valor());
    const siguiente = (actual + paso + lista.length) % lista.length;
    this.valor.set(lista[siguiente].valor);
    const botones = (evento.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role="radio"]');
    botones?.[siguiente]?.focus();
  }
}
