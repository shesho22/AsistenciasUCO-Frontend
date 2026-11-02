import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FranjaHorario } from '../../../core/models/course.model';
import { DIAS_SEMANA, franjaNueva } from '../../../core/validation/franjas.util';

/**
 * Editor del horario semanal de un grupo (F1/F3): una fila por franja (día, hora de inicio y de fin). Lo usan el formulario
 * del coordinador y el del docente; la validación vive en `validarFranjas` y las reglas de negocio las aplica la DB.
 */
@Component({
  selector: 'app-franjas-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-warm-800">Horario semanal</h3>
        <button type="button" data-testid="agregar-franja" (click)="agregar()" class="text-xs font-semibold text-primary-700 hover:underline">
          + Agregar franja
        </button>
      </div>
      <p class="text-[11px] text-warm-500">
        Un bloque por día y hora. Las franjas del grupo no pueden cruzarse entre sí y el docente no puede tener otro grupo a la misma hora.
      </p>
      @for (franja of franjas(); track $index; let i = $index) {
        <div class="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
          <select [name]="'dia' + i" [ngModel]="franja.dia" (ngModelChange)="cambiar(i, { dia: $event })" class="px-3 py-2 border border-warm-200 rounded-xl text-sm">
            @for (d of dias; track d.codigo) {
              <option [value]="d.codigo">{{ d.nombre }}</option>
            }
          </select>
          <input [name]="'inicio' + i" type="time" [ngModel]="franja.horaInicio" (ngModelChange)="cambiar(i, { horaInicio: $event })" class="px-3 py-2 border border-warm-200 rounded-xl text-sm" />
          <input [name]="'fin' + i" type="time" [ngModel]="franja.horaFin" (ngModelChange)="cambiar(i, { horaFin: $event })" class="px-3 py-2 border border-warm-200 rounded-xl text-sm" />
          <button type="button" (click)="quitar(i)" class="text-xs text-red-600 hover:underline" title="Quitar franja">Quitar</button>
        </div>
      }
    </div>
  `,
})
export class FranjasEditorComponent {
  readonly dias = DIAS_SEMANA;
  readonly franjas = model<FranjaHorario[]>([]);

  agregar(): void {
    this.franjas.update((actuales) => [...actuales, franjaNueva()]);
  }

  quitar(indice: number): void {
    this.franjas.update((actuales) => actuales.filter((_, i) => i !== indice));
  }

  cambiar(indice: number, cambio: Partial<FranjaHorario>): void {
    this.franjas.update((actuales) => actuales.map((f, i) => (i === indice ? { ...f, ...cambio } : f)));
  }
}
