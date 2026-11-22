import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';

/**
 * Cierre masivo de asistencia por período (vista propia de `/app/admin/sistema/cierre-masivo`).
 * Acción real e irreversible: pide confirmación en un diálogo y delega el cierre al backend.
 */
@Component({
  selector: 'app-admin-cierre-masivo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, EmptyStateComponent, FormsModule, ConfirmDialogComponent, DatePipe, ErrorCargaComponent, PaginationComponent],
  template: `
    <div class="space-y-4">
      <app-page-header
        etiqueta="Gobierno de TI & Auditoría"
        contexto="Cierre semestral"
        titulo="Cierre Masivo de Asistencia"
        descripcion="Consolidación definitiva de la asistencia de un período académico. Es una acción irreversible."
      />
      <div class="bg-gradient-to-r from-primary-900 to-primary-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="space-y-2">
          <span class="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-primary-800 text-primary-200 inline-block">
            Consolidación Semestral Definitiva
          </span>
          <h2 class="text-xl font-serif font-bold text-white">Cierre Masivo de Asistencia</h2>
          <p class="text-xs text-warm-200 max-w-xl">
            Acción real e irreversible: al ejecutar el cierre, el sistema congela todas las sesiones del período seleccionado, computa el porcentaje final de inasistencias de cada estudiante matriculado y emite las actas oficiales de aprobación y reprobación por fallas.
          </p>
        </div>

        <div class="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-xl flex flex-col items-center gap-3 w-full md:w-auto md:shrink-0 min-w-0">
          <label for="cierre-periodo" class="text-xs font-bold text-white uppercase">Período para Cierre</label>
          @if (periodos().length === 0) {
            <p class="text-xs text-warm-300">No hay períodos académicos registrados para realizar el cierre.</p>
          } @else {
            <select
              id="cierre-periodo"
              [(ngModel)]="periodoSeleccionadoCierre"
              class="w-full max-w-full min-w-0 px-4 py-2 rounded-lg bg-white text-warm-900 text-xs font-bold focus:outline-none"
            >
              @for (p of periodos(); track p.id) {
                <option [value]="p.id">{{ etiquetaPeriodo(p) }}</option>
              }
            </select>
          }

          <button
            type="button"
            (click)="iniciarCierreSemestral()"
            [disabled]="isProcesandoCierre() || periodos().length === 0 || !periodoSeleccionadoCierre"
            class="w-full min-h-[44px] px-5 py-2.5 bg-accent-500 hover:bg-accent-400 disabled:bg-warm-400 text-warm-900 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            @if (isProcesandoCierre()) {
              <svg aria-hidden="true" class="animate-spin h-4 w-4 text-warm-900" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>Procesando...</span>
            } @else {
              <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Ejecutar cierre definitivo</span>
            }
          </button>
        </div>
      </div>

      <!-- Historial de Reportes de Cierre -->
      <div>
        <h3 class="text-base font-bold text-warm-900 mb-3">Historial de Cierres Masivos Realizados</h3>

        <div class="superficie tabla-scroll">
          <table class="w-full text-left text-sm">
            <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
              <tr>
                <th scope="col" class="px-5 py-3.5">ID Reporte</th>
                <th scope="col" class="px-5 py-3.5">Período</th>
                <th scope="col" class="px-5 py-3.5">Fecha y Hora Ejecución</th>
                <th scope="col" class="px-5 py-3.5 text-center">Estudiantes Procesados</th>
                <th scope="col" class="px-5 py-3.5 text-center">Materias Consolidadas</th>
                <th scope="col" class="px-5 py-3.5 text-center">Aprobados Asistencia</th>
                <th scope="col" class="px-5 py-3.5 text-center">Reprobados por Fallas</th>
                <th scope="col" class="px-5 py-3.5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-warm-100">
              @for (rep of reportesPagina(); track rep.id) {
                <tr class="hover:bg-warm-50/70 transition-colors">
                  <td class="px-5 py-4 font-mono text-xs font-bold text-primary-800">{{ rep.id }}</td>
                  <td class="px-5 py-4 font-bold text-warm-900">{{ rep.periodoCodigo }}</td>
                  <td class="px-5 py-4 text-xs text-warm-600">{{ rep.fechaEjecucion | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="px-5 py-4 text-center font-bold text-warm-900">{{ rep.totalEstudiantesProcesados }}</td>
                  <td class="px-5 py-4 text-center text-warm-700">{{ rep.totalMateriasAfectadas }}</td>
                  <td class="px-5 py-4 text-center font-bold text-success-700">
                    {{ rep.totalAprobadosAsistencia }} ({{ porcentaje(rep.totalAprobadosAsistencia, rep.totalEstudiantesProcesados) }})
                  </td>
                  <td class="px-5 py-4 text-center font-bold text-danger-600">
                    {{ rep.totalReprobadosFallas }} ({{ porcentaje(rep.totalReprobadosFallas, rep.totalEstudiantesProcesados) }})
                  </td>
                  <td class="px-5 py-4 text-center">
                    <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-success-100 text-success-800">
                      {{ rep.estado }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="px-5 py-4">
                    <app-empty-state
                      title="Aún no hay cierres masivos"
                      description="Todavía no se ha ejecutado ningún cierre masivo de período. Cuando se ejecute uno, su resultado aparecerá aquí."
                      causa="Se llena cuando se ejecuta el primer cierre masivo de un período."
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (errorHistorial(); as error) {
          <div class="mt-3">
            <app-error-carga [error]="error" (reintentar)="cargarHistorial()" />
          </div>
        }
        @if (reportesCierre().length > tamanoPagina()) {
          <app-pagination
            class="mt-3 block"
            [totalItems]="reportesCierre().length"
            [pageSize]="tamanoPagina()"
            [currentPage]="pagina()"
            (pageChange)="pagina.set($event)"
            (pageSizeChange)="cambiarTamano($event)"
          />
        }
      </div>

      <app-confirm-dialog
        [isOpen]="cierrePendiente()"
        title="Cierre masivo definitivo"
        [message]="'¿Confirma ejecutar el cierre masivo definitivo de asistencia para el ' + periodoEnConfirmacion() + '? Esta acción es irreversible y consolidará los registros de inasistencia de todos los estudiantes.'"
        confirmLabel="Ejecutar cierre"
        [destructive]="true"
        (confirmed)="confirmarCierre()"
        (cancelled)="cierrePendiente.set(false)"
      />
    </div>
  `,
})
export class AdminCierreMasivoComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  periodoSeleccionadoCierre = '';
  isProcesandoCierre = signal<boolean>(false);
  cierrePendiente = signal<boolean>(false);

  reportesCierre = this.adminService.reportesCierre;
  pagina = signal(1);
  tamanoPagina = signal(10);
  errorHistorial = signal<LoadErrorState | null>(null);
  /** El backend entrega el historial completo: la paginación de la tabla se hace aquí, sobre esa lista. */
  reportesPagina = computed(() => {
    const inicio = (this.pagina() - 1) * this.tamanoPagina();
    return this.reportesCierre().slice(inicio, inicio + this.tamanoPagina());
  });
  periodos = this.coordService.periodos;

  private readonly sincronizarPeriodo = effect(() => {
    this.actualizarPeriodoSeleccionado();
  });

  ngOnInit(): void {
    this.coordService.cargarPeriodosAcademicosBase();
    this.actualizarPeriodoSeleccionado();
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.errorHistorial.set(null);
    this.adminService
      .cargarHistorialCierres()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.pagina.set(1),
        error: (err: unknown) => this.errorHistorial.set(classifyLoadError(err)),
      });
  }

  cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  private actualizarPeriodoSeleccionado(): void {
    const lista = this.periodos();
    if (lista.length > 0) {
      const vigente = lista.find((p) => (p as { esVigente?: boolean }).esVigente === true);
      this.periodoSeleccionadoCierre = vigente ? vigente.id : lista[0].id;
    } else {
      this.periodoSeleccionadoCierre = '';
    }
  }

  /** Nombre legible del período elegido (nunca el identificador interno). */
  nombrePeriodoSeleccionado(): string {
    const p = this.periodos().find((x) => x.id === this.periodoSeleccionadoCierre || x.codigo === this.periodoSeleccionadoCierre);
    return p ? this.etiquetaPeriodo(p) : '';
  }

  /** Texto del período en la confirmación: evita "período Período X" cuando el nombre ya trae la palabra. */
  periodoEnConfirmacion(): string {
    const nombre = this.nombrePeriodoSeleccionado();
    return /^per[ií]odo\s/i.test(nombre) ? nombre : `período ${nombre}`;
  }

  /** El nombre ya incluye el código (p. ej. "Período 2026-2"): se muestra una sola vez. */
  etiquetaPeriodo(p: { nombre: string; codigo: string }): string {
    return p.nombre.includes(p.codigo) ? p.nombre : `${p.nombre} (${p.codigo})`;
  }

  porcentaje(parte: number, total: number): string {
    return total > 0 ? `${((parte / total) * 100).toFixed(1)}%` : '—';
  }

  iniciarCierreSemestral(): void {
    this.cierrePendiente.set(true);
  }

  confirmarCierre(): void {
    this.cierrePendiente.set(false);

    const periodoObj = this.periodos().find((p) => p.id === this.periodoSeleccionadoCierre || p.codigo === this.periodoSeleccionadoCierre);
    const idPeriodo = periodoObj ? periodoObj.id : this.periodoSeleccionadoCierre;
    const codigoPeriodo = periodoObj ? periodoObj.codigo : this.periodoSeleccionadoCierre;

    if (!idPeriodo) {
      this.toast.error(mensajeUi('UI_ADMIN_SYSTEM_001'));
      return;
    }

    this.isProcesandoCierre.set(true);
    this.adminService
      .ejecutarCierreMasivo(idPeriodo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isProcesandoCierre.set(false);
          const mensajeExito = res?.mensajeUsuario || `Cierre masivo del período ${codigoPeriodo} solicitado correctamente.`;
          this.toast.success(mensajeExito);
          this.cargarHistorial();
        },
        error: (err: unknown) => {
          this.isProcesandoCierre.set(false);
          this.toast.error(getApiErrorMessage(err));
        },
      });
  }
}
