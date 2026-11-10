import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeriodoAcademicoItem } from '../../../../core/models/role-management.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';

export const PERIODO_NOMBRE_MINIMO = 3;
export const PERIODO_NOMBRE_MAXIMO = 50;

export interface PeriodoFormDatos {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

/** Diálogo de alta y edición del período académico; permanece abierto hasta que el padre confirma la respuesta. */
@Component({
  selector: 'app-academic-period-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal [isOpen]="true" [title]="esEdicion() ? 'Modificar período académico' : 'Nuevo período académico'" (closed)="cancelar()">
      <form class="space-y-4" (ngSubmit)="enviar()" novalidate>
        <app-form-field label="Nombre del período" [required]="true" [errorMessage]="errorNombre()">
          <input
            name="nombre"
            type="text"
            maxlength="50"
            placeholder="2027-1"
            autocomplete="off"
            [ngModel]="nombre()"
            (ngModelChange)="nombre.set($event)"
            class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
          />
        </app-form-field>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <app-form-field label="Fecha de inicio" [required]="true">
            <input
              name="fechaInicio"
              type="date"
              [ngModel]="fechaInicio()"
              (ngModelChange)="fechaInicio.set($event)"
              class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
            />
          </app-form-field>
          <app-form-field label="Fecha de fin" [required]="true" [errorMessage]="errorFechas()">
            <input
              name="fechaFin"
              type="date"
              [ngModel]="fechaFin()"
              (ngModelChange)="fechaFin.set($event)"
              class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
            />
          </app-form-field>
        </div>

        <p class="text-xs text-warm-500">
          El estado (planeación, activo o cerrado) se calcula con las fechas del período.
        </p>

        @if (error()) {
          <p class="text-xs font-semibold text-danger-600" role="alert">{{ error() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button type="button" (click)="cancelar()" class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200">
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="!valido() || guardando()"
            class="px-3.5 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 disabled:opacity-40 text-xs font-bold text-white"
          >
            {{ guardando() ? 'Guardando...' : esEdicion() ? 'Guardar cambios' : 'Crear período' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class AcademicPeriodFormModalComponent implements OnInit {
  readonly periodo = input<PeriodoAcademicoItem | null>(null);
  readonly error = input<string>('');
  readonly guardando = input<boolean>(false);

  readonly guardar = output<PeriodoFormDatos>();
  readonly cerrar = output<void>();

  readonly nombre = signal('');
  readonly fechaInicio = signal('');
  readonly fechaFin = signal('');

  readonly esEdicion = computed(() => this.periodo() !== null);

  readonly errorNombre = computed(() => {
    const largo = this.nombre().trim().length;
    if (largo === 0) return '';
    if (largo < PERIODO_NOMBRE_MINIMO) return `El nombre debe tener al menos ${PERIODO_NOMBRE_MINIMO} caracteres.`;
    return largo > PERIODO_NOMBRE_MAXIMO ? `El nombre no puede superar ${PERIODO_NOMBRE_MAXIMO} caracteres.` : '';
  });

  readonly errorFechas = computed(() => {
    const inicio = this.fechaInicio();
    const fin = this.fechaFin();
    return inicio && fin && inicio >= fin ? 'La fecha de fin debe ser posterior a la de inicio.' : '';
  });

  readonly valido = computed(
    () =>
      this.nombre().trim().length > 0 &&
      !this.errorNombre() &&
      !!this.fechaInicio() &&
      !!this.fechaFin() &&
      !this.errorFechas(),
  );

  ngOnInit(): void {
    const actual = this.periodo();
    if (actual) {
      this.nombre.set(actual.nombre || actual.codigo);
      this.fechaInicio.set(actual.fechaInicio);
      this.fechaFin.set(actual.fechaFin);
    }
  }

  enviar(): void {
    if (!this.valido() || this.guardando()) return;
    this.guardar.emit({
      nombre: this.nombre().trim(),
      fechaInicio: this.fechaInicio(),
      fechaFin: this.fechaFin(),
    });
  }

  cancelar(): void {
    if (!this.guardando()) this.cerrar.emit();
  }
}
