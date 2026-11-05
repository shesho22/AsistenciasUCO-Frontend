import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { CorreccionDocumentoComponent } from '../correccion-documento/correccion-documento.component';
import {
  CorregirIdentidadPayload,
  EstadoCorreccionDocumento,
  IdentidadActual,
} from '../../../core/models/correccion-identidad.model';

const MAX_NOMBRE = 50;
const CLASE_CONTROL =
  'w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500';

/**
 * HU159: corrección de identidad de un estudiante (coordinador de su programa) o de un decano (administrador): nombres,
 * apellidos, documento (si está habilitado) y motivo obligatorio. No toca correo, contraseña ni estado. El backend
 * valida la jerarquía, la unicidad del documento y deja la auditoría.
 */
@Component({
  selector: 'app-correccion-identidad-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent, CorreccionDocumentoComponent],
  template: `
    <app-modal [isOpen]="true" [title]="titulo()" (closed)="cancelar.emit()">
      <div class="space-y-4">
        <p class="text-xs text-warm-600">
          Corrige errores de digitación. El correo, la contraseña y el estado no se modifican aquí.
        </p>
        @if (error()) {
          <p role="alert" class="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{{ error() }}</p>
        }
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block text-xs font-semibold text-warm-700">Primer nombre *
            <input type="text" name="primerNombre" maxlength="50" [ngModel]="primerNombre()" (ngModelChange)="primerNombre.set($event)" [class]="claseControl" />
          </label>
          <label class="block text-xs font-semibold text-warm-700">Segundo nombre
            <input type="text" name="segundoNombre" maxlength="50" [ngModel]="segundoNombre()" (ngModelChange)="segundoNombre.set($event)" [class]="claseControl" />
          </label>
          <label class="block text-xs font-semibold text-warm-700">Primer apellido *
            <input type="text" name="primerApellido" maxlength="50" [ngModel]="primerApellido()" (ngModelChange)="primerApellido.set($event)" [class]="claseControl" />
          </label>
          <label class="block text-xs font-semibold text-warm-700">Segundo apellido
            <input type="text" name="segundoApellido" maxlength="50" [ngModel]="segundoApellido()" (ngModelChange)="segundoApellido.set($event)" [class]="claseControl" />
          </label>
        </div>
        <app-correccion-documento
          [numeroActual]="actual().numeroIdentificacion"
          [codigoTipoActual]="actual().codigoTipoIdentificacion"
          [idTipoActual]="actual().idTipoIdentificacion ?? null"
          [motivoSiempre]="true"
          (estadoCambio)="documento.set($event)"
        />
      </div>
      <div modal-footer class="flex items-center gap-3">
        <button type="button" data-accion="cancelar" (click)="cancelar.emit()"
          class="text-xs px-3 py-2 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-100 transition-colors">Cancelar</button>
        <button type="button" data-accion="guardar" [disabled]="!esValido() || guardando()" (click)="onGuardar()"
          class="text-xs px-3 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Guardar corrección
        </button>
      </div>
    </app-modal>
  `,
})
export class CorreccionIdentidadModalComponent implements OnInit {
  readonly titulo = input('Corregir datos de identidad');
  readonly actual = input.required<IdentidadActual>();
  readonly guardando = input(false);
  readonly error = input<string | null>(null);
  readonly guardar = output<CorregirIdentidadPayload>();
  readonly cancelar = output<void>();

  readonly claseControl = CLASE_CONTROL;
  readonly primerNombre = signal('');
  readonly segundoNombre = signal('');
  readonly primerApellido = signal('');
  readonly segundoApellido = signal('');
  readonly documento = signal<EstadoCorreccionDocumento>({ valido: false, documento: null, motivo: '' });

  readonly esValido = computed(
    () =>
      this.primerNombre().trim().length > 0 &&
      this.primerNombre().trim().length <= MAX_NOMBRE &&
      this.primerApellido().trim().length > 0 &&
      this.primerApellido().trim().length <= MAX_NOMBRE &&
      this.documento().valido,
  );

  ngOnInit(): void {
    const a = this.actual();
    this.primerNombre.set(a.primerNombre ?? '');
    this.segundoNombre.set(a.segundoNombre ?? '');
    this.primerApellido.set(a.primerApellido ?? '');
    this.segundoApellido.set(a.segundoApellido ?? '');
  }

  onGuardar(): void {
    if (!this.esValido()) {
      return;
    }
    const estado = this.documento();
    this.guardar.emit({
      primerNombre: this.primerNombre().trim(),
      segundoNombre: this.segundoNombre().trim(),
      primerApellido: this.primerApellido().trim(),
      segundoApellido: this.segundoApellido().trim(),
      ...(estado.documento ?? {}),
      motivo: estado.motivo,
    });
  }
}
