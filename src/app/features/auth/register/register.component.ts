import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { FormSelectComponent, SelectOption } from '../../../shared/components/form-select/form-select.component';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import {
  getApiErrorMessage,
  getApiFieldError,
} from '../../../core/api/errors/api-error.util';
import { CatalogService } from '../../../core/services/catalog.service';
import { CrearUsuarioRequest } from '../../../core/api/models/crear-usuario-request.model';
import { UserService } from '../../../core/services/user.service';
import {
  getPasswordValidationError,
  parseIdentificationNumber,
} from '../../../core/validation/request-form-validation.util';

type RegisterField =
  | 'tipoIdIdentificacion'
  | 'primerNombre'
  | 'segundoNombre'
  | 'primerApellido'
  | 'segundoApellido'
  | 'correo'
  | 'numeroIdentificacion'
  | 'password';

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonComponent,
    FormFieldComponent,
    FormSelectComponent,
    CardComponent,
    ToastComponent,
  ],
  template: `
    <app-card [glass]="true" padding="lg">
      <div class="mb-6 text-center">
        <h2 class="font-serif font-bold text-2xl text-warm-900 tracking-tight">Registro Institucional</h2>
        <p class="text-xs text-warm-500 mt-1">Creación de usuario institucional</p>
      </div>

      <form (submit)="onRegister($event)" class="space-y-3.5">
        <!-- Tipo y Número de Identificación -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <app-form-field
            label="Tipo de Documento"
            [required]="true"
            [errorMessage]="fieldErrors().tipoIdIdentificacion ?? ''"
          >
            <app-form-select
              [options]="documentTypeOptions()"
              [value]="tipoIdentificacionId"
              (valueChange)="tipoIdentificacionId = $event"
              placeholder="Seleccione tipo..."
            ></app-form-select>
          </app-form-field>

          <app-form-field
            label="Número de Documento"
            [required]="true"
            [errorMessage]="fieldErrors().numeroIdentificacion ?? ''"
          >
            <input
              type="text"
              inputmode="numeric"
              maxlength="10"
              [(ngModel)]="numeroIdentificacion"
              name="numeroIdentificacion"
              placeholder="Ej. 1017123456"
              required
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-warm-sm"
            />
          </app-form-field>
        </div>

        <!-- Primer y Segundo Nombre -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <app-form-field
            label="Primer Nombre"
            [required]="true"
            [errorMessage]="fieldErrors().primerNombre ?? ''"
          >
            <input
              type="text"
              maxlength="50"
              [(ngModel)]="primerNombre"
              name="primerNombre"
              placeholder="Ej. Roberto"
              required
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-warm-sm"
            />
          </app-form-field>

          <app-form-field
            label="Segundo Nombre (Opcional)"
            [errorMessage]="fieldErrors().segundoNombre ?? ''"
          >
            <input
              type="text"
              maxlength="50"
              [(ngModel)]="segundoNombre"
              name="segundoNombre"
              placeholder="Ej. Carlos"
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-warm-sm"
            />
          </app-form-field>
        </div>

        <!-- Primer y Segundo Apellido -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <app-form-field
            label="Primer Apellido"
            [required]="true"
            [errorMessage]="fieldErrors().primerApellido ?? ''"
          >
            <input
              type="text"
              maxlength="50"
              [(ngModel)]="primerApellido"
              name="primerApellido"
              placeholder="Ej. Sánchez"
              required
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-warm-sm"
            />
          </app-form-field>

          <app-form-field
            label="Segundo Apellido (Opcional)"
            [required]="false"
            [errorMessage]="fieldErrors().segundoApellido ?? ''"
          >
            <input
              type="text"
              maxlength="50"
              [(ngModel)]="segundoApellido"
              name="segundoApellido"
              placeholder="Ej. Gómez"
              class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-warm-sm"
            />
          </app-form-field>
        </div>

        <app-form-field
          label="Correo Institucional"
          [required]="true"
          [errorMessage]="fieldErrors().correo ?? ''"
        >
          <input
            type="email"
            maxlength="100"
            [(ngModel)]="email"
            name="email"
            placeholder="roberto.sanchez@uco.edu.co"
            required
            class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-warm-sm"
          />
        </app-form-field>

        <app-form-field
          label="Contraseña / Clave"
          [required]="true"
          [errorMessage]="fieldErrors().password ?? ''"
        >
          <input
            type="password"
            minlength="8"
            maxlength="255"
            [(ngModel)]="password"
            name="password"
            placeholder="Mínimo 8 caracteres"
            required
            class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-warm-sm"
          />
        </app-form-field>

        <app-button
          variant="primary"
          type="submit"
          [fullWidth]="true"
          [loading]="isLoading()"
        >
          Crear Cuenta Institucional
        </app-button>
      </form>

      <div class="mt-6 pt-4 border-t border-warm-200 text-center text-xs text-warm-600">
        ¿Ya posees una cuenta?
        <a routerLink="/login" class="text-primary-700 font-semibold hover:underline ml-1">Inicia sesión</a>
      </div>
    </app-card>

    <app-toast
      [visible]="showToast()"
      [message]="toastMessage()"
      [type]="toastType()"
      (dismissed)="showToast.set(false)"
    ></app-toast>
  `,
})
export class RegisterComponent implements OnInit {
  private router = inject(Router);
  private catalogService = inject(CatalogService);
  private userService = inject(UserService);

