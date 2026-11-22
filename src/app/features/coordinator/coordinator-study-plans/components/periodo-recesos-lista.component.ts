import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { RecesoAcademico } from '../../../../core/models/receso-academico.model';
import { estadoReceso, fechaCorta } from './periodo-recesos-editor.component';

/**
 * DEC-081: lista compacta, de solo consulta, de los días de receso de un período (decano y coordinador). La lista llega
 * ordenada y con el estado resuelto por el backend.
 */
@Component({
  selector: 'app-periodo-recesos-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="superficie space-y-2 p-4" [attr.aria-label]="'Días de receso del período ' + nombrePeriodo()" data-testid="recesos-periodo">
      <h3 class="text-sm font-bold text-warm-900">Días de receso académico · {{ nombrePeriodo() }}</h3>
      @if (cargando()) {
        <p class="text-xs text-warm-600" role="status">Cargando los días de receso...</p>
      } @else if (error()) {
        <p class="text-xs font-semibold text-danger-700" role="alert" data-testid="recesos-error">{{ error() }}</p>
      } @else if (recesos().length === 0) {
        <p class="text-xs text-warm-600" data-testid="recesos-vacio">Este período no tiene días de receso.</p>
      } @else {
        <ul class="divide-y divide-warm-100 text-xs" data-testid="recesos-lista">
          @for (r of recesos(); track r.id) {
            <li class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5" data-testid="receso-item">
              <span class="font-semibold tabular-nums text-warm-900">{{ fecha(r.fecha) }}</span>
              <span class="min-w-0 break-words text-warm-700">{{ r.motivo }}</span>
              <span class="text-warm-500">{{ estado(r) }}</span>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class PeriodoRecesosListaComponent {
  private readonly servicio = inject(CoordinatorManagementService);

  readonly idPeriodo = input.required<string>();
  readonly nombrePeriodo = input('');

  protected readonly recesos = signal<RecesoAcademico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly fecha = fechaCorta;
  protected readonly estado = estadoReceso;

  constructor() {
    effect((onCleanup) => {
      const id = this.idPeriodo();
      untracked(() => {
        this.cargando.set(true);
        this.error.set('');
        const suscripcion = this.servicio.getRecesosPeriodo(id, true).subscribe({
          next: (res) => {
            this.recesos.set(res.datos ?? []);
            this.cargando.set(false);
          },
          error: (err) => {
            this.recesos.set([]);
            this.error.set(getApiErrorMessage(err));
            this.cargando.set(false);
          },
        });
        onCleanup(() => suscripcion.unsubscribe());
      });
    });
  }
}
