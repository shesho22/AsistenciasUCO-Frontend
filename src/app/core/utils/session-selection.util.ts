import { ClassSession } from '../models/attendance.model';

/**
 * Determina de forma determinística la sesión recomendada a seleccionar:
 * 1. Si existe una sesión en curso (hoy y dentro de su rango de hora inicio/fin), la selecciona prioritariamente.
 * 2. Si no, busca la próxima sesión futura más cercana (fechaHoraInicio > ahora).
 * 3. Si todas las sesiones ya concluyeron en el pasado, selecciona la última sesión completada (la más reciente).
 * 4. Si la lista está vacía, retorna undefined.
 */
export function findActiveOrUpcomingSession(
  sessions: ClassSession[],
  now: Date = new Date()
): ClassSession | undefined {
  if (!sessions || sessions.length === 0) {
    return undefined;
  }

  const nowMs = now.getTime();

  const parseSessionTime = (dateStr: string, timeStr: string): number => {
    const [year, month, day] = (dateStr || '').split('-').map(Number);
    const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
    if (!year || !month || !day) return 0;
    return new Date(year, month - 1, day, hours || 0, minutes || 0, 0).getTime();
  };

  const DIA_MS = 24 * 60 * 60 * 1000;
  const sessionTimings = sessions.map((s) => {
    const startMs = parseSessionTime(s.date, s.startTime);
    let endMs = parseSessionTime(s.date, s.endTime || s.startTime);
    // Una sesion que cruza la medianoche (22:30 - 00:35) termina al dia siguiente.
    if (endMs < startMs) endMs += DIA_MS;
    return { session: s, startMs, endMs };
  });

  // 1. Sesión activa en curso: startMs <= nowMs <= endMs. Con sesiones solapadas gana la que empezó antes
  //    (y, a igual inicio, la de menor número), sin depender del orden en que llegaron.
  const activeSession = sessionTimings
    .filter((t) => t.startMs <= nowMs && nowMs <= t.endMs)
    .sort((a, b) => a.startMs - b.startMs || a.session.sessionNumber - b.session.sessionNumber)[0];
  if (activeSession) {
    return activeSession.session;
  }

  // 2. Próximas sesiones futuras: startMs > nowMs ordenadas ascendentemente (la más cercana)
  const futureSessions = sessionTimings
    .filter((t) => t.startMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs);

  if (futureSessions.length > 0) {
    return futureSessions[0].session;
  }

  // 3. Si todas ya concluyeron, tomamos la más reciente en el pasado (startMs más alto)
  const pastSessions = sessionTimings
    .filter((t) => t.startMs <= nowMs)
    .sort((a, b) => b.startMs - a.startMs);

  if (pastSessions.length > 0) {
    return pastSessions[0].session;
  }

  return sessions[0];
}
