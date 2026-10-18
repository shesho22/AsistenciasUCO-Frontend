import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';
import { ClassSession } from '../../../../../core/models/attendance.model';
import { SessionTimeZoneService } from '../../../../../core/services/session-timezone.service';

@Component({
  selector: 'app-teacher-sesion-detalle-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ModalComponent, ButtonComponent],
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
                <div class="col-span-2 text-amber-800"><strong>Horario:</strong> no confirmado</div>
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

            @if ((sesion()?.records || []).length === 0) {
              <p class="text-xs text-warm-500 text-center py-4 bg-warm-50/50 rounded-xl">
                Sin registros individuales para esta sesión.
              </p>
            } @else {
              <div class="max-h-56 overflow-y-auto space-y-1.5 border border-warm-200 rounded-xl p-2 bg-warm-50/30">
                @for (rec of sesion()?.records || []; track rec.studentId) {
                  <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-warm-100 text-xs">
                    <div>
                      <p class="font-bold text-warm-900">{{ rec.studentName }}</p>
                      <p class="text-[10px] text-warm-500 font-mono">{{ rec.studentCode }}</p>
                    </div>
                    <span
                      class="px-2 py-0.5 font-bold rounded-full text-[10px]"
                      [class]="statusBadgeClasses(rec.status)"
                    >
                      {{ statusLabel(rec.status) }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <div modal-footer class="flex items-center justify-end w-full pt-2">
        <app-button variant="secondary" size="sm" (clicked)="closed.emit()">
          Cerrar Detalle
        </app-button>
      </div>
    </app-modal>
  `,
})
export class TeacherSesionDetalleModalComponent {
  readonly timeZone = inject(SessionTimeZoneService);
  isOpen = input.required<boolean>();
  sesion = input<ClassSession | null>(null);
  closed = output<void>();

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
        return 'bg-emerald-100 text-emerald-800';
      case 'SJC':
        return 'bg-red-100 text-red-800';
      case 'EX':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-warm-100 text-warm-700';
    }
  }
}
