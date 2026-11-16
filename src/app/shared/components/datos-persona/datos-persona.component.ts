import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormFieldComponent } from '../form-field/form-field.component';
import { TipoIdentificacionItem } from '../../../core/services/catalog.service';
import { NAME_MAX_LENGTH } from '../../../core/validation/form-fields.util';

/** Campos de la identidad de una persona que comparten todos los formularios de alta. */
export type CampoPersona =
  | 'tipoIdentificacionId'
  | 'numeroIdentificacion'
  | 'primerNombre'
  | 'segundoNombre'
  | 'primerApellido'
  | 'segundoApellido'
  | 'correo';

export interface DatosPersona {
  tipoIdentificacionId: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  correo: string;
}

export interface CambioDatoPersona {
  campo: CampoPersona;
  valor: string;
}

/** El documento viaja como entero en el backend (INT): como maximo 10 digitos. */
export const DOCUMENTO_MAX_LENGTH = 10;
export const CORREO_MAX_LENGTH = 100;

const CLASE_CONTROL =
  'w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

/**
 * Bloque de datos personales de los formularios de alta (decano, coordinador, docente, admision y matricula manual):
 * mismo orden (documento, nombres, apellidos, correo), mismos rotulos y mismos limites en todos. Es solo presentacion:
 * recibe los datos y los errores del formulario que lo usa y emite cada cambio de campo; las reglas siguen en cada
 * formulario y en el backend, que es la autoridad.
 */
@Component({
  selector: 'app-datos-persona',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="datos-persona">
      @if (incluirDocumento()) {
        <app-form-field label="Tipo de documento" [required]="true" [errorMessage]="error('tipoIdentificacionId')">
          <select
            name="tipoIdentificacionId"
            [class]="claseControl"
            [disabled]="soloLectura()"
            (change)="emitir('tipoIdentificacionId', $any($event.target).value)"
          >
            @for (tipo of tiposIdentificacion(); track tipo.id) {
              <option [value]="tipo.id" [selected]="tipo.id === datos().tipoIdentificacionId">
                {{ tipo.tipoIdentificacion }} - {{ tipo.nombre }}
              </option>
            }
          </select>
        </app-form-field>
        <app-form-field label="Número de documento" [required]="true" [errorMessage]="error('numeroIdentificacion')">
          <input
            type="text"
            name="numeroIdentificacion"
            inputmode="numeric"
            autocomplete="off"
            placeholder="Ej. 1017000000"
            [class]="claseControl"
            [readOnly]="soloLectura()"
            [value]="datos().numeroIdentificacion"
            (input)="alEscribirDocumento($event)"
          />
        </app-form-field>
      }

      <app-form-field label="Primer nombre" [required]="true" [errorMessage]="error('primerNombre')">
        <input type="text" name="primerNombre" autocomplete="off" [attr.maxlength]="maxNombre" placeholder="Ej. Juan"
          [class]="claseControl" [readOnly]="soloLectura()" [value]="datos().primerNombre"
          (input)="emitir('primerNombre', $any($event.target).value)" />
      </app-form-field>
      <app-form-field label="Segundo nombre (opcional)" [errorMessage]="error('segundoNombre')">
        <input type="text" name="segundoNombre" autocomplete="off" [attr.maxlength]="maxNombre" placeholder="Ej. Carlos"
          [class]="claseControl" [readOnly]="soloLectura()" [value]="datos().segundoNombre"
          (input)="emitir('segundoNombre', $any($event.target).value)" />
      </app-form-field>
      <app-form-field label="Primer apellido" [required]="true" [errorMessage]="error('primerApellido')">
        <input type="text" name="primerApellido" autocomplete="off" [attr.maxlength]="maxNombre" placeholder="Ej. Gómez"
          [class]="claseControl" [readOnly]="soloLectura()" [value]="datos().primerApellido"
          (input)="emitir('primerApellido', $any($event.target).value)" />
      </app-form-field>
      <app-form-field label="Segundo apellido (opcional)" [errorMessage]="error('segundoApellido')">
        <input type="text" name="segundoApellido" autocomplete="off" [attr.maxlength]="maxNombre" placeholder="Ej. Pérez"
          [class]="claseControl" [readOnly]="soloLectura()" [value]="datos().segundoApellido"
          (input)="emitir('segundoApellido', $any($event.target).value)" />
      </app-form-field>

      @if (incluirCorreo()) {
        <div class="sm:col-span-2 flex flex-col gap-1.5">
          <app-form-field label="Correo institucional" [required]="true" [errorMessage]="error('correo')" [helperText]="ayudaCorreo()">
            <input type="email" name="correo" autocomplete="off" [attr.maxlength]="maxCorreo" [placeholder]="placeholderCorreo()"
              [class]="claseControl" [readOnly]="soloLectura()" [value]="datos().correo"
              (input)="emitir('correo', $any($event.target).value)" />
          </app-form-field>
          @if (aviso()) {
            <p class="text-xs text-warm-600" data-testid="aviso-activacion-cuenta">{{ aviso() }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class DatosPersonaComponent {
  readonly datos = input.required<DatosPersona>();
  readonly tiposIdentificacion = input<readonly TipoIdentificacionItem[]>([]);
  readonly errores = input<Partial<Record<CampoPersona, string>>>({});
  /** Matricula manual: el documento se escribe arriba para buscar a la persona; aqui solo van nombres y correo. */
  readonly incluirDocumento = input(true);
  /** Matricula de un estudiante existente: su correo no se pide. */
  readonly incluirCorreo = input(true);
  readonly soloLectura = input(false);
  readonly placeholderCorreo = input('nombre.apellido@uco.edu.co');
  readonly ayudaCorreo = input('');
  /** IDENT-002: explica que la persona recibira el enlace de activacion. */
  readonly aviso = input('');

  readonly cambio = output<CambioDatoPersona>();

  readonly claseControl = CLASE_CONTROL;
  readonly maxNombre = NAME_MAX_LENGTH;
  readonly maxCorreo = CORREO_MAX_LENGTH;

  error(campo: CampoPersona): string {
    return this.errores()[campo] ?? '';
  }

  emitir(campo: CampoPersona, valor: string): void {
    this.cambio.emit({ campo, valor });
  }

  /**
   * Solo digitos y como maximo 10: lo que no sea numero se descarta en el mismo control. El limite se aplica sobre los
   * digitos (no con maxlength), para que pegar "1.017.555.444" no pierda cifras al truncar los puntos.
   */
  alEscribirDocumento(event: Event): void {
    const control = event.target as HTMLInputElement;
    const digitos = control.value.replace(/\D/g, '').slice(0, DOCUMENTO_MAX_LENGTH);
    if (control.value !== digitos) {
      control.value = digitos;
    }
    this.emitir('numeroIdentificacion', digitos);
  }
}

/** Aplica un cambio del bloque a un objeto de formulario y devuelve la copia (para formularios basados en signals). */
export function aplicarCambioPersona<T extends Partial<DatosPersona>>(datos: T, cambio: CambioDatoPersona): T {
  return { ...datos, [cambio.campo]: cambio.valor };
}
