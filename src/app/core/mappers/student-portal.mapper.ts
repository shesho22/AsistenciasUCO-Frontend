import {
  HorarioEstudianteApiDto,
  MateriaEstudianteApiDto,
  SesionMateriaEstudianteApiDto,
} from '../api/models/estudiante-portal-api-dto.model';
import {
  DiaSemana,
  EstadoAsistenciaSesionEstudiante,
  EstadoSolicitudRevision,
  HorarioItem,
  MateriaEstudianteItem,
  SesionMateriaDetalle,
} from '../models/role-management.model';
import { normalizeRfc3339ToUtc } from '../time/session-timezone.util';
import { isUuid } from '../utils/uuid.util';

/** Texto honesto cuando el backend no informa un campo de presentacion. */
export const NO_INFORMADO = 'No informado';

/** Formateador de instantes UTC a fecha/hora en la zona IANA del usuario (inyectado por el servicio). */
export type InstantFormatter = (utcInstant: string) => { date: string; time: string };

const DIAS: Record<string, DiaSemana> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
};

const COLORES: HorarioItem['colorCategory'][] = ['emerald', 'amber', 'blue', 'purple'];

const ESTADOS_ASISTENCIA: readonly EstadoAsistenciaSesionEstudiante[] = [
  'PRESENTE',
  'AUSENTE',
  'RETARDO',
  'JUSTIFICADA',
  'PARCIAL',
  'NO_DISPONIBLE',
];

/**
 * Estados con los que el estudiante puede pedir revision; `NO_DISPONIBLE` jamas habilita un reclamo.
 * `PARCIAL` (SUPUESTO-B-15, CERT-CULM001): sesion con varias tomas en la que alguna quedo ausente y otra presente;
 * el reclamo es por la toma ausente.
 */
const ESTADOS_RECLAMABLES = new Set<EstadoAsistenciaSesionEstudiante>(['AUSENTE', 'RETARDO', 'PARCIAL']);

/** Nombres de estado de solicitud que entrega el catalogo de la DB (`pendiente`, `aceptada`, `rechazada`, `retirada`). */
const SOLICITUD_POR_NOMBRE: Record<string, EstadoSolicitudRevision> = {
  pendiente: 'PENDIENTE',
  aceptada: 'APROBADA',
  rechazada: 'RECHAZADA',
  retirada: 'RETIRADA',
};

const NAIVE_LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d{1,9})?)?$/;
const HAS_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;

function texto(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function hashColor(seed: string): HorarioItem['colorCategory'] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const codePoint = seed.codePointAt(i) ?? 0;
    hash = (hash * 31 + codePoint) >>> 0;
    if (codePoint > 0xffff) i++;
  }
  return COLORES[hash % COLORES.length];
}

