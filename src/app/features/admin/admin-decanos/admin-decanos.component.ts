import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CatalogService, TipoIdentificacionItem, FacultadItem } from '../../../core/services/catalog.service';
import { DecanoItem, InstitucionItem } from '../../../core/models/role-management.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { FiltrosPlegablesComponent } from '../../../shared/components/filtros-plegables/filtros-plegables.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { FiltroEstado } from '../../../shared/utils/listado-paginado';
import { SelectorModoComponent, OpcionModo } from '../../../shared/components/selector-modo/selector-modo.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { CambioDatoPersona, DatosPersonaComponent } from '../../../shared/components/datos-persona/datos-persona.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { UserPickerModalComponent, UserPickerItem } from '../../../shared/components/user-picker-modal/user-picker-modal.component';
import { datosDePersonaSeleccionada } from '../../../shared/components/user-picker-modal/datos-persona-seleccionada';
import { AccountAccessStatusComponent } from '../../../shared/components/account-access-status/account-access-status.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { parseIdentificationNumber, validateInstitutionalEmail } from '../../../core/validation/request-form-validation.util';
import { getPersonNameError, getPersonNamesError, getSafeTextError, getStaffEmailError, NAME_MAX_LENGTH } from '../../../core/validation/form-fields.util';
import { StudentRegistrationConfigService } from '../../../core/services/student-registration-config.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { finalize } from 'rxjs';
import { IdentidadEsperada, UltimaPeticion, advertirRegistroNoListado } from '../../../core/utils/registro-confirmado.util';
import { CorreccionIdentidadService } from '../../../core/services/correccion-identidad.service';
import { CorregirIdentidadPayload, IdentidadActual } from '../../../core/models/correccion-identidad.model';
import { CorreccionIdentidadModalComponent } from '../../../shared/components/correccion-identidad-modal/correccion-identidad-modal.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

type VistaAdmin = 'LISTA' | 'REGISTRO';

/** Cómo se resuelve la facultad del decano al registrarlo. */
export type ModoFacultad = 'CREAR' | 'VINCULAR' | 'SIN';

const NOMBRE_FACULTAD_MIN = 3;
const NOMBRE_FACULTAD_MAX = 50;

