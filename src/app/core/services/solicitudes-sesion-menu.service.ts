import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { UserRole } from '../models/user.model';
import { REALTIME_EVENT_TYPE } from '../realtime/model/realtime-event.model';
import { RealtimeService } from '../realtime/realtime.service';
import { CoordinadorSesionesService } from './coordinador-sesiones.service';
import { DocenteSolicitudesSesionService } from './docente-solicitudes-sesion.service';

/** Eventos que cambian el total de solicitudes pendientes (ATA D6). */
const EVENTOS_QUE_RECUENTAN: readonly string[] = [
  REALTIME_EVENT_TYPE.SESION_SOLICITUD_CREADA,
  REALTIME_EVENT_TYPE.SESION_SOLICITUD_RECHAZADA,
  REALTIME_EVENT_TYPE.SESION_MANUAL_CREADA,
];

/**
 * ATA D6: contador de «Solicitudes de sesión» del menú. Es el `total` de la consulta del rol con
 * `soloPendientes=true, tamano=1`; se recarga al fijar el rol y con los eventos de solicitudes (SSE, sin polling).
 */
@Injectable({ providedIn: 'root' })
export class SolicitudesSesionMenuService {
  private readonly coordinador = inject(CoordinadorSesionesService);
  private readonly docente = inject(DocenteSolicitudesSesionService);
  private readonly realtime = inject(RealtimeService);

  /** Pendientes del rol vigente; 0 si el rol no tiene la entrada o la consulta falla. */
  readonly pendientes = signal(0);

  private rol: UserRole | null = null;
  private suscripcion: Subscription | null = null;
  private consulta: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detener());
  }

  /** Fija el rol, recuenta y escucha los eventos de solicitudes. Con un rol sin la entrada deja el contador en cero. */
  iniciar(rol: UserRole | null): void {
    this.detener();
    this.rol = rol;
    if (rol !== 'COORDINADOR' && rol !== 'DOCENTE') {
      this.pendientes.set(0);
      return;
    }
    this.suscripcion = this.realtime.events().subscribe((evento) => {
      if (EVENTOS_QUE_RECUENTAN.includes(evento?.type)) this.recargar();
    });
    this.recargar();
  }

  /** Vuelve a consultar el total; también lo usa la bandeja del coordinador tras aprobar o rechazar. */
  recargar(): void {
    const conteo = this.conteoDelRol();
    this.consulta?.unsubscribe();
    if (!conteo) {
      this.pendientes.set(0);
      return;
    }
    this.consulta = conteo.subscribe({
      next: (total) => this.pendientes.set(total),
      error: () => this.pendientes.set(0),
    });
  }

  private conteoDelRol(): Observable<number> | null {
    if (this.rol === 'COORDINADOR') return this.coordinador.contarPendientes();
    if (this.rol === 'DOCENTE') return this.docente.contarPendientes();
    return null;
  }

  private detener(): void {
    this.suscripcion?.unsubscribe();
    this.consulta?.unsubscribe();
    this.suscripcion = null;
    this.consulta = null;
  }
}
