import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActualizarDocentePayload, DocentePrograma } from '../../../../core/models/docente-programa.model';
import { CorreccionDocumentoComponent } from '../../../../shared/components/correccion-documento/correccion-documento.component';
import { EstadoCorreccionDocumento } from '../../../../core/models/correccion-identidad.model';
import { getPersonNamesError } from '../../../../core/validation/form-fields.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';

const CLASE_CONTROL =
  'w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20';

/**
 * Edicion de un docente del programa (HU092): nombres de la persona (el tipo de vinculacion se retiro, MEJORAS-SERGIO-2026-11-18).
 * El correo se muestra de solo lectura (exige sincronizar la cuenta de acceso: IAM-001). HU159 (2026-11-05): el
 * documento se corrige si el parámetro lo permite; si cambia, exige motivo.
 */
@Component({
    selector: 'app-coordinator-docente-edit-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent, FormsModule, CorreccionDocumentoComponent],
    template: `
    <app-modal
      [isOpen]="true"
      title="Editar docente"
      [subtitulo]="docente().codigoTipoIdentificacion + ' ' + docente().numeroIdentificacion + ' · ' + docente().correo"
      tamano="xl"
      etiquetaCerrar="Cerrar"
      [cerrarAlPulsarFondo]="false"
      (closed)="solicitarCierre()"
    >
      <form (ngSubmit)="enviar()" class="space-y-4" autocomplete="off">
        @if (error()) {
          <p role="alert" class="text-xs font-medium text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2">{{ error() }}</p>
        }
        <p class="text-xs text-warm-600 bg-warm-50 border border-warm-100 rounded-xl px-3 py-2">
          El cambio de nombres y de documento aplica a la persona en todos sus programas. El correo no se puede editar aquí.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="block text-xs font-semibold text-warm-700">Primer nombre
            <input type="text" name="primerNombre" [(ngModel)]="form.primerNombre" maxlength="50" [class]="clase" />
          </label>
          <label class="block text-xs font-semibold text-warm-700">Segundo nombre
            <input type="text" name="segundoNombre" [(ngModel)]="form.segundoNombre" maxlength="50" [class]="clase" />
          </label>
          <label class="block text-xs font-semibold text-warm-700">Primer apellido
            <input type="text" name="primerApellido" [(ngModel)]="form.primerApellido" maxlength="50" [class]="clase" />
          </label>
          <label class="block text-xs font-semibold text-warm-700">Segundo apellido
            <input type="text" name="segundoApellido" [(ngModel)]="form.segundoApellido" maxlength="50" [class]="clase" />
          </label>
        </div>
        <app-correccion-documento
          [numeroActual]="docente().numeroIdentificacion"
          [codigoTipoActual]="docente().codigoTipoIdentificacion"
          (estadoCambio)="documento.set($event)"
        />
        <div class="flex justify-end gap-3 pt-3 border-t border-warm-100">
          <button type="button" (click)="solicitarCierre()" class="px-4 py-2 rounded-xl text-sm font-semibold bg-warm-100 text-warm-800 hover:bg-warm-200">Cancelar</button>
          <button type="submit" class="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-700 text-white hover:bg-primary-800">Guardar cambios</button>
        </div>
      </form>
    </app-modal>
  `
})
export class CoordinatorDocenteEditModalComponent implements OnInit {
  readonly docente = input.required<DocentePrograma>();

  readonly guardar = output<ActualizarDocentePayload>();
  readonly cerrar = output<void>();

  readonly clase = CLASE_CONTROL;
  readonly error = signal<string | null>(null);
  /** HU159: documento corregido y motivo (por defecto, sin cambio). */
  readonly documento = signal<EstadoCorreccionDocumento>({ valido: true, documento: null, motivo: '' });

  form = {
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
  };

  ngOnInit(): void {
    const d = this.docente();
    this.form = {
      primerNombre: d.primerNombre,
      segundoNombre: d.segundoNombre ?? '',
      primerApellido: d.primerApellido,
      segundoApellido: d.segundoApellido ?? '',
    };
  }

  enviar(): void {
    const actual = this.docente();
    const f = this.form;
    const primerNombre = f.primerNombre.trim();
    const primerApellido = f.primerApellido.trim();
    if (!primerNombre || !primerApellido) {
      this.error.set(mensajeUi('UI_COORDINATOR_DOCENTES_004'));
      return;
    }
    // DEC-073: nombres y apellidos solo con letras, espacios, apóstrofo y guion.
    const nombresError = getPersonNamesError(f);
    if (nombresError) {
      this.error.set(nombresError);
      return;
    }

    const payload: ActualizarDocentePayload = {};
    const estado = this.documento();
    if (!estado.valido) {
      this.error.set(mensajeUi('UI_COORDINATOR_DOCENTES_005'));
      return;
    }
    if (estado.documento) {
      Object.assign(payload, estado.documento, { motivo: estado.motivo });
    }
    if (primerNombre !== actual.primerNombre) {
      payload.primerNombre = primerNombre;
    }
    if (f.segundoNombre.trim() !== (actual.segundoNombre ?? '')) {
      payload.segundoNombre = f.segundoNombre.trim();
    }
    if (primerApellido !== actual.primerApellido) {
      payload.primerApellido = primerApellido;
    }
    if (f.segundoApellido.trim() !== (actual.segundoApellido ?? '')) {
      payload.segundoApellido = f.segundoApellido.trim();
    }

    if (Object.keys(payload).length === 0) {
      this.error.set(mensajeUi('UI_COORDINATOR_DOCENTES_006'));
      return;
    }
    this.error.set(null);
    this.guardar.emit(payload);
  }

  solicitarCierre(): void {
    this.cerrar.emit();
  }
}