  tipoIdentificacionId = 'A1B2C3D4-0000-0000-0000-000000000001';
  numeroIdentificacion = '';
  primerNombre = '';
  segundoNombre = '';
  primerApellido = '';
  segundoApellido = '';
  email = '';
  password = '';

  isLoading = signal<boolean>(false);
  showToast = signal<boolean>(false);
  toastMessage = signal<string>('');
  toastType = signal<'success' | 'error'>('success');
  fieldErrors = signal<Partial<Record<RegisterField, string>>>({});

  documentTypeOptions = signal<SelectOption[]>([]);

  ngOnInit(): void {
    this.catalogService.getIdentityDocumentTypes().subscribe({
      next: (documentTypes) => {
        const options: SelectOption[] = documentTypes.map((doc) => ({
          value: doc.id,
          label: `${doc.tipoIdentificacion} - ${doc.nombre}`,
        }));
        this.documentTypeOptions.set(options);
        if (options.length > 0) {
          this.tipoIdentificacionId = options[0].value;
        }
      },
    });
  }

  onRegister(event: Event): void {
    event.preventDefault();

    this.fieldErrors.set({});

    const identificationResult = parseIdentificationNumber(
      this.numeroIdentificacion
    );
    const effectivePassword = this.password.trim();
    const passwordError = getPasswordValidationError(
      effectivePassword,
      this.numeroIdentificacion
    );
    const fieldErrors: Partial<Record<RegisterField, string>> = {};

    if (!identificationResult.valid) {
      fieldErrors.numeroIdentificacion = identificationResult.error;
    }
    if (!this.primerNombre.trim()) {
      fieldErrors.primerNombre = 'El campo Primer Nombre es obligatorio.';
    }
    if (!this.primerApellido.trim()) {
      fieldErrors.primerApellido = 'El campo Primer Apellido es obligatorio.';
    }
    if (!this.email.trim()) {
      fieldErrors.correo = 'El campo Correo Institucional es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      fieldErrors.correo = 'El campo Correo Institucional debe tener un formato válido (ej. usuario@uco.edu.co).';
    }
    if (passwordError) {
      fieldErrors.password = passwordError;
    }

    if (
      !this.tipoIdentificacionId ||
      Object.keys(fieldErrors).length > 0
    ) {
      if (!this.tipoIdentificacionId) {
        fieldErrors.tipoIdIdentificacion = 'El campo Tipo de Documento es obligatorio.';
      }
      this.fieldErrors.set(fieldErrors);
      this.toastType.set('error');
      const errVals = Object.values(fieldErrors);
      this.toastMessage.set(errVals.length === 1 ? errVals[0]! : `Campos con error en el formulario: ${Object.keys(fieldErrors).join(', ')}.`);
      this.showToast.set(true);
      return;
    }

    if (!identificationResult.valid) {
      return;
    }

    this.isLoading.set(true);

    const request: CrearUsuarioRequest = {
      tipoIdIdentificacion: this.tipoIdentificacionId,
      numeroIdentificacion: identificationResult.value,
      primerNombre: this.primerNombre.trim(),
      segundoNombre: this.segundoNombre.trim(),
      primerApellido: this.primerApellido.trim(),
      segundoApellido: this.segundoApellido.trim(),
      correo: this.email.trim(),
      password: effectivePassword,
    };

    this.userService.createUser(request).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.exitoso) {
          this.toastType.set('success');
          this.toastMessage.set(res.mensajeUsuario || '¡Registro completado exitosamente! Redirigiendo...');
          this.showToast.set(true);

          setTimeout(() => {
            void this.router.navigate(['/login']);
          }, 1200);
        } else {
          this.toastType.set('error');
          this.toastMessage.set(res.mensajeUsuario || 'Error al completar el registro.');
          this.showToast.set(true);
        }
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.toastType.set('error');
        this.setApiFieldErrors(error);
        this.toastMessage.set(getApiErrorMessage(error));
        this.showToast.set(true);
      },
    });
  }

  private setApiFieldErrors(error: unknown): void {
    const fields: RegisterField[] = [
      'tipoIdIdentificacion',
      'primerNombre',
      'segundoNombre',
      'primerApellido',
      'segundoApellido',
      'correo',
      'numeroIdentificacion',
      'password',
    ];
    const fieldErrors: Partial<Record<RegisterField, string>> = {};

    for (const field of fields) {
      const message = getApiFieldError(error, field);
      if (message) {
        fieldErrors[field] = message;
      }
    }

    this.fieldErrors.set(fieldErrors);
  }
}


