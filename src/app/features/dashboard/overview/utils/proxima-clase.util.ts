export interface ProximaClaseInfo {
  materia: string;
  codigo: string;
  /** Ausente para el docente: HorarioDocente no entrega aula (no se sintetiza). */
  aula?: string;
  subtitulo: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  fechaProxima: Date;
  enCurso: boolean;
  tiempoRestanteTexto: string;
  tiempoDetalleBadge: string;
  minutosRestantes: number;
}

export interface ClaseHorarioItem {
  codigoMateria: string;
  nombreMateria: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  aula?: string;
  subtitulo: string;
}

export function parseDayToNumber(dayStr: string): number {
  if (!dayStr) return -1;
  const d = dayStr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (d.startsWith('dom')) return 0;
  if (d.startsWith('lun')) return 1;
  if (d.startsWith('mar')) return 2;
  if (d.startsWith('mi')) return 3;
  if (d.startsWith('jue')) return 4;
  if (d.startsWith('vie')) return 5;
  if (d.startsWith('sab')) return 6;
  return -1;
}

export function sanitizeDayName(dayStr: string): string {
  const num = parseDayToNumber(dayStr);
  switch (num) {
    case 0:
      return 'Domingo';
    case 1:
      return 'Lunes';
    case 2:
      return 'Martes';
    case 3:
      return 'Miércoles';
    case 4:
      return 'Jueves';
    case 5:
      return 'Viernes';
    case 6:
      return 'Sábado';
    default:
      return dayStr || '';
  }
}

export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return { hours, minutes };
}

export function parseScheduleString(
  schedule: string
): Array<{ dia: string; horaInicio: string; horaFin: string }> {
  if (!schedule) return [];
  const res: Array<{ dia: string; horaInicio: string; horaFin: string }> = [];

  const timeMatch = schedule.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!timeMatch) return [];

  const horaInicio = timeMatch[1];
  const horaFin = timeMatch[2];

  const diasDetectados: string[] = [];
  const lower = schedule
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (lower.includes('lun')) diasDetectados.push('Lunes');
  if (lower.includes('mar')) diasDetectados.push('Martes');
  if (lower.includes('mie')) diasDetectados.push('Miércoles');
  if (lower.includes('jue')) diasDetectados.push('Jueves');
  if (lower.includes('vie')) diasDetectados.push('Viernes');
  if (lower.includes('sab')) diasDetectados.push('Sábado');
  if (lower.includes('dom')) diasDetectados.push('Domingo');

  for (const d of diasDetectados) {
    res.push({ dia: d, horaInicio, horaFin });
  }
  return res;
}

export function calcularProximaClaseDesdeItems(
  items: ClaseHorarioItem[]
): ProximaClaseInfo | null {
  if (!items || items.length === 0) return null;

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  interface Candidato {
    item: ClaseHorarioItem;
    startDate: Date;
    endDate: Date;
    enCurso: boolean;
    diffMs: number;
  }

  const candidatos: Candidato[] = [];

  for (const item of items) {
    const targetDay = parseDayToNumber(item.dia);
    if (targetDay === -1) continue;

    const tInicio = parseTime(item.horaInicio);
    const tFin = parseTime(item.horaFin);
    if (!tInicio) continue;

    const dayDiff = (targetDay - currentDay + 7) % 7;

    let startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayDiff,
      tInicio.hours,
      tInicio.minutes,
      0,
      0
    );

    let endDate: Date;
    if (tFin) {
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + dayDiff,
        tFin.hours,
        tFin.minutes,
        0,
        0
      );
    } else {
      endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    }

    if (dayDiff === 0) {
      if (now >= startDate && now <= endDate) {
        candidatos.push({
          item,
          startDate,
          endDate,
          enCurso: true,
          diffMs: 0,
        });
        continue;
      } else if (now > endDate) {
        startDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        endDate = new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    const diffMs = startDate.getTime() - now.getTime();
    if (diffMs > 0) {
      candidatos.push({
        item,
        startDate,
        endDate,
        enCurso: false,
        diffMs,
      });
    }
  }

  if (candidatos.length === 0) return null;

  candidatos.sort((a, b) => {
    if (a.enCurso && !b.enCurso) return -1;
    if (!a.enCurso && b.enCurso) return 1;
    return a.diffMs - b.diffMs;
  });

  const elegido = candidatos[0];
  const diffMinutos = Math.max(0, Math.round(elegido.diffMs / 60000));

  let tiempoRestanteTexto = '';
  let tiempoDetalleBadge = '';

  const cleanDia = sanitizeDayName(elegido.item.dia);

  if (elegido.enCurso) {
    const minsParaTerminar = Math.max(
      1,
      Math.round((elegido.endDate.getTime() - now.getTime()) / 60000)
    );
    tiempoRestanteTexto = `¡En curso ahora!`;
    tiempoDetalleBadge = `Finaliza en ${minsParaTerminar} min`;
  } else if (diffMinutos < 60) {
    tiempoRestanteTexto =
      diffMinutos <= 1 ? 'En 1 minuto' : `Faltan ${diffMinutos} min`;
    tiempoDetalleBadge = `En ${diffMinutos} min`;
  } else if (diffMinutos < 1440) {
    const horas = Math.floor(diffMinutos / 60);
    const mins = diffMinutos % 60;
    const minsStr = mins > 0 ? ` ${mins}m` : '';
    if (elegido.startDate.getDate() === now.getDate()) {
      tiempoRestanteTexto = `Hoy en ${horas}h${minsStr}`;
      tiempoDetalleBadge = `Hoy a las ${elegido.item.horaInicio}`;
    } else {
      tiempoRestanteTexto = `Mañana en ${horas}h${minsStr}`;
      tiempoDetalleBadge = `Mañana ${elegido.item.horaInicio}`;
    }
  } else {
    const dias = Math.floor(diffMinutos / 1440);
    tiempoRestanteTexto = `En ${dias} día${dias > 1 ? 's' : ''}`;
    tiempoDetalleBadge = `${cleanDia} ${elegido.item.horaInicio}`;
  }

  return {
    materia: elegido.item.nombreMateria,
    codigo: elegido.item.codigoMateria,
    aula: elegido.item.aula,
    subtitulo: elegido.item.subtitulo,
    dia: cleanDia,
    horaInicio: elegido.item.horaInicio,
    horaFin: elegido.item.horaFin,
    fechaProxima: elegido.startDate,
    enCurso: elegido.enCurso,
    tiempoRestanteTexto,
    tiempoDetalleBadge,
    minutosRestantes: diffMinutos,
  };
}
