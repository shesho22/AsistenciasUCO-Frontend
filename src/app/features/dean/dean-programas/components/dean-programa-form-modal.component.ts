import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import {
  CatalogoPrograma,
  CoordinadorOpcion,
  ProgramaAcademico,
  ProgramaPayload,
} from '../../../../core/models/programa-academico.model';

const NOMBRE_MAXIMO = 50;

/** Alta (programa = null) y edición de un programa académico (HU076, HU077). */
@Component({
  selector: 'app-dean-programa-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent, FormFieldComponent],
  template: `
    <app-modal [isOpen]="true" [title]="esEdicion() ? 'Editar programa académico' : 'Nuevo programa académico'" (closed)="cancelar()">
      <form class="space-y-4" (ngSubmit)="enviar()">
        <app-form-field label="Nombre del programa" [required]="true">
          <input
            name="nombre"
            type="text"
            maxlength="50"
            [ngModel]="nombre()"
            (ngModelChange)="nombre.set($event)"
            class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm"
          />
        </app-form-field>

        <app-form-field label="Tipo de programa" [required]="true">
          <select name="tipo" [ngModel]="idTipoPrograma()" (ngModelChange)="idTipoPrograma.set($event)" class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm">
            <option value="">-- Selecciona un tipo --</option>
            @for (t of tiposPrograma(); track t.id) {
              <option [value]="t.id">{{ t.nombre }}</option>
            }
          </select>
        </app-form-field>

        <app-form-field label="Coordinador" [required]="true">
          <select name="coordinador" [ngModel]="idCoordinador()" (ngModelChange)="idCoordinador.set($event)" class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm">
            <option value="">-- Selecciona un coordinador --</option>
            @for (c of opcionesCoordinador(); track c.id) {
              <option [value]="c.id">{{ c.nombre }}</option>
            }
          </select>
        </app-form-field>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <app-form-field label="Modalidad">
            <select name="modalidad" [ngModel]="idModalidad()" (ngModelChange)="idModalidad.set($event)" class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm">
              <option value="">Sin definir</option>
              @for (m of modalidades(); track m.id) {
                <option [value]="m.id">{{ m.nombre }}</option>
              }
            </select>
          </app-form-field>
          <app-form-field label="Jornada">
            <select name="jornada" [ngModel]="idJornada()" (ngModelChange)="idJornada.set($event)" class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm">
              <option value="">Sin definir</option>
              @for (j of jornadas(); track j.id) {
                <option [value]="j.id">{{ j.nombre }}</option>
              }
            </select>
          </app-form-field>
        </div>

        @if (error()) {
          <p class="text-xs font-semibold text-danger-600" role="alert">{{ error() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button type="button" (click)="cancelar()" class="px-3.5 py-2 rounded-xl bg-warm-50 hover:bg-warm-100 text-xs font-semibold text-warm-700 border border-warm-200">
            Cancelar
          </button>
          <button type="submit" [disabled]="!valido() || guardando()" class="px-3.5 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 disabled:opacity-40 text-xs font-bold text-white">
            {{ esEdicion() ? 'Guardar cambios' : 'Crear programa' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class DeanProgramaFormModalComponent implements OnInit {
  readonly programa = input<ProgramaAcademico | null>(null);
  readonly coordinadoresDisponibles = input<CoordinadorOpcion[]>([]);
  readonly tiposPrograma = input<CatalogoPrograma[]>([]);
  readonly modalidades = input<CatalogoPrograma[]>([]);
  readonly jornadas = input<CatalogoPrograma[]>([]);
  readonly error = input<string>('');
  readonly guardando = input<boolean>(false);

  readonly guardar = output<ProgramaPayload>();
  readonly cerrar = output<void>();

  readonly nombre = signal('');
  readonly idTipoPrograma = signal('');
  readonly idCoordinador = signal('');
  readonly idModalidad = signal('');
  readonly idJornada = signal('');

  readonly esEdicion = computed(() => this.programa() !== null);

  /** En edición el coordinador actual sigue siendo elegible aunque ya no figure como disponible. */
  readonly opcionesCoordinador = computed<CoordinadorOpcion[]>(() => {
    const disponibles = this.coordinadoresDisponibles();
    const actual = this.programa();
    if (!actual || disponibles.some((c) => c.id === actual.idCoordinador)) {
      return disponibles;
    }
    return [...disponibles, { id: actual.idCoordinador, nombre: actual.nombreCoordinador ?? actual.idCoordinador }];
  });

  readonly valido = computed(() => {
    const nombre = this.nombre().trim();
    return nombre.length > 0 && nombre.length <= NOMBRE_MAXIMO && !!this.idTipoPrograma() && !!this.idCoordinador();
  });

  ngOnInit(): void {
    const p = this.programa();
    if (p) {
      this.nombre.set(p.nombre);
      this.idTipoPrograma.set(p.idTipoPrograma);
      this.idCoordinador.set(p.idCoordinador);
      this.idModalidad.set(p.idModalidad ?? '');
      this.idJornada.set(p.idJornada ?? '');
    }
  }

  enviar(): void {
    if (!this.valido()) {
      return;
    }
    this.guardar.emit({
      nombre: this.nombre().trim(),
      idTipoPrograma: this.idTipoPrograma(),
      idCoordinador: this.idCoordinador(),
      idModalidad: this.idModalidad() || null,
      idJornada: this.idJornada() || null,
    });
  }

  cancelar(): void {
    this.cerrar.emit();
  }
}
