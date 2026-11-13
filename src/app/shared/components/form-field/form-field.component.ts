import { Component, ChangeDetectionStrategy, ElementRef, afterEveryRender, inject, input } from '@angular/core';


let fieldIdCounter = 0;

@Component({
    selector: 'app-form-field',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="flex flex-col gap-1.5 w-full">
      @if (label()) {
        <label
          [for]="fieldId()"
          class="text-xs font-bold uppercase tracking-wider text-warm-700 select-none flex items-center justify-between"
        >
          <span>
            {{ label() }}
            @if (required()) {
              <span class="text-danger-500 font-bold ml-0.5" title="Campo requerido">*</span>
            }
          </span>
          <ng-content select="[label-extra]"></ng-content>
        </label>
      }

      <div class="relative flex items-center w-full">
        <ng-content></ng-content>
      </div>

      @if (errorMessage() || error()) {
        <p [id]="fieldId() + '-error'" class="text-xs font-semibold text-danger-600 flex items-center gap-1.5 mt-0.5 animate-fade-in" role="alert">
          <svg class="w-3.5 h-3.5 shrink-0 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage() || error() }}</span>
        </p>
      } @else if (helperText()) {
        <p [id]="fieldId() + '-helper'" class="text-xs text-warm-500 mt-0.5">
          {{ helperText() }}
        </p>
      }
    </div>
  `
})
export class FormFieldComponent {
  label = input<string>('');
  helperText = input<string>('');
  errorMessage = input<string>('');
  error = input<string>('');
  required = input<boolean>(false);
  fieldId = input<string>(`form-field-ctrl-${++fieldIdCounter}`);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Asocia la etiqueta y el error al control proyectado (F-COO-010, F-ADM-S23): sin esto el label no nombra al input.
    afterEveryRender(() => this.vincularControl());
  }

  private vincularControl(): void {
    const raiz = this.host.nativeElement;
    const control = raiz.querySelector<HTMLElement>('input, select, textarea');
    if (!control) return;
    if (!control.id) {
      control.id = this.fieldId();
    }
    const etiqueta = raiz.querySelector<HTMLLabelElement>('label');
    if (etiqueta && etiqueta.htmlFor !== control.id) {
      etiqueta.htmlFor = control.id;
    }
    const mensaje = this.errorMessage() || this.error();
    const idError = `${this.fieldId()}-error`;
    if (mensaje) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', idError);
    } else {
      control.removeAttribute('aria-invalid');
      if (control.getAttribute('aria-describedby') === idError) {
        control.removeAttribute('aria-describedby');
      }
    }
  }
}
