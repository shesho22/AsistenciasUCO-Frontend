import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import {
  AdmisionEstudianteDto,
  AdmisionEstudianteRequest,
  ProgramaInstitucionDto,
} from '../../../core/models/role-management.model';
import { TipoIdentificacionApiDto } from '../../../core/api/models/tipo-identificacion-api-dto.model';
import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors } from '../../../core/api/errors/api-error.util';

const CLASE_INPUT =
  'w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500';

/** Mayor valor de un INT de Java/SQL Server: el backend recibe el documento como entero. */
const MAXIMO_DOCUMENTO = 2_147_483_647;

/** CERT-CULM001 (HU156): el documento es un entero positivo sin ceros a la izquierda que cabe en un INT. */
function esDocumentoEntero(valor: string): boolean {
  const texto = valor.trim();
  return /^[1-9]\d*$/.test(texto) && texto.length <= 10 && Number(texto) <= MAXIMO_DOCUMENTO;
}

/** Campos del formulario que pueden mostrar el error de `details[].field` debajo de su input. */
/** Códigos con los que el backend pide la clave inicial de una persona nueva. */
const CODIGOS_CLAVE_REQUERIDA = new Set(['ADS_006', 'ERR_PASSWORD_REQUERIDO']);

const CAMPOS_FORMULARIO = new Set([
  'tipoIdentificacionId',
  'numeroIdentificacion',
  'primerNombre',
  'segundoNombre',
  'primerApellido',
  'segundoApellido',
  'correo',
  'password',
  'idPrograma',
]);

/**
 * HU156: modal de admisión individual de estudiantes por el Administrador Institucional.
 * Permite registrar un estudiante en un programa activo de la institución sin necesidad de matrícula previa en grupos.
 * Maneja asignación de credenciales (ADS_006), validación de unicidad (ADS_002, ADS_004) y advertencia de estado de cuenta.
 */
