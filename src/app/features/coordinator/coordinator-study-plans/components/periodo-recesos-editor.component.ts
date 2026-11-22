import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CoordinatorManagementService } from '../../../../core/services/coordinator-management.service';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { getFreeTextError } from '../../../../core/validation/form-fields.util';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { RECESO_MOTIVO_MAXIMO, RecesoAcademico, RecesoPendiente } from '../../../../core/models/receso-academico.model';

/** `yyyy-MM-dd` → `dd/MM/yyyy` sin pasar por `Date` (sin desfase de zona horaria). */
export function fechaCorta(fechaIso: string): string {
  const [anio, mes, dia] = (fechaIso ?? '').split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : (fechaIso ?? '');
}

/** Rótulo del estado de un día de receso: lo que canceló o «Sin aplicar». */
export function estadoReceso(receso: Pick<RecesoAcademico, 'estaAplicado' | 'sesionesCanceladas'>): string {
  if (!receso.estaAplicado) return 'Sin aplicar';
  return `Aplicado: ${receso.sesionesCanceladas} ${receso.sesionesCanceladas === 1 ? 'clase cancelada' : 'clases canceladas'}`;
}

/**
 * DEC-081: sección «Días de receso académico» del formulario del período.
 *
 * - Sin `idPeriodo` (alta): los días se acumulan en `pendientes`; el padre los registra uno a uno cuando el período ya existe.
 *   Aquí solo se valida la forma (fecha dentro del rango del formulario, motivo no vacío y de hasta 200 caracteres).
 * - Con `idPeriodo` (edición): lista los días del período y registra o retira cada uno al instante. Los textos de éxito y
 *   de error son los del backend; la validación real (festivo, fecha futura, repetida, período cerrado) es suya.
 */
