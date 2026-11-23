import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeriodoAcademicoItem } from '../../../../core/models/role-management.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { getSafeTextError } from '../../../../core/validation/form-fields.util';
import { RecesoPendiente } from '../../../../core/models/receso-academico.model';
import { PeriodoRecesosEditorComponent } from './periodo-recesos-editor.component';

export const PERIODO_NOMBRE_MINIMO = 3;
export const PERIODO_NOMBRE_MAXIMO = 50;
/** El semestre dura siempre 16 semanas = 112 días corridos (PERIODO/SEMANAS_DURACION); la DB es quien lo impone (PER_011). */
export const PERIODO_SEMANAS = 16;

/** Suma días a una fecha `yyyy-MM-dd` sin depender de la zona horaria del navegador. */
export function sumarDias(fechaIso: string, dias: number): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  if (!anio || !mes || !dia) return '';
  const fecha = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return fecha.toISOString().slice(0, 10);
}

/** Fecha de fin de un semestre que empieza en `inicio`: inicio + 16 semanas - 1 día. */
export function fechaFinDelSemestre(inicio: string): string {
  return inicio ? sumarDias(inicio, PERIODO_SEMANAS * 7 - 1) : '';
}

export interface PeriodoFormDatos {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

/** Diálogo de alta y edición del período académico; permanece abierto hasta que el padre confirma la respuesta. */
@Component({
  selector: 'app-academic-period-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent, FormFieldComponent, PeriodoRecesosEditorComponent],
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
          <app-form-field label="Fecha de fin (se calcula sola)">
            <input
              name="fechaFin"
              type="date"
              data-testid="fecha-fin-periodo"
              [ngModel]="fechaFinEfectiva()"
              readonly
              tabindex="-1"
              class="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-700"
            />
          </app-form-field>
        </div>

        <p class="text-xs text-warm-500" data-testid="ayuda-duracion-periodo">
          El semestre dura siempre {{ semanas }} semanas ({{ semanas * 7 }} días): elige solo la fecha de inicio y la de fin se calcula sola.
          El estado (planeación, activo o cerrado) se calcula con las fechas del período.
        </p>
        @if (periodoHistorico()) {
          <p class="text-xs text-warm-600 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2" data-testid="aviso-periodo-historico">
            Este período dura {{ duracionActualDias() }} días porque se creó antes de la regla de {{ semanas }} semanas. Se conserva tal cual
            mientras no cambies la fecha de inicio; si la cambias, pasará a durar {{ semanas }} semanas.
          </p>
        }

        <app-periodo-recesos-editor
          [idPeriodo]="periodo()?.id ?? null"
          [fechaInicio]="fechaInicio()"
          [fechaFin]="fechaFinEfectiva()"
          [pendientes]="recesosPendientes()"
          (pendientesChange)="alCambiarRecesos($event)"
        />

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
  /** DEC-081: días de receso agregados al formulario de un período nuevo; el padre los registra tras crear el período. */
  readonly recesosChange = output<RecesoPendiente[]>();

  protected readonly recesosPendientes = signal<RecesoPendiente[]>([]);

  readonly nombre = signal('');
  readonly fechaInicio = signal('');
  /** Fecha de fin guardada del período que se edita (vacía al crear). */
  readonly fechaFin = signal('');
  readonly semanas = PERIODO_SEMANAS;

  readonly esEdicion = computed(() => this.periodo() !== null);

  /**
   * Fecha de fin que se muestra y se envía: la calculada (inicio + 16 semanas - 1 día). Si se edita un período histórico que no cumple la
   * regla y NO se cambia su fecha de inicio, se conserva su fin guardado (la DB solo valida la duración cuando cambian las fechas).
   */
  readonly fechaFinEfectiva = computed(() => {
    const actual = this.periodo();
    if (actual && actual.fechaInicio === this.fechaInicio() && this.fechaFin()) return this.fechaFin();
    return fechaFinDelSemestre(this.fechaInicio());
  });

  readonly duracionActualDias = computed(() => {
    const inicio = this.fechaInicio();
    const fin = this.fechaFin();
    if (!inicio || !fin) return 0;
    return Math.round((Date.parse(fin) - Date.parse(inicio)) / 86_400_000) + 1;
  });

  /** Período existente cuya duración no es la del semestre vigente y cuya fecha de inicio no se ha cambiado. */
  readonly periodoHistorico = computed(() => {
    const actual = this.periodo();
    return !!actual && actual.fechaInicio === this.fechaInicio() && this.duracionActualDias() > 0 && this.duracionActualDias() !== PERIODO_SEMANAS * 7;
  });

  readonly errorNombre = computed(() => {
    const largo = this.nombre().trim().length;
    if (largo === 0) return '';
    if (largo < PERIODO_NOMBRE_MINIMO) return `El nombre debe tener al menos ${PERIODO_NOMBRE_MINIMO} caracteres.`;
    if (largo > PERIODO_NOMBRE_MAXIMO) return `El nombre no puede superar ${PERIODO_NOMBRE_MAXIMO} caracteres.`;
    // DEC-073: texto seguro (sin < > ni comillas).
    return getSafeTextError(this.nombre(), 'Nombre del período', { maxLength: PERIODO_NOMBRE_MAXIMO }) ?? '';
  });

  readonly valido = computed(() => this.nombre().trim().length > 0 && !this.errorNombre() && !!this.fechaInicio() && !!this.fechaFinEfectiva());

  ngOnInit(): void {
    const actual = this.periodo();
    if (actual) {
      this.nombre.set(actual.nombreOriginal || actual.nombre || actual.codigo);
      this.fechaInicio.set(actual.fechaInicio);
      this.fechaFin.set(actual.fechaFin);
    }
  }

  enviar(): void {
    if (!this.valido() || this.guardando()) return;
    this.guardar.emit({
      nombre: this.nombre().trim(),
      fechaInicio: this.fechaInicio(),
      fechaFin: this.fechaFinEfectiva(),
    });
  }

  protected alCambiarRecesos(recesos: RecesoPendiente[]): void {
    this.recesosPendientes.set(recesos);
    this.recesosChange.emit(recesos);
  }

  cancelar(): void {
    if (!this.guardando()) this.cerrar.emit();
  }
}
