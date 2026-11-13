import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { PeriodoAcademicoItem } from '../../../../core/models/role-management.model';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
    selector: 'app-academic-periods-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, CardComponent, BadgeComponent, ButtonComponent, FormFieldComponent, PaginationComponent],
    template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm">
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

      <!-- Grid de Períodos -->
      @if (pagedPeriodos().length === 0) {
        <div class="bg-white rounded-2xl border border-warm-200 p-12 text-center shadow-warm-sm">
          <p class="text-sm text-warm-500">No hay períodos académicos registrados.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          @for (periodo of pagedPeriodos(); track periodo.id) {
            <app-card [hoverable]="true" padding="md">
              <div class="space-y-4">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
                      {{ periodo.codigo }}
                    </span>
                    @if (periodo.esActual) {
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-100 text-primary-800">
                        ACTUAL
                      </span>
                    }
                  </div>

                  <app-badge [variant]="periodo.estado === 'ACTIVO' ? 'success' : (periodo.estado === 'PLANEACION' ? 'warning' : 'danger')">
                    {{ periodo.estado }}
                  </app-badge>
                </div>

                <div>
                  <h4 class="font-serif font-bold text-base text-warm-900">{{ periodo.nombre }}</h4>
                </div>

                <div class="p-3 rounded-xl bg-warm-50 border border-warm-100 text-xs space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-warm-500">Fecha de Inicio:</span>
                    <strong class="text-warm-900">{{ periodo.fechaInicio }}</strong>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-warm-500">Fecha de Cierre:</span>
                    <strong class="text-warm-900">{{ periodo.fechaFin }}</strong>
                  </div>
                </div>

                @if (!soloLectura()) {
                <div class="flex items-center justify-between pt-2 border-t border-warm-100 text-xs">
                  <button
                    type="button"
                    (click)="deletePeriodo.emit(periodo)"
                    class="font-semibold text-danger-700 hover:text-danger-900"
                    title="Eliminar el período (solo si no tiene grupos ni sesiones)"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    (click)="abrirEditar(periodo)"
                    class="text-warm-600 hover:text-warm-950 font-medium"
                    title="Modificar fechas del período"
                  >
                    Editar Fechas
                  </button>
                </div>
                }
              </div>
            </app-card>
          }
        </div>

        @if (periodos().length > pageSize()) {
          <div class="mt-6 flex justify-center">
            <app-pagination
              [currentPage]="currentPage()"
              [totalItems]="periodos().length"
              [pageSize]="pageSize()"
              (pageChange)="currentPage.set($event)"
            />
          </div>
        }
      }

      <!-- Formulario Inline Período -->
      @if (mostrarModal()) {
        <div class="bg-white p-6 rounded-2xl border border-primary-200 shadow-warm-md max-w-xl mx-auto space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-serif font-bold text-base text-warm-900">
              {{ modoModal() === 'CREAR' ? 'Apertura de Nuevo Período' : 'Modificación de Período' }}
            </h4>
            <button (click)="mostrarModal.set(false)" class="text-warm-400 hover:text-warm-700 text-xs font-bold">
              ✕ Cerrar
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-form-field label="Código del Período" [required]="true">
              <input
                type="text"
                [(ngModel)]="periodoForm.codigo"
                placeholder="Ej. 2027-1"
                class="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </app-form-field>

            <p class="text-xs text-warm-500 self-center">
              El estado (planeación, activo o cerrado) se calcula con las fechas del período.
            </p>

            <app-form-field label="Fecha de Inicio" [required]="true">
              <input
                type="date"
                [(ngModel)]="periodoForm.fechaInicio"
                class="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </app-form-field>

            <app-form-field label="Fecha de Fin" [required]="true">
              <input
                type="date"
                [(ngModel)]="periodoForm.fechaFin"
                class="w-full px-3 py-2 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </app-form-field>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <app-button variant="secondary" size="sm" (clicked)="mostrarModal.set(false)">
              Cancelar
            </app-button>
            <app-button
              variant="primary"
              size="sm"
              [disabled]="!periodoForm.codigo.trim() || !periodoForm.fechaInicio || !periodoForm.fechaFin"
              (clicked)="guardar()"
            >
              Guardar Período
            </app-button>
          </div>
        </div>
      }
    </div>
  `
})
export class AcademicPeriodsTabComponent {
  periodos = input.required<PeriodoAcademicoItem[]>();
  /** HU096-HU098: decano y coordinador solo consultan; crear, editar y eliminar es del administrador. */
  soloLectura = input(false);

  savePeriodo = output<{ modo: 'CREAR' | 'EDITAR'; id?: string; datos: any }>();
  /** HU098: solicita eliminar el período; el backend lo rechaza si tiene grupos o sesiones. */
  deletePeriodo = output<PeriodoAcademicoItem>();

  currentPage = signal(1);
  pageSize = signal(6);

  mostrarModal = signal(false);
  modoModal = signal<'CREAR' | 'EDITAR'>('CREAR');
  selectedPeriodoId: string | null = null;

  periodoForm: {
    codigo: string;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
    estado: PeriodoAcademicoItem['estado'];
  } = {
    codigo: '',
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'PLANEACION',
  };

  pagedPeriodos = computed(() => {
    const list = this.periodos();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  abrirCrear(): void {
    this.modoModal.set('CREAR');
    this.selectedPeriodoId = null;
    this.periodoForm = {
      codigo: '2027-1',
      nombre: 'Primer Semestre Académico 2027',
      fechaInicio: '2027-02-01',
      fechaFin: '2027-06-20',
      estado: 'PLANEACION',
    };
    this.mostrarModal.set(true);
  }

  abrirEditar(periodo: PeriodoAcademicoItem): void {
    this.modoModal.set('EDITAR');
    this.selectedPeriodoId = periodo.id;
    this.periodoForm = {
      codigo: periodo.codigo,
      nombre: periodo.nombre,
      fechaInicio: periodo.fechaInicio,
      fechaFin: periodo.fechaFin,
      estado: periodo.estado,
    };
    this.mostrarModal.set(true);
  }

  /** HU096/HU097: el código del período (p. ej. 2027-1) es su nombre único en la institución. */
  guardar(): void {
    this.savePeriodo.emit({
      modo: this.modoModal(),
      id: this.selectedPeriodoId || undefined,
      datos: {
        nombre: this.periodoForm.codigo.trim(),
        fechaInicio: this.periodoForm.fechaInicio,
        fechaFin: this.periodoForm.fechaFin,
      },
    });
    this.mostrarModal.set(false);
  }
}
