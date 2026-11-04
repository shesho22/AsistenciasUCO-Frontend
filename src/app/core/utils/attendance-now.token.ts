import { InjectionToken } from '@angular/core';

/**
 * Reloj de presentación de la ventana de asistencia (SES-01). Solo decide qué se habilita en la UI;
 * la autoridad temporal es el servidor (backend/DB rechazan fuera de ventana con 409). Inyectable para
 * que las pruebas fijen el instante sin alterar timers globales.
 */
export const ATTENDANCE_NOW = new InjectionToken<() => number>('ATTENDANCE_NOW', {
  providedIn: 'root',
  factory: () => () => Date.now(),
});
