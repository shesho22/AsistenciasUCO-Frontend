import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';


export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
    selector: 'app-badge',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <span [class]="badgeClasses()">
      @if (dot()) {
        <span [class]="dotClasses()"></span>
      }
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  variant = input<BadgeVariant>('neutral');
  dot = input<boolean>(true);
  size = input<'sm' | 'md'>('md');

  badgeClasses = computed(() => {
    const base = 'inline-flex items-center font-medium rounded-full tracking-wide transition-colors';
    
    const sizes = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-1 text-xs gap-1.5',
    }[this.size()];

    const variants = {
      success: 'bg-success-50 text-success-800 border border-success-200/60',
      warning: 'bg-warning-50 text-warning-800 border border-warning-200/60',
      danger: 'bg-danger-50 text-danger-800 border border-danger-200/60',
      info: 'bg-info-50 text-info-800 border border-info-200/60',
      neutral: 'bg-warm-100 text-warm-700 border border-warm-200/80',
    }[this.variant()];

    return `${base} ${sizes} ${variants}`;
  });

  dotClasses = computed(() => {
    const base = 'w-1.5 h-1.5 rounded-full';
    const dots = {
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      info: 'bg-info-500',
      neutral: 'bg-warm-400',
    }[this.variant()];

    return `${base} ${dots}`;
  });
}
