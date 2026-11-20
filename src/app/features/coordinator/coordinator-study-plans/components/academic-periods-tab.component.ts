import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { PeriodoAcademicoItem } from '../../../../core/models/role-management.model';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AcademicPeriodFormModalComponent, PeriodoFormDatos } from './academic-period-form-modal.component';
import {
  TAMANO_PAGINA_TABLA,
  TablaDatosComponent,
  paginarEnCliente,
} from '../../../../shared/components/tabla-datos/tabla-datos.component';

@Component({
  selector: 'app-academic-periods-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, ButtonComponent, TablaDatosComponent, AcademicPeriodFormModalComponent],
  template: `
    <div class="space-y-4">
      <div class="superficie flex items-center justify-between p-5">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Calendario de Períodos Académicos</h3>
          <p class="text-xs text-warm-500">Configuración de ciclos lectivos, fechas límites y activación de períodos.</p>
        </div>

        @if (!soloLectura()) {
          <app-button variant="primary" size="sm" (clicked)="abrirCrear()">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            + Nuevo Período Académico
          </app-button>
        } @else {
          <span class="text-xs text-warm-500">Los períodos los administra la institución.</span>
        }
      </div>

      <!-- Tabla de Períodos (más reciente primero) -->
      <app-tabla-datos
        etiqueta="Períodos académicos"
        [columnas]="soloLectura() ? 5 : 6"
        anchoMinimo="44rem"
        [vacio]="periodos().length === 0"
        mensajeVacio="No hay períodos académicos registrados."
        [paginada]="true"
        [totalItems]="periodos().length"
        [pagina]="currentPage()"
        [tamanoPagina]="pageSize()"
        (paginaChange)="currentPage.set($event)"
        (tamanoPaginaChange)="cambiarTamano($event)"
      >
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Período</th>
            <th scope="col">Fecha de inicio</th>
            <th scope="col">Fecha de cierre</th>
            <th scope="col">Estado</th>
            @if (!soloLectura()) {
              <th scope="col"><span class="sr-only">Acciones</span></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (periodo of pagedPeriodos(); track periodo.id) {
            <tr data-testid="periodo-fila">
              <td class="whitespace-nowrap">
                <span class="inline-block rounded-md bg-warm-100 px-2 py-0.5 font-mono text-xs font-bold text-warm-800">{{ periodo.codigo }}</span>
              </td>
              <td>
                <span class="font-semibold text-warm-900">{{ periodo.nombre }}</span>
                @if (periodo.esActual) {
                  <span class="ml-2 rounded bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-800">ACTUAL</span>
                }
              </td>
              <td class="whitespace-nowrap tabular-nums">{{ periodo.fechaInicio }}</td>
              <td class="whitespace-nowrap tabular-nums">{{ periodo.fechaFin }}</td>
              <td>
                <app-badge
                  size="sm"
                  [variant]="periodo.estado === 'ACTIVO' ? 'success' : (periodo.estado === 'PLANEACION' ? 'warning' : 'danger')"
                >
                  {{ periodo.estado }}
                </app-badge>
              </td>
              @if (!soloLectura()) {
                <td class="text-right whitespace-nowrap text-xs">
                  <button
                    type="button"
                    (click)="abrirEditar(periodo)"
                    class="mr-3 font-medium text-warm-600 hover:text-warm-950"
                    title="Modificar fechas del período"
                  >
                    Editar Fechas
                  </button>
                  <button
                    type="button"
                    (click)="deletePeriodo.emit(periodo)"
                    class="font-semibold text-danger-700 hover:text-danger-900"
                    title="Eliminar el período (solo si no tiene grupos ni sesiones)"
                  >
                    Eliminar
                  </button>
                </td>
              }
            </tr>
          }
        </tbody>
      </app-tabla-datos>

      @if (mostrarModal()) {
        @defer (on immediate) {
          <app-academic-period-form-modal
            [periodo]="periodoEditando()"
            [guardando]="guardando()"
            [error]="errorGuardado()"
            (guardar)="guardar($event)"
            (cerrar)="cerrarFormulario()"
          />
        }
      }
    </div>
  `,
})
export class AcademicPeriodsTabComponent {
  periodos = input.required<PeriodoAcademicoItem[]>();
  /** HU096-HU098: decano y coordinador solo consultan; crear, editar y eliminar es del administrador. */
  soloLectura = input(false);

  /** El padre marca la petición en curso y el mensaje del backend; el diálogo no se cierra hasta la respuesta. */
  guardando = input(false);
  errorGuardado = input('');

  savePeriodo = output<{ modo: 'CREAR' | 'EDITAR'; id?: string; datos: PeriodoFormDatos }>();
  /** Solicita eliminar el período; el backend lo rechaza si tiene grupos o sesiones. */
  deletePeriodo = output<PeriodoAcademicoItem>();

  currentPage = signal(1);
  pageSize = signal(TAMANO_PAGINA_TABLA);

  mostrarModal = signal(false);
  periodoEditando = signal<PeriodoAcademicoItem | null>(null);

  /** Más reciente primero (por fecha de inicio ISO); la lista original no tenía orden elegido por el usuario. */
  periodosOrdenados = computed(() =>
    [...this.periodos()].sort((a, b) => (b.fechaInicio ?? '').localeCompare(a.fechaInicio ?? '')),
  );

  pagedPeriodos = computed(() => paginarEnCliente(this.periodosOrdenados(), this.currentPage(), this.pageSize()));

  cambiarTamano(tamano: number): void {
    this.pageSize.set(tamano);
    this.currentPage.set(1);
  }

  abrirCrear(): void {
    this.periodoEditando.set(null);
    this.mostrarModal.set(true);
  }

  abrirEditar(periodo: PeriodoAcademicoItem): void {
    this.periodoEditando.set(periodo);
    this.mostrarModal.set(true);
  }

  /** El nombre del período (p. ej. 2027-1) es único en la institución. */
  guardar(datos: PeriodoFormDatos): void {
    const editando = this.periodoEditando();
    this.savePeriodo.emit({
      modo: editando ? 'EDITAR' : 'CREAR',
      id: editando?.id,
      datos,
    });
  }

  cerrarFormulario(): void {
    this.mostrarModal.set(false);
    this.periodoEditando.set(null);
  }
}
