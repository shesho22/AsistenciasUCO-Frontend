import { Component, ChangeDetectionStrategy, input, output, inject, computed, effect, signal, untracked } from '@angular/core';

import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import {
  TablaDatosComponent,
  TAMANO_PAGINA_TABLA,
  paginarEnCliente,
} from '../../../../../shared/components/tabla-datos/tabla-datos.component';
import { ClassSession } from '../../../../../core/models/attendance.model';
import { SessionTimeZoneService } from '../../../../../core/services/session-timezone.service';

@Component({
    selector: 'app-teacher-sesion-detalle-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ModalComponent, ButtonComponent, TablaDatosComponent],
    template: `
    <app-modal
      [isOpen]="isOpen()"
      title="Detalles y Registro de Sesión Lectiva"
      (closed)="closed.emit()"
    >
      @if (sesion()) {
        <div class="space-y-4">
          <!-- Header de Sesión -->
          <div class="p-4 rounded-xl bg-warm-50 border border-warm-200 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-warm-200 text-warm-800">
                Sesión #{{ sesion()?.sessionNumber }}
              </span>
            </div>
            <h4 class="font-bold text-base text-warm-900">{{ sesion()?.title }}</h4>
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-warm-200/60 text-xs text-warm-700">
              @if (sesion()?.estadoTemporal === 'INDETERMINADA') {
                <div class="col-span-2 text-warning-800"><strong>Horario:</strong> no confirmado</div>
              } @else {
                <div><strong>Fecha:</strong> {{ timeZone.displaySessionDate(sesion()!) }}{{ timeZone.displaySessionEndDate(sesion()!) !== timeZone.displaySessionDate(sesion()!) ? ' – ' + timeZone.displaySessionEndDate(sesion()!) : '' }}</div>
                <div><strong>Horario:</strong> {{ timeZone.displaySessionStartTime(sesion()!) }} - {{ timeZone.displaySessionEndTime(sesion()!) }}</div>
              }
            </div>
          </div>

          <!-- Listado de Asistencia en esta Sesión -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h5 class="text-xs font-bold uppercase tracking-wider text-warm-700">
                Registro de Asistencias ({{ (sesion()?.records || []).length }} estudiantes)
              </h5>
            </div>

            <app-tabla-datos
              etiqueta="Registro de asistencias de la sesión"
              [columnas]="3"
              anchoMinimo="24rem"
              alturaMaxima="20rem"
              [vacio]="registros().length === 0"
              mensajeVacio="Sin registros individuales para esta sesión."
              [paginada]="true"
              [totalItems]="registros().length"
              [pagina]="pagina()"
              [tamanoPagina]="tamanoPagina()"
              (paginaChange)="pagina.set($event)"
              (tamanoPaginaChange)="cambiarTamano($event)"
            >
              <thead>
                <tr>
                  <th scope="col">Estudiante</th>
                  <th scope="col">Código</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (rec of registrosPagina(); track rec.studentId) {
                  <tr data-testid="sesion-detalle-registro">
                    <td class="font-bold text-warm-900 text-xs">{{ rec.studentName }}</td>
                    <td class="text-xs text-warm-500 font-mono whitespace-nowrap">{{ rec.studentCode }}</td>
                    <td class="whitespace-nowrap">
                      <span class="px-2 py-0.5 font-bold rounded-full text-[10px]" [class]="statusBadgeClasses(rec.status)">
                        {{ statusLabel(rec.status) }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </app-tabla-datos>
          </div>
        </div>
      }

      <div modal-footer class="flex items-center justify-end w-full pt-2">
        <app-button variant="secondary" size="sm" (clicked)="closed.emit()">
          Cerrar Detalle
        </app-button>
      </div>
    </app-modal>
  `
})
export class TeacherSesionDetalleModalComponent {
  readonly timeZone = inject(SessionTimeZoneService);
  isOpen = input.required<boolean>();
  sesion = input<ClassSession | null>(null);
  closed = output<void>();

  /** Registros de la sesión en tabla paginada en el cliente (15 por defecto, 15/30/50). */
  readonly registros = computed(() => this.sesion()?.records ?? []);
  readonly pagina = signal(1);
  readonly tamanoPagina = signal(TAMANO_PAGINA_TABLA);
  readonly registrosPagina = computed(() => paginarEnCliente(this.registros(), this.pagina(), this.tamanoPagina()));

  constructor() {
    // Otra sesión: se vuelve a la primera página.
    effect(() => {
      this.sesion();
      untracked(() => this.pagina.set(1));
    });
  }

  cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  statusLabel(status: ClassSession['records'][number]['status']): string {
    switch (status) {
      case 'AN':
        return 'Presente';
      case 'SJC':
        return 'Falta SJC';
      case 'EX':
        return 'Excusa';
      default:
        return 'Sin registrar';
    }
  }

  statusBadgeClasses(status: ClassSession['records'][number]['status']): string {
    switch (status) {
      case 'AN':
        return 'bg-success-100 text-success-800';
      case 'SJC':
        return 'bg-danger-100 text-danger-800';
      case 'EX':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-warm-100 text-warm-700';
    }
  }
}
