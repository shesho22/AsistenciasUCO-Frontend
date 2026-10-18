import { Injectable, signal } from '@angular/core';
import {
  browserTimeZone,
  currentDateInTimeZone,
  formatInstantInTimeZone,
  localSessionToInstants,
  LocalSessionInput,
} from '../time/session-timezone.util';
import type { ClassSession } from '../models/attendance.model';

export type SessionTimeZoneMode = 'auto' | 'manual';

const STORAGE_KEY = 'asistenciasuco.session-timezone';

@Injectable({ providedIn: 'root' })
export class SessionTimeZoneService {
  readonly mode = signal<SessionTimeZoneMode>('auto');
  readonly zone = signal<string>(browserTimeZone());

  constructor() {
    this.restorePreference();
  }

  setAutomatic(): void {
    this.mode.set('auto');
    this.zone.set(browserTimeZone());
    this.persist('auto');
  }

  setManualTimeZone(timeZone: string): void {
    // La validación real de IANA la realiza Intl en la conversión; se fuerza una
    // operación de formato aquí para no persistir una preferencia inválida.
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    this.mode.set('manual');
    this.zone.set(timeZone);
    this.persist(timeZone);
  }

  refreshAutomaticZone(): void {
    if (this.mode() === 'auto') this.zone.set(browserTimeZone());
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

  private persist(value: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // La preferencia es opcional; la sesión sigue usando el signal en memoria.
    }
  }
}

