import { Injectable, inject } from '@angular/core';
import {
  Observable,
  auditTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  scan,
  tap,
} from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../../core/realtime/model/realtime-connection-state.model';
import {
  AttendanceSessionUpdatedRealtimePayload,
  REALTIME_EVENT_TYPE,
  RealtimeEvent,
  SesionCanceladaRealtimePayload,
} from '../../../core/realtime/model/realtime-event.model';

/** Ventana de coalescencia para no disparar una recarga por cada evento de
 * una ráfaga (ej. registro masivo consecutivo sobre el mismo grupo/sesión). */
export const ATTENDANCE_REALTIME_COALESCE_MS = 250;

interface ReconnectRecoveryState {
  /** Se observó `RECONNECTING` y aún no ha vuelto `CONNECTED`. */
  readonly recovering: boolean;
  /** Este estado es el primer `CONNECTED` tras una reconexión. */
  readonly refresh: boolean;
}

/**
 * Máquina de estado de recuperación tras reconexión. Recuerda que se observó
 * `RECONNECTING` y mantiene esa marca aunque aparezcan `CONNECTING` u otros
 * `RECONNECTING` intermedios; el primer `CONNECTED` posterior pide exactamente
 * un refresh HTTP y limpia la marca. Una conexión inicial
 * (`DISCONNECTED → CONNECTING → CONNECTED`) nunca pasó por `RECONNECTING`, así
 * que no refresca. No se depende de que `RECONNECTING` y `CONNECTED` sean
 * consecutivos: el transporte real puede emitir `RECONNECTING → CONNECTING →
 * CONNECTED` (MV001-R01).
 */
function reconnectRecoveryStep(
  acc: ReconnectRecoveryState,
  state: RealtimeConnectionState
): ReconnectRecoveryState {
  if (state === 'RECONNECTING') {
    return { recovering: true, refresh: false };
  }
  if (state === 'CONNECTED') {
    return { recovering: false, refresh: acc.recovering };
  }
  return { recovering: acc.recovering, refresh: false };
}

/**
 * Filtra `ASISTENCIAS_SESION_ACTUALIZADAS` a los eventos que pertenecen al
 * grupo/sesión actualmente visibles en `AttendanceControlComponent`, y
 * coalesce ráfagas. Extraído como clase propia para poder probarlo sin
 * instanciar el componente completo (que además de esto orquesta
 * matrícula, sesiones y formularios).
 */
@Injectable({ providedIn: 'root' })
export class AttendanceRealtimeSyncService {
  private readonly realtimeService = inject(RealtimeService);

  connectGroup(grupoId: string): void {
    this.realtimeService.startForGroup(grupoId);
  }

  disconnect(): void {
    this.realtimeService.stop();
  }

  connectionAlerts(): Observable<RealtimeConnectionState> {
    return this.realtimeService.connectionState$.pipe(
      filter(
        (state): state is RealtimeConnectionState =>
          state === 'UNAUTHORIZED' || state === 'ERROR'
      ),
      distinctUntilChanged()
    );
  }

  /**
   * HU047: `SESION_CANCELADA` del grupo visible. Sin coalescencia ni temporizadores: cada evento actualiza la lista
   * y el estado de una sesión cancelada es idempotente.
   */
  watchCancelaciones(getGroupId: () => string): Observable<RealtimeEvent<SesionCanceladaRealtimePayload>> {
    return this.realtimeService
      .listenType<SesionCanceladaRealtimePayload>(REALTIME_EVENT_TYPE.SESION_CANCELADA)
      .pipe(
        filter((evt) => {
          const groupId = getGroupId();
          return !!groupId && evt.payload?.grupo === groupId;
        })
      );
  }

  watch(
    getGroupId: () => string,
    getSessionId: () => string
  ): Observable<RealtimeEvent<AttendanceSessionUpdatedRealtimePayload> | void> {
    const businessEvent$ = this.realtimeService
      .listenType<AttendanceSessionUpdatedRealtimePayload>(
        REALTIME_EVENT_TYPE.ASISTENCIAS_SESION_ACTUALIZADAS
      )
      .pipe(
        filter((evt) => {
          const groupId = getGroupId();
          const sessionId = getSessionId();
          return (
            !!groupId &&
            !!sessionId &&
            evt.payload?.grupo === groupId &&
            evt.payload?.sesion === sessionId
          );
        }),
        auditTime(ATTENDANCE_REALTIME_COALESCE_MS)
      );

    // La marca de reconexión es por suscripción: cada `watch()` mantiene la suya.
    const reconnected$ = this.realtimeService.connectionState$.pipe(
      scan(reconnectRecoveryStep, { recovering: false, refresh: false }),
      filter((recovery) => recovery.refresh),
      tap(() => {
        if (!environment.production) {
          console.debug('[Realtime] RECOVERY_HTTP_REFRESH');
        }
      }),
      map(() => undefined)
    );

    return merge(businessEvent$, reconnected$);
  }
}
