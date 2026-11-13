import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
    selector: 'app-card',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex flex-col h-full w-full',
    },
    template: `
    <div [class]="cardClasses()">
      @if (title() || subtitle() || hasHeaderSlot()) {
        <div class="flex items-center justify-between pb-4 mb-4 border-b border-warm-200/80 shrink-0">
          <div>
            @if (title()) {
              <h3 class="font-serif font-semibold text-lg text-warm-900 tracking-tight">{{ title() }}</h3>
            }
            @if (subtitle()) {
              <p class="text-xs text-warm-500 mt-0.5">{{ subtitle() }}</p>
            }
          </div>
          <ng-content select="[card-header-actions]"></ng-content>
        </div>
      }

      <div class="w-full flex-1 flex flex-col">
        <ng-content></ng-content>
      </div>

      <div class="shrink-0 mt-auto w-full">
        <ng-content select="[card-footer]"></ng-content>
      </div>
    </div>
  `
})
export class CardComponent {
  title = input<string>('');
  subtitle = input<string>('');
  padding = input<CardPadding>('md');
  hoverable = input<boolean>(false);
  glass = input<boolean>(false);
  hasHeaderSlot = input<boolean>(false);

  cardClasses = computed(() => {
    const base = 'bg-white rounded-2xl border border-warm-200/80 shadow-warm-sm transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full w-full';
    const glassEffect = this.glass() ? 'bg-white/95 backdrop-blur-md border-warm-200/90 shadow-warm-lg' : '';
    const hoverEffect = this.hoverable() ? 'hover:shadow-warm-md hover:-translate-y-0.5 hover:border-warm-300' : '';

    const paddings = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-6 sm:p-8',
    }[this.padding()];

    return `${base} ${glassEffect} ${hoverEffect} ${paddings}`;
  });
}
