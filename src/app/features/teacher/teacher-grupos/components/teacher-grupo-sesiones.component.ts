import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ClassSession } from '../../../../core/models/attendance.model';
import { SesionEstadoBadgeComponent } from '../../../../shared/components/sesion-estado-badge/sesion-estado-badge.component';
import { estaCancelada, estaPendienteAprobacion, TEXTO_SESION_PENDIENTE } from '../../../../core/models/sesion-estado.model';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';

@Component({
  selector: 'app-teacher-grupo-sesiones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, CommonModule, ButtonComponent, SesionEstadoBadgeComponent],
  template: `
    <div class="bg-white rounded-b-2xl border-x border-b border-warm-200 shadow-warm-sm overflow-hidden space-y-4 p-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-100">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Cronograma de Sesiones de Clase</h3>
          <p class="text-xs text-warm-500">Sesiones regulares programadas, reposiciones y sesiones extraordinarias registradas.</p>
        </div>
        <app-button variant="primary" size="sm" (clicked)="programarExtraordinaria.emit()">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          + Solicitar sesión extraordinaria
        </app-button>
      </div>

      @if (loading()) {
        <div class="p-6 space-y-3">
          @for (n of [1, 2, 3]; track n) {
            <div class="h-16 bg-warm-100 rounded-xl animate-pulse"></div>
          }
        </div>
      } @else if (sessions().length === 0) {
        <app-empty-state
          title="No hay sesiones registradas para este grupo."
          causa="Solicita la primera sesión extraordinaria o espera las sesiones del horario del grupo."
        />
      } @else {
        <div class="divide-y divide-warm-100">
          @for (sesion of sessions(); track sesion.id) {
            <div
              class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-warm-50/50 transition-colors"
              [class.opacity-80]="esCancelada(sesion)"
              [attr.data-testid]="'sesion-' + sesion.id"
            >
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-warm-100 text-warm-800">
                    #{{ sesion.sessionNumber }}
                  </span>
                  @if (sesion.estadoTemporal === 'INDETERMINADA') {
                    <span class="text-xs font-semibold text-warning-800 bg-warning-50 px-2 py-0.5 rounded">Horario no confirmado</span>
                  } @else {
                    <span class="text-xs font-medium text-warm-600">
                      {{ timeZone.displaySessionDate(sesion) }}{{ timeZone.displaySessionEndDate(sesion) !== timeZone.displaySessionDate(sesion) ? ' – ' + timeZone.displaySessionEndDate(sesion) : '' }}
                    </span>
                    <span class="text-warm-300">•</span>
                    <span class="text-xs font-mono font-bold text-warm-800">{{ timeZone.displaySessionStartTime(sesion) }} - {{ timeZone.displaySessionEndTime(sesion) }}</span>
                  }
                </div>

                <h4 class="font-bold text-sm text-warm-900 leading-snug" [class.line-through]="esCancelada(sesion)">
                  {{ sesion.title }}
                </h4>
                <app-sesion-estado-badge
                  [estado]="sesion.estado"
                  [cancelacion]="sesion.cancelacion"
                  [estadoSolicitud]="sesion.estadoSolicitud"
                  [pendienteAprobacion]="sesion.pendienteAprobacion"
                />
                @if (esPendiente(sesion)) {
                  <p class="text-xs text-warning-800" data-testid="sesion-pendiente-texto">{{ textoPendiente }}</p>
                }
              </div>

              <!-- Botones de Acción sobre la Sesión -->
              <div data-testid="sesion-acciones" class="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  (click)="tomarAsistencia.emit(sesion)"
                  [disabled]="esCancelada(sesion) || esPendiente(sesion)"
                  class="text-xs font-bold text-white bg-primary-800 hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs"
                  title="Tomar o registrar asistencia de esta sesión"
                >
                  <svg class="w-3.5 h-3.5 text-primary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tomar Asistencia
                </button>

                @if (qrEnabled()) {
                  <button
                    type="button"
                    (click)="proyectar.emit(sesion)"
                    [disabled]="esCancelada(sesion) || esPendiente(sesion)"
                    class="text-xs font-bold text-primary-800 hover:text-primary-950 bg-accent-100 hover:bg-accent-200 border border-accent-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    title="Proyectar QR/PIN específico de esta sesión"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR / PIN
                  </button>
                }

                <button
                  type="button"
                  (click)="verDetalle.emit(sesion)"
                  class="text-xs font-semibold text-warm-700 hover:text-warm-900 bg-warm-100 hover:bg-warm-200 border border-warm-200 min-h-[44px] px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                  title="Ver detalles e historial de asistencia de esta sesión"
                >
                  <svg class="w-3.5 h-3.5 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Detalles
                </button>

                <button
                  type="button"
                  (click)="ajustarHorario.emit(sesion)"
                  [disabled]="esCancelada(sesion)"
                  class="text-xs font-semibold text-primary-800 hover:text-primary-950 bg-primary-50 hover:bg-primary-100 border border-primary-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                  title="Modificar horario de la sesión"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ajustar Horario
                </button>

                @if (cancelEnabled() && !esCancelada(sesion)) {
                  <button
                    type="button"
                    (click)="cancelar.emit(sesion)"
                    class="text-xs font-semibold text-danger-700 hover:text-danger-900 bg-danger-50 hover:bg-danger-100 border border-danger-200 min-h-[44px] px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                    title="Cancelar una sesión de clase con motivo lectivo"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancelar
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TeacherGrupoSesionesComponent {
  readonly timeZone = inject(SessionTimeZoneService);
  sessions = input<ClassSession[]>([]);
  loading = input<boolean>(false);
  // QR/PIN sigue fuera de contrato hasta B.2; Cancelar (HU047) se habilita con la bandera sessionCancelEnabled.
  qrEnabled = input<boolean>(false);
  cancelEnabled = input<boolean>(false);

  protected esCancelada = estaCancelada;
  protected esPendiente = estaPendienteAprobacion;
  protected readonly textoPendiente = TEXTO_SESION_PENDIENTE;

  programarExtraordinaria = output<void>();
  tomarAsistencia = output<ClassSession>();
  proyectar = output<ClassSession>();
  verDetalle = output<ClassSession>();
  ajustarHorario = output<ClassSession>();
  cancelar = output<ClassSession>();
}
