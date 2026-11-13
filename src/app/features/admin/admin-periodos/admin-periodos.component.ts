import { Component, OnInit, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PeriodoFormDatos } from '../../coordinator/coordinator-study-plans/components/academic-period-form-modal.component';
import { AcademicPeriodsTabComponent } from '../../coordinator/coordinator-study-plans/components/academic-periods-tab.component';

/**
 * HU096/HU097/HU098: el período académico es único para toda la institución, por eso solo el administrador lo
 * crea, modifica y elimina. Decano y coordinador lo consultan en sus portales.
 */
@Component({
  selector: 'app-admin-periodos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, AcademicPeriodsTabComponent, ConfirmDialogComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">
              Administración Institucional
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Calendario Académico</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Períodos Académicos
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            El período es único para toda la institución. Un período solo puede eliminarse si no tiene grupos ni sesiones.
          </p>
        </div>
        <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200 self-start sm:self-auto">
          {{ periodos().length }} Períodos
        </span>
      </div>

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
  private coordService = inject(CoordinatorManagementService);
  private toast = inject(ToastService);

  private readonly tab = viewChild(AcademicPeriodsTabComponent);

  periodos = signal<PeriodoAcademicoItem[]>(this.coordService.periodos());
  guardando = signal(false);
  errorGuardado = signal('');
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

  guardarPeriodo(event: { modo: 'CREAR' | 'EDITAR'; id?: string; datos: PeriodoFormDatos }): void {
    this.guardando.set(true);
    this.errorGuardado.set('');
    const peticion =
      event.modo === 'CREAR'
        ? this.coordService.crearPeriodoAcademico(event.datos)
        : this.coordService.actualizarPeriodoAcademico(event.id ?? '', event.datos);
    peticion.subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (res.exitoso) {
          this.tab()?.cerrarFormulario();
          this.toast.success(res.mensajeUsuario || 'Período académico guardado.');
          this.cargarPeriodos();
        } else {
          this.errorGuardado.set(res.mensajeUsuario || res.mensajeTecnico || 'No se pudo guardar el período académico.');
        }
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorGuardado.set(getApiErrorMessage(err));
      },
    });
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
          this.toast.success(res.mensajeUsuario || `Período ${periodo.codigo} eliminado.`);
          this.cargarPeriodos();
        }
      },
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }
}
