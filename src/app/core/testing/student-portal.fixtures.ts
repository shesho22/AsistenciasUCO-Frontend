import { MateriaEstudianteItem, SesionMateriaDetalle } from '../models/role-management.model';

/** UUID de la asignatura "Arquitectura de Software" usada en las pruebas manuales LB-004D. */
export const ASIGNATURA_ID = 'e2f3a4b5-0000-0000-0000-000000000001';
export const GRUPO_ID = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
export const GRUPO_2_ID = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e';

/** Materia con la forma que produce el mapper a partir del contrato real (sin indicadores ni datos de presentacion). */
export function crearMateria(overrides: Partial<MateriaEstudianteItem> = {}): MateriaEstudianteItem {
  const id = overrides.id ?? ASIGNATURA_ID;
  const idGrupo = overrides.idGrupo ?? GRUPO_ID;
  return {
    id,
    idGrupo,
    claveGrupo: `${id}:${idGrupo}`,
    nombre: 'Arquitectura de Software',
    grupo: 'Grupo 001 - Arq Software',
    codigo: null,
    docente: null,
    aula: null,
    horario: null,
    creditos: null,
    indicadores: null,
    estado: null,
    ...overrides,
  };
}

/** Sesion sin registro de asistencia confirmable (`NO_DISPONIBLE`, no reclamable). */
export function crearSesion(overrides: Partial<SesionMateriaDetalle> = {}): SesionMateriaDetalle {
  return {
    id: 'd1d2d3d4-0000-4000-8000-000000000001',
    materiaId: ASIGNATURA_ID,
    grupoId: GRUPO_ID,
    numeroSesion: 1,
    fecha: '2026-10-19',
    horario: '13:00 - 15:00',
    temporalidad: 'UTC',
    tema: 'Introducción',
    estadoAsistencia: 'NO_DISPONIBLE',
    solicitudRevision: null,
    reclamable: false,
    ...overrides,
  };
}
