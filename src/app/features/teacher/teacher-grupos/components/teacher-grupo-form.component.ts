import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GrupoCoordinadorPayload } from '../../../../core/services/course.service';
import { FranjaHorario } from '../../../../core/models/course.model';
import { OfertaCreacionGruposDocenteApiDto } from '../../../../core/api/models/oferta-creacion-grupos-docente-api-dto.model';
import { franjaNueva, validarFranjas } from '../../../../core/validation/franjas.util';
import { FranjasEditorComponent } from '../../../../shared/components/franjas-editor/franjas-editor.component';

/**
 * F3: formulario "Nuevo grupo" del docente. El grupo queda a su propio nombre (el idDocente viene de la oferta que entrega
 * el backend), con las asignaturas de sus programas y su horario inicial. El período no se elige: la DB toma el más
 * reciente. Los cambios posteriores del horario los hace el coordinador; el docente los solicita (F6).
 */
@Component({
  selector: 'app-teacher-grupo-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FranjasEditorComponent],
  template: `
    <form class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-5 max-w-3xl" (ngSubmit)="enviar()">
      <div>
        <h2 class="font-serif font-bold text-xl text-warm-900">Nuevo grupo</h2>
        <p class="text-xs text-warm-500 mt-1">
          El grupo queda a tu nombre en el período académico más reciente. Después, los cambios de horario los aprueba el coordinador.
        </p>
      </div>

      @if (cargando()) {
        <p class="text-sm text-warm-500" data-testid="cargando-oferta">Cargando tus asignaturas...</p>
      } @else if (asignaturas().length === 0) {
        <p class="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3" data-testid="sin-oferta">
          No tienes asignaturas disponibles: pide al coordinador que te vincule a un programa académico.
        </p>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="text-xs font-semibold text-warm-700 sm:col-span-2">Asignatura
            <select name="idAsignatura" [(ngModel)]="idAsignatura" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm">
              <option value="">Seleccione...</option>
              @for (a of asignaturas(); track a.idAsignatura) {
                <option [value]="a.idAsignatura">{{ a.codigoAsignatura }} - {{ a.nombreAsignatura }} ({{ a.nombrePrograma }})</option>
              }
            </select>
          </label>
          <label class="text-xs font-semibold text-warm-700">Código del grupo
            <input name="codigo" type="number" min="1" [(ngModel)]="codigo" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm" />
          </label>
          <label class="text-xs font-semibold text-warm-700">Nombre del grupo
            <input name="nombre" type="text" maxlength="50" [(ngModel)]="nombre" class="mt-1 w-full px-3 py-2 border border-warm-200 rounded-xl text-sm" />
          </label>
        </div>

        <app-franjas-editor [(franjas)]="franjas" />
      }

      @if (error()) {
        <p class="text-xs text-red-700" role="alert" data-testid="error-grupo">{{ error() }}</p>
      }

      <div class="flex justify-end gap-2 pt-2 border-t border-warm-100">
        <button type="button" (click)="cancelar.emit()" class="px-4 py-2 rounded-xl bg-warm-50 border border-warm-200 text-sm font-semibold text-warm-700">
          Cancelar
        </button>
        <button type="submit" [disabled]="guardando() || cargando() || asignaturas().length === 0"
          class="px-4 py-2 rounded-xl bg-primary-700 text-sm font-semibold text-white disabled:opacity-60">
          {{ guardando() ? 'Guardando...' : 'Crear grupo' }}
        </button>
      </div>
    </form>
  `,
})
export class TeacherGrupoFormComponent {
  readonly oferta = input<OfertaCreacionGruposDocenteApiDto | null>(null);
  readonly cargando = input<boolean>(false);
  readonly guardando = input<boolean>(false);

  readonly guardar = output<GrupoCoordinadorPayload>();
  readonly cancelar = output<void>();

  readonly asignaturas = computed(() => this.oferta()?.asignaturas ?? []);
  readonly error = signal<string | null>(null);

  idAsignatura = '';
  codigo: number | null = null;
  nombre = '';
  franjas: FranjaHorario[] = [franjaNueva()];

  /** Validaciones de formato; el vínculo con el programa, el cruce de horario y el resto de reglas los confirma la DB. */
  validar(): string | null {
    if (!this.oferta()?.idDocente) {
      return 'No fue posible identificar al docente.';
    }
    if (!this.idAsignatura) {
      return 'Seleccione la asignatura.';
    }
    if (!this.codigo || Number(this.codigo) < 1 || !this.nombre.trim()) {
      return 'El código y el nombre del grupo son obligatorios.';
    }
    return validarFranjas(this.franjas);
  }

  enviar(): void {
    const error = this.validar();
    this.error.set(error);
    if (error) {
      return;
    }
    this.guardar.emit({
      idAsignatura: this.idAsignatura,
      codigo: Number(this.codigo),
      nombre: this.nombre.trim(),
      idDocente: this.oferta()!.idDocente,
      franjas: this.franjas,
    });
  }
}