@Component({
    selector: 'app-admision-estudiante-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ModalComponent],
    template: `
    <app-modal [isOpen]="isOpen()" title="Admitir nuevo estudiante" (closed)="onCancelar()">
      <div class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <p class="text-xs text-warm-600">
          Registra un estudiante en un programa académico de la institución. Si es un usuario nuevo se creará su cuenta de acceso institucional.
        </p>

        @if (errorGeneral()) {
          <div role="alert" class="p-3 bg-danger-50 border border-danger-200 rounded-xl text-xs text-danger-700">
            {{ errorGeneral() }}
          </div>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Tipo y Número de Documento -->
          <div>
            <label class="block text-xs font-semibold text-warm-700 mb-1">
              Tipo de documento <span class="text-danger-600">*</span>
            </label>
            <select
              aria-label="Tipo de documento"
              [ngModel]="tipoIdentificacionId()"
              (ngModelChange)="tipoIdentificacionId.set($event)"
              [class]="claseInput"
            >
              @for (tipo of tipos(); track tipo.id) {
                <option [value]="tipo.id">{{ tipo.tipoIdentificacion }} · {{ tipo.nombre }}</option>
              }
            </select>
            @if (erroresCampos()['tipoIdentificacionId']) {
              <p class="text-xs text-danger-600 mt-1">{{ erroresCampos()['tipoIdentificacionId'] }}</p>
            }
          </div>

          <div>
            <label class="block text-xs font-semibold text-warm-700 mb-1">
              Número de documento <span class="text-danger-600">*</span>
            </label>
            <input
              type="text"
              inputmode="numeric"
              aria-label="Número de documento"
              maxlength="20"
              [ngModel]="numeroIdentificacion()"
              (ngModelChange)="numeroIdentificacion.set($event)"
              placeholder="Ej. 1017000111"
              [class]="claseInput"
            />
            @if (erroresCampos()['numeroIdentificacion']) {
              <p class="text-xs text-danger-600 mt-1">{{ erroresCampos()['numeroIdentificacion'] }}</p>
            } @else if (documentoInvalido()) {
              <p class="text-xs text-danger-600 mt-1" data-testid="documento-invalido">
                Escribe solo números, sin puntos, espacios ni ceros al inicio (máximo 2147483647).
              </p>
            }
          </div>

          <!-- Nombres -->
          <div>
            <label class="block text-xs font-semibold text-warm-700 mb-1">
              Primer nombre <span class="text-danger-600">*</span>
            </label>
            <input
              type="text"
              aria-label="Primer nombre"
              maxlength="50"
              [ngModel]="primerNombre()"
              (ngModelChange)="primerNombre.set($event)"
              placeholder="Primer nombre"
              [class]="claseInput"
            />
            @if (erroresCampos()['primerNombre']) {
              <p class="text-xs text-danger-600 mt-1">{{ erroresCampos()['primerNombre'] }}</p>
            }
          </div>

          <div>
            <label class="block text-xs font-semibold text-warm-700 mb-1">Segundo nombre</label>
            <input
              type="text"
              aria-label="Segundo nombre"
              maxlength="50"
              [ngModel]="segundoNombre()"
              (ngModelChange)="segundoNombre.set($event)"
              placeholder="Opcional"
              [class]="claseInput"
            />
            @if (erroresCampos()['segundoNombre']) {
              <p class="text-xs text-danger-600 mt-1">{{ erroresCampos()['segundoNombre'] }}</p>
            }
          </div>

          <!-- Apellidos -->
          <div>
            <label class="block text-xs font-semibold text-warm-700 mb-1">
              Primer apellido <span class="text-danger-600">*</span>
            </label>
            <input
              type="text"
              aria-label="Primer apellido"
              maxlength="50"
              [ngModel]="primerApellido()"
              (ngModelChange)="primerApellido.set($event)"
              placeholder="Primer apellido"
              [class]="claseInput"
            />
            @if (erroresCampos()['primerApellido']) {
              <p class="text-xs text-danger-600 mt-1">{{ erroresCampos()['primerApellido'] }}</p>
            }
          </div>

          <div>
            <label class="block text-xs font-semibold text-warm-700 mb-1">Segundo apellido</label>
            <input
              type="text"
              aria-label="Segundo apellido"
              maxlength="50"
              [ngModel]="segundoApellido()"
              (ngModelChange)="segundoApellido.set($event)"
              placeholder="Opcional"
              [class]="claseInput"
            />
            @if (erroresCampos()['segundoApellido']) {
              <p class="text-xs text-danger-600 mt-1">{{ erroresCampos()['segundoApellido'] }}</p>
            }
          </div>

          <!-- Correo Institucional -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-warm-700 mb-1">
              Correo institucional <span class="text-danger-600">*</span>
            </label>
            <input
              type="email"
              aria-label="Correo institucional"
              [ngModel]="correo()"
              (ngModelChange)="correo.set($event)"
              placeholder="ejemplo@uco.edu.co"
              [class]="claseInput"
            />
            @if (erroresCampos()['correo']) {
              <p class="text-xs text-danger-600 mt-1">{{ erroresCampos()['correo'] }}</p>
            }
          </div>

          <!-- Selección de Programa Académico con Búsqueda -->
          <div class="sm:col-span-2 space-y-1.5">
            <label class="block text-xs font-semibold text-warm-700">
              Programa académico institucional <span class="text-danger-600">*</span>
            </label>
            <div class="flex gap-2">
              <input
                type="search"
                aria-label="Buscar programa"
                [ngModel]="busquedaPrograma()"
                (ngModelChange)="onBusquedaProgramaChange($event)"
                (keyup.enter)="buscarProgramas(busquedaPrograma())"
                placeholder="Filtrar programa por código o nombre..."
                [class]="claseInput"
              />
              <button
                type="button"
                (click)="buscarProgramas(busquedaPrograma())"
                class="px-3 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-warm-700 transition-colors"
              >
                Buscar
              </button>
            </div>

            <select
              aria-label="Seleccionar programa académico"
              [ngModel]="idPrograma()"
              (ngModelChange)="idPrograma.set($event)"
              [class]="claseInput"
            >
              <option value="">-- Selecciona un programa --</option>
              @for (p of programas(); track p.id) {
                <option [value]="p.id">
                  {{ p.codigo }} · {{ p.nombre }} ({{ p.nombreFacultad }})
                </option>
              }
            </select>
            @if (erroresCampos()['idPrograma']) {
              <p class="text-xs text-danger-600 mt-1">{{ erroresCampos()['idPrograma'] }}</p>
            }
            <p class="text-xs text-warm-600 mt-1" data-testid="aviso-admitido-sin-grupo">
              {{ avisoSinGrupo }}
            </p>
          </div>

          <!-- Contraseña Inicial (Condicional o requerida ante ADS_006) -->
          @if (mostrarPassword()) {
            <div class="sm:col-span-2 p-3 bg-warm-50 border border-warm-200 rounded-xl space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-warm-800">
                  Contraseña inicial requerida <span class="text-danger-600">*</span>
                </label>
                <span class="text-xs text-warm-500">Mínimo 8 caracteres</span>
              </div>
              <input
                type="password"
                aria-label="Contraseña inicial"
                [ngModel]="password()"
                (ngModelChange)="password.set($event)"
                placeholder="Contraseña segura temporal"
                [class]="claseInput"
              />
              @if (erroresCampos()['password']) {
                <p class="text-xs text-danger-600">{{ erroresCampos()['password'] }}</p>
              }
            </div>
          } @else {
            <div class="sm:col-span-2 flex items-center justify-between pt-1">
              <button
                type="button"
                (click)="mostrarPassword.set(true)"
                class="text-xs font-semibold text-primary-700 hover:underline"
              >
                + Asignar contraseña inicial explícita
              </button>
            </div>
          }
        </div>
      </div>

      <div modal-footer class="flex items-center justify-end gap-3 pt-3 border-t border-warm-100">
        <button
          type="button"
          (click)="onCancelar()"
          class="min-h-[40px] px-4 py-2 rounded-xl border border-warm-300 text-warm-700 text-xs font-semibold hover:bg-warm-100 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          [disabled]="!esValido() || guardando()"
          (click)="onGuardar()"
          class="min-h-[40px] px-5 py-2 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ guardando() ? 'Admitiendo…' : 'Admitir estudiante' }}
        </button>
      </div>
    </app-modal>
  `
})
export class AdmisionEstudianteModalComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly admin = inject(AdminManagementService);
  private readonly toast = inject(ToastService);

  readonly isOpen = input(true);
  /**
   * HU156: la admisión vincula al estudiante con un programa, no con un grupo. La lista de Personas → Estudiantes se
   * arma por grupos, así que el admitido no aparece ahí hasta que se inscriba en uno (decisión de John, 2026-11-11).
   */
  readonly avisoSinGrupo =
    'Aparecerá en la lista de estudiantes cuando esté inscrito en un grupo.';

  readonly cerrar = output<void>();
  readonly admitido = output<AdmisionEstudianteDto>();

  readonly claseInput = CLASE_INPUT;

  readonly tipos = signal<TipoIdentificacionApiDto[]>([]);
  readonly programas = signal<ProgramaInstitucionDto[]>([]);
  readonly buscandoProgramas = signal(false);
  readonly guardando = signal(false);

  // Form fields
  readonly tipoIdentificacionId = signal('');
  readonly numeroIdentificacion = signal('');
  readonly primerNombre = signal('');
  readonly segundoNombre = signal('');
  readonly primerApellido = signal('');
  readonly segundoApellido = signal('');
  readonly correo = signal('');
  readonly idPrograma = signal('');
  readonly busquedaPrograma = signal('');
  readonly password = signal('');
  readonly mostrarPassword = signal(false);

  // Errors
  readonly errorGeneral = signal<string | null>(null);
  readonly erroresCampos = signal<Record<string, string>>({});

  /** El documento tiene texto pero no es un entero válido: se explica por qué el botón está deshabilitado. */
  readonly documentoInvalido = computed(
    () => this.numeroIdentificacion().trim().length > 0 && !esDocumentoEntero(this.numeroIdentificacion())
  );

  readonly esValido = computed(() => {
    return (
      this.tipoIdentificacionId().trim().length > 0 &&
      // CERT-CULM001 (HU156): el documento viaja como entero (INT en el backend), asi que solo se aceptan digitos sin
      // ceros a la izquierda y hasta 2147483647.
      esDocumentoEntero(this.numeroIdentificacion()) &&
      this.primerNombre().trim().length > 0 &&
      this.primerApellido().trim().length > 0 &&
      this.correo().trim().length > 0 &&
      this.idPrograma().trim().length > 0 &&
      (!this.mostrarPassword() || this.password().trim().length > 0)
    );
  });

  ngOnInit(): void {
    this.cargarTipos();
    this.buscarProgramas('');
  }

  private cargarTipos(): void {
    this.catalog.getTiposIdentificacion().subscribe({
      next: (res) => {
        const datos = res?.datos ?? [];
        this.tipos.set(datos);
        if (datos.length > 0 && !this.tipoIdentificacionId()) {
          this.tipoIdentificacionId.set(datos[0].id);
        }
      },
      error: () => this.tipos.set([]),
    });
  }

  onBusquedaProgramaChange(texto: string): void {
    this.busquedaPrograma.set(texto);
    if (!texto.trim()) {
      this.buscarProgramas('');
    }
  }

  buscarProgramas(texto: string): void {
    this.buscandoProgramas.set(true);
    this.admin.getProgramasInstitucion({ texto: texto.trim(), pagina: 1, tamano: 20 }).subscribe({
      next: (res) => {
        this.buscandoProgramas.set(false);
        this.programas.set(res?.elementos ?? []);
      },
      error: () => {
        this.buscandoProgramas.set(false);
        this.programas.set([]);
      },
    });
  }

  onGuardar(): void {
    if (!this.esValido()) {
      return;
    }

    this.guardando.set(true);
    this.errorGeneral.set(null);
    this.erroresCampos.set({});

    const payload: AdmisionEstudianteRequest = {
      tipoIdentificacionId: this.tipoIdentificacionId(),
      // CERT-CULM001 (HU156): el backend espera un entero (AdmitirEstudianteRequest.numeroIdentificacion: Integer);
      // como texto respondia 400 FIELD_INVALID_TYPE y la admision fallaba siempre.
      numeroIdentificacion: Number.parseInt(this.numeroIdentificacion().trim(), 10),
      primerNombre: this.primerNombre().trim(),
      segundoNombre: this.segundoNombre().trim() || undefined,
      primerApellido: this.primerApellido().trim(),
      segundoApellido: this.segundoApellido().trim() || undefined,
      correo: this.correo().trim(),
      password: this.password().trim() || '',
      idPrograma: this.idPrograma(),
    };

    this.admin.admitirEstudiante(payload).subscribe({
      next: (res) => {
        this.guardando.set(false);
        const dto = res.datos;
        if (dto.estadoCuenta === 'ACTIVA') {
          this.toast.success(`Estudiante admitido exitosamente. ${this.avisoSinGrupo}`);
        } else {
          this.toast.warning(
            `Estudiante admitido. La cuenta de acceso quedó en estado ${dto.estadoCuenta}. ${this.avisoSinGrupo}`
          );
        }
        this.admitido.emit(dto);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.procesarError(err);
      },
    });
  }

  /**
   * CERT-CULM001 (HU156): la API responde con el contrato de errores del golden path ({@code code}, {@code message},
   * {@code details[].field/message}); antes se leian {@code codigo}, {@code mensajeUsuario} y {@code details[].campo},
   * asi que el formulario nunca mostraba el error ni pedia la clave inicial (ADS_006).
   *
   * <p>La clave inicial la piden dos codigos: {@code ERR_PASSWORD_REQUERIDO} (la regla del backend, antes de llegar a la
   * BD, cuando la persona es nueva) y {@code ADS_006} (la BD). Con cualquiera de los dos se abre el campo de la clave
   * y el mensaje queda junto a el.</p>
   */
  private procesarError(err: unknown): void {
    const codigo = getApiErrorCode(err);
    const mensaje = getApiErrorMessage(err);

    if (codigo !== null && CODIGOS_CLAVE_REQUERIDA.has(codigo)) {
      this.mostrarPassword.set(true);
      this.erroresCampos.update((m) => ({
        ...m,
        password: mensaje || 'Indica una contraseña inicial para el estudiante nuevo.',
      }));
      return;
    }

    const mapa: Record<string, string> = {};
    for (const detalle of getApiFieldErrors(err)) {
      if (CAMPOS_FORMULARIO.has(detalle.field)) {
        mapa[detalle.field] = detalle.message || 'Campo inválido.';
      }
    }
    this.erroresCampos.set(mapa);
    // Sin errores de campos del formulario, el mensaje va arriba para que el usuario siempre vea qué pasó.
    if (Object.keys(mapa).length === 0) {
      this.errorGeneral.set(mensaje);
    }
  }

  onCancelar(): void {
    this.cerrar.emit();
  }
}
