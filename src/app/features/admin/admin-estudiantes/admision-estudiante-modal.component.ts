import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

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
import { getApiErrorMessage, getApiFieldErrors } from '../../../core/api/errors/api-error.util';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { getPersonNameError, getPersonNamesError, getStaffEmailError } from '../../../core/validation/form-fields.util';
import { StudentRegistrationConfigService } from '../../../core/services/student-registration-config.service';
import {
  CambioDatoPersona,
  CampoPersona,
  DatosPersonaComponent,
} from '../../../shared/components/datos-persona/datos-persona.component';

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
const CAMPOS_FORMULARIO = new Set([
  'tipoIdentificacionId',
  'numeroIdentificacion',
  'primerNombre',
  'segundoNombre',
  'primerApellido',
  'segundoApellido',
  'correo',
  'idPrograma',
]);

/**
 * HU156: modal de admisión individual de estudiantes por el Administrador Institucional.
 * Permite registrar un estudiante en un programa activo de la institución sin necesidad de matrícula previa en grupos.
 * IDENT-002: no asigna contraseña; el estudiante activa su cuenta con el enlace que recibe en su correo institucional.
 * Maneja la validación de unicidad (ADS_002, ADS_004) y la advertencia de estado de cuenta.
 */
@Component({
    selector: 'app-admision-estudiante-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ModalComponent, DatosPersonaComponent],
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
          <div class="sm:col-span-2">
            <app-datos-persona
              [datos]="{
                tipoIdentificacionId: tipoIdentificacionId(),
                numeroIdentificacion: numeroIdentificacion(),
                primerNombre: primerNombre(),
                segundoNombre: segundoNombre(),
                primerApellido: primerApellido(),
                segundoApellido: segundoApellido(),
                correo: correo()
              }"
              [tiposIdentificacion]="tipos()"
              [errores]="erroresPersona()"
              (cambio)="alCambiarDato($event)"
            />
          </div>
          <!-- Selección de Programa Académico con Búsqueda -->
          <div class="sm:col-span-2 space-y-1.5">
            <label for="adm-programa" class="block text-xs font-semibold text-warm-700">
              Programa académico institucional <span class="text-danger-600">*</span>
            </label>
            <div class="relative" #contenedorPrograma>
              <input id="adm-programa"
                type="text"
                role="combobox"
                autocomplete="off"
                aria-label="Programa académico"
                aria-autocomplete="list"
                aria-controls="adm-programa-lista"
                [attr.aria-expanded]="listaAbierta()"
                [ngModel]="busquedaPrograma()"
                (ngModelChange)="onBusquedaProgramaChange($event)"
                (focus)="abrirLista()"
                (blur)="cerrarLista()"
                (keydown)="onTeclaPrograma($event)"
                placeholder="Escribe o despliega para elegir un programa..."
                [class]="claseInput + ' pr-9'"
              />
              <button
                type="button"
                tabindex="-1"
                aria-label="Mostrar programas"
                (mousedown)="$event.preventDefault()"
                (click)="alternarLista()"
                class="absolute inset-y-0 right-0 px-3 text-warm-500 hover:text-warm-700"
              >
                <span aria-hidden="true" class="text-[10px]">{{ listaAbierta() ? '▲' : '▼' }}</span>
              </button>

              @if (listaAbierta()) {
                <ul
                  id="adm-programa-lista"
                  role="listbox"
                  [style]="estiloLista()"
                  class="fixed z-[70] overflow-y-auto bg-white border border-warm-300 rounded-xl shadow-lg py-1"
                >
                  @for (p of programas(); track p.id; let i = $index) {
                    <li
                      role="option"
                      [attr.aria-selected]="p.id === idPrograma()"
                      (mousedown)="$event.preventDefault()"
                      (click)="seleccionarPrograma(p)"
                      class="px-3 py-2 text-xs cursor-pointer text-warm-800 hover:bg-primary-50"
                      [class.bg-primary-50]="i === indiceActivo()"
                    >
                      {{ etiquetaPrograma(p) }}
                    </li>
                  } @empty {
                    <li class="px-3 py-2 text-xs text-warm-500">
                      {{ buscandoProgramas() ? 'Buscando…' : 'Sin programas que coincidan.' }}
                    </li>
                  }
                </ul>
              }
            </div>
            @if (erroresCampos()['idPrograma']) {
              <p class="text-xs text-danger-600 mt-1">{{ erroresCampos()['idPrograma'] }}</p>
            }
            <p class="text-xs text-warm-600 mt-1" data-testid="aviso-admitido-sin-grupo">
              {{ avisoSinGrupo }}
            </p>
          </div>

          <!-- IDENT-002: sin contraseña; el estudiante la define al activar la cuenta -->
          <p class="sm:col-span-2 text-xs text-warm-600" data-testid="aviso-activacion-cuenta">
            {{ avisoActivacion }}
          </p>
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
export class AdmisionEstudianteModalComponent implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly admin = inject(AdminManagementService);
  private readonly toast = inject(ToastService);
  /** DEC-073: dominio institucional vigente (llega del backend). */
  private readonly dominioCorreo = signal<string | null>(null);
  private readonly registroConfig = inject(StudentRegistrationConfigService);

  private readonly contenedorPrograma = viewChild<ElementRef<HTMLElement>>('contenedorPrograma');

  readonly isOpen = input(true);
  /**
   * HU156: la admisión vincula al estudiante con un programa, no con un grupo. La lista de Personas → Estudiantes se
   * arma por grupos, así que el admitido no aparece ahí hasta que se inscriba en uno (decisión de John, 2026-11-11).
   */
  readonly avisoSinGrupo =
    'Aparecerá en la lista de estudiantes cuando esté inscrito en un grupo.';

  /** IDENT-002: el registro no lleva contraseña; la cuenta se activa con el enlace del correo institucional. */
  readonly avisoActivacion =
    'No se asigna contraseña. Si el estudiante es nuevo, recibirá en su correo institucional un enlace para activar la cuenta y definir su contraseña.';

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
      this.errorNombres() === null &&
      !this.errorLocal('correo') &&
      this.idPrograma().trim().length > 0
    );
  });

  /** DEC-073: primer error de formato de nombres y apellidos. */
  private readonly errorNombres = computed(() =>
    getPersonNamesError({
      primerNombre: this.primerNombre(),
      segundoNombre: this.segundoNombre(),
      primerApellido: this.primerApellido(),
      segundoApellido: this.segundoApellido(),
    })
  );

  /** DEC-073: error de formato de un campo antes de enviar; vacío si es válido o aún no se escribió. */
  /** Errores de cada dato personal para el bloque compartido: los del backend (details) y las pre-validaciones locales. */
  readonly erroresPersona = computed<Partial<Record<CampoPersona, string>>>(() => {
    const api = this.erroresCampos();
    const documento = api['numeroIdentificacion']
      || (this.documentoInvalido() ? 'Escribe solo números, sin puntos, espacios ni ceros al inicio (máximo 2147483647).' : '');
    return {
      tipoIdentificacionId: api['tipoIdentificacionId'] ?? '',
      numeroIdentificacion: documento,
      primerNombre: this.errorLocal('primerNombre') || api['primerNombre'] || '',
      segundoNombre: this.errorLocal('segundoNombre') || api['segundoNombre'] || '',
      primerApellido: this.errorLocal('primerApellido') || api['primerApellido'] || '',
      segundoApellido: this.errorLocal('segundoApellido') || api['segundoApellido'] || '',
      correo: this.errorLocal('correo') || api['correo'] || '',
    };
  });

  alCambiarDato(cambio: CambioDatoPersona): void {
    const destinos = {
      tipoIdentificacionId: this.tipoIdentificacionId,
      numeroIdentificacion: this.numeroIdentificacion,
      primerNombre: this.primerNombre,
      segundoNombre: this.segundoNombre,
      primerApellido: this.primerApellido,
      segundoApellido: this.segundoApellido,
      correo: this.correo,
    };
    destinos[cambio.campo].set(cambio.valor);
  }

  errorLocal(campo: 'primerNombre' | 'segundoNombre' | 'primerApellido' | 'segundoApellido' | 'correo'): string {
    if (campo === 'correo') {
      return this.correo().trim() ? getStaffEmailError(this.correo(), this.dominioCorreo()) ?? '' : '';
    }
    const etiquetas = { primerNombre: 'Primer Nombre', segundoNombre: 'Segundo Nombre', primerApellido: 'Primer Apellido', segundoApellido: 'Segundo Apellido' };
    return getPersonNameError(this[campo](), etiquetas[campo]) ?? '';
  }

  ngOnInit(): void {
    document.addEventListener('scroll', this.alDesplazar, true);
    this.registroConfig.getEmailDomain().subscribe({ next: (d) => this.dominioCorreo.set(d), error: () => this.dominioCorreo.set(null) });
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

  readonly listaAbierta = signal(false);
  readonly indiceActivo = signal(-1);
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

  etiquetaPrograma(p: ProgramaInstitucionDto): string {
    // El código puede llegar vacío o nulo del backend: no se muestra "null ·" en ese caso.
    const codigo = p.codigo?.trim();
    const facultad = p.nombreFacultad?.trim();
    return `${codigo ? codigo + ' · ' : ''}${p.nombre}${facultad ? ` (${facultad})` : ''}`;
  }

  /** Escribir filtra en el servidor (con una pequeña espera) y descarta la selección previa si el texto cambia. */
  onBusquedaProgramaChange(texto: string): void {
    this.busquedaPrograma.set(texto);
    this.idPrograma.set('');
    this.indiceActivo.set(-1);
    this.listaAbierta.set(true);
    this.posicionarLista();
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }
    this.temporizadorBusqueda = setTimeout(() => this.buscarProgramas(texto), texto.trim() ? 250 : 0);
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.alDesplazar, true);
    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
    }
  }

  /** La lista flota (position: fixed) sobre el formulario; se posiciona según el campo y se reubica al hacer scroll o redimensionar. */
  readonly estiloLista = signal<Record<string, string>>({});

  /** El scroll no burbujea: se escucha en fase de captura para reubicar la lista si se desplaza el formulario. */
  private readonly alDesplazar = (): void => this.posicionarLista();

  @HostListener('window:resize')
  posicionarLista(): void {
    const caja = this.contenedorPrograma()?.nativeElement;
    if (!caja || !this.listaAbierta()) {
      return;
    }
    const r = caja.getBoundingClientRect();
    const altoDeseado = 224;
    const abajo = window.innerHeight - r.bottom - 8;
    const arriba = r.top - 8;
    const haciaArriba = abajo < 140 && arriba > abajo;
    const alto = Math.min(altoDeseado, haciaArriba ? arriba : abajo);
    this.estiloLista.set({
      left: `${r.left}px`,
      width: `${r.width}px`,
      maxHeight: `${alto}px`,
      ...(haciaArriba ? { bottom: `${window.innerHeight - r.top + 4}px` } : { top: `${r.bottom + 4}px` }),
    });
  }

  abrirLista(): void {
    this.listaAbierta.set(true);
    this.posicionarLista();
  }

  cerrarLista(): void {
    this.listaAbierta.set(false);
    this.indiceActivo.set(-1);
  }

  alternarLista(): void {
    this.listaAbierta.update((v) => !v);
    this.posicionarLista();
  }

  seleccionarPrograma(p: ProgramaInstitucionDto): void {
    this.idPrograma.set(p.id);
    this.busquedaPrograma.set(this.etiquetaPrograma(p));
    this.cerrarLista();
  }

  onTeclaPrograma(evento: KeyboardEvent): void {
    const total = this.programas().length;
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        this.listaAbierta.set(true);
        this.indiceActivo.update((i) => (total === 0 ? -1 : (i + 1) % total));
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.indiceActivo.update((i) => (total === 0 ? -1 : (i <= 0 ? total - 1 : i - 1)));
        break;
      case 'Enter': {
        const p = this.programas()[this.indiceActivo()];
        if (this.listaAbierta() && p) {
          evento.preventDefault();
          this.seleccionarPrograma(p);
        }
        break;
      }
      case 'Escape':
        this.cerrarLista();
        break;
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
      idPrograma: this.idPrograma(),
    };

    this.admin.admitirEstudiante(payload).subscribe({
      next: (res) => {
        this.guardando.set(false);
        const dto = res.datos;
        if (dto.estadoCuenta === 'ACTIVA') {
          this.toast.success(mensajeUi('UI_ADMISION_ESTUDIANTE_MODAL_001', { aviso: this.avisoSinGrupo }));
        } else {
          this.toast.warning(
            mensajeUi('UI_ADMISION_ESTUDIANTE_MODAL_002', { estado: dto.estadoCuenta, aviso: this.avisoSinGrupo })
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
   * asi que el formulario nunca mostraba el error.
   */
  private procesarError(err: unknown): void {
    const mensaje = getApiErrorMessage(err);

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
