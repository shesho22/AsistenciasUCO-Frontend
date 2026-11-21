import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { classifyLoadError, LoadErrorState } from '../../../core/api/errors/load-error.util';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { CategoriaJustificacionAdmin } from '../../../core/models/catalogo-admin.model';
import { AdminCatalogosService } from '../../../core/services/admin-catalogos.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TablaDatosComponent } from '../../../shared/components/tabla-datos/tabla-datos.component';
import { ToastService } from '../../../shared/components/toast/toast.component';

const CODIGO_VALIDO = /^[A-Z0-9_]+$/;
const TEXTO_SIN_ANGULOS = /^[^<>]*$/;
export const CLASE_CONTROL_CATALOGO =
  'w-full px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20';

/** Gestión de las categorías de justificación (solo ADMINISTRADOR): alta, edición y activación/desactivación. */
@Component({
  selector: 'app-categorias-justificacion-admin',
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
    <section class="space-y-3" aria-labelledby="categorias-titulo" data-testid="categorias-seccion">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 id="categorias-titulo" class="text-lg font-bold font-serif text-warm-900">Categorías de justificación</h2>
          <p class="text-sm text-warm-600">Motivos con los que un estudiante puede justificar una inasistencia.</p>
        </div>
        <app-button variant="primary" size="sm" (clicked)="abrirCrear()">
          <span data-testid="categoria-nueva">Nueva categoría</span>
        </app-button>
      </div>

      @if (error(); as e) {
        <app-error-carga [error]="e" (reintentar)="cargar()" />
      } @else {
        <app-tabla-datos
          etiqueta="Categorías de justificación"
          [columnas]="6"
          [cargando]="cargando()"
          [vacio]="!cargando() && filas().length === 0"
          mensajeVacio="No hay categorías de justificación registradas."
          anchoMinimo="44rem"
        >
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Nombre</th>
              <th scope="col">Descripción</th>
              <th scope="col">Requiere soporte</th>
              <th scope="col">Estado</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (c of filas(); track c.id) {
              <tr [attr.data-testid]="'categoria-fila-' + c.id">
                <td class="font-mono text-warm-900">{{ c.codigo }}</td>
                <td class="font-semibold text-warm-900">{{ c.nombre }}</td>
                <td class="text-warm-700">{{ c.descripcion || '—' }}</td>
                <td class="text-warm-700">{{ c.requiereSoporte ? 'Sí' : 'No' }}</td>
                <td>
                  <app-badge [variant]="c.estaActivo ? 'success' : 'neutral'">{{ c.estaActivo ? 'Activo' : 'Inactivo' }}</app-badge>
                </td>
                <td class="text-right whitespace-nowrap">
                  <app-button variant="ghost" size="sm" (clicked)="abrirEditar(c)">
                    <span [attr.data-testid]="'categoria-editar-' + c.id">Editar<span class="sr-only"> {{ c.nombre }}</span></span>
                  </app-button>
                  <app-button variant="ghost" size="sm" (clicked)="pedirCambioEstado(c)">
                    <span [attr.data-testid]="'categoria-estado-' + c.id">
                      {{ c.estaActivo ? 'Desactivar' : 'Activar' }}<span class="sr-only"> {{ c.nombre }}</span>
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
      [title]="editando() ? 'Editar categoría de justificación' : 'Nueva categoría de justificación'"
      tamano="md"
      (closed)="cerrarForm()"
    >
      <form class="space-y-4" (submit)="$event.preventDefault(); guardar()" data-testid="categoria-form">
        <app-form-field
          label="Código"
          [required]="true"
          [helperText]="editando() ? 'El código no se puede modificar.' : 'Hasta 5 caracteres: A-Z, 0-9 y _.'"
          [errorMessage]="errorCodigo()"
        >
          <input
            type="text"
            name="codigo"
            maxlength="5"
            [value]="codigo()"
            [disabled]="editando() !== null"
            (input)="codigo.set($any($event.target).value.toUpperCase())"
            [class]="claseControl + ' font-mono'"
          />
        </app-form-field>
        <app-form-field label="Nombre" [required]="true" helperText="Hasta 50 caracteres." [errorMessage]="errorNombre()">
          <input type="text" name="nombre" maxlength="50" [value]="nombre()" (input)="nombre.set($any($event.target).value)" [class]="claseControl" />
        </app-form-field>
        <app-form-field label="Descripción" helperText="Opcional, hasta 250 caracteres, sin los signos menor y mayor que." [errorMessage]="errorDescripcion()">
          <textarea
            name="descripcion"
            rows="3"
            maxlength="250"
            [value]="descripcion()"
            (input)="descripcion.set($any($event.target).value)"
            [class]="claseControl"
          ></textarea>
        </app-form-field>
        <label class="flex items-center gap-2 text-sm text-warm-800 min-h-[44px]">
          <input
            type="checkbox"
            name="requiereSoporte"
            [checked]="requiereSoporte()"
            (change)="requiereSoporte.set($any($event.target).checked)"
            class="h-4 w-4 rounded border-warm-300 text-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500"
          />
          Requiere soporte documental
        </label>
        @if (errorGuardado()) {
          <p role="alert" data-testid="categoria-error" class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3 break-words">
            {{ errorGuardado() }}
          </p>
        }
      </form>
      <div modal-footer class="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
        <app-button variant="secondary" (clicked)="cerrarForm()">Cancelar</app-button>
        <app-button variant="primary" [loading]="guardando()" [disabled]="!formValido()" (clicked)="guardar()">
          <span data-testid="categoria-guardar">Guardar</span>
        </app-button>
      </div>
    </app-modal>

    <app-confirm-dialog
      [isOpen]="porCambiar() !== null"
      [title]="porCambiar()?.estaActivo ? 'Desactivar categoría' : 'Activar categoría'"
      [message]="mensajeConfirmacion()"
      [confirmLabel]="porCambiar()?.estaActivo ? 'Desactivar' : 'Activar'"
      [destructive]="porCambiar()?.estaActivo === true"
      (confirmed)="confirmarCambioEstado()"
      (cancelled)="porCambiar.set(null)"
    />
  `,
})
export class CategoriasJustificacionAdminComponent implements OnInit {
  private readonly servicio = inject(AdminCatalogosService);
  private readonly toast = inject(ToastService);

  protected readonly claseControl = CLASE_CONTROL_CATALOGO;

  readonly filas = signal<CategoriaJustificacionAdmin[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<LoadErrorState | null>(null);

  readonly formAbierto = signal(false);
  readonly editando = signal<CategoriaJustificacionAdmin | null>(null);
  readonly guardando = signal(false);
  readonly errorGuardado = signal('');
  readonly codigo = signal('');
  readonly nombre = signal('');
  readonly descripcion = signal('');
  readonly requiereSoporte = signal(false);

  readonly porCambiar = signal<CategoriaJustificacionAdmin | null>(null);

  readonly errorCodigo = computed(() => {
    const v = this.codigo();
    if (this.editando() || v === '') return '';
    return CODIGO_VALIDO.test(v) && v.length <= 5 ? '' : 'Use hasta 5 caracteres: A-Z, 0-9 y _.';
  });
  readonly errorNombre = computed(() => (this.nombre().length > 50 ? 'Máximo 50 caracteres.' : ''));
  readonly errorDescripcion = computed(() => {
    const v = this.descripcion();
    if (v.length > 250) return 'Máximo 250 caracteres.';
    return TEXTO_SIN_ANGULOS.test(v) ? '' : 'No use los signos menor ni mayor que.';
  });
  readonly formValido = computed(
    () =>
      this.nombre().trim() !== '' &&
      (this.editando() !== null || this.codigo() !== '') &&
      this.errorCodigo() === '' &&
      this.errorNombre() === '' &&
      this.errorDescripcion() === ''
  );

  readonly mensajeConfirmacion = computed(() => {
    const c = this.porCambiar();
    if (!c) return '';
    return c.estaActivo
      ? `¿Desactivar la categoría «${c.nombre}»? Dejará de estar disponible para nuevas justificaciones.`
      : `¿Activar la categoría «${c.nombre}»?`;
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listarCategorias().subscribe({
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
    this.descripcion.set('');
    this.requiereSoporte.set(false);
    this.errorGuardado.set('');
    this.formAbierto.set(true);
  }

  abrirEditar(c: CategoriaJustificacionAdmin): void {
    this.editando.set(c);
    this.codigo.set(c.codigo);
    this.nombre.set(c.nombre);
    this.descripcion.set(c.descripcion ?? '');
    this.requiereSoporte.set(c.requiereSoporte);
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
    const descripcion = this.descripcion().trim();
    const base = {
      nombre: this.nombre().trim(),
      requiereSoporte: this.requiereSoporte(),
      ...(descripcion ? { descripcion } : {}),
    };
    const actual = this.editando();
    const peticion = actual
      ? this.servicio.editarCategoria(actual.id, base)
      : this.servicio.crearCategoria({ codigo: this.codigo(), ...base });
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

  pedirCambioEstado(c: CategoriaJustificacionAdmin): void {
    this.porCambiar.set(c);
  }

  confirmarCambioEstado(): void {
    const c = this.porCambiar();
    this.porCambiar.set(null);
    if (!c) return;
    this.servicio.cambiarEstadoCategoria(c.id, !c.estaActivo).subscribe({
      next: (res) => {
        this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_CATALOGOS_002'));
        this.cargar();
      },
      error: (err: unknown) => this.toast.error(getApiErrorMessage(err)),
    });
  }
}
