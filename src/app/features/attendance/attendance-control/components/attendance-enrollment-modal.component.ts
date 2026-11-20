import { Component, ChangeDetectionStrategy, computed, effect, input, output, signal, inject, untracked, WritableSignal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { FormSelectComponent, SelectOption } from '../../../../shared/components/form-select/form-select.component';
import { StudentService } from '../../../../core/services/student.service';
import { GroupService } from '../../../../core/services/group.service';
import { ProgramaResumen } from '../../../../core/models/role-management.model';
import { getApiErrorMessage, getApiErrorCode, API_ERROR_CODE } from '../../../../core/api/errors/api-error.util';
import { CambioDatoPersona, DatosPersonaComponent } from '../../../../shared/components/datos-persona/datos-persona.component';

/** Datos del formulario de matricula/registro de estudiante que emite el modal. */
export interface MatriculaEstudianteSolicitud {
  tipoIdentificacionId: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  /** Programa del estudiante; solo viaja cuando el grupo tiene más de un programa. */
  idPrograma?: string;
  correo: string;
  esNuevoEstudiante?: boolean;
  estudianteExistente?: boolean;
}

@Component({
    selector: 'app-attendance-enrollment-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ModalComponent, ButtonComponent, FormFieldComponent, FormSelectComponent, DatosPersonaComponent],
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

        @if (programas().length > 1) {
          <app-form-field
            label="Programa del estudiante"
            [required]="true"
            [errorMessage]="fieldErrors()['idPrograma'] ?? ''"
          >
            <app-form-select
              [options]="opcionesPrograma()"
              [value]="idPrograma()"
              (valueChange)="idPrograma.set($event)"
              placeholder="Selecciona el programa..."
            ></app-form-select>
          </app-form-field>
        }

        <!-- 1. CASO ESTUDIANTE EXISTENTE: Tarjeta Resumen con datos UCO cargados -->
        @if (isExistingStudent()) {
          <div class="p-3.5 bg-success-50/80 border border-success-200 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-success-800">
                <span class="w-2 h-2 rounded-full bg-success-500 animate-pulse"></span>
                Estudiante Institucional Detectado
              </span>
              <span class="text-[11px] text-success-700 bg-success-100 px-2 py-0.5 rounded-md font-medium">UCO Activo</span>
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

            <!-- Datos personales (bloque compartido); el documento se escribe arriba para buscar al estudiante -->
            <app-datos-persona
              [datos]="{
                tipoIdentificacionId: docType(),
                numeroIdentificacion: code(),
                primerNombre: firstName(),
                segundoNombre: secondName(),
                primerApellido: lastName(),
                segundoApellido: secondLastName(),
                correo: email()
              }"
              [incluirDocumento]="false"
              [errores]="fieldErrors()"
              [placeholderCorreo]="emailPlaceholder()"
              [ayudaCorreo]="emailDomain() ? 'Debe terminar en ' + emailDomain() + '.' : ''"
              aviso="No se asigna contraseña. El estudiante recibirá en su correo institucional un enlace para activar la cuenta y definir su contraseña."
              (cambio)="alCambiarDato($event)"
            />
          </div>
        }

        <!-- Botones de Acción del Modal -->
        <div modal-footer class="flex items-center justify-end gap-2 w-full pt-2">
          <app-button variant="ghost" size="sm" (clicked)="onClose()">
            Cancelar
          </app-button>

          @if (isExistingStudent()) {
            <app-button variant="primary" size="sm" type="submit" [loading]="isEnrolling()" [disabled]="yaMatriculado() || faltaPrograma()">
              Vincular Estudiante al Grupo
            </app-button>
          } @else if (showRegistrationForm()) {
            <app-button variant="primary" size="sm" type="submit" [loading]="isEnrolling()" [disabled]="faltaPrograma()">
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
  `
})
export class AttendanceEnrollmentModalComponent {
  private readonly studentService = inject(StudentService);
  private readonly groupService = inject(GroupService);

  isOpen = input.required<boolean>();
  /** Grupo del docente titular en el que se matricula: la búsqueda por documento es de ese grupo (DEC-027). */
  grupoId = input<string>('');
  isEnrolling = input<boolean>(false);
  docTypeOptions = input<SelectOption[]>([]);
  fieldErrors = input<Record<string, string | undefined>>({});
  /** Dominio institucional exigido (IDENT-001); vacio si aun no se conoce. */
  emailDomain = input<string>('');
  emailPlaceholder = computed(() => `juan.perez${this.emailDomain() || '@uco.edu.co'}`);

  /** Programas del grupo (GET /grupos/{id}/programas): el selector solo aparece con más de uno. */
  programas = signal<ProgramaResumen[]>([]);
  idPrograma = signal<string>('');
  opcionesPrograma = computed<SelectOption[]>(() =>
    this.programas().map((p) => ({ value: p.idPrograma, label: p.nombrePrograma }))
  );
  /** Con varios programas el docente debe elegir uno antes de matricular. */
  faltaPrograma = computed(() => this.programas().length > 1 && !this.idPrograma());

  docType = signal<string>('');
  code = signal<string>('');
  firstName = signal<string>('');
  secondName = signal<string>('');
  lastName = signal<string>('');
  secondLastName = signal<string>('');
  email = signal<string>('');

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

  submitted = output<MatriculaEstudianteSolicitud>();
  closed = output<void>();
  clearFieldError = output<string>();

  constructor() {
    effect(() => {
      const abierto = this.isOpen();
      const grupo = this.grupoId();
      untracked(() => {
        this.programas.set([]);
        this.idPrograma.set('');
        if (!abierto || !grupo) return;
        this.groupService.getProgramasGrupo(grupo).subscribe({
          next: (res) => {
            const lista = res.datos ?? [];
            this.programas.set(lista);
            if (lista.length === 1) this.idPrograma.set(lista[0].idPrograma);
          },
          // Sin la lista no se muestra selector; el backend responde EST_005 si el grupo exige programa.
          error: () => this.programas.set([]),
        });
      });
    });
  }

  /** Cambio de un dato personal desde el bloque compartido; limpia el error del campo como el resto del modal. */
  alCambiarDato(cambio: CambioDatoPersona): void {
    const destinos: Partial<Record<CambioDatoPersona['campo'], WritableSignal<string>>> = {
      primerNombre: this.firstName,
      segundoNombre: this.secondName,
      primerApellido: this.lastName,
      segundoApellido: this.secondLastName,
      correo: this.email,
    };
    const destino = destinos[cambio.campo];
    if (destino) {
      this.onFieldInput(cambio.campo, cambio.valor, destino);
    }
  }

  onFieldInput(field: string, value: string, signalRef: WritableSignal<string>): void {
    signalRef.set(value);
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
    if (Number.isNaN(numDoc) || numDoc <= 0) {
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
          const status = (error as { status?: number } | null)?.status;
          const code = getApiErrorCode(error);
          if (status === 404 || code === API_ERROR_CODE.RESOURCE_NOT_FOUND) {
            // Estudiante no encontrado (404): abrir formulario de nuevo registro
            this.isExistingStudent.set(false);
            this.limpiarDatosFormulario();
            this.showRegistrationForm.set(true);
            this.searchStatus.set('NOT_FOUND');
            this.searchError.set('');
          } else {
            // 403/500/fallo de red: el backend explica por qué; no se abre el alta para no duplicar una cuenta por un fallo de consulta.
            this.isExistingStudent.set(false);
            this.showRegistrationForm.set(false);
            this.limpiarDatosFormulario();
            this.searchStatus.set('IDLE');
            this.searchError.set(getApiErrorMessage(error));
          }
        },
      });
  }

  private limpiarDatosFormulario(): void {
    this.firstName.set('');
    this.secondName.set('');
    this.lastName.set('');
    this.secondLastName.set('');
    this.email.set('');
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
    if (this.yaMatriculado() || this.faltaPrograma()) {
      return;
    }
    const existente = this.isExistingStudent() && !this.showRegistrationForm();

    // Emitir siempre submitted para que el componente padre calcule y pinte los mensajes
    // de error en rojo debajo de todos los campos obligatorios o inválidos (primerNombre, correo, etc.)
    this.submitted.emit({
      tipoIdentificacionId: this.docType(),
      numeroIdentificacion: this.code().trim(),
      primerNombre: this.firstName().trim(),
      segundoNombre: this.secondName().trim() || undefined,
      primerApellido: this.lastName().trim(),
      segundoApellido: this.secondLastName().trim() || undefined,
      idPrograma: this.programas().length > 1 ? this.idPrograma() : undefined,
      // Un estudiante existente se matricula solo por documento: su correo no sale del modal. IDENT-002: nunca hay
      // contraseña; el estudiante nuevo la define al activar su cuenta.
      correo: existente ? '' : this.email().trim(),
      esNuevoEstudiante: this.showRegistrationForm(),
      estudianteExistente: existente,
    });
  }
}
