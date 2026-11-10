import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NivelAsistencia, nivelAsistencia } from '../../../core/utils/nivel-asistencia';

interface Presentacion {
  texto: string;
  descripcion: string;
  clases: string;
}

const PRESENTACION: Record<NivelAsistencia, Presentacion> = {
  verde: { texto: 'Normal', descripcion: 'nivel normal', clases: 'bg-success-50 text-success-700 border-success-200' },
  ambar: { texto: 'Advertencia', descripcion: 'advertencia', clases: 'bg-warning-50 text-warning-700 border-warning-200' },
  rojo: { texto: 'Pérdida', descripcion: 'pérdida de la asignatura', clases: 'bg-danger-50 text-danger-700 border-danger-200' },
};

/** Semaforo unico de inasistencia: color + icono + texto + aria-label (no depende solo del color). */
@Component({
  selector: 'app-semaforo-asistencia',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vista(); as v) {
      <span
        data-testid="semaforo-nivel"
        class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
        [class]="v.clases"
        [attr.data-nivel]="v.nivel"
        [attr.aria-label]="v.aria"
        role="img"
      >
        @switch (v.nivel) {
          @case ('verde') {
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clip-rule="evenodd" /></svg>
          }
          @case ('ambar') {
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M8.3 3.2a2 2 0 013.4 0l6 10.5A2 2 0 0116 16.7H4a2 2 0 01-1.7-3zM10 7a1 1 0 00-1 1v3a1 1 0 002 0V8a1 1 0 00-1-1zm0 7.2a1.1 1.1 0 100-2.2 1.1 1.1 0 000 2.2z" clip-rule="evenodd" /></svg>
          }
          @default {
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7.7 6.3a1 1 0 00-1.4 1.4L8.6 10l-2.3 2.3a1 1 0 101.4 1.4l2.3-2.3 2.3 2.3a1 1 0 001.4-1.4L11.4 10l2.3-2.3a1 1 0 00-1.4-1.4L10 8.6z" clip-rule="evenodd" /></svg>
          }
        }
        @if (!compacto()) {
          <span data-testid="semaforo-texto">{{ v.texto }}</span>
        }
      </span>
    }
  `,
})
export class SemaforoAsistenciaComponent {
  /** % de inasistencia por horas. */
  readonly porcentaje = input<number | null | undefined>(null);
  readonly umbralAdvertencia = input<number | null | undefined>(null);
  readonly umbralPerdida = input<number | null | undefined>(null);
  readonly compacto = input<boolean>(false);

  protected readonly vista = computed(() => {
    const p = this.porcentaje();
    const nivel = nivelAsistencia(p, this.umbralAdvertencia(), this.umbralPerdida());
    if (nivel === null) return null;
    const pres = PRESENTACION[nivel];
    return { nivel, ...pres, aria: `Inasistencia ${p} %: ${pres.descripcion}` };
  });
}
