import { Component, ChangeDetectionStrategy, inject, input, output } from '@angular/core';

import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { type EstadoCargaReclamos, SolicitudRevisionItem } from '../../../../core/models/role-management.model';
import { etiquetaEstadoReclamo, varianteEstadoReclamo } from '../../../../core/utils/reclamo-estado.util';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';

@Component({
    selector: 'app-teacher-grupo-reclamos',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BadgeComponent],
    template: `
    <div class="bg-white rounded-b-2xl border-x border-b border-warm-200 shadow-warm-sm p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-100">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Solicitudes de Revisión y Justificaciones</h3>
          <p class="text-xs text-warm-500">Inasistencias y retardos reportados por estudiantes para este curso.</p>
        </div>
        <button
          type="button"
          (click)="irAReclamos.emit()"
          class="text-xs font-semibold text-primary-800 hover:text-primary-950 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 inline-flex items-center gap-1.5 transition-colors"
        >
          Abrir Portal de Reclamos Completo →
        </button>
      </div>

      @if (estadoCarga() === 'LOADING') {
        <div role="status" class="p-6 space-y-3">
          <p class="text-sm text-warm-600">Cargando reclamos del grupo…</p>
          @for (n of [1, 2]; track n) {
            <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
          }
        </div>
      } @else if (estadoCarga() === 'LOADED' && reclamos().length === 0) {
        <div class="p-12 text-center text-warm-400">
          <p class="text-sm">No hay reclamos para este grupo. No hay justificaciones ni reclamos pendientes.</p>
        </div>
      } @else if (estadoCarga() === 'LOADED') {
        <div class="space-y-3">
          @for (rec of reclamos(); track rec.id) {
            <div class="p-4 rounded-xl border border-warm-200 bg-warm-50/50 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-800">
                    REC-#{{ rec.id.slice(0, 8).toUpperCase() }}
                  </span>
                  <span class="text-xs font-bold text-warm-900">{{ rec.estudianteNombre }}</span>
                </div>
                <app-badge [variant]="varianteEstado(rec.estadoSolicitud)">
                  {{ etiquetaEstado(rec.estadoSolicitud) }}
                </app-badge>
              </div>
              @if (rec.numeroToma != null) {
                <p class="text-[11px] font-semibold text-warm-800" data-testid="grupo-reclamo-toma">{{ textoToma(rec) }}</p>
              }
              <p class="text-xs text-warm-700 italic">"{{ rec.justificacionSolicitud }}"</p>
              <div class="text-[11px] text-warm-500 flex items-center justify-between pt-1 border-t border-warm-200/60">
                <span>Categoría: {{ rec.categoria || 'Médico / Salud' }}</span>
                <span>Fecha: {{ rec.fechaSolicitud }}</span>
              </div>
            </div>
          }
        </div>
      } @else if (estadoCarga() === 'FORBIDDEN' || estadoCarga() === 'UNAVAILABLE' || estadoCarga() === 'NETWORK_ERROR' || estadoCarga() === 'SERVER_ERROR') {
        <div role="alert" class="p-8 text-center space-y-3">
          @if (estadoCarga() === 'FORBIDDEN') {
            <p class="text-sm text-danger-700">No tienes autorización para consultar reclamos de este grupo.</p>
          } @else if (estadoCarga() === 'UNAVAILABLE') {
            <p class="text-sm text-warning-800">El servicio de reclamos no está disponible (HTTP 501).</p>
          } @else if (estadoCarga() === 'NETWORK_ERROR') {
            <p class="text-sm text-danger-700">No fue posible conectar con el servicio de reclamos.</p>
          } @else {
            <p class="text-sm text-danger-700">No fue posible cargar los reclamos del grupo. Intenta nuevamente.</p>
          }
          <button
            type="button"
            data-accion="reintentar"
            (click)="reintentar.emit()"
            class="text-xs font-semibold text-primary-800 hover:text-primary-950 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200"
          >Reintentar consulta</button>
        </div>
      } @else {
        <p class="p-8 text-center text-sm text-warm-500">Selecciona un grupo para consultar sus reclamos.</p>
      }
    </div>
  `
})
export class TeacherGrupoReclamosComponent {
  private readonly zona = inject(SessionTimeZoneService);

  reclamos = input<SolicitudRevisionItem[]>([]);
  /** Valor LOADED conserva el uso anterior del componente standalone; el hub envía el estado HTTP real. */
  estadoCarga = input<EstadoCargaReclamos>('LOADED');
  irAReclamos = output<void>();
  reintentar = output<void>();

  /** Una solicitud retirada por el estudiante se ve neutra: no es pendiente, rechazada ni resuelta. */
  readonly varianteEstado = varianteEstadoReclamo;
  readonly etiquetaEstado = etiquetaEstadoReclamo;

  /** "Reclamo de la toma N · HH:mm" (hora local del punto de control; UTC solo en el contrato). */
  textoToma(rec: Pick<SolicitudRevisionItem, 'numeroToma' | 'fechaPuntoControlUtc'>): string {
    const hora = rec.fechaPuntoControlUtc ? this.zona.formatTemporal(rec.fechaPuntoControlUtc, 'time') : null;
    return ['Reclamo de la toma ' + rec.numeroToma, hora].filter((parte) => !!parte).join(' · ');
  }
}
