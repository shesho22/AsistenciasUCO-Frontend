import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';


@Component({
    selector: 'app-avatar',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div
      [class]="containerClasses()"
      [style.backgroundColor]="bgColor()"
      [title]="name()"
      [attr.aria-label]="name()"
    >
      <span class="font-serif font-bold uppercase select-none text-white tracking-normal leading-none drop-shadow-xs">
        {{ letter() }}
      </span>
    </div>
  `
})
export class AvatarComponent {
  readonly name = input<string>('Usuario UCO');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');

  /**
   * Obtiene la letra inicial representativa del nombre del usuario,
   * omitiendo títulos académicos (Dr., Ing., Prof., etc.).
   */
  readonly letter = computed(() => {
    const raw = this.name();
    if (!raw) return 'U';
    const clean = raw.replace(/^(Dr\.|Dra\.|Ing\.|Prof\.|Lic\.|Sr\.|Sra\.)\s+/i, '').trim();
    return clean ? clean.charAt(0).toUpperCase() : 'U';
  });

  /**
   * Genera un color armónico y consistente para el usuario dentro de la paleta institucional.
   */
  readonly bgColor = computed(() => {
    const colors = Array.from({ length: 8 }, (_, i) => `var(--color-avatar-${i + 1})`);
    let hash = 0;
    const raw = this.name();
    const clean = (raw || '').replace(/^(Dr\.|Dra\.|Ing\.|Prof\.|Lic\.|Sr\.|Sra\.)\s+/i, '').trim();
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  });

  readonly containerClasses = computed(() => {
    const base = 'flex items-center justify-center shrink-0 shadow-xs border border-white/25 ring-1 ring-black/5 transition-transform duration-150';
    switch (this.size()) {
      case 'xs':
        return `${base} w-6 h-6 text-xs rounded-lg`;
      case 'sm':
        return `${base} w-8 h-8 text-xs rounded-xl`;
      case 'lg':
        return `${base} w-12 h-12 text-base rounded-2xl`;
      case 'xl':
        return `${base} w-14 h-14 text-xl rounded-2xl`;
      default:
        return `${base} w-10 h-10 text-sm rounded-xl`;
    }
  });
}
