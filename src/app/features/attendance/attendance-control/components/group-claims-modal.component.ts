import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent, BadgeVariant } from '../../../../shared/components/badge/badge.component';
import { SolicitudRevisionItem } from '../../../../core/models/role-management.model';
import { Course } from '../../../../core/models/course.model';

@Component({
  selector: 'app-group-claims-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ModalComponent, ButtonComponent, BadgeComponent],
  template: `
    <app-modal
      [isOpen]="isOpen()"
      title="Reclamos y Justificaciones del Grupo"
      (closed)="closed.emit()"
    >
      <div class="space-y-4">
        <!-- Subtítulo e Indicadores -->
        <div class="flex items-center justify-between pb-2 border-b border-warm-100">
          <div>
            <span class="text-xs font-bold text-warm-700 uppercase tracking-wider block">
              {{ course()?.name }}{{ course()?.code ? ' (' + course()?.code + ')' : '' }}
            </span>
            <span class="text-[11px] text-warm-500">
              Solicitudes de inasistencia radicadas por los estudiantes de este curso.
            </span>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
            {{ reclamos().length }} Registros
          </span>
        </div>

        @if (isLoading()) {
          <div class="space-y-3 py-4">
            @for (n of [1, 2, 3]; track n) {
              <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
            }
          </div>
        } @else if (reclamos().length === 0) {
          <div class="py-10 text-center text-warm-400 bg-warm-50/50 rounded-2xl border border-dashed border-warm-200">
            <svg class="w-8 h-8 mx-auto mb-2 text-warm-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-xs font-medium text-warm-600">No hay reclamos ni justificaciones para este grupo.</p>
            <p class="text-[11px] text-warm-400 mt-0.5">Todas las asistencias están al día y sin novedades.</p>
          </div>
        } @else {
          <div class="max-h-72 overflow-y-auto space-y-3 pr-1">
            @for (rec of reclamos(); track rec.id) {
              <div class="p-3.5 rounded-xl border border-warm-200 bg-warm-50/40 hover:bg-warm-50 transition-colors space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-800">
                      REC-#{{ rec.id.slice(0, 8).toUpperCase() }}
                    </span>
                    <h6 class="font-bold text-xs text-warm-900 truncate">{{ rec.estudianteNombre }}</h6>
                  </div>
                  <app-badge [variant]="getBadgeVariant(rec.estadoSolicitud)">
                    {{ rec.estadoSolicitud }}
                  </app-badge>
                </div>

                <p class="text-xs text-warm-700 italic bg-white p-2.5 rounded-lg border border-warm-100">
                  "{{ rec.justificacionSolicitud }}"
                </p>

                <div class="flex flex-wrap items-center justify-between text-[11px] text-warm-500 pt-1 border-t border-warm-200/50">
                  <span>Motivo: <strong class="text-warm-700">{{ rec.categoria || 'Médico / Salud' }}</strong></span>
                  <span>Fecha: {{ rec.fechaSolicitud }}</span>
                </div>

                <!-- Acción Resolver si está PENDIENTE -->
                @if (rec.estadoSolicitud === 'PENDIENTE') {
                  <div class="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      (click)="resolver.emit({ id: rec.id, accion: 'RECHAZADA' })"
                      class="text-[11px] font-bold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      (click)="resolver.emit({ id: rec.id, accion: 'APROBADA' })"
                      class="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                    >
                      Aprobar Excusa
                    </button>
                  </div>
                } @else if (rec.justificacionRespuesta) {
                  <p class="text-[11px] text-warm-600 bg-warm-100/70 p-2 rounded-lg">
                    <strong>Respuesta:</strong> {{ rec.justificacionRespuesta }}
                  </p>
                }
              </div>
            }
          </div>
        }

        <!-- Footer -->
        <div modal-footer class="flex items-center justify-between w-full pt-2">
          <button
            type="button"
            (click)="irABandejaGeneral.emit()"
            class="text-xs font-semibold text-primary-800 hover:text-primary-950 underline underline-offset-2"
          >
            Abrir Bandeja Completa de Reclamos →
          </button>
          <app-button variant="primary" size="sm" (clicked)="closed.emit()">
            Cerrar
          </app-button>
        </div>
      </div>
    </app-modal>
  `,
})
export class GroupClaimsModalComponent {
  isOpen = input<boolean>(false);
  course = input<Course | null | undefined>(null);
  reclamos = input<SolicitudRevisionItem[]>([]);
  isLoading = input<boolean>(false);

  closed = output<void>();
  resolver = output<{ id: string; accion: 'APROBADA' | 'RECHAZADA' }>();
  irABandejaGeneral = output<void>();

  getBadgeVariant(estado?: string): BadgeVariant {
    if (estado === 'APROBADA') return 'success';
    if (estado === 'RECHAZADA') return 'danger';
    return 'warning';
  }
}
