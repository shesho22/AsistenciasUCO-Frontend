import { Inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { EventSourceMessage, EventStreamContentType } from '@microsoft/fetch-event-source';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import {
  RealtimeSubscriptionScope,
  RealtimeTransport,
} from '../../contract/realtime-transport';
import { RealtimeEvent, isValidRealtimeEvent } from '../../model/realtime-event.model';
import { RealtimeConnectionState } from '../../model/realtime-connection-state.model';
import { FetchEventSourceFn, SSE_FETCH_EVENT_SOURCE } from './sse-fetch-event-source.token';

/** Backoff acotado para errores de red: 1s, 2s, 5s, 10s, luego 30s como techo. */
const RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000, 30000];
const MIN_TOKEN_VALIDITY_SECONDS = 30;
/**
 * Liveness del stream. El backend emite un comentario `:heartbeat` cada 25 s;
 * 40 s da margen a un heartbeat tardío. Sin actividad SSE durante este tiempo
 * el stream se considera zombie y se reabre (MV001-R02).
 */
export const SSE_STALE_TIMEOUT_MS = 40_000;

function debugLog(message: string): void {
  if (!environment.production) {
    console.debug(`[Realtime] ${message}`);
  }
}

function getSecureJitter(maxMs: number): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return (buffer[0] / 0xffffffff) * maxMs;
  }
  return maxMs / 2;
}

class UnauthorizedStreamError extends Error {}
class ForbiddenStreamError extends Error {}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/**
 * Transporte SSE autenticado hacia `GET /api/v1/realtime/stream`, construido
 * sobre `@microsoft/fetch-event-source` (permite enviar `Authorization`,
 * cosa que `EventSource` nativo no soporta). Posee en exclusiva: la petición
 * fetch, el parseo SSE, el header Bearer y la política de reconexión.
 */
@Injectable()
export class FetchSseRealtimeTransport implements RealtimeTransport {
  private readonly eventsSubject = new Subject<RealtimeEvent>();
  private readonly stateSubject = new BehaviorSubject<RealtimeConnectionState>(
    'DISCONNECTED'
  );

  readonly events$: Observable<RealtimeEvent> = this.eventsSubject.asObservable();
  readonly connectionState$: Observable<RealtimeConnectionState> =
    this.stateSubject.asObservable();

  private abortController: AbortController | null = null;
  private running = false;
  /**
   * Índice del backoff. Es solo temporización: `online` lo reinicia a 0 para
   * reintentar de inmediato, sin decidir qué estado se anuncia.
   */
  private backoffAttempt = 0;
  /**
   * Semántica de conexión: true desde que el stream se perdió (fallo, cierre
   * del servidor, `offline`, token no renovable) hasta el siguiente `CONNECTED`.
   * Mientras sea true, los intentos se anuncian `RECONNECTING`, nunca
   * `CONNECTING`; así una reconexión no se confunde con una conexión inicial
   * aunque el backoff se haya reiniciado (MV001-R01).
   */
  private isReconnecting = false;
  private activeGroupId: string | null = null;
  private connectionGeneration = 0;
  /** Despierta la pausa de reconexión en curso (online, stop o cambio de scope). */
  private wake: (() => void) | null = null;
  /** true entre un evento 'offline' y el siguiente 'online' del navegador. */
  private browserOffline = false;
  private networkListenersAttached = false;
  /** Watchdog de liveness, atado al par groupId + generation vigente. */
  private staleTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * true desde un reconnect forzado hasta que su generation invoca fetch (o
   * termina sin conectar). Evita abrir N recoveries con eventos `online` seguidos.
   */
  private recoveryAttemptPending = false;

  private readonly onOffline = (): void => {
    this.browserOffline = true;
    if (!this.running) {
      return;
    }
    debugLog('OFFLINE');
    this.clearStaleTimer();
    // Un stream colgado sobre una red caída no siempre falla por sí solo:
    // se aborta la petición actual y el bucle espera 'online' para reabrir.
    this.abortController?.abort();
    this.isReconnecting = true;
    this.setState('RECONNECTING');
  };

  private readonly onOnline = (): void => {
    this.browserOffline = false;
    if (!this.running) {
      return;
    }
    debugLog('ONLINE');
    // Un stream largo puede quedar congelado dentro de fetchEventSource sin
    // `wake` disponible: `online` fuerza una nueva generation, no solo despierta
    // la pausa de backoff (MV001-R02).
    this.forceReconnectCurrentScope('online');
  };

