import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';


export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
    selector: 'app-form-select',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="relative w-full">
      <select
        [value]="value()"
        [disabled]="disabled()"
        (change)="onSelectChange($event)"
        class="w-full appearance-none bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2.5 pr-10 text-xs sm:text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 transition-all duration-150 shadow-warm-sm disabled:bg-warm-100 disabled:text-warm-400 disabled:cursor-not-allowed cursor-pointer hover:border-warm-400"
      >
        @if (placeholder()) {
          <option value="" disabled [selected]="!value()">{{ placeholder() }}</option>
        }
        @for (opt of options(); track opt.value) {
          <option [value]="opt.value" [selected]="opt.value === value()" [disabled]="opt.disabled">{{ opt.label }}</option>
        }
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-warm-500">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  `
})
export class FormSelectComponent {
  options = input<SelectOption[]>([]);
  value = input<string>('');
  placeholder = input<string>('Seleccione una opción...');
  disabled = input<boolean>(false);

  valueChange = output<string>();

  onSelectChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.valueChange.emit(val);
  }
}
