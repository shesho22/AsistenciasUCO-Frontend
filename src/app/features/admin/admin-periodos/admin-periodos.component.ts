import { Component, OnInit, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PeriodoFormDatos } from '../../coordinator/coordinator-study-plans/components/academic-period-form-modal.component';
import { AcademicPeriodsTabComponent } from '../../coordinator/coordinator-study-plans/components/academic-periods-tab.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { RecesoPendiente, ResultadoRecesoPendiente } from '../../../core/models/receso-academico.model';
import { fechaCorta } from '../../coordinator/coordinator-study-plans/components/periodo-recesos-editor.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

/**
 * HU096/HU097/HU098: el período académico es único para toda la institución, por eso solo el administrador lo
 * crea, modifica y elimina. Decano y coordinador lo consultan en sus portales.
 */
@Component({
  selector: 'app-admin-periodos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [PageHeaderComponent, CommonModule, AcademicPeriodsTabComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-4 animate-fade-in">
      <app-page-header
        [enTarjeta]="true"
        etiqueta="Administración Institucional"
        contexto="Calendario Académico"
        titulo="Períodos Académicos"
        descripcion="El período es único para toda la institución. Un período solo puede eliminarse si no tiene grupos ni sesiones."
      >
        <span cabecera-acciones class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200 self-start sm:self-auto">
          {{ periodos().length }} Períodos
        </span>
      </app-page-header>

      @if (resultadosRecesos().length > 0) {
        <section class="superficie space-y-2 p-4" role="status" aria-labelledby="titulo-resultado-recesos" data-testid="resultado-recesos">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 id="titulo-resultado-recesos" class="text-sm font-bold text-warm-900">Días de receso del período {{ periodoRecesosNombre() }}</h3>
              <p class="text-xs text-warm-600">El período se creó. Para registrar de nuevo un día que falló, edita el período y agrégalo.</p>
            </div>
            <button type="button" data-testid="cerrar-resultado-recesos" (click)="cerrarResultadosRecesos()" class="shrink-0 text-xs font-semibold text-warm-700 hover:text-warm-950">
              Cerrar
            </button>
          </div>
          <ul class="space-y-1.5 text-xs">
            @for (r of resultadosRecesos(); track r.fecha) {
              <li
                class="rounded-xl border px-3 py-2 break-words"
                [class]="r.exitoso ? 'border-success-200 bg-success-50 text-success-800' : 'border-danger-200 bg-danger-50 text-danger-700 font-semibold'"
                data-testid="resultado-receso-fila"
              >
                <span class="font-semibold tabular-nums">{{ fecha(r.fecha) }}</span> · {{ r.mensaje }}
              </li>
            }
          </ul>
        </section>
      }

      <app-academic-periods-tab
        [periodos]="periodos()"
        [guardando]="guardando()"
        [errorGuardado]="errorGuardado()"
        (savePeriodo)="guardarPeriodo($event)"
        (deletePeriodo)="eliminarPeriodo($event)"
      />

      <app-confirm-dialog
        [isOpen]="periodoPorEliminar() !== null"
        title="Eliminar período académico"
        [message]="'¿Eliminar el período ' + (periodoPorEliminar()?.codigo ?? '') + '? Solo es posible si no tiene grupos ni sesiones.'"
        confirmLabel="Eliminar período"
        [destructive]="true"
        (confirmed)="confirmarEliminacion()"
        (cancelled)="cancelarEliminacion()"
      />
    </div>
  `,
})
export class AdminPeriodosComponent implements OnInit {
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);

  private readonly tab = viewChild(AcademicPeriodsTabComponent);

  periodos = signal<PeriodoAcademicoItem[]>(this.coordService.periodos());
  guardando = signal(false);
  errorGuardado = signal('');
  /** DEC-081: resultado de cada día de receso registrado tras crear el período (solo se muestra si alguno falló). */
  resultadosRecesos = signal<ResultadoRecesoPendiente[]>([]);
  periodoRecesosNombre = signal('');
  protected readonly fecha = fechaCorta;
  /** Período pendiente de confirmación en el diálogo de eliminación (HU098). */
  periodoPorEliminar = signal<PeriodoAcademicoItem | null>(null);

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  cargarPeriodos(): void {
    this.coordService.getPeriodosAcademicos().subscribe({
      next: (res) => this.periodos.set(res.datos || []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }

  guardarPeriodo(event: { modo: 'CREAR' | 'EDITAR'; id?: string; datos: PeriodoFormDatos; recesos?: RecesoPendiente[] }): void {
    this.guardando.set(true);
    this.errorGuardado.set('');
    this.cerrarResultadosRecesos();
    const peticion =
      event.modo === 'CREAR'
        ? this.coordService.crearPeriodoAcademico(event.datos)
        : this.coordService.actualizarPeriodoAcademico(event.id ?? '', event.datos);
    peticion.subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (res.exitoso) {
          this.tab()?.cerrarFormulario();
          const recesos = event.modo === 'CREAR' ? (event.recesos ?? []) : [];
          const idCreado = res.datos?.id;
          if (recesos.length > 0 && idCreado) {
            this.cargarPeriodos();
            this.registrarRecesos(idCreado, event.datos.nombre, recesos);
            return;
          }
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_PERIODOS_001'));
          this.cargarPeriodos();
        } else {
          this.errorGuardado.set(res.mensajeUsuario || res.mensajeTecnico || mensajeUi('UI_ADMIN_PERIODOS_003'));
        }
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorGuardado.set(getApiErrorMessage(err));
      },
    });
  }

  cerrarResultadosRecesos(): void {
    this.resultadosRecesos.set([]);
  }

  /**
   * DEC-081: con el período ya creado, registra los días de receso uno a uno (en orden). El fallo de un día no detiene
   * los demás ni deshace el período; cada resultado muestra el texto del backend.
   */
  private registrarRecesos(idPeriodo: string, nombre: string, recesos: RecesoPendiente[]): void {
    const resultados: ResultadoRecesoPendiente[] = [];
    const registrar = (indice: number): void => {
      if (indice >= recesos.length) {
        this.terminarRecesos(nombre, resultados);
        return;
      }
      const receso = recesos[indice];
      this.coordService.crearRecesoPeriodo(idPeriodo, receso).subscribe({
        next: (res) => {
          const exitoso = res.exitoso !== false;
          resultados.push({
            ...receso,
            exitoso,
            mensaje: (exitoso ? res.mensajeUsuario : res.mensajeUsuario || res.mensajeTecnico) || mensajeUi(exitoso ? 'UI_ADMIN_RECESOS_001' : 'UI_ADMIN_RECESOS_002'),
          });
          registrar(indice + 1);
        },
        error: (err) => {
          resultados.push({ ...receso, exitoso: false, mensaje: getApiErrorMessage(err) });
          registrar(indice + 1);
        },
      });
    };
    registrar(0);
  }

  private terminarRecesos(nombre: string, resultados: ResultadoRecesoPendiente[]): void {
    if (resultados.every((r) => r.exitoso)) {
      this.toast.success(mensajeUi('UI_ADMIN_PERIODOS_004'));
      return;
    }
    this.periodoRecesosNombre.set(nombre);
    this.resultadosRecesos.set(resultados);
    this.toast.warning(mensajeUi('UI_ADMIN_PERIODOS_005'));
  }

  eliminarPeriodo(periodo: PeriodoAcademicoItem): void {
    this.periodoPorEliminar.set(periodo);
  }

  cancelarEliminacion(): void {
    this.periodoPorEliminar.set(null);
  }

  confirmarEliminacion(): void {
    const periodo = this.periodoPorEliminar();
    this.periodoPorEliminar.set(null);
    if (!periodo) {
      return;
    }
    this.coordService.eliminarPeriodoAcademico(periodo.id).subscribe({
      next: (res) => {
        if (res.exitoso) {
          this.toast.success(res.mensajeUsuario || mensajeUi('UI_ADMIN_PERIODOS_002', { codigo: periodo.codigo }));
          this.cargarPeriodos();
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }
}
