import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

/**
 * Fondos del avatar (tokens `--color-avatar-N` de `@theme`). Van escritos completos a propósito: Tailwind solo publica
 * un color del tema si encuentra su clase literal en el código. Armadas en tiempo de ejecución (o usadas como
 * `var(--color-avatar-N)` en un estilo en línea) las variables no llegan al CSS y el avatar queda sin fondo.
 */
export const AVATAR_FONDOS: readonly string[] = [
  'bg-avatar-1',
  'bg-avatar-2',
  'bg-avatar-3',
  'bg-avatar-4',
  'bg-avatar-5',
  'bg-avatar-6',
  'bg-avatar-7',
  'bg-avatar-8',
];

const TITULO_ACADEMICO = /^(Dr\.|Dra\.|Ing\.|Prof\.|Lic\.|Sr\.|Sra\.)\s+/i;

@Component({
    selector: 'app-avatar',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div
      [class]="containerClasses()"
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

  /** Nombre sin títulos académicos (Dr., Ing., Prof., etc.): de él salen la inicial y el color. */
  private readonly nombreLimpio = computed(() => (this.name() || '').replace(TITULO_ACADEMICO, '').trim());

  /** Letra inicial representativa del nombre del usuario. */
  readonly letter = computed(() => {
    const clean = this.nombreLimpio();
    return clean ? clean.charAt(0).toUpperCase() : 'U';
  });

  /** Color armónico y estable para el usuario dentro de la paleta institucional. */
  readonly bgClass = computed(() => {
    const clean = this.nombreLimpio();
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_FONDOS[Math.abs(hash) % AVATAR_FONDOS.length];
  });

  readonly containerClasses = computed(() => {
    const base = `flex items-center justify-center shrink-0 shadow-xs border border-white/25 ring-1 ring-black/5 transition-transform duration-150 ${this.bgClass()}`;
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
