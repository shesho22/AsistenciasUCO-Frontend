import { Component, ChangeDetectionStrategy, computed, input, output, signal, inject, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { FormSelectComponent, SelectOption } from '../../../../shared/components/form-select/form-select.component';
import { StudentService } from '../../../../core/services/student.service';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';

@Component({
  selector: 'app-attendance-enrollment-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, FormFieldComponent, FormSelectComponent],
  template: `
    <app-modal
      [isOpen]="isOpen()"
      title="Matricular Estudiante en Grupo"
      (closed)="onClose()"
    >
      <form (submit)="onSubmit($event)" class="space-y-4">
        <p class="text-xs text-warm-500">
          Ingresa el documento del alumno para matricularlo directamente al grupo.
        </p>

        <!-- Bloque Principal: Identificación del Estudiante -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-1">
            <app-form-field
              label="Tipo Documento"
              [required]="true"
              [errorMessage]="fieldErrors()['tipoIdentificacionId'] ?? ''"
            >
              <app-form-select
                [options]="docTypeOptions()"
                [value]="docType()"
                (valueChange)="onDocTypeChange($event)"
                placeholder="Tipo..."
              ></app-form-select>
            </app-form-field>
          </div>

          <div class="sm:col-span-2">
            <app-form-field
              label="Número de Identificación"
              [required]="true"
              [errorMessage]="fieldErrors()['numeroIdentificacion'] ?? ''"
            >
              <div class="relative flex items-center">
                <input
                  type="text"
                  inputmode="numeric"
                  maxlength="10"
                  [ngModel]="code()"
                  (ngModelChange)="onCodeChange($event)"
                  (blur)="onCodeBlur()"
                  (keydown.enter)="onCodeEnter($event)"
                  name="studentCode"
                  placeholder="Ej. 1017123456"
                  class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 pr-24"
                />
                <button
                  type="button"
                  (click)="buscarEstudiante()"
                  [disabled]="isSearching() || !docType() || !code().trim()"
                  class="absolute right-1 top-1 bottom-1 px-3 bg-warm-100 hover:bg-warm-200 text-warm-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  @if (isSearching()) {
                    <span class="inline-block w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                    <span>Buscando...</span>
                  } @else {
                    <span>🔍 Buscar</span>
                  }
                </button>
              </div>
            </app-form-field>
            @if (searchError()) {
              <p class="mt-1 text-[11px] text-danger-700" role="alert" data-testid="busqueda-error">{{ searchError() }}</p>
            }
          </div>
        </div>

        <!-- 1. CASO ESTUDIANTE EXISTENTE: Tarjeta Resumen con datos UCO cargados -->
        @if (isExistingStudent()) {
          <div class="p-3.5 bg-success-50/80 border border-success-200 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-success-800">
                <span class="w-2 h-2 rounded-full bg-success-500 animate-pulse"></span>
                Estudiante Institucional Detectado
              </span>
              <span class="text-[11px] text-success-600 bg-success-100 px-2 py-0.5 rounded-md font-medium">UCO Activo</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-warm-800">
              <div>
                <span class="text-warm-500 text-[11px] block">Nombre Completo:</span>
                <span class="font-medium text-warm-900">
                  {{ firstName() }} {{ secondName() }} {{ lastName() }} {{ secondLastName() }}
                </span>
              </div>
              <div>
                <span class="text-warm-500 text-[11px] block">Correo Institucional:</span>
                <span class="font-medium text-warm-900" data-testid="correo-enmascarado">{{ correoEnmascarado() }}</span>
              </div>
            </div>

            @if (yaMatriculado()) {
              <p class="text-[11px] font-semibold text-warning-800 border-t border-success-200/60 pt-2" data-testid="aviso-ya-matriculado">
                Ya está matriculado en este grupo.
              </p>
            } @else if (seReactivara()) {
              <p class="text-[11px] text-info-800 border-t border-success-200/60 pt-2" data-testid="aviso-reactivacion">
                Fue retirado de este grupo: se reactivará su matrícula.
              </p>
            } @else {
              <p class="text-[11px] text-success-700 border-t border-success-200/60 pt-2">
                Se vinculará directamente al grupo activo sin modificar sus credenciales existentes.
              </p>
            }
          </div>
        }

        <!-- 2. Botón alternador para registrar nuevo estudiante manualmente si no se ha desplegado -->
        @if (!isExistingStudent() && !showRegistrationForm()) {
          <div class="flex items-center justify-between p-3 bg-warm-50 border border-dashed border-warm-300 rounded-xl text-xs">
            <span class="text-warm-600">¿El alumno es nuevo y no está registrado en el sistema?</span>
            <button
              type="button"
              (click)="desplegarFormularioNuevoEstudiante()"
              class="text-primary-600 hover:text-primary-700 font-semibold hover:underline"
            >
              + Registrar datos de nuevo alumno
            </button>
          </div>
        }

        <!-- 3. CASO ESTUDIANTE NUEVO: Formulario Desplegado Automáticamente o Manualmente -->
        @if (showRegistrationForm()) {
          <div class="space-y-3 pt-1 border-t border-warm-200">
            <div class="p-2.5 bg-info-50 border border-info-200 rounded-xl flex items-start gap-2">
              <span class="text-info-600 text-sm">ℹ️</span>
              <div class="text-[11px] text-info-800">
                <span class="font-semibold block text-xs">Registro de Nuevo Estudiante</span>
                Diligencie los datos personales para crear la cuenta institucional del estudiante e inscribirlo al grupo.
              </div>
            </div>

            <!-- Primer y Segundo Nombre -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <app-form-field
                label="Primer Nombre"
                [required]="true"
                [errorMessage]="fieldErrors()['primerNombre'] ?? ''"
              >
                <input
                  type="text"
                  maxlength="50"
                  [ngModel]="firstName()"
                  (ngModelChange)="onFieldInput('primerNombre', $event, firstName)"
                  name="studentFirstName"
                  placeholder="Ej. Juan"
                  class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </app-form-field>

              <app-form-field
                label="Segundo Nombre (Opcional)"
                [errorMessage]="fieldErrors()['segundoNombre'] ?? ''"
              >
                <input
                  type="text"
                  maxlength="50"
                  [ngModel]="secondName()"
                  (ngModelChange)="onFieldInput('segundoNombre', $event, secondName)"
                  name="studentSecondName"
                  placeholder="Ej. Carlos"
                  class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </app-form-field>
            </div>

            <!-- Primer y Segundo Apellido -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <app-form-field
                label="Primer Apellido"
                [required]="true"
                [errorMessage]="fieldErrors()['primerApellido'] ?? ''"
              >
                <input
                  type="text"
                  maxlength="50"
                  [ngModel]="lastName()"
                  (ngModelChange)="onFieldInput('primerApellido', $event, lastName)"
                  name="studentLastName"
                  placeholder="Ej. Pérez"
                  class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </app-form-field>

              <app-form-field
                label="Segundo Apellido (Opcional)"
                [errorMessage]="fieldErrors()['segundoApellido'] ?? ''"
              >
                <input
                  type="text"
                  maxlength="50"
                  [ngModel]="secondLastName()"
                  (ngModelChange)="onFieldInput('segundoApellido', $event, secondLastName)"
                  name="studentSecondLastName"
                  placeholder="Ej. Gómez"
                  class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </app-form-field>
            </div>

            <!-- Correo Electrónico Institucional -->
            <app-form-field
              label="Correo Electrónico Institucional"
              [required]="true"
              [errorMessage]="fieldErrors()['correo'] ?? ''"
            >
              <input
                type="email"
                maxlength="100"
                [ngModel]="email()"
                (ngModelChange)="onFieldInput('correo', $event, email)"
                name="studentEmail"
                [placeholder]="emailPlaceholder()"
                class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              @if (emailDomain()) {
                <p class="mt-1 text-[11px] text-warm-500" data-testid="email-domain-hint">
                  Debe terminar en {{ emailDomain() }}. Se enviará un enlace para verificar el correo.
                </p>
              }
            </app-form-field>

            <!-- Contraseña Temporal y Confirmación de Contraseña -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <app-form-field
                label="Contraseña Temporal"
                [required]="true"
                [errorMessage]="fieldErrors()['password'] ?? ''"
              >
                <input
                  type="password"
                  minlength="8"
                  maxlength="255"
                  [ngModel]="password()"
                  (ngModelChange)="onFieldInput('password', $event, password)"
                  name="studentPassword"
                  placeholder="Mínimo 8 caracteres"
                  class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </app-form-field>

              <app-form-field
                label="Confirmar Contraseña"
                [required]="true"
                [errorMessage]="confirmPasswordError()"
              >
                <input
                  type="password"
                  minlength="8"
                  maxlength="255"
                  [ngModel]="confirmPassword()"
                  (ngModelChange)="onFieldInput('confirmPassword', $event, confirmPassword)"
                  name="studentConfirmPassword"
                  placeholder="Repita la contraseña"
                  class="w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </app-form-field>
            </div>
          </div>
        }

        <!-- Botones de Acción del Modal -->
        <div modal-footer class="flex items-center justify-end gap-2 w-full pt-2">
          <app-button variant="ghost" size="sm" (clicked)="onClose()">
            Cancelar
          </app-button>

          @if (isExistingStudent()) {
            <app-button variant="primary" size="sm" type="submit" [loading]="isEnrolling()" [disabled]="yaMatriculado()">
              Vincular Estudiante al Grupo
            </app-button>
          } @else if (showRegistrationForm()) {
            <app-button variant="primary" size="sm" type="submit" [loading]="isEnrolling()">
              Registrar y Matricular en Grupo
            </app-button>
          } @else {
            <app-button
              variant="primary"
              size="sm"
              type="button"
              (clicked)="buscarEstudiante()"
              [loading]="isSearching()"
              [disabled]="!docType() || !code().trim()"
            >
              Consultar y Matricular
            </app-button>
          }
        </div>
      </form>
    </app-modal>
  `,
})
export class AttendanceEnrollmentModalComponent {
  private studentService = inject(StudentService);

  isOpen = input.required<boolean>();
  /** Grupo del docente titular en el que se matricula: la búsqueda por documento es de ese grupo (DEC-027). */
  grupoId = input<string>('');
  isEnrolling = input<boolean>(false);
  docTypeOptions = input<SelectOption[]>([]);
  fieldErrors = input<Record<string, string | undefined>>({});
  /** Dominio institucional exigido (IDENT-001); vacio si aun no se conoce. */
  emailDomain = input<string>('');
  emailPlaceholder = computed(() => `juan.perez${this.emailDomain() || '@uco.edu.co'}`);

  docType = signal<string>('');
  code = signal<string>('');
  firstName = signal<string>('');
  secondName = signal<string>('');
  lastName = signal<string>('');
  secondLastName = signal<string>('');
  email = signal<string>('');
  password = signal<string>('');
  confirmPassword = signal<string>('');
  confirmPasswordError = signal<string>('');

  isSearching = signal<boolean>(false);
  isExistingStudent = signal<boolean>(false);
  showRegistrationForm = signal<boolean>(false);
  searchStatus = signal<'IDLE' | 'FOUND' | 'NOT_FOUND'>('IDLE');
  /** Correo enmascarado del estudiante hallado (solo lectura): el correo real nunca llega al navegador. */
  correoEnmascarado = signal<string>('');
  /** Código de la matrícula del hallado en este grupo: `A` activa, `I` retirada, `null` sin matrícula. */
  estadoMatricula = signal<string | null>(null);
  /** Mensaje del backend cuando la búsqueda falla (403, 400…); no abre el alta. */
  searchError = signal<string>('');
  yaMatriculado = computed(() => this.isExistingStudent() && this.estadoMatricula() === 'A');
  seReactivara = computed(() => this.isExistingStudent() && this.estadoMatricula() === 'I');

  submitted = output<{
    tipoIdentificacionId: string;
    numeroIdentificacion: string;
    primerNombre: string;
    segundoNombre?: string;
    primerApellido: string;
    segundoApellido?: string;
    correo: string;
    password: string;
    confirmPassword?: string;
    hasLocalConfirmError?: boolean;
    esNuevoEstudiante?: boolean;
    estudianteExistente?: boolean;
  }>();
  closed = output<void>();
  clearFieldError = output<string>();

  onFieldInput(field: string, value: string, signalRef: WritableSignal<string>): void {
    signalRef.set(value);
    if (field === 'password' || field === 'confirmPassword') {
      if (this.confirmPasswordError()) {
        const pass = field === 'password' ? value : this.password();
        const conf = field === 'confirmPassword' ? value : this.confirmPassword();
        if (!conf || pass === conf) {
          this.confirmPasswordError.set('');
        }
      }
    }
    this.clearFieldError.emit(field);
  }

  onDocTypeChange(newDocType: string): void {
    this.docType.set(newDocType);
    this.searchError.set('');
    this.clearFieldError.emit('tipoIdentificacionId');
    this.resetExistingStudentState();
  }

  onCodeChange(newCode: string): void {
    this.code.set(newCode);
    this.searchError.set('');
    this.clearFieldError.emit('numeroIdentificacion');
    if (this.isExistingStudent() || this.searchStatus() !== 'IDLE') {
      this.resetExistingStudentState();
    }
  }

  onCodeBlur(): void {
    if (!this.isExistingStudent() && !this.showRegistrationForm()) {
      this.buscarEstudiante();
    }
  }

  onCodeEnter(e: Event): void {
    e.preventDefault();
    if (!this.isExistingStudent() && !this.showRegistrationForm()) {
      this.buscarEstudiante();
    }
  }

  desplegarFormularioNuevoEstudiante(): void {
    this.isExistingStudent.set(false);
    this.limpiarDatosFormulario();
    this.showRegistrationForm.set(true);
    this.searchStatus.set('NOT_FOUND');
  }

  buscarEstudiante(): void {
    const tipo = this.docType();
    const documento = this.code().trim();
    if (!tipo || !documento || documento.length < 5) {
      return;
    }

    const numDoc = Number(documento);
    if (isNaN(numDoc) || numDoc <= 0) {
      return;
    }

    this.isSearching.set(true);
    this.searchError.set('');
    this.studentService
      .searchStudentByIdentification(this.grupoId(), tipo, numDoc)
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (res) => {
          const estudiante = res.datos;
          if (estudiante) {
            this.firstName.set(estudiante.primerNombre);
            this.secondName.set(estudiante.segundoNombre ?? '');
            this.lastName.set(estudiante.primerApellido);
            this.secondLastName.set(estudiante.segundoApellido ?? '');
            this.email.set('');
            this.password.set('');
            this.confirmPassword.set('');
            this.correoEnmascarado.set(estudiante.correoEnmascarado);
            this.estadoMatricula.set(estudiante.codigoEstadoMatriculaGrupo);
            this.isExistingStudent.set(true);
            this.showRegistrationForm.set(false);
            this.searchStatus.set('FOUND');
          } else {
            // No existe: automáticamente desplegar formulario de nuevo estudiante limpio
            this.isExistingStudent.set(false);
            this.limpiarDatosFormulario();
            this.showRegistrationForm.set(true);
            this.searchStatus.set('NOT_FOUND');
          }
        },
        error: (error: unknown) => {
          // 403/400…: el backend explica por qué; no se abre el alta para no duplicar una cuenta por un fallo de consulta.
          this.isExistingStudent.set(false);
          this.showRegistrationForm.set(false);
          this.limpiarDatosFormulario();
          this.searchStatus.set('IDLE');
          this.searchError.set(getApiErrorMessage(error));
        },
      });
  }

  private limpiarDatosFormulario(): void {
    this.firstName.set('');
    this.secondName.set('');
    this.lastName.set('');
    this.secondLastName.set('');
    this.email.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.confirmPasswordError.set('');
    this.correoEnmascarado.set('');
    this.estadoMatricula.set(null);
  }

  private resetExistingStudentState(): void {
    this.isExistingStudent.set(false);
    this.showRegistrationForm.set(false);
    this.searchStatus.set('IDLE');
    this.limpiarDatosFormulario();
  }

  onClose(): void {
    this.resetExistingStudentState();
    this.docType.set('');
    this.code.set('');
    this.closed.emit();
  }

  onSubmit(e: Event): void {
    e.preventDefault();

    // Con matrícula activa en este grupo no hay nada que enviar.
    if (this.yaMatriculado()) {
      return;
    }
    const existente = this.isExistingStudent() && !this.showRegistrationForm();

    let hasLocalConfirmError = false;
    if (this.showRegistrationForm()) {
      const pass = this.password();
      const confirm = this.confirmPassword();

      if (!confirm) {
        this.confirmPasswordError.set('Debe confirmar la contraseña.');
        hasLocalConfirmError = true;
      } else if (pass !== confirm) {
        this.confirmPasswordError.set('Las contraseñas no coinciden.');
        hasLocalConfirmError = true;
      } else {
        this.confirmPasswordError.set('');
      }
    }

    // Emitir siempre submitted para que el componente padre calcule y pinte los mensajes
    // de error en rojo debajo de todos los campos obligatorios o inválidos (primerNombre, correo, etc.)
    this.submitted.emit({
      tipoIdentificacionId: this.docType(),
      numeroIdentificacion: this.code().trim(),
      primerNombre: this.firstName().trim(),
      segundoNombre: this.secondName().trim() || undefined,
      primerApellido: this.lastName().trim(),
      segundoApellido: this.secondLastName().trim() || undefined,
      // Un estudiante existente se matricula solo por documento: ni correo ni contraseña salen del modal.
      correo: existente ? '' : this.email().trim(),
      password: existente ? '' : this.password(),
      confirmPassword: existente ? '' : this.confirmPassword(),
      hasLocalConfirmError,
      esNuevoEstudiante: this.showRegistrationForm(),
      estudianteExistente: existente,
    });
  }
}