@Component({
  selector: 'app-admin-decanos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent,
    CommonModule,
    FormsModule,
    BadgeComponent,
    FiltrosPlegablesComponent,
    ErrorCargaComponent,
    PaginationComponent,
    ButtonComponent,
    FormFieldComponent,
    DatosPersonaComponent,
    UserPickerModalComponent,
    AccountAccessStatusComponent,
    CorreccionIdentidadModalComponent,
    SelectorModoComponent,
  ],
  template: `
    <div class="space-y-4 animate-fade-in">
      <!-- 1. VISTA: LISTA DE DECANOS -->
      @if (vistaActual() === 'LISTA') {
        <app-page-header
          [enTarjeta]="true"
          etiqueta="Administración Central"
          contexto="Módulo de Gobierno"
          titulo="Gestión de Decanos"
          descripcion="Administra los decanos asignados a cada facultad institucional y supervisa su estado activo."
        >
          <div cabecera-acciones class="flex items-center gap-3" data-testid="acciones-encabezado">
            <button
              type="button"
              data-testid="accion-registrar-decano"
              (click)="abrirFormularioRegistro()"
              class="min-h-[44px] px-4 py-2.5 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold transition-colors shadow-warm-sm flex items-center gap-2"
            >
              <span>+</span> Registrar decano
            </button>
            <span data-testid="contador-decanos" class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">{{ isLoading() && decanos().length === 0 ? '…' : filteredDecanos().length }} Decanos</span>
          </div>
        </app-page-header>

        <!-- Estado de acceso de la ultima cuenta registrada (verificado por el backend, nunca por la SPA) -->
        <app-account-access-status [correo]="ultimaCuentaRegistrada()" />

        <section class="superficie p-4 space-y-4">
          <app-filtros-plegables [activos]="filtrosActivos()">
            <div buscar>
              <input
                type="search"
                aria-label="Buscar decano por nombre, cédula o facultad"
                [ngModel]="busqueda()"
                (ngModelChange)="onBusqueda($event)"
                placeholder="Buscar por nombre, documento o facultad..."
                class="w-full min-w-0 px-3.5 py-2.5 min-h-[44px] bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
              />
            </div>
            <select
              aria-label="Filtrar decanos por estado"
              [ngModel]="estado()"
              (ngModelChange)="onEstado($event)"
              class="w-full sm:w-64 px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </app-filtros-plegables>

          @if (errorCarga() && !isLoading()) {
            <app-error-carga [error]="errorCarga()!" (reintentar)="cargarDecanos()" />
          } @else if (isLoading() && decanos().length === 0) {
            <p role="status" class="text-sm text-warm-500 text-center py-6">Cargando decanos…</p>
          } @else if (filteredDecanos().length === 0) {
            <p class="text-sm text-warm-500 text-center py-6">No hay decanos que coincidan con la búsqueda.</p>
          } @else {
            <div class="tabla-scroll">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                    <th scope="col" class="py-2 pr-3">Decano</th>
                    <th scope="col" class="py-2 pr-3">Documento</th>
                    <th scope="col" class="py-2 pr-3">Facultad</th>
                    <th scope="col" class="py-2 pr-3">Estado</th>
                    <th scope="col" class="py-2 text-right"><span class="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (decano of decanosPagina(); track decano.id) {
                    <tr class="border-b border-warm-50">
                      <td class="py-2 pr-3">
                        <span class="font-semibold text-warm-900 block">{{ decano.nombreCompleto || (decano.nombres + ' ' + decano.apellidos).trim() }}</span>
                        <span class="text-xs text-warm-500">{{ decano.correo || '—' }}</span>
                      </td>
                      <td class="py-2 pr-3 font-mono text-xs text-warm-600">{{ decano.tipoIdentificacion ? decano.tipoIdentificacion + ' ' : '' }}{{ decano.numeroIdentificacion || '—' }}</td>
                      <td class="py-2 pr-3 text-warm-900">{{ decano.facultad || decano.nombreFacultad || 'Sin Facultad Asignada' }}</td>
                      <td class="py-2 pr-3">
                        <app-badge [variant]="decano.estado === 'ACTIVO' ? 'success' : 'neutral'">{{ decano.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}</app-badge>
                      </td>
                      <td class="py-2 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          data-accion="alternar-estado"
                          class="min-h-[44px] px-2 text-xs font-semibold text-warm-600 hover:underline"
                          (click)="toggleEstado(decano)"
                        >
                          {{ decano.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar' }}
                        </button>
                        <!-- HU159: el administrador corrige los datos de identidad del decano -->
                        <button
                          type="button"
                          data-accion="corregir-identidad"
                          class="min-h-[44px] px-2 text-xs font-semibold text-primary-700 hover:underline"
                          (click)="decanoACorregir.set(decano)"
                        >
                          Corregir datos
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <app-pagination
            [totalItems]="filteredDecanos().length"
            [totalPages]="totalPaginas()"
            [pageSize]="tamano()"
            [currentPage]="pagina()"
            (pageChange)="irAPagina($event)"
            (pageSizeChange)="cambiarTamano($event)"
          ></app-pagination>
        </section>
      }

      <!-- 2. VISTA COMPLETA: FORMULARIO DE REGISTRO DE DECANO -->
      @if (vistaActual() === 'REGISTRO') {
        <!-- Barra Superior de Retorno -->
        <div class="superficie flex items-center justify-between p-4">
          <button
            type="button"
            (click)="volverALista()"
            class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la Gestión de Decanos
          </button>

          <span class="text-xs font-bold text-primary-800 bg-primary-50 border border-primary-200 px-3 py-1 rounded-full">
            Nuevo Registro Institucional
          </span>
        </div>

        <div class="superficie p-4 sm:p-8 max-w-3xl mx-auto space-y-4">
          <div>
            <h2 class="font-serif font-bold text-2xl text-warm-900">
              Registrar Nuevo Decano
            </h2>
            <p class="text-sm text-warm-600 mt-1">
              Ingresa los datos personales para dar de alta la autoridad académica institucional y define su facultad en el mismo paso.
            </p>
          </div>

          <!-- Paso 1: buscar en el directorio institucional; si la persona no existe, se llena a mano -->
          <section class="p-4 rounded-2xl bg-primary-50/70 border border-primary-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" data-testid="paso-directorio">
            <div>
              <p class="text-sm font-semibold text-primary-950">Paso 1 · Buscar en el directorio</p>
              <p class="text-xs text-primary-800">Si la persona ya pertenece a la Universidad, selecciónala para precargar sus datos. Si no aparece, completa el formulario a mano.</p>
            </div>
            <app-button variant="primary" size="sm" type="button" (clicked)="abrirModalSeleccionarDecano()">
              Buscar en el directorio
            </app-button>
          </section>

          <form (ngSubmit)="guardarDecano()" class="space-y-4">
            <app-datos-persona
              [datos]="{
                tipoIdentificacionId: formData.tipoIdentificacionId ?? '',
                numeroIdentificacion: formData.numeroIdentificacion,
                primerNombre: formData.primerNombre ?? '',
                segundoNombre: formData.segundoNombre ?? '',
                primerApellido: formData.primerApellido ?? '',
                segundoApellido: formData.segundoApellido ?? '',
                correo: formData.correo
              }"
              [tiposIdentificacion]="tiposIdentificacion()"
              [errores]="{
                primerNombre: errorNombrePersona('primerNombre'),
                segundoNombre: errorNombrePersona('segundoNombre'),
                primerApellido: errorNombrePersona('primerApellido'),
                segundoApellido: errorNombrePersona('segundoApellido'),
                correo: errorCorreo()
              }"
              placeholderCorreo="decano.facultad@uco.edu.co"
              aviso="No se asigna contraseña. La persona recibirá en su correo institucional un enlace para activar la cuenta y definir su contraseña."
              (cambio)="alCambiarDato($event)"
            />

            <fieldset class="space-y-4 p-4 rounded-2xl border border-warm-200 bg-warm-50/60" data-testid="seccion-facultad">
              <legend class="px-2 text-sm font-bold text-warm-800">Facultad</legend>
              <app-selector-modo etiqueta="Facultad del decano" [opciones]="opcionesModoFacultad" [(valor)]="modoFacultad" />

              @switch (modoFacultad()) {
                @case ('CREAR') {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="facultad-crear">
                    <app-form-field label="Nombre de la facultad" [required]="true" [helperText]="'Entre 3 y 50 caracteres.'" [errorMessage]="errorNombreFacultad()">
                      <input
                        type="text"
                        [(ngModel)]="facultadNueva.nombre"
                        name="facultadNombre"
                        maxlength="50"
                        placeholder="ej. Facultad de Ingeniería"
                        class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </app-form-field>
                    <app-form-field label="Código (Opcional)">
                      <input
                        type="text"
                        [(ngModel)]="facultadNueva.codigo"
                        name="facultadCodigo"
                        placeholder="ej. ING"
                        class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </app-form-field>
                    <div class="sm:col-span-2">
                      <app-form-field label="Institución" [required]="true">
                        <select
                          [(ngModel)]="facultadNueva.idInstitucion"
                          name="facultadInstitucion"
                          class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                          <option value="">{{ instituciones().length === 0 ? '-- No hay instituciones disponibles --' : '-- Selecciona una institución --' }}</option>
                          @for (inst of instituciones(); track inst.id) {
                            <option [value]="inst.id">{{ inst.nombre }}</option>
                          }
                        </select>
                      </app-form-field>
                    </div>
                  </div>
                }
                @case ('VINCULAR') {
                  <div data-testid="facultad-vincular">
                    <app-form-field label="Facultad existente" [required]="true">
                      <select
                        [(ngModel)]="idFacultadExistente"
                        name="facultadExistente"
                        class="w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      >
                        <option value="">{{ facultades().length === 0 ? '-- No hay facultades disponibles --' : '-- Selecciona una facultad --' }}</option>
                        @for (fac of facultades(); track fac.id) {
                          <option [value]="fac.id">{{ fac.nombre }}</option>
                        }
                      </select>
                    </app-form-field>
                    @if (facultades().length === 0) {
                      <p class="mt-2 text-xs text-warning-800 bg-warning-50 border border-warning-200 rounded-xl px-3 py-2" role="status" data-testid="sin-facultades-libres">
                        {{ errorFacultades()
                          ? 'No se pudo cargar el listado de facultades. Intenta de nuevo más tarde.'
                          : 'No hay facultades libres: todas las facultades activas ya tienen un decano. Crea una facultad nueva o registra al decano sin facultad.' }}
                      </p>
                    }
                  </div>
                }
                @case ('SIN') {
                  <p class="text-xs text-warm-600" data-testid="facultad-sin">
                    El decano se registra sin facultad. Podrás asociarla más adelante.
                  </p>
                }
              }
            </fieldset>

            <div class="flex items-center justify-end gap-3 pt-5 border-t border-warm-100">
              <app-button variant="secondary" size="md" type="button" (clicked)="volverALista()">
                Cancelar
              </app-button>
              <app-button variant="primary" size="md" type="submit" [loading]="isSubmitting()" [disabled]="!formularioValido() || isSubmitting()">
                Guardar Decano
              </app-button>
            </div>
          </form>
        </div>
      }

      <!-- Modal de Selección de Decano Existente -->
      <app-user-picker-modal
        [isOpen]="isPickerModalOpen()"
        fuente="INSTITUCION"
        title="Nombrar Decano de Facultad"
        subtitle="Selecciona un directivo, docente o funcionario del claustro institucional para nombrarlo Decano."
        roleBadge="Gobierno Académico UCO"
        (userSelected)="onDecanoSeleccionadoDelDirectorio($event)"
        (requestNew)="onSolicitarRegistroNuevo()"
        (cancelled)="isPickerModalOpen.set(false)"
      />

      @if (decanoACorregir(); as d) {
        <app-correccion-identidad-modal
          titulo="Corregir datos del decano"
          [actual]="identidadDe(d)"
          [guardando]="guardandoCorreccion()"
          [error]="errorCorreccion()"
          (guardar)="corregirDecano(d, $event)"
          (cancelar)="cerrarCorreccion()"
        />
      }
    </div>
  `,
})
export class AdminDecanosComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly catalogService = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly sessionTimeZone = inject(SessionTimeZoneService);
  private readonly correccionIdentidad = inject(CorreccionIdentidadService);
  private readonly registroConfig = inject(StudentRegistrationConfigService);
  /** DEC-073: dominio institucional vigente para el correo del decano (llega del backend). */
  readonly dominioCorreo = signal<string | null>(null);
  readonly maxNombre = NAME_MAX_LENGTH;

  /** HU159: decano cuya identidad se corrige (null = modal cerrado). */
  decanoACorregir = signal<DecanoItem | null>(null);
  guardandoCorreccion = signal(false);
  errorCorreccion = signal<string | null>(null);

  isPickerModalOpen = signal<boolean>(false);
  /** Correo de la ultima cuenta registrada: el panel consulta su estado de acceso real. */
  ultimaCuentaRegistrada = signal<string | null>(null);
  vistaActual = signal<VistaAdmin>('LISTA');
  decanos = signal<DecanoItem[]>([]);
  tiposIdentificacion = signal<TipoIdentificacionItem[]>([]);
  facultades = signal<FacultadItem[]>([]);
  errorFacultades = signal(false);
  readonly instituciones = this.adminService.instituciones;

  readonly opcionesModoFacultad: OpcionModo<ModoFacultad>[] = [
    { valor: 'CREAR', etiqueta: 'Crear facultad nueva' },
    { valor: 'VINCULAR', etiqueta: 'Vincular facultad existente' },
    { valor: 'SIN', etiqueta: 'Sin facultad por ahora' },
  ];
  modoFacultad = signal<ModoFacultad>('CREAR');
  facultadNueva = { nombre: '', codigo: '', idInstitucion: '' };
  idFacultadExistente = '';
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);

  busqueda = signal('');
  private readonly route = inject(ActivatedRoute, { optional: true });
  estado = signal<FiltroEstado>('TODOS');
  /** Filtros aplicados fuera de la busqueda: alimenta la insignia del boton "Filtros". */
  filtrosActivos = computed(() => (this.estado() !== 'TODOS' ? 1 : 0));
  /** Fallo de la ultima carga (null si fue bien): permite ofrecer reintento en vez de una lista vacia. */
  errorCarga = signal<LoadErrorState | null>(null);
  /** La API de decanos no pagina: se pagina en el cliente sobre la lista ya filtrada. */
  pagina = signal(1);
  tamano = signal(10);
  private readonly ultimaPeticionDecanos = new UltimaPeticion();

  formData: Omit<DecanoItem, 'id'> = {
    tipoIdentificacionId: '',
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    nombres: '',
    apellidos: '',
    correo: '',
    facultad: 'Sin Facultad Asignada',
    idFacultad: null,
    fechaAsignacion: this.sessionTimeZone.currentDate(),
    estado: 'ACTIVO',
  };

  filteredDecanos = computed(() => {
    const query = this.busqueda().toLowerCase().trim();
    const estado = this.estado();

    return this.decanos().filter((item) => {
      const nombres = (item.nombres || '').toLowerCase();
      const apellidos = (item.apellidos || '').toLowerCase();
      const nombreCompleto = (item.nombreCompleto || '').toLowerCase();
      const facultad = (item.facultad || item.nombreFacultad || '').toLowerCase();
      const doc = (item.numeroIdentificacion || '');

      const matchQuery =
        !query ||
        nombres.includes(query) ||
        apellidos.includes(query) ||
        nombreCompleto.includes(query) ||
        facultad.includes(query) ||
        doc.includes(query);

      const matchEstado = estado === 'TODOS' || item.estado === estado;

      return matchQuery && matchEstado;
    });
  });

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.filteredDecanos().length / this.tamano())));

  decanosPagina = computed(() => {
    const inicio = (this.pagina() - 1) * this.tamano();
    return this.filteredDecanos().slice(inicio, inicio + this.tamano());
  });

  onBusqueda(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(1);
  }

  onEstado(valor: FiltroEstado): void {
    this.estado.set(valor);
    this.pagina.set(1);
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
  }

  identidadDe(d: DecanoItem): IdentidadActual {
    // CIERRE-W1B: los cuatro campos de nombre los entrega el backend; no se parten cadenas.
    return {
      primerNombre: d.primerNombre ?? '',
      segundoNombre: d.segundoNombre || null,
      primerApellido: d.primerApellido ?? '',
      segundoApellido: d.segundoApellido || null,
      numeroIdentificacion: d.numeroIdentificacion,
      codigoTipoIdentificacion: d.tipoIdentificacion ?? null,
      idTipoIdentificacion: d.tipoIdentificacionId ?? null,
    };
  }

  corregirDecano(d: DecanoItem, payload: CorregirIdentidadPayload): void {
    this.guardandoCorreccion.set(true);
    this.errorCorreccion.set(null);
    this.correccionIdentidad.corregirDecano(d.id, payload).subscribe({
      next: (r) => {
        this.guardandoCorreccion.set(false);
        this.decanoACorregir.set(null);
        if (r.datos?.sincronizacionIdentidad === 'PENDIENTE') {
          this.toast.warning(r.datos.mensajeUsuario ?? mensajeUi('UI_ADMIN_DECANOS_001'));
        } else {
          this.toast.success(mensajeUi('UI_ADMIN_DECANOS_002'));
        }
        this.cargarDecanos();
      },
      error: (e) => {
        this.guardandoCorreccion.set(false);
        this.errorCorreccion.set(getApiErrorMessage(e));
      },
    });
  }

  cerrarCorreccion(): void {
    this.decanoACorregir.set(null);
    this.errorCorreccion.set(null);
  }


  ngOnInit(): void {
    // Acceso rápido del panel («Gestionar Decano»): abre la lista ya filtrada por la facultad.
    const busquedaEnlace = this.route?.snapshot?.queryParamMap?.get('busqueda')?.trim();
    if (busquedaEnlace) this.busqueda.set(busquedaEnlace);
    this.cargarTiposIdentificacion();
    this.cargarFacultades();
    this.cargarInstituciones();
    this.cargarDecanos();
    this.registroConfig.getEmailDomain().subscribe({ next: (d) => this.dominioCorreo.set(d), error: () => this.dominioCorreo.set(null) });
  }

  cargarInstituciones(): void {
    this.adminService.getInstituciones().subscribe({
      next: (res) => this.preseleccionarInstitucion(res.datos ?? []),
      error: (err) => this.toast.warning(getApiErrorMessage(err)),
    });
  }

  private preseleccionarInstitucion(lista: InstitucionItem[]): void {
    if (lista.length === 1 && !this.facultadNueva.idInstitucion) {
      this.facultadNueva.idInstitucion = lista[0].id;
    }
  }

  cargarFacultades(): void {
    // Solo se ofrecen las facultades activas y sin decano: una facultad con decano no puede recibir otro.
    this.adminService.cargarFacultades().subscribe({
      next: (res) => {
        this.errorFacultades.set(false);
        this.facultades.set(
          (res.datos ?? [])
            .filter((f) => f.estado !== 'INACTIVO' && !f.decanoId)
            .map((f) => ({ id: f.id, nombre: f.nombre })),
        );
      },
      error: () => {
        this.facultades.set([]);
        this.errorFacultades.set(true);
      },
    });
  }

  cargarTiposIdentificacion(): void {
    this.catalogService.getTiposIdentificacion().subscribe({
      next: (res) => {
        if (res.datos && res.datos.length > 0) {
          this.tiposIdentificacion.set(res.datos);
          this.formData.tipoIdentificacionId = res.datos[0].id;
          this.formData.tipoIdentificacion = res.datos[0].tipoIdentificacion;
        }
      },
      error: () => console.warn('Usando catálogo local de tipos de documento.'),
    });
  }

  /** Cambio de un dato personal desde el bloque compartido (el documento ya llega solo con digitos). */
  alCambiarDato(cambio: CambioDatoPersona): void {
    if (cambio.campo === 'tipoIdentificacionId') {
      const tipo = this.tiposIdentificacion().find((t) => t.id === cambio.valor);
      if (tipo) {
        this.formData.tipoIdentificacion = tipo.tipoIdentificacion;
        this.formData.tipoIdentificacionId = tipo.id;
      }
      return;
    }
    this.formData[cambio.campo] = cambio.valor;
  }

  cargarDecanos(identidadEsperada?: IdentidadEsperada): void {
    const peticion = this.ultimaPeticionDecanos.iniciar();
    this.isLoading.set(true);
    this.errorCarga.set(null);
    this.adminService.getDecanos().subscribe({
      next: (res) => {
        if (!this.ultimaPeticionDecanos.esVigente(peticion)) {
          return;
        }
        const datos = res.datos || [];
        this.decanos.set(datos);
        // Si la lista se acorto al recargar, la pagina actual puede quedar fuera de rango.
        this.pagina.set(Math.min(this.pagina(), this.totalPaginas()));
        this.isLoading.set(false);
        advertirRegistroNoListado(datos, identidadEsperada, (aviso) => this.toast.warning(aviso));
      },
      error: (err) => {
        if (!this.ultimaPeticionDecanos.esVigente(peticion)) {
          return;
        }
        this.isLoading.set(false);
        this.errorCarga.set(classifyLoadError(err));
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }

  toggleEstado(decano: DecanoItem): void {
    this.adminService.toggleDecanoStatus(decano.id).subscribe({
      next: (res) => {
        if (res.exitoso && res.datos) {
          const updated = this.decanos().map((d) => (d.id === decano.id ? res.datos! : d));
          this.decanos.set(updated);
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_DECANOS_003'));
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  abrirFormularioRegistro(): void {
    this.formData = {
      tipoIdentificacionId: this.tiposIdentificacion().length > 0 ? this.tiposIdentificacion()[0].id : '',
      tipoIdentificacion: this.tiposIdentificacion().length > 0 ? this.tiposIdentificacion()[0].tipoIdentificacion : '',
      numeroIdentificacion: '',
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      nombres: '',
      apellidos: '',
      correo: '',
      facultad: 'Sin Facultad Asignada',
      idFacultad: null,
      fechaAsignacion: this.sessionTimeZone.currentDate(),
      estado: 'ACTIVO',
    };
    this.modoFacultad.set('CREAR');
    this.facultadNueva = { nombre: '', codigo: '', idInstitucion: '' };
    this.idFacultadExistente = '';
    this.preseleccionarInstitucion(this.instituciones());
    this.vistaActual.set('REGISTRO');
  }

  volverALista(): void {
    this.vistaActual.set('LISTA');
  }

  /** Mensaje del nombre de facultad nueva; vacío si es válido o aún no se escribió. */
  errorNombreFacultad(): string {
    const nombre = this.facultadNueva.nombre.trim();
    if (!nombre) {
      return '';
    }
    return nombre.length < NOMBRE_FACULTAD_MIN || nombre.length > NOMBRE_FACULTAD_MAX
      ? mensajeUi('UI_ADMIN_DECANOS_012')
      : getSafeTextError(nombre, 'Nombre de la Facultad') ?? '';
  }

  /** Primer problema de la sección Facultad según el modo elegido; null si es válida. */
  errorFacultad(): string | null {
    switch (this.modoFacultad()) {
      case 'CREAR': {
        const nombre = this.facultadNueva.nombre.trim();
        if (nombre.length < NOMBRE_FACULTAD_MIN || nombre.length > NOMBRE_FACULTAD_MAX) {
          return mensajeUi('UI_ADMIN_DECANOS_013');
        }
        const formato = getSafeTextError(nombre, 'Nombre de la Facultad') ?? getSafeTextError(this.facultadNueva.codigo, 'Código de la Facultad');
        if (formato) {
          return formato;
        }
        return this.facultadNueva.idInstitucion ? null : mensajeUi('UI_ADMIN_DECANOS_014');
      }
      case 'VINCULAR':
        return this.idFacultadExistente ? null : mensajeUi('UI_ADMIN_DECANOS_015');
      default:
        return null;
    }
  }

  /** DEC-073: error de formato de un nombre o apellido (lo obligatorio se avisa al guardar). */
  errorNombrePersona(campo: 'primerNombre' | 'segundoNombre' | 'primerApellido' | 'segundoApellido'): string {
    const etiquetas = { primerNombre: 'Primer Nombre', segundoNombre: 'Segundo Nombre', primerApellido: 'Primer Apellido', segundoApellido: 'Segundo Apellido' };
    return getPersonNameError(this.formData[campo], etiquetas[campo]) ?? '';
  }

  /** DEC-073: error del correo institucional del decano; vacío si aún no se escribió. */
  errorCorreo(): string {
    return (this.formData.correo || '').trim() ? getStaffEmailError(this.formData.correo, this.dominioCorreo()) ?? '' : '';
  }

  /** Habilita Guardar solo cuando datos personales, acceso y facultad son válidos. */
  formularioValido(): boolean {
    const f = this.formData;
    return (
      !!f.tipoIdentificacionId &&
      parseIdentificationNumber(f.numeroIdentificacion).valid &&
      !!(f.primerNombre || '').trim() &&
      !!(f.primerApellido || '').trim() &&
      getPersonNamesError(f) === null &&
      getStaffEmailError(f.correo, this.dominioCorreo()) === null &&
      this.errorFacultad() === null
    );
  }

  private facultadParaPayload(): { idFacultad: string | null; facultadNueva: { nombre: string; codigo?: string; idInstitucion: string } | null } {
    switch (this.modoFacultad()) {
      case 'CREAR': {
        const codigo = this.facultadNueva.codigo.trim();
        return {
          idFacultad: null,
          facultadNueva: {
            nombre: this.facultadNueva.nombre.trim(),
            ...(codigo ? { codigo } : {}),
            idInstitucion: this.facultadNueva.idInstitucion,
          },
        };
      }
      case 'VINCULAR':
        return { idFacultad: this.idFacultadExistente, facultadNueva: null };
      default:
        return { idFacultad: null, facultadNueva: null };
    }
  }

  guardarDecano(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (!this.formData.tipoIdentificacionId) {
      this.toast.warning(mensajeUi('UI_ADMIN_DECANOS_004'));
      return;
    }

    const idResult = parseIdentificationNumber(this.formData.numeroIdentificacion);
    if (!idResult.valid) {
      this.toast.warning(idResult.error);
      return;
    }

    const pn = (this.formData.primerNombre || '').trim();
    const pa = (this.formData.primerApellido || '').trim();
    if (!pn) {
      this.toast.warning(mensajeUi('UI_ADMIN_DECANOS_005'));
      return;
    }
    if (!pa) {
      this.toast.warning(mensajeUi('UI_ADMIN_DECANOS_006'));
      return;
    }

    const nombresError = getPersonNamesError(this.formData);
    if (nombresError) {
      this.toast.warning(nombresError);
      return;
    }

    const emailResult = validateInstitutionalEmail(this.formData.correo);
    if (!emailResult.valid) {
      this.toast.warning(emailResult.error || mensajeUi('UI_ADMIN_DECANOS_007'));
      return;
    }
    const correoError = getStaffEmailError(this.formData.correo, this.dominioCorreo());
    if (correoError) {
      this.toast.warning(correoError);
      return;
    }

    const errorFacultad = this.errorFacultad();
    if (errorFacultad) {
      this.toast.warning(errorFacultad);
      return;
    }

    this.formData.nombres = [pn, (this.formData.segundoNombre || '').trim()].filter(Boolean).join(' ');
    this.formData.apellidos = [pa, (this.formData.segundoApellido || '').trim()].filter(Boolean).join(' ');

    const payload = {
      tipoIdentificacionId: this.formData.tipoIdentificacionId,
      numeroIdentificacion: Number(this.formData.numeroIdentificacion),
      primerNombre: pn,
      segundoNombre: (this.formData.segundoNombre || '').trim(),
      primerApellido: pa,
      segundoApellido: (this.formData.segundoApellido || '').trim(),
      correo: this.formData.correo.trim(),
      ...this.facultadParaPayload(),
    };

    this.isSubmitting.set(true);
    this.adminService.createDecano(payload).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_DECANOS_009'));
          this.ultimaCuentaRegistrada.set(payload.correo);
          this.cargarDecanos({ numeroIdentificacion: String(payload.numeroIdentificacion), correo: payload.correo });
          this.cargarFacultades();
          this.volverALista();
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  abrirModalSeleccionarDecano(): void {
    this.isPickerModalOpen.set(true);
  }

  /** "Persona nueva" en el directorio: se cierra el buscador y se conserva el formulario para llenarlo a mano. */
  onSolicitarRegistroNuevo(): void {
    this.isPickerModalOpen.set(false);
    if (this.vistaActual() !== 'REGISTRO') {
      this.abrirFormularioRegistro();
    }
  }

  onDecanoSeleccionadoDelDirectorio(user: UserPickerItem): void {
    this.isPickerModalOpen.set(false);

    const yaExiste = this.decanos().some(
      (d) =>
        d.id === user.id ||
        (d.numeroIdentificacion && d.numeroIdentificacion === user.numeroIdentificacion) ||
        (d.correo && user.correo && d.correo.toLowerCase() === user.correo.toLowerCase())
    );

    if (yaExiste) {
      this.toast.info(mensajeUi('UI_ADMIN_DECANOS_010', { nombres: user.nombres, apellidos: user.apellidos }));
      return;
    }

    this.abrirFormularioRegistro();
    Object.assign(this.formData, datosDePersonaSeleccionada(user, this.tiposIdentificacion()));
    this.toast.info(mensajeUi('UI_ADMIN_DECANOS_011', { nombres: user.nombres, apellidos: user.apellidos }));
  }
}