  constructor(
    private authService: AuthService,
    private ngZone: NgZone,
    @Inject(SSE_FETCH_EVENT_SOURCE) private fetchEventSourceFn: FetchEventSourceFn
  ) {}

  start(scope: RealtimeSubscriptionScope): void {
    if (this.running && this.activeGroupId === scope.grupoId) {
      return;
    }

    this.abortController?.abort();
    this.wake?.();
    this.clearStaleTimer();
    this.recoveryAttemptPending = false;
    this.connectionGeneration++;
    const generation = this.connectionGeneration;
    this.activeGroupId = scope.grupoId;
    this.running = true;
    this.backoffAttempt = 0;
    this.isReconnecting = false;
    this.attachNetworkListeners();
    this.ngZone.runOutsideAngular(() => {
      void this.runLoop(scope.grupoId, generation);
    });
  }

  stop(): void {
    this.running = false;
    this.activeGroupId = null;
    this.connectionGeneration++;
    this.abortController?.abort();
    this.abortController = null;
    this.wake?.();
    this.clearStaleTimer();
    this.recoveryAttemptPending = false;
    this.detachNetworkListeners();
    this.isReconnecting = false;
    this.setState('DISCONNECTED');
  }

  /**
   * Invalida la generation actual y abre una nueva para el mismo grupo. Distinto
   * de `start()` (idempotente): el loop anterior muere por generation mismatch.
   */
  private forceReconnectCurrentScope(reason: string): void {
    const groupId = this.activeGroupId;
    if (!this.running || !groupId || this.recoveryAttemptPending) {
      return;
    }
    debugLog(`FORCE_RECONNECT reason=${reason}`);
    this.recoveryAttemptPending = true;
    this.clearStaleTimer();
    this.isReconnecting = true;
    this.backoffAttempt = 0;
    this.connectionGeneration++;
    const generation = this.connectionGeneration;
    this.abortController?.abort();
    this.abortController = null;
    this.wake?.();
    this.setState('RECONNECTING');
    this.ngZone.runOutsideAngular(() => {
      void this.runLoop(groupId, generation);
    });
  }

  private clearStaleTimer(): void {
    if (this.staleTimer !== null) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
  }

  /** Registra actividad SSE (open, heartbeat o evento) y rearma el watchdog. */
  private markStreamActivity(groupId: string, generation: number): void {
    this.clearStaleTimer();
    this.staleTimer = setTimeout(() => {
      this.staleTimer = null;
      if (
        !this.isActive(groupId, generation) ||
        this.stateSubject.value !== 'CONNECTED'
      ) {
        return;
      }
      debugLog('STALE');
      this.forceReconnectCurrentScope('stale-stream');
    }, SSE_STALE_TIMEOUT_MS);
  }

  private attachNetworkListeners(): void {
    if (this.networkListenersAttached || typeof window === 'undefined') {
      return;
    }
    window.addEventListener('offline', this.onOffline);
    window.addEventListener('online', this.onOnline);
    this.networkListenersAttached = true;
  }

