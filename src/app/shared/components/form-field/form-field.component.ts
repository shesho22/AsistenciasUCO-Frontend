import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

let fieldIdCounter = 0;

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
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
  `,
})
export class FormFieldComponent {
  label = input<string>('');
  helperText = input<string>('');
  errorMessage = input<string>('');
  error = input<string>('');
  required = input<boolean>(false);
  fieldId = input<string>(`form-field-ctrl-${++fieldIdCounter}`);
}
