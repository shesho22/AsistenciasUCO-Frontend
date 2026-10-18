export type SessionTimeZoneErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_LOCAL_TIME'
  | 'AMBIGUOUS_LOCAL_TIME'
  | 'END_BEFORE_START';

export class SessionTimeZoneError extends Error {
  constructor(
    public readonly code: SessionTimeZoneErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'SessionTimeZoneError';
  }
}

export interface LocalSessionInput {
  date: string;
  startTime: string;
  endTime: string;
  timeZone: string;
}

export interface LocalSessionInstants {
  fechaHoraInicio: string;
  fechaHoraFin: string;
}

export interface LocalDateTimeParts {
  date: string;
  time: string;
}

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const RFC3339_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?(Z|[+-]\d{2}:\d{2})$/;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

function validTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function parseDate(date: string): { year: number; month: number; day: number } {
  const match = LOCAL_DATE_PATTERN.exec(date);
  if (!match) {
    throw new SessionTimeZoneError('INVALID_INPUT', `Fecha local inválida: ${date}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(0);
  check.setUTCFullYear(year, month - 1, day);
  check.setUTCHours(0, 0, 0, 0);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new SessionTimeZoneError('INVALID_INPUT', `Fecha local inválida: ${date}`);
  }
  return { year, month, day };
}

function parseTime(time: string): { hour: number; minute: number } {
  const match = LOCAL_TIME_PATTERN.exec(time);
  if (!match) {
    throw new SessionTimeZoneError('INVALID_INPUT', `Hora local inválida: ${time}`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new SessionTimeZoneError('INVALID_INPUT', `Hora local inválida: ${time}`);
  }
  return { hour, minute };
}

function localNaiveEpoch(date: string, time: string): number {
  const d = parseDate(date);
  const t = parseTime(time);
  const value = new Date(0);
  value.setUTCFullYear(d.year, d.month - 1, d.day);
  value.setUTCHours(t.hour, t.minute, 0, 0);
  return value.getTime();
}

function formatParts(epochMs: number, timeZone: string): LocalDateTimeParts {
  const formatter = getFormatter(timeZone);
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(epochMs)).map((part) => [part.type, part.value])
  );
  return {
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
    time: `${parts['hour']}:${parts['minute']}`,
  };
}

function offsetMinutesAt(epochMs: number, timeZone: string): number {
  const parts = formatPartsWithSeconds(epochMs, timeZone);
  const asUtc = new Date(0);
  asUtc.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  asUtc.setUTCHours(parts.hour, parts.minute, parts.second, 0);
  return Math.round((asUtc.getTime() - epochMs) / 60000);
}

function formatPartsWithSeconds(
  epochMs: number,
  timeZone: string
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const formatter = getFormatter(timeZone);
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(epochMs)).map((part) => [part.type, part.value])
  );
  return {
    year: Number(parts['year']),
    month: Number(parts['month']),
    day: Number(parts['day']),
    hour: Number(parts['hour']),
    minute: Number(parts['minute']),
    second: Number(parts['second']),
  };
}

function addCalendarDay(date: string): string {
  const parsed = parseDate(date);
  const value = new Date(0);
  value.setUTCFullYear(parsed.year, parsed.month - 1, parsed.day + 1);
  value.setUTCHours(0, 0, 0, 0);
  return `${String(value.getUTCFullYear()).padStart(4, '0')}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function findLocalCandidates(date: string, time: string, timeZone: string): number[] {
  if (!validTimeZone(timeZone)) {
    throw new SessionTimeZoneError('INVALID_INPUT', `Zona IANA inválida: ${timeZone}`);
  }
  const naive = localNaiveEpoch(date, time);
  const offsets = new Set<number>();
  // Se consultan los offsets de la base IANA del runtime; no se aplican reglas
  // DST manuales ni offsets constantes. La ventana cubre cambios extremos de zona.
  for (let delta = -36 * 60; delta <= 36 * 60; delta += 30) {
    offsets.add(offsetMinutesAt(naive + delta * 60000, timeZone));
  }

  return [...offsets]
    .map((offset) => naive - offset * 60000)
    .filter((candidate) => {
      const parts = formatParts(candidate, timeZone);
      return parts.date === date && parts.time === time;
    })
    .sort((a, b) => a - b);
}

function formatOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'Z';
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

function formatExplicitInstant(epochMs: number, timeZone: string): string {
  const parts = formatPartsWithSeconds(epochMs, timeZone);
  const offset = offsetMinutesAt(epochMs, timeZone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(parts.second).padStart(2, '0')}${formatOffset(offset)}`;
}

export function localDateTimeToExplicitInstant(
  date: string,
  time: string,
  timeZone: string
): string {
  const candidates = findLocalCandidates(date, time, timeZone);
  if (candidates.length === 0) {
    throw new SessionTimeZoneError(
      'INVALID_LOCAL_TIME',
      `La hora ${date} ${time} no existe en ${timeZone} por un cambio de horario de verano.`
    );
  }
  if (candidates.length > 1) {
    throw new SessionTimeZoneError(
      'AMBIGUOUS_LOCAL_TIME',
      `La hora ${date} ${time} ocurre dos veces en ${timeZone}; selecciona una hora no ambigua.`
    );
  }
  return formatExplicitInstant(candidates[0], timeZone);
}

export function localSessionToInstants(input: LocalSessionInput): LocalSessionInstants {
  if (input.startTime === input.endTime) {
    throw new SessionTimeZoneError(
      'END_BEFORE_START',
      'La hora de fin debe ser posterior a la hora de inicio; una sesión de 24 horas no se crea implícitamente.'
    );
  }
  const start = localDateTimeToExplicitInstant(input.date, input.startTime, input.timeZone);
  const endDate = input.endTime <= input.startTime ? addCalendarDay(input.date) : input.date;
  const end = localDateTimeToExplicitInstant(endDate, input.endTime, input.timeZone);
  if (Date.parse(end) <= Date.parse(start)) {
    throw new SessionTimeZoneError(
      'END_BEFORE_START',
      'La hora de fin debe ser posterior al instante de inicio.'
    );
  }
  return { fechaHoraInicio: start, fechaHoraFin: end };
}

export function normalizeRfc3339ToUtc(value: string): string {
  const match = RFC3339_PATTERN.exec(value);
  if (!match) {
    throw new SessionTimeZoneError('INVALID_INPUT', `Instante RFC3339 inválido: ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  parseDate(`${match[1]}-${match[2]}-${match[3]}`);
  if (hour > 23 || minute > 59 || second > 59) {
    throw new SessionTimeZoneError('INVALID_INPUT', `Instante RFC3339 inválido: ${value}`);
  }
  const rawOffset = match[8];
  const offsetHours = rawOffset === 'Z' ? 0 : Number(rawOffset.slice(1, 3));
  const offsetRemainder = rawOffset === 'Z' ? 0 : Number(rawOffset.slice(4, 6));
  if (offsetRemainder > 59 || offsetHours > 14 || (offsetHours === 14 && offsetRemainder !== 0)) {
    throw new SessionTimeZoneError('INVALID_INPUT', `Offset RFC3339 inválido: ${value}`);
  }
  const offsetMinutes = rawOffset === 'Z'
    ? 0
    : (offsetHours * 60 + offsetRemainder) * (rawOffset[0] === '+' ? 1 : -1);
  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  instant.setUTCHours(hour, minute, second, 0);
  instant.setTime(instant.getTime() - offsetMinutes * 60000);
  const fraction = match[7] ? `.${match[7]}` : '';
  return `${String(instant.getUTCFullYear()).padStart(4, '0')}-${String(instant.getUTCMonth() + 1).padStart(2, '0')}-${String(instant.getUTCDate()).padStart(2, '0')}T${String(instant.getUTCHours()).padStart(2, '0')}:${String(instant.getUTCMinutes()).padStart(2, '0')}:${String(instant.getUTCSeconds()).padStart(2, '0')}${fraction}Z`;
}

export function formatInstantInTimeZone(
  instant: string,
  timeZone: string
): LocalDateTimeParts {
  if (!RFC3339_PATTERN.test(instant) || !validTimeZone(timeZone)) {
    throw new SessionTimeZoneError('INVALID_INPUT', 'Instante o zona IANA inválidos.');
  }
  const utc = normalizeRfc3339ToUtc(instant);
  const epoch = Date.parse(utc);
  if (!Number.isFinite(epoch)) {
    throw new SessionTimeZoneError('INVALID_INPUT', `Instante inválido: ${instant}`);
  }
  return formatParts(epoch, timeZone);
}

export function browserTimeZone(): string {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return detected && validTimeZone(detected) ? detected : 'UTC';
}

export function currentDateInTimeZone(timeZone: string): string {
  return formatParts(Date.now(), timeZone).date;
}

