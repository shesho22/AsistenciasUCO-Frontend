import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EmptyStateVariant = 'neutral' | 'search' | 'info' | 'error';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-warm-300 bg-white/60 min-h-[220px]"
      role="status"
    >
      <!-- Icon Container con Badge Esférico -->
      <div [class]="iconBgClasses()">
        <ng-content select="[empty-icon]">
          <svg class="w-7 h-7 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </ng-content>
      </div>

      <!-- Título con jerarquía tipográfica estricta -->
      <h3 class="font-serif font-bold text-lg text-warm-900 mt-4 tracking-tight">
        {{ title() }}
      </h3>

      <!-- Descripción explicativa con contraste WCAG AA -->
      @if (description()) {
        <p class="text-sm text-warm-600 max-w-md mt-1.5 leading-relaxed">
          {{ description() }}
        </p>
      }

      <!-- Causa probable del vacío (opcional) -->
      @if (causa()) {
        <p class="text-xs text-warm-500 max-w-md mt-1" data-testid="empty-causa">{{ causa() }}</p>
      }

      <!-- Slot para Botón de Llamada a la Acción (CTA) -->
      <div class="mt-5 flex items-center gap-3">
        @if (accionTexto()) {
          <button
            type="button"
            data-testid="empty-accion"
            class="min-h-[44px] rounded-xl border border-warm-200 bg-white px-4 py-2 text-sm font-semibold text-warm-800 hover:bg-warm-50"
            (click)="accion.emit()"
          >
            {{ accionTexto() }}
          </button>
        }
        <ng-content select="[empty-action]"></ng-content>
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  title = input<string>('No se encontraron registros');
  description = input<string>('');
  variant = input<EmptyStateVariant>('neutral');
  /** Por qué está vacío y qué sigue (opcional). */
  causa = input<string>('');
  /** Texto de la acción sugerida; sin texto no se pinta el botón. */
  accionTexto = input<string>('');
  accion = output<void>();

  readonly iconBgClasses = computed(() => {
    const base = 'w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs transition-colors shrink-0';
    switch (this.variant()) {
      case 'search':
        return `${base} bg-primary-50 text-primary-700`;
      case 'info':
        return `${base} bg-accent-100 text-accent-900`;
      case 'error':
        return `${base} bg-danger-50 text-danger-700`;
      default:
        return `${base} bg-warm-100 text-warm-600`;
    }
  });
}
