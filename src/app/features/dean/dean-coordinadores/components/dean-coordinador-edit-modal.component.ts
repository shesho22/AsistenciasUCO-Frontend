import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ActualizarCoordinadorPayload, CoordinadorItem } from '../../../../core/models/role-management.model';
import { CorreccionDocumentoComponent } from '../../../../shared/components/correccion-documento/correccion-documento.component';
import { EstadoCorreccionDocumento } from '../../../../core/models/correccion-identidad.model';
import { getPersonNameError, getPersonNamesError, getStaffEmailError } from '../../../../core/validation/form-fields.util';
import { StudentRegistrationConfigService } from '../../../../core/services/student-registration-config.service';

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOMBRE = 50;
const MAX_CORREO = 100;

/**
 * HU121: edición de los datos personales de un coordinador. HU159 (2026-11-05): el decano también corrige el tipo y
 * el número de documento si el parámetro lo permite; si cambia, exige motivo (el documento es el usuario de acceso).
 * La validación de negocio la hace el backend.
 */
@Component({
    selector: 'app-dean-coordinador-edit-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ModalComponent, FormFieldComponent, CorreccionDocumentoComponent],
    template: `
    <app-modal [isOpen]="true" title="Editar coordinador" (closed)="cancelar.emit()">
      <div class="space-y-4">
        <app-correccion-documento
          [numeroActual]="coordinador().numeroIdentificacion"
          [codigoTipoActual]="coordinador().tipoIdentificacion ?? null"
          [idTipoActual]="coordinador().tipoIdentificacionId ?? null"
          (estadoCambio)="documento.set($event)"
        />

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <app-form-field label="Primer nombre" [required]="true" [errorMessage]="errorNombre('primerNombre')">
            <input
              type="text"
              name="primerNombre"
              maxlength="50"
              [ngModel]="primerNombre()"
              (ngModelChange)="primerNombre.set($event)"
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </app-form-field>
          <app-form-field label="Segundo nombre" [errorMessage]="errorNombre('segundoNombre')">
            <input
              type="text"
              name="segundoNombre"
              maxlength="50"
              [ngModel]="segundoNombre()"
              (ngModelChange)="segundoNombre.set($event)"
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </app-form-field>
          <app-form-field label="Primer apellido" [required]="true" [errorMessage]="errorNombre('primerApellido')">
            <input
              type="text"
              name="primerApellido"
              maxlength="50"
              [ngModel]="primerApellido()"
              (ngModelChange)="primerApellido.set($event)"
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </app-form-field>
          <app-form-field label="Segundo apellido" [errorMessage]="errorNombre('segundoApellido')">
            <input
              type="text"
              name="segundoApellido"
              maxlength="50"
              [ngModel]="segundoApellido()"
              (ngModelChange)="segundoApellido.set($event)"
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </app-form-field>
        </div>

        <app-form-field label="Correo electrónico" [required]="true">
          <input
            type="email"
            name="correo"
            maxlength="100"
            [ngModel]="correo()"
            (ngModelChange)="correo.set($event)"
            class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          @if (correoInvalido()) {
            <p class="mt-1 text-xs text-danger-600" role="alert">Ingresa un correo electrónico válido.</p>
          } @else if (errorCorreoInstitucional()) {
            <p class="mt-1 text-xs text-danger-600" role="alert">{{ errorCorreoInstitucional() }}</p>
          }
        </app-form-field>
      </div>

      <div modal-footer class="flex items-center gap-3">
        <button
          type="button"
          data-accion="cancelar"
          (click)="cancelar.emit()"
          class="text-xs px-3 py-2 rounded-xl border border-warm-300 text-warm-700 hover:bg-warm-100 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          data-accion="guardar"
          [disabled]="!esValido()"
          (click)="onGuardar()"
          class="text-xs px-3 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Guardar cambios
        </button>
      </div>
    </app-modal>
  `
})
export class DeanCoordinadorEditModalComponent {
  coordinador = input.required<CoordinadorItem>();
  guardar = output<ActualizarCoordinadorPayload>();
  cancelar = output<void>();