/** Normaliza `LocalTime` JSON (`"08:00"`, `"08:00:00"` o `[8, 0]`) a `HH:mm`; `null` si no es una hora valida. */
export function normalizeLocalTime(value: unknown): string | null {
  let hours: number;
  let minutes: number;
  if (Array.isArray(value) && value.length >= 2 && value.every((part) => Number.isInteger(part))) {
    [hours, minutes] = value as number[];
  } else if (typeof value === 'string') {
    const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
    if (!match) return null;
    hours = Number(match[1]);
    minutes = Number(match[2]);
  } else {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Normaliza el dia del backend (`LUNES`, `Miércoles`, `SABADO`...) a `DiaSemana`; `null` si no es un dia lectivo conocido. */
export function normalizeDia(value: unknown): DiaSemana | null {
  const raw = texto(value);
  if (!raw) return null;
  const key = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return DIAS[key] ?? null;
}

/**
 * Avisa cuando el backend entrego filas que el contrato no permite mostrar. Solo registra conteos y los NOMBRES de los
 * campos de la primera fila descartada, nunca sus valores (identificadores, nombres o correos).
 */
function descartadas(recurso: string, crudos: readonly unknown[], validos: number, descartada?: unknown): void {
  if (crudos.length <= validos) return;
  const campos =
    descartada && typeof descartada === 'object'
      ? Object.keys(descartada as Record<string, unknown>).sort((a, b) => a.localeCompare(b))
      : [];
  console.warn(
    `[student-portal] ${crudos.length - validos} de ${crudos.length} ${recurso} descartadas por no cumplir el contrato.`,
    { campos }
  );
}

function estadoSolicitud(value: unknown): SesionMateriaDetalle['solicitudRevision'] {
  const raw = texto(value);
  if (!raw) return null;
  return SOLICITUD_POR_NOMBRE[raw.toLowerCase()] ?? 'DESCONOCIDA';
}

/**
 * Adaptadores tipados entre los DTO HTTP del portal estudiantil y los modelos de UI.
 * Reglas: nunca inventan datos (codigos, docentes, indicadores); lo ausente es `null`; las filas sin identidad
 * valida se descartan para que ninguna ruta se construya con `undefined`/`null`.
 */
export class StudentPortalMapper {
  static toMateria(dto: MateriaEstudianteApiDto): MateriaEstudianteItem | null {
    if (!dto || !isUuid(dto.idAsignatura) || !isUuid(dto.idGrupo)) return null;
    return {
      id: dto.idAsignatura,
      idGrupo: dto.idGrupo,
      claveGrupo: `${dto.idAsignatura}:${dto.idGrupo}`,
      nombre: texto(dto.nombreAsignatura) ?? NO_INFORMADO,
      grupo: texto(dto.nombreGrupo) ?? NO_INFORMADO,
      codigo: null,
      docente: null,
      aula: null,
      horario: null,
      creditos: typeof dto.creditos === 'number' && dto.creditos > 0 ? dto.creditos : null,
      caracter: texto(dto.nombreCaracter) ?? texto(dto.codigoCaracter),
      indicadores: dto.indicadores ?? null,
      estado: null,
      estadoMatricula: dto.estadoMatricula ?? null,
    };
  }

  static toMaterias(dtos: readonly MateriaEstudianteApiDto[] | null | undefined): MateriaEstudianteItem[] {
    const crudos = dtos ?? [];
    const validas = crudos
      .map((dto) => StudentPortalMapper.toMateria(dto))
      .filter((item): item is MateriaEstudianteItem => item !== null);
    descartadas('materias', crudos, validas.length, crudos.find((dto) => StudentPortalMapper.toMateria(dto) === null));
    return validas;
  }

  /**
   * GET /estudiante/materias no trae docente ni horario: se cruzan por `idGrupo` con los bloques de
   * GET /estudiante/horarios. Sin bloques para el grupo, siguen en `null` (no se inventan).
   */
  static conHorarios(materias: readonly MateriaEstudianteItem[], horarios: readonly HorarioItem[]): MateriaEstudianteItem[] {
    return materias.map((materia) => {
      const bloques = horarios.filter((h) => h.idGrupo === materia.idGrupo);
      if (bloques.length === 0) return materia;
      return {
        ...materia,
        codigo: materia.codigo ?? (bloques[0].codigoMateria !== NO_INFORMADO ? bloques[0].codigoMateria : null),
        docente: materia.docente ?? bloques.find((b) => b.docente)?.docente ?? null,
        aula: materia.aula ?? bloques.find((b) => b.aula)?.aula ?? null,
        horario: materia.horario ?? bloques.map((b) => `${b.dia} ${b.horaInicio}-${b.horaFin}`).join(' · '),
      };
    });
  }

  static toHorario(dto: HorarioEstudianteApiDto): HorarioItem | null {
    if (!dto || !isUuid(dto.id)) return null;
    const dia = normalizeDia(dto.dia);
    const horaInicio = normalizeLocalTime(dto.horaInicio);
    const horaFin = normalizeLocalTime(dto.horaFin);
    if (!dia || !horaInicio || !horaFin) return null;
    return {
      id: dto.id,
      idGrupo: isUuid(dto.idGrupo) ? dto.idGrupo : undefined,
      codigoMateria: texto(dto.codigoMateria) ?? NO_INFORMADO,
      nombreMateria: texto(dto.nombreMateria) ?? NO_INFORMADO,
      grupo: texto(dto.grupo) ?? NO_INFORMADO,
      dia,
      horaInicio,
      horaFin,
      aula: null,
      docente: texto(dto.docente),
      colorCategory: hashColor(dto.idGrupo ?? dto.id),
    };
  }

  static toHorarios(dtos: readonly HorarioEstudianteApiDto[] | null | undefined): HorarioItem[] {
    const crudos = dtos ?? [];
    const validos = crudos
      .map((dto) => StudentPortalMapper.toHorario(dto))
      .filter((item): item is HorarioItem => item !== null);
    descartadas('horarios', crudos, validos.length, crudos.find((dto) => StudentPortalMapper.toHorario(dto) === null));
    return validos;
  }

  /**
   * Una sesion con offset/`Z` se convierte a la zona del usuario. Una hora sin zona (wire format actual de
   * `LocalDateTime`) NO se reinterpreta: se muestra tal cual y se marca `SIN_ZONA` (el frontend no asume zona).
   * `estadoAsistencia` solo se acepta si el backend lo envia con un valor conocido; si falta o es desconocido queda
   * `NO_DISPONIBLE` (nunca AUSENTE). `reclamable` exige la pista del backend Y un estado AUSENTE/RETARDO y ninguna
   * solicitud previa; la decision definitiva sigue siendo del backend al radicar.
   */
  static toSesion(
    dto: SesionMateriaEstudianteApiDto,
    materiaId: string,
    format: InstantFormatter
  ): SesionMateriaDetalle | null {
    if (!dto || !isUuid(dto.id)) return null;

    // APP-04: el backend entrega el instante UTC confirmado aparte; la hora v1 sin zona solo es respaldo literal.
    const inicio = StudentPortalMapper.presentarInstante(dto.fechaHoraInicioUtc ?? dto.fechaHoraInicio, format);
    const fin = StudentPortalMapper.presentarInstante(dto.fechaHoraFinUtc ?? dto.fechaHoraFin, format);
    const fecha = inicio?.date ?? NO_INFORMADO;
    let horario = NO_INFORMADO;
    if (inicio) horario = fin ? `${inicio.time} - ${fin.time}` : inicio.time;
    const estado = ESTADOS_ASISTENCIA.find((valor) => valor === dto.estadoAsistencia) ?? 'NO_DISPONIBLE';
    const solicitudRevision = estadoSolicitud(dto.estadoSolicitudRevision);
    const cancelada = dto.estado === 'CANCELADA';
    const limite = StudentPortalMapper.presentarInstante(dto.fechaLimiteJustificacionUtc, format);

    return {
      id: dto.id,
      materiaId,
      grupoId: dto.idGrupo,
      numeroSesion: dto.numero,
      fecha,
      horario,
      temporalidad: inicio?.utc ? 'UTC' : 'SIN_ZONA',
      fechaHoraInicioUtc: inicio?.utc,
      tema: texto(dto.nombre) ?? texto(dto.codigo) ?? `Sesión ${dto.numero}`,
      estadoAsistencia: estado,
      solicitudRevision,
      estado: cancelada ? 'CANCELADA' : 'PROGRAMADA',
      cancelacion: dto.cancelacion ?? null,
      horasSesion: typeof dto.horasSesion === 'number' ? dto.horasSesion : undefined,
      fechaLimiteJustificacionUtc: limite?.utc,
      fechaLimiteJustificacionLocal: limite ? `${limite.date} ${limite.time}` : undefined,
      plazoJustificacionVigente: typeof dto.plazoJustificacionVigente === 'boolean' ? dto.plazoJustificacionVigente : undefined,
      reclamable: !cancelada && dto.reclamable === true && ESTADOS_RECLAMABLES.has(estado) && solicitudRevision === null,
    };
  }

  static toSesiones(
    dtos: readonly SesionMateriaEstudianteApiDto[] | null | undefined,
    materiaId: string,
    format: InstantFormatter
  ): SesionMateriaDetalle[] {
    const crudos = dtos ?? [];
    const validas = crudos
      .map((dto) => StudentPortalMapper.toSesion(dto, materiaId, format))
      .filter((item): item is SesionMateriaDetalle => item !== null);
    descartadas(
      'sesiones',
      crudos,
      validas.length,
      crudos.find((dto) => StudentPortalMapper.toSesion(dto, materiaId, format) === null)
    );
    return validas;
  }

  private static presentarInstante(
    value: unknown,
    format: InstantFormatter
  ): { date: string; time: string; utc?: string } | null {
    const raw = texto(value);
    if (!raw) return null;
    try {
      if (HAS_OFFSET.test(raw)) {
        const utc = normalizeRfc3339ToUtc(raw);
        return { ...format(utc), utc };
      }
    } catch {
      return null;
    }
    const naive = NAIVE_LOCAL_DATE_TIME.exec(raw);
    return naive ? { date: naive[1], time: naive[2] } : null;
  }
}
