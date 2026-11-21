import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { classifyLoadError, LoadErrorState } from '../../../core/api/errors/load-error.util';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { MotivoCancelacionSesionAdmin } from '../../../core/models/catalogo-admin.model';
import { AdminCatalogosService } from '../../../core/services/admin-catalogos.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TablaDatosComponent } from '../../../shared/components/tabla-datos/tabla-datos.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { CLASE_CONTROL_CATALOGO } from './categorias-justificacion-admin.component';

const CODIGO_VALIDO = /^[A-Z0-9_]+$/;
const ORDEN_VALIDO = /^[1-9]\d*$/;

/** Gestión de los motivos de cancelación de sesión (solo ADMINISTRADOR): alta, edición y activación/desactivación. */
@Component({
  selector: 'app-motivos-cancelacion-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    ErrorCargaComponent,
    FormFieldComponent,
    ModalComponent,
    TablaDatosComponent,
  ],
  template: `
    <section class="space-y-3" aria-labelledby="motivos-titulo" data-testid="motivos-seccion">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 id="motivos-titulo" class="text-lg font-bold font-serif text-warm-900">Motivos de cancelación de sesión</h2>
          <p class="text-sm text-warm-600">Motivos que el docente puede indicar al cancelar una sesión, en el orden en que se ofrecen.</p>
        </div>
        <app-button variant="primary" size="sm" (clicked)="abrirCrear()">
          <span data-testid="motivo-nuevo">Nuevo motivo</span>
        </app-button>
      </div>

      @if (error(); as e) {
        <app-error-carga [error]="e" (reintentar)="cargar()" />
      } @else {
        <app-tabla-datos
          etiqueta="Motivos de cancelación de sesión"
          [columnas]="5"
          [cargando]="cargando()"
          [vacio]="!cargando() && filas().length === 0"
          mensajeVacio="No hay motivos de cancelación registrados."
          anchoMinimo="40rem"
        >
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Nombre</th>
              <th scope="col">Orden</th>
              <th scope="col">Estado</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (m of filas(); track m.id) {
              <tr [attr.data-testid]="'motivo-fila-' + m.id">
                <td class="font-mono text-warm-900">{{ m.codigo }}</td>
                <td class="font-semibold text-warm-900">{{ m.nombre }}</td>
                <td class="font-mono text-warm-700">{{ m.orden }}</td>
                <td>
                  <app-badge [variant]="m.estaActivo ? 'success' : 'neutral'">{{ m.estaActivo ? 'Activo' : 'Inactivo' }}</app-badge>
                </td>
                <td class="text-right whitespace-nowrap">
                  <app-button variant="ghost" size="sm" (clicked)="abrirEditar(m)">
                    <span [attr.data-testid]="'motivo-editar-' + m.id">Editar<span class="sr-only"> {{ m.nombre }}</span></span>
                  </app-button>
                  <app-button variant="ghost" size="sm" (clicked)="pedirCambioEstado(m)">
                    <span [attr.data-testid]="'motivo-estado-' + m.id">
                      {{ m.estaActivo ? 'Desactivar' : 'Activar' }}<span class="sr-only"> {{ m.nombre }}</span>
                    </span>
                  </app-button>
                </td>
              </tr>
            }
          </tbody>
        </app-tabla-datos>
      }
    </section>

    <app-modal
      [isOpen]="formAbierto()"
      [title]="editando() ? 'Editar motivo de cancelación' : 'Nuevo motivo de cancelación'"
      tamano="md"
      (closed)="cerrarForm()"
    >
      <form class="space-y-4" (submit)="$event.preventDefault(); guardar()" data-testid="motivo-form">
        <app-form-field
          label="Código"
          [required]="true"
          [helperText]="editando() ? 'El código no se puede modificar.' : 'Hasta 50 caracteres: A-Z, 0-9 y _.'"
          [errorMessage]="errorCodigo()"
        >
          <input
            type="text"
            name="codigo"
            maxlength="50"
            [value]="codigo()"
            [disabled]="editando() !== null"
            (input)="codigo.set($any($event.target).value.toUpperCase())"
            [class]="claseControl + ' font-mono'"
          />
        </app-form-field>
        <app-form-field label="Nombre" [required]="true" helperText="Hasta 200 caracteres." [errorMessage]="errorNombre()">
          <input type="text" name="nombre" maxlength="200" [value]="nombre()" (input)="nombre.set($any($event.target).value)" [class]="claseControl" />
        </app-form-field>
        <app-form-field
          label="Orden"
          [required]="editando() !== null"
          [helperText]="editando() ? 'Número entero desde 1.' : 'Opcional: número entero desde 1.'"
          [errorMessage]="errorOrden()"
        >
          <input
            type="text"
            name="orden"
            inputmode="numeric"
            [value]="orden()"
            (input)="orden.set($any($event.target).value)"
            [class]="claseControl"
          />
        </app-form-field>
        @if (errorGuardado()) {
          <p role="alert" data-testid="motivo-error" class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3 break-words">
            {{ errorGuardado() }}
          </p>
        }
      </form>
      <div modal-footer class="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
        <app-button variant="secondary" (clicked)="cerrarForm()">Cancelar</app-button>
        <app-button variant="primary" [loading]="guardando()" [disabled]="!formValido()" (clicked)="guardar()">
          <span data-testid="motivo-guardar">Guardar</span>
        </app-button>
      </div>
    </app-modal>

    <app-confirm-dialog
      [isOpen]="porCambiar() !== null"
      [title]="porCambiar()?.estaActivo ? 'Desactivar motivo' : 'Activar motivo'"
      [message]="mensajeConfirmacion()"
      [confirmLabel]="porCambiar()?.estaActivo ? 'Desactivar' : 'Activar'"
      [destructive]="porCambiar()?.estaActivo === true"
      (confirmed)="confirmarCambioEstado()"
      (cancelled)="porCambiar.set(null)"
    />
  `,
})
export class MotivosCancelacionAdminComponent implements OnInit {
  private readonly servicio = inject(AdminCatalogosService);
  private readonly toast = inject(ToastService);