  private detachNetworkListeners(): void {
    if (!this.networkListenersAttached || typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('online', this.onOnline);
    this.networkListenersAttached = false;
    this.browserOffline = false;
  }

  private setState(state: RealtimeConnectionState): void {
    this.ngZone.run(() => this.stateSubject.next(state));
  }

  private isActive(groupId: string, generation: number): boolean {
    return (
      this.running &&
      this.activeGroupId === groupId &&
      this.connectionGeneration === generation
    );
  }

  private async runLoop(groupId: string, generation: number): Promise<void> {
    while (this.isActive(groupId, generation)) {
      if (environment.useMocks) {
        this.setState('DISCONNECTED');
        return;
      }

      let token: string | null = null;
      try {
        token = await this.authService.getValidAccessToken(
          MIN_TOKEN_VALIDITY_SECONDS
        );
      } catch {
        // Fallo al renovar el token (típicamente sin red): tratar como
        // recuperable, igual que un fallo del stream.
        token = null;
      }
      if (!this.isActive(groupId, generation)) {
        return;
      }
      if (!token) {
        this.recoveryAttemptPending = false;
        if (!this.authService.token()) {
          // Sin sesión: no hay nada que reconectar.
          this.setState('DISCONNECTED');
          return;
        }
        // Hay sesión pero no se pudo obtener/renovar un token ahora (p. ej.
        // offline con el access token vencido): esperar y reintentar en vez
        // de abandonar el stream para siempre.
        await this.waitBeforeReconnect(groupId, generation);
        continue;
      }

      this.setState(this.isReconnecting ? 'RECONNECTING' : 'CONNECTING');
      const controller = new AbortController();
      this.abortController = controller;

      this.recoveryAttemptPending = false;

      try {
        await this.fetchEventSourceFn(
          `${environment.apiUrl}/realtime/stream?grupoId=${encodeURIComponent(
            groupId
          )}`,
          {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
            'X-Correlation-Id': crypto.randomUUID(),
          },
          credentials: 'omit',
          openWhenHidden: true,
          signal: controller.signal,
          onopen: async (response) => {
            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.startsWith(EventStreamContentType)) {
              if (this.isActive(groupId, generation)) {
                this.backoffAttempt = 0;
                this.isReconnecting = false;
                this.setState('CONNECTED');
                this.markStreamActivity(groupId, generation);
                debugLog(`CONNECTED generation=${generation}`);
              }
              return;
            }
            if (response.status === 401) {
              throw new UnauthorizedStreamError();
            }
            if (response.status === 403) {
              throw new ForbiddenStreamError();
            }
            throw new Error(
              `Respuesta inesperada del stream realtime: HTTP ${response.status}`
            );
          },
          onmessage: (msg) => {
            if (this.isActive(groupId, generation)) {
              // Incluye heartbeats (data vacío): son liveness, no eventos.
              this.markStreamActivity(groupId, generation);
              this.handleMessage(msg);
            }
          },
          onerror: (err) => {
            // Relanzar SIEMPRE: nunca delegar la política de reintento a la
            // librería, la gobierna este bucle exclusivamente.
            throw err;
          },
          }
        );

        // El servidor cerró el stream sin error (ej. ciclo de vida del LB):
        // tratar como recuperable y reconectar con backoff.
        if (!this.isActive(groupId, generation)) {
          return;
        }
        await this.waitBeforeReconnect(groupId, generation);
      } catch (err) {
        if (!this.isActive(groupId, generation)) {
          return;
        }
        this.clearStaleTimer();
        if (isAbortError(err)) {
          if (controller.signal.aborted && this.abortController === controller && this.browserOffline) {
            // Abortado por 'offline' (no por stop/cambio de scope).
            await this.waitBeforeReconnect(groupId, generation);
            continue;
          }
          return;
        }

        if (err instanceof UnauthorizedStreamError) {
          const refreshed = await this.authService.refreshAccessToken();
          if (!this.isActive(groupId, generation)) {
            return;
          }
          if (refreshed) {
            continue;
          }
          this.setState('UNAUTHORIZED');
          this.running = false;
          return;
        }

        if (err instanceof ForbiddenStreamError) {
          this.setState('ERROR');
          this.running = false;
          return;
        }

        await this.waitBeforeReconnect(groupId, generation);
      }
    }
  }

  private async waitBeforeReconnect(
    groupId: string,
    generation: number
  ): Promise<void> {
    if (!this.isActive(groupId, generation)) {
      return;
    }
    this.clearStaleTimer();
    this.isReconnecting = true;
    this.setState('RECONNECTING');
    // Con el navegador offline no tiene sentido sondear: se espera 'online'
    // (o stop). Con red, backoff acotado + jitter, interrumpible por 'online'.
    const waitMs = this.browserOffline
      ? Number.POSITIVE_INFINITY
      : RECONNECT_BACKOFF_MS[
          Math.min(this.backoffAttempt, RECONNECT_BACKOFF_MS.length - 1)
        ] +
        getSecureJitter(250);
    this.backoffAttempt++;
    await this.pause(waitMs);
  }

  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = Number.isFinite(ms) ? setTimeout(done, ms) : undefined;
      const self = this;
      function done(): void {
        clearTimeout(timer);
        if (self.wake === done) {
          self.wake = null;
        }
        resolve();
      }
      this.wake = done;
    });
  }

  private handleMessage(msg: EventSourceMessage): void {
    // fetch-event-source 2.0.1 invoca onmessage también para mensajes sin
    // `data` (heartbeat): la actividad ya se registró; no es evento de negocio.
    if (!msg.data) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(msg.data);
    } catch {
      console.warn('[Realtime] Payload SSE no es JSON válido; evento descartado.');
      return;
    }

    if (!isValidRealtimeEvent(parsed)) {
      console.warn('[Realtime] Evento SSE con forma inválida; evento descartado.');
      return;
    }

    if (msg.event && parsed.type && msg.event !== parsed.type) {
      console.warn(
        `[Realtime] Inconsistencia entre el campo SSE "event" (${msg.event}) y "data.type" (${parsed.type}); evento descartado.`
      );
      return;
    }

    this.ngZone.run(() => this.eventsSubject.next(parsed));
  }
}