@Component({
  selector: 'app-periodo-recesos-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FormFieldComponent],
  template: `
    <section class="space-y-3 rounded-2xl border border-warm-200 bg-warm-50/60 p-4" aria-labelledby="titulo-recesos-periodo" data-testid="seccion-recesos">
      <div>
        <h3 id="titulo-recesos-periodo" class="text-sm font-bold text-warm-900">Días de receso académico</h3>
        <p class="text-xs text-warm-600" data-testid="nota-recesos">
          Al agregar un día se cancelan sus clases en todos los grupos del período y se avisa por correo a estudiantes y docentes.
          Un día que ya canceló clases no se puede retirar.
        </p>
        @if (!esEdicion()) {
          <p class="mt-1 text-xs text-warm-600">Los días se registran cuando guardes el período.</p>
        } @else {
          <p class="mt-1 text-xs text-warm-600">Cada día se registra o se retira al instante; no hace falta guardar el período.</p>
        }
      </div>

      @if (esEdicion()) {
        @if (cargando()) {
          <p class="text-xs text-warm-600" role="status">Cargando los días de receso...</p>
        } @else if (errorCarga()) {
          <p class="text-xs font-semibold text-danger-700" role="alert" data-testid="error-carga-recesos">{{ errorCarga() }}</p>
        } @else if (recesos().length === 0) {
          <p class="text-xs text-warm-600" data-testid="sin-recesos">Este período no tiene días de receso.</p>
        } @else {
          <div class="tabla-scroll rounded-xl border border-warm-200 bg-white">
            <table class="tabla tabla-tarjetas" aria-label="Días de receso del período">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Estado</th>
                  <th scope="col" class="col-acciones bg-warm-100"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (r of recesos(); track r.id) {
                  <tr data-testid="receso-fila">
                    <td data-label="Fecha" class="whitespace-nowrap tabular-nums">{{ fecha(r.fecha) }}</td>
                    <td data-label="Motivo" class="break-words">{{ r.motivo }}</td>
                    <td data-label="Estado" data-testid="receso-estado">{{ estado(r) }}</td>
                    <td class="col-acciones bg-white text-right">
                      @if (r.puedeRetirarse) {
                        <button
                          type="button"
                          data-testid="retirar-receso"
                          [disabled]="retirando() === r.id"
                          [attr.aria-label]="'Retirar el receso del ' + fecha(r.fecha)"
                          (click)="retirar(r)"
                          class="text-xs font-semibold text-danger-700 hover:text-danger-900 disabled:opacity-40"
                        >
                          Retirar
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else {
        @if (pendientes().length === 0) {
          <p class="text-xs text-warm-600" data-testid="sin-pendientes">Todavía no agregaste días de receso.</p>
        } @else {
          <ul class="space-y-1.5" data-testid="lista-pendientes" aria-label="Días de receso por registrar">
            @for (p of pendientes(); track p.fecha) {
              <li class="flex items-start justify-between gap-2 rounded-xl border border-warm-200 bg-white px-3 py-2 text-xs" data-testid="pendiente-fila">
                <span class="min-w-0 break-words">
                  <span class="font-semibold tabular-nums text-warm-900">{{ fecha(p.fecha) }}</span>
                  <span class="text-warm-700"> · {{ p.motivo }}</span>
                  @if (fueraDeRango(p.fecha)) {
                    <span class="block font-semibold text-warning-800" data-testid="pendiente-fuera">Queda fuera de las fechas del período.</span>
                  }
                </span>
                <button
                  type="button"
                  data-testid="quitar-pendiente"
                  [attr.aria-label]="'Quitar el receso del ' + fecha(p.fecha)"
                  (click)="quitar(p)"
                  class="shrink-0 font-semibold text-danger-700 hover:text-danger-900"
                >
                  Quitar
                </button>
              </li>
            }
          </ul>
        }
      }

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-[11rem_1fr_auto] sm:items-start" data-testid="form-receso">
        <app-form-field label="Fecha del receso" [errorMessage]="errorFecha()">
          <input
            name="fechaReceso"
            type="date"
            data-testid="receso-fecha"
            [min]="fechaInicio()"
            [max]="fechaFin()"
            [ngModelOptions]="{ standalone: true }"
            [ngModel]="fechaNueva()"
            (ngModelChange)="fechaNueva.set($event)"
            class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
          />
        </app-form-field>
        <app-form-field label="Motivo" [errorMessage]="errorMotivo()">
          <input
            name="motivoReceso"
            type="text"
            data-testid="receso-motivo"
            [attr.maxlength]="motivoMaximo"
            placeholder="Semana Santa"
            autocomplete="off"
            [ngModelOptions]="{ standalone: true }"
            [ngModel]="motivoNuevo()"
            (ngModelChange)="motivoNuevo.set($event)"
            (keydown.enter)="alEnter($event)"
            class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700"
          />
        </app-form-field>
        <div class="sm:pt-[1.625rem]">
          <button
            type="button"
            data-testid="agregar-receso"
            [disabled]="!puedeAgregar() || enviando()"
            (click)="agregar()"
            class="w-full whitespace-nowrap rounded-xl border border-primary-700 bg-white px-3.5 py-2 text-xs font-semibold text-primary-700 disabled:opacity-40 sm:w-auto"
          >
            {{ enviando() ? 'Agregando...' : 'Agregar' }}
          </button>
        </div>
      </div>

      @if (errorAgregar()) {
        <p class="text-xs font-semibold text-danger-700" role="alert" data-testid="error-agregar-receso">{{ errorAgregar() }}</p>
      }
    </section>
  `,
})
export class PeriodoRecesosEditorComponent implements OnInit {
  private readonly servicio = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);

  /** Período existente (edición). Sin él, el formulario es de alta y los días quedan pendientes. */
  readonly idPeriodo = input<string | null>(null);
  /** Rango del formulario del período (`yyyy-MM-dd`); solo se usa para validar la forma. */
  readonly fechaInicio = input('');
  readonly fechaFin = input('');
  /** Días por registrar tras crear el período (alta). */
  readonly pendientes = model<RecesoPendiente[]>([]);

  protected readonly motivoMaximo = RECESO_MOTIVO_MAXIMO;
  protected readonly fecha = fechaCorta;
  protected readonly estado = estadoReceso;

  protected readonly fechaNueva = signal('');
  protected readonly motivoNuevo = signal('');
  protected readonly recesos = signal<RecesoAcademico[]>([]);
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal('');
  protected readonly errorAgregar = signal('');
  protected readonly enviando = signal(false);
  protected readonly retirando = signal<string | null>(null);

  protected readonly esEdicion = computed(() => !!this.idPeriodo());

  protected readonly errorFecha = computed(() => {
    const fecha = this.fechaNueva();
    if (!fecha) return '';
    if (!this.fechaInicio() || !this.fechaFin()) return 'Elige primero la fecha de inicio del período.';
    if (this.repetidaEnPendientes()) return 'Ese día ya está en la lista.';
    return this.fueraDeRango(fecha) ? 'La fecha debe estar dentro del período.' : '';
  });

  protected readonly errorMotivo = computed(() => {
    const motivo = this.motivoNuevo();
    if (!motivo) return '';
    return getFreeTextError(motivo, 'Motivo', { maxLength: RECESO_MOTIVO_MAXIMO }) ?? '';
  });

  protected readonly puedeAgregar = computed(
    () => !!this.fechaNueva() && this.motivoNuevo().trim().length > 0 && !this.errorFecha() && !this.errorMotivo() && !this.repetidaEnPendientes()
  );

  private readonly repetidaEnPendientes = computed(() => !this.esEdicion() && this.pendientes().some((p) => p.fecha === this.fechaNueva()));

  ngOnInit(): void {
    if (this.esEdicion()) this.cargar();
  }

  fueraDeRango(fecha: string): boolean {
    const inicio = this.fechaInicio();
    const fin = this.fechaFin();
    return !inicio || !fin || fecha < inicio || fecha > fin;
  }

  /** Enter en el motivo agrega el día; no debe enviar el formulario del período que lo contiene. */
  alEnter(evento: Event): void {
    evento.preventDefault();
    if (this.puedeAgregar() && !this.enviando()) this.agregar();
  }

  agregar(): void {
    if (!this.puedeAgregar()) return;
    const receso: RecesoPendiente = { fecha: this.fechaNueva(), motivo: this.motivoNuevo().trim() };
    this.errorAgregar.set('');
    const id = this.idPeriodo();
    if (!id) {
      this.pendientes.update((lista) => [...lista, receso].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      this.limpiar();
      return;
    }
    this.enviando.set(true);
    this.servicio.crearRecesoPeriodo(id, receso).subscribe({
      next: (res) => {
        this.enviando.set(false);
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_RECESOS_001'));
          this.limpiar();
          this.cargar();
        } else {
          this.errorAgregar.set(res.mensajeUsuario || res.mensajeTecnico || mensajeUi('UI_ADMIN_RECESOS_002'));
        }
      },
      error: (err) => {
        this.enviando.set(false);
        this.errorAgregar.set(getApiErrorMessage(err));
      },
    });
  }

  quitar(pendiente: RecesoPendiente): void {
    this.pendientes.update((lista) => lista.filter((p) => p.fecha !== pendiente.fecha));
  }

  retirar(receso: RecesoAcademico): void {
    const id = this.idPeriodo();
    if (!id || !receso.puedeRetirarse || this.retirando()) return;
    this.retirando.set(receso.id);
    this.errorAgregar.set('');
    this.servicio.retirarRecesoPeriodo(id, receso.id).subscribe({
      next: (res) => {
        this.retirando.set(null);
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_RECESOS_003'));
        } else {
          this.errorAgregar.set(res.mensajeUsuario || res.mensajeTecnico || mensajeUi('UI_ADMIN_RECESOS_002'));
        }
        this.cargar();
      },
      error: (err) => {
        this.retirando.set(null);
        this.errorAgregar.set(getApiErrorMessage(err));
        this.cargar();
      },
    });
  }

  private cargar(): void {
    const id = this.idPeriodo();
    if (!id) return;
    this.cargando.set(true);
    this.errorCarga.set('');
    this.servicio.getRecesosPeriodo(id).subscribe({
      next: (res) => {
        this.recesos.set(res.datos ?? []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorCarga.set(getApiErrorMessage(err));
      },
    });
  }

  private limpiar(): void {
    this.fechaNueva.set('');
    this.motivoNuevo.set('');
  }
}
