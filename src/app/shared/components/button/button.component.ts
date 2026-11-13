import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';


export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
    selector: 'app-button',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-disabled]="disabled() || loading() ? 'true' : null"
      [attr.aria-busy]="loading() ? 'true' : null"
      (click)="onClick($event)"
      [class]="buttonClasses()"
    >
      @if (loading()) {
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="sr-only">Cargando...</span>
      }
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  fullWidth = input<boolean>(false);

  clicked = output<MouseEvent>();

  buttonClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center font-medium transition-all duration-200 select-none active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100';

    const rounded = 'rounded-xl';

    const sizes = {
      sm: 'px-3 py-1.5 text-xs shadow-xs gap-1.5 min-h-[36px]',
      md: 'px-4 py-2.5 text-sm shadow-warm-sm gap-2 min-h-[44px]',
      lg: 'px-6 py-3 text-base shadow-warm-md gap-2.5 min-h-[48px]',
    }[this.size()];

    const width = this.fullWidth() ? 'w-full' : 'w-auto';

    const variants = {
      primary:
        'bg-primary-700 text-white hover:bg-primary-800 focus-visible:ring-primary-600 shadow-warm-sm hover:shadow-warm-md',
      secondary:
        'bg-warm-100 text-warm-800 hover:bg-warm-200 border border-warm-200 focus-visible:ring-warm-400',
      accent:
        'bg-accent-500 text-warm-950 hover:bg-accent-600 font-semibold focus-visible:ring-accent-400 shadow-warm-sm',
      danger:
        'bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500 shadow-warm-sm',
      ghost:
        'bg-transparent text-warm-700 hover:bg-warm-200/60 hover:text-warm-900 focus-visible:ring-warm-400 shadow-none',
    }[this.variant()];

    return `${base} ${rounded} ${sizes} ${width} ${variants}`;
  });

  onClick(event: MouseEvent) {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}