  primerNombre = signal('');
  segundoNombre = signal('');
  primerApellido = signal('');
  segundoApellido = signal('');
  correo = signal('');
  /** HU159: documento corregido y motivo (por defecto, sin cambio). */
  documento = signal<EstadoCorreccionDocumento>({ valido: true, documento: null, motivo: '' });

  /** DEC-073: dominio institucional vigente (llega del backend). */
  private readonly dominioCorreo = signal<string | null>(null);

  /**
   * DEC-073: un correo NUEVO debe ser institucional; el que ya tenia el coordinador no se revalida (igual que la base de
   * datos), para que un registro antiguo pueda corregir sus nombres.
   */
  errorCorreoInstitucional = computed(() => {
    const valor = this.correo().trim();
    if (!valor || valor.toLowerCase() === (this.coordinador().correo ?? '').trim().toLowerCase()) {
      return '';
    }
    return getStaffEmailError(valor, this.dominioCorreo()) ?? '';
  });

  correoInvalido = computed(() => {
    const valor = this.correo().trim();
    return valor.length > 0 && (!FORMATO_CORREO.test(valor) || valor.length > MAX_CORREO);
  });

  esValido = computed(
    () =>
      this.primerNombre().trim().length > 0 &&
      this.primerNombre().trim().length <= MAX_NOMBRE &&
      this.primerApellido().trim().length > 0 &&
      this.primerApellido().trim().length <= MAX_NOMBRE &&
      this.correo().trim().length > 0 &&
      !this.correoInvalido() &&
      !this.errorCorreoInstitucional() &&
      getPersonNamesError({
        primerNombre: this.primerNombre(),
        segundoNombre: this.segundoNombre(),
        primerApellido: this.primerApellido(),
        segundoApellido: this.segundoApellido(),
      }) === null &&
      this.documento().valido,
  );

  /** DEC-073: error de formato de un nombre o apellido; vacío si es válido o está vacío. */
  errorNombre(campo: 'primerNombre' | 'segundoNombre' | 'primerApellido' | 'segundoApellido'): string {
    const etiquetas = { primerNombre: 'Primer Nombre', segundoNombre: 'Segundo Nombre', primerApellido: 'Primer Apellido', segundoApellido: 'Segundo Apellido' };
    return getPersonNameError(this[campo](), etiquetas[campo]) ?? '';
  }

  constructor() {
    inject(StudentRegistrationConfigService).getEmailDomain().subscribe({
      next: (d) => this.dominioCorreo.set(d),
      error: () => this.dominioCorreo.set(null),
    });
    effect(() => {
      const c = this.coordinador();
      const nombres = c.nombres?.trim().split(/\s+/).filter(Boolean) ?? [];
      const apellidos = c.apellidos?.trim().split(/\s+/).filter(Boolean) ?? [];
      this.primerNombre.set(c.primerNombre ?? nombres[0] ?? '');
      this.segundoNombre.set(c.segundoNombre ?? nombres.slice(1).join(' '));
      this.primerApellido.set(c.primerApellido ?? apellidos[0] ?? '');
      this.segundoApellido.set(c.segundoApellido ?? apellidos.slice(1).join(' '));
      this.correo.set(c.correo ?? '');
    }, { allowSignalWrites: true });
  }

  onGuardar(): void {
    if (!this.esValido()) {
      return;
    }
    this.guardar.emit({
      primerNombre: this.primerNombre().trim(),
      segundoNombre: this.segundoNombre().trim(),
      primerApellido: this.primerApellido().trim(),
      segundoApellido: this.segundoApellido().trim(),
      correo: this.correo().trim(),
      ...(this.documento().documento ? { ...this.documento().documento, motivo: this.documento().motivo } : {}),
    });
  }
}
