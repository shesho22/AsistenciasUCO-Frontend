import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import {
  browserTimeZone,
  currentDateInTimeZone,
  detectedBrowserTimeZone,
  formatInstantInTimeZone,
  localSessionToInstants,
  LocalSessionInput,
  PresentedTemporal,
  presentTemporalValue,
  timeZoneOffsetLabel,
} from '../time/session-timezone.util';
import type { ClassSession } from '../models/attendance.model';

export type SessionTimeZoneMode = 'auto' | 'manual';
/** Origen de la zona efectiva: navegador (automática), respaldo `UTC` si el navegador no informa zona, o manual. */
export type SessionTimeZoneSource = 'browser' | 'fallback' | 'manual';
export type TemporalPart = 'datetime' | 'date' | 'time';

const STORAGE_KEY = 'asistenciasuco.session-timezone';

/**
 * Zona horaria efectiva de la aplicación (APP-04). Por defecto es AUTOMÁTICA: la zona IANA del navegador
 * (`Intl.DateTimeFormat().resolvedOptions().timeZone`), sin geolocalización, IP ni idioma. Los instantes UTC se
 * conservan como fuente de verdad y solo se formatean aquí para presentación; nunca se persisten convertidos.
 */
@Injectable({ providedIn: 'root' })
export class SessionTimeZoneService implements OnDestroy {
  readonly mode = signal<SessionTimeZoneMode>('auto');
  readonly zone = signal<string>(browserTimeZone());
  readonly zoneSource = signal<SessionTimeZoneSource>(detectedBrowserTimeZone() ? 'browser' : 'fallback');
  readonly zoneLabel = computed(() => {
    const zone = this.zone();
    const offset = timeZoneOffsetLabel(zone);
    const origin = {
      browser: 'automática del navegador',
      fallback: 'respaldo: el navegador no informó su zona',
      manual: 'selección manual',
    }[this.zoneSource()];
    return `${zone} (${offset}, ${origin})`;
  });

  private readonly onBrowserResume = (): void => {
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') this.refreshAutomaticZone();
  };

  constructor() {
    this.restorePreference();
    // La zona del sistema puede cambiar con la pestaña abierta (viaje, ajuste del SO): se recalcula al volver a
    // ella sin exigir recarga ni cierre de sesión. Recargar también la recalcula al construir el servicio.
    if (typeof window !== 'undefined') window.addEventListener('focus', this.onBrowserResume);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onBrowserResume);
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') window.removeEventListener('focus', this.onBrowserResume);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onBrowserResume);
  }

  setAutomatic(): void {
    this.mode.set('auto');
    this.applyBrowserZone();
    this.persist('auto');
  }

  setManualTimeZone(timeZone: string): void {
    // La validación real de IANA la realiza Intl en la conversión; se fuerza una
    // operación de formato aquí para no persistir una preferencia inválida.
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    this.mode.set('manual');
    this.zone.set(timeZone);
    this.zoneSource.set('manual');
    this.persist(timeZone);
  }

  refreshAutomaticZone(): void {
    if (this.mode() === 'auto') this.applyBrowserZone();
  }

  currentDate(): string {
    return currentDateInTimeZone(this.zone());
  }

  toInstants(input: Omit<LocalSessionInput, 'timeZone'>): ReturnType<typeof localSessionToInstants> {
    return localSessionToInstants({ ...input, timeZone: this.zone() });
  }

  displayInstant(instant: string): { date: string; time: string } {
    return formatInstantInTimeZone(instant, this.zone());
  }

  /** Presenta un valor de la API: instante → zona efectiva; fecha-hora sin zona → literal marcada `SIN_ZONA`. */
  presentTemporal(value: string | null | undefined): PresentedTemporal | null {
    return presentTemporalValue(value, this.zone());
  }

  /** Texto `dd/MM/yyyy HH:mm` (o solo fecha/hora) en la zona efectiva; `—` si el valor no es presentable. */
  formatTemporal(value: string | null | undefined, part: TemporalPart = 'datetime'): string {
    const presented = this.presentTemporal(value);
    if (!presented) return '—';
    const [year, month, day] = presented.date.split('-');
    const date = `${day}/${month}/${year}`;
    if (part === 'date') return date;
    if (part === 'time') return presented.time;
    return `${date} ${presented.time}`;
  }

  /** Rango `inicio – fin`; si el fin cae en otra fecha local (cruce de medianoche) se muestra con su fecha. */
  formatTemporalRange(start: string | null | undefined, end: string | null | undefined): string {
    const startText = this.formatTemporal(start);
    const endPresented = this.presentTemporal(end);
    if (!endPresented) return startText;
    const sameDay = this.presentTemporal(start)?.date === endPresented.date;
    return `${startText} – ${this.formatTemporal(end, sameDay ? 'time' : 'datetime')}`;
  }

  /** `true` si algún valor presentable carece de zona (v1 `LocalDateTime` o procedencia no confirmada). */
  hasUnzonedValue(values: readonly (string | null | undefined)[]): boolean {
    return values.some((value) => this.presentTemporal(value)?.kind === 'SIN_ZONA');
  }

  displaySessionDate(session: ClassSession): string {
    return session.fechaHoraInicio && session.estadoTemporal !== 'INDETERMINADA'
      ? this.displayInstant(session.fechaHoraInicio).date
      : session.date;
  }

  displaySessionEndDate(session: ClassSession): string {
    return session.fechaHoraFin && session.estadoTemporal !== 'INDETERMINADA'
      ? this.displayInstant(session.fechaHoraFin).date
      : session.endDate || session.date;
  }

  displaySessionStartTime(session: ClassSession): string {
    return session.fechaHoraInicio && session.estadoTemporal !== 'INDETERMINADA'
      ? this.displayInstant(session.fechaHoraInicio).time
      : session.startTime;
  }

  displaySessionEndTime(session: ClassSession): string {
    return session.fechaHoraFin && session.estadoTemporal !== 'INDETERMINADA'
      ? this.displayInstant(session.fechaHoraFin).time
      : session.endTime;
  }

  private restorePreference(): void {
    if (typeof localStorage === 'undefined') return;
    const preference = localStorage.getItem(STORAGE_KEY);
    if (!preference || preference === 'auto') {
      this.refreshAutomaticZone();
      return;
    }
    try {
      this.setManualTimeZone(preference);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      this.refreshAutomaticZone();
    }
  }

  private applyBrowserZone(): void {
    this.zone.set(browserTimeZone());
    this.zoneSource.set(detectedBrowserTimeZone() ? 'browser' : 'fallback');
  }

  private persist(value: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // La preferencia es opcional; la sesión sigue usando el signal en memoria.
    }
  }
}