  protected readonly claseControl = CLASE_CONTROL_CATALOGO;

  readonly filas = signal<MotivoCancelacionSesionAdmin[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<LoadErrorState | null>(null);

  readonly formAbierto = signal(false);
  readonly editando = signal<MotivoCancelacionSesionAdmin | null>(null);
  readonly guardando = signal(false);
  readonly errorGuardado = signal('');
  readonly codigo = signal('');
  readonly nombre = signal('');
  readonly orden = signal('');

  readonly porCambiar = signal<MotivoCancelacionSesionAdmin | null>(null);

  readonly errorCodigo = computed(() => {
    const v = this.codigo();
    if (this.editando() || v === '') return '';
    return CODIGO_VALIDO.test(v) && v.length <= 50 ? '' : 'Use hasta 50 caracteres: A-Z, 0-9 y _.';
  });
  readonly errorNombre = computed(() => (this.nombre().length > 200 ? 'Máximo 200 caracteres.' : ''));
  readonly errorOrden = computed(() => {
    const v = this.orden().trim();
    if (v === '') return '';
    return ORDEN_VALIDO.test(v) ? '' : 'Escriba un número entero desde 1.';
  });
  readonly formValido = computed(
    () =>
      this.nombre().trim() !== '' &&
      (this.editando() !== null || this.codigo() !== '') &&
      (this.editando() === null || this.orden().trim() !== '') &&
      this.errorCodigo() === '' &&
      this.errorNombre() === '' &&
      this.errorOrden() === ''
  );

  readonly mensajeConfirmacion = computed(() => {
    const m = this.porCambiar();
    if (!m) return '';
    return m.estaActivo
      ? `¿Desactivar el motivo «${m.nombre}»? Dejará de ofrecerse al cancelar sesiones.`
      : `¿Activar el motivo «${m.nombre}»?`;
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listarMotivos().subscribe({
      next: (res) => {
        this.filas.set(res.datos ?? []);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.filas.set([]);
        this.error.set(classifyLoadError(err));
        this.cargando.set(false);
      },
    });
  }

  abrirCrear(): void {
    this.editando.set(null);
    this.codigo.set('');
    this.nombre.set('');
    this.orden.set('');
    this.errorGuardado.set('');
    this.formAbierto.set(true);
  }

  abrirEditar(m: MotivoCancelacionSesionAdmin): void {
    this.editando.set(m);
    this.codigo.set(m.codigo);
    this.nombre.set(m.nombre);
    this.orden.set(String(m.orden));
    this.errorGuardado.set('');
    this.formAbierto.set(true);
  }

  cerrarForm(): void {
    if (this.guardando()) return;
    this.formAbierto.set(false);
  }

  guardar(): void {
    if (this.guardando() || !this.formValido()) return;
    this.guardando.set(true);
    this.errorGuardado.set('');
    const nombre = this.nombre().trim();
    const ordenTexto = this.orden().trim();
    const actual = this.editando();
    const peticion = actual
      ? this.servicio.editarMotivo(actual.id, { nombre, orden: Number(ordenTexto) })
      : this.servicio.crearMotivo({
          codigo: this.codigo(),
          nombre,
          ...(ordenTexto ? { orden: Number(ordenTexto) } : {}),
        });
    peticion.subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.formAbierto.set(false);
        this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_CATALOGOS_001'));
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.errorGuardado.set(getApiErrorMessage(err));
      },
    });
  }

  pedirCambioEstado(m: MotivoCancelacionSesionAdmin): void {
    this.porCambiar.set(m);
  }

  confirmarCambioEstado(): void {
    const m = this.porCambiar();
    this.porCambiar.set(null);
    if (!m) return;
    this.servicio.cambiarEstadoMotivo(m.id, !m.estaActivo).subscribe({
      next: (res) => {
        this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_CATALOGOS_002'));
        this.cargar();
      },
      error: (err: unknown) => this.toast.error(getApiErrorMessage(err)),
    });
  }
}
