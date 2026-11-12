import {
  HorarioEstudianteApiDto,
  MateriaEstudianteApiDto,
  SesionMateriaEstudianteApiDto,
  TomaSesionEstudianteApiDto,
} from '../api/models/estudiante-portal-api-dto.model';
import { HorarioItem } from '../models/role-management.model';
import { MockMateriaEstudiante, MockSesionMateria } from './role-management.mock';

/** UUID v4-formado y deterministico a partir de una semilla; solo para el modo mock. */
export function mockUuid(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const hex: string[] = [];
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < seed.length; i++) {
      const codePoint = seed.codePointAt(i) ?? 0;
      h1 = Math.imul(h1 ^ (codePoint + round), 0x01000193) >>> 0;
      h2 = Math.imul(h2 + h1 + i, 0x85ebca6b) >>> 0;
      if (codePoint > 0xffff) i++;
    }
    hex.push(h1.toString(16).padStart(8, '0'), h2.toString(16).padStart(8, '0'));
  }
  const flat = hex.join('').slice(0, 32).split('');
  flat[12] = '4';
  flat[16] = '89ab'[Number.parseInt(flat[16], 16) % 4];
  const joined = flat.join('');
  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(16, 20)}-${joined.slice(20, 32)}`;
}

/** Materia mock -> `MateriaEstudianteDTO` (solo los 4 campos del contrato real). */
export function mockMateriasToDto(materias: MockMateriaEstudiante[]): MateriaEstudianteApiDto[] {
  return materias.map((m) => ({
    idAsignatura: mockUuid(`asignatura:${m.id}`),
    nombreAsignatura: m.nombre,
    idGrupo: mockUuid(`grupo:${m.id}:${m.grupo}`),
    nombreGrupo: m.grupo,
  }));
}

/** Horario mock -> `HorarioEstudianteDTO`. */
export function mockHorariosToDto(horarios: HorarioItem[]): HorarioEstudianteApiDto[] {
  return horarios.map((h) => ({
    id: mockUuid(`horario:${h.id}`),
    idEstudiante: mockUuid('estudiante:mock'),
    idGrupo: mockUuid(`grupo:${h.codigoMateria}:${h.grupo}`),
    codigoMateria: h.codigoMateria,
    nombreMateria: h.nombreMateria,
    grupo: h.grupo,
    dia: h.dia.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(),
    horaInicio: `${h.horaInicio}:00`,
    horaFin: `${h.horaFin}:00`,
    docente: h.docente ?? '',
  }));
}

/** Tomas mock (puntos de control en el minuto 0 y a mitad de la clase): el estado de cada toma sigue al de la sesion. */
function mockTomasDto(sesionId: string, estado: string, fecha: string, inicio: string, fin: string): TomaSesionEstudianteApiDto[] {
  if (estado !== 'PRESENTE' && estado !== 'AUSENTE' && estado !== 'JUSTIFICADA') return [];
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fin.split(':').map(Number);
  const medio = Math.floor((hi * 60 + mi + hf * 60 + mf) / 2);
  const hora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  return [inicio, hora(medio)].map((h, i) => ({
    idToma: mockUuid(`toma:${sesionId}:${i + 1}`),
    numero: i + 1,
    fechaPuntoControlUtc: `${fecha}T${h}:00Z`,
    estado,
    reclamable: estado === 'AUSENTE',
    idSolicitudRevision: null,
    estadoSolicitudRevision: null,
    resultadoAprobacion: null,
  }));
}

/** Sesion mock -> `SesionMateriaEstudianteDTO` (el mock si conoce RETARDO, que el backend real no distingue). */
export function mockSesionesToDto(
  sesiones: MockSesionMateria[],
  materia: MockMateriaEstudiante | undefined
): SesionMateriaEstudianteApiDto[] {
  const grupo = materia?.grupo ?? 'GRP-01';
  return sesiones.map((s) => {
    const horas = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/.exec(s.horario);
    const inicio = horas?.[1] ?? '08:00';
    const fin = horas?.[2] ?? '10:00';
    const tomas = mockTomasDto(s.id, s.estadoAsistencia, s.fecha, inicio, fin);
    const minutos = (Number(fin.slice(0, 2)) - Number(inicio.slice(0, 2))) * 60 + Number(fin.slice(3)) - Number(inicio.slice(3));
    return {
      id: mockUuid(`sesion:${s.id}`),
      nombre: s.tema,
      numero: s.numeroSesion,
      codigo: `SES-${String(s.numeroSesion).padStart(2, '0')}`,
      numeroSemana: Math.ceil(s.numeroSesion / 2),
      idGrupo: mockUuid(`grupo:${s.materiaId}:${grupo}`),
      codigoGrupo: grupo,
      nombreGrupo: grupo,
      fechaHoraInicio: `${s.fecha}T${inicio}:00Z`,
      fechaHoraFin: `${s.fecha}T${fin}:00Z`,
      estadoAsistencia: s.estadoAsistencia,
      estadoSolicitudRevision: null,
      reclamable: s.estadoAsistencia === 'AUSENTE' || s.estadoAsistencia === 'RETARDO',
      minutosSesion: tomas.length > 0 ? minutos : null,
      minutosAsistidos: tomas.length > 0 ? (s.estadoAsistencia === 'PRESENTE' ? minutos : 0) : null,
      minutosFalta: tomas.length > 0 ? (s.estadoAsistencia === 'AUSENTE' ? minutos : 0) : null,
      minutosExcusa: tomas.length > 0 ? (s.estadoAsistencia === 'JUSTIFICADA' ? minutos : 0) : null,
      minutosSinRegistro: tomas.length > 0 ? 0 : null,
      tomas,
    };
  });
}
