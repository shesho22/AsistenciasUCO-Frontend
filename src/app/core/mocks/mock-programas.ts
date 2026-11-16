import { CatalogoPrograma, ProgramaAcademico } from '../models/programa-academico.model';

/**
 * Simulador de los programas académicos del decano y de sus catálogos (GET /decano/programas, /tipos-programa,
 * /modalidades-programa y /jornadas-programa). Los datos son coherentes con la estructura y los créditos del simulador.
 */
export const TIPOS_PROGRAMA_MOCK: CatalogoPrograma[] = [
  { id: 'TPR-1', codigo: 'PREGRADO', nombre: 'Pregrado' },
  { id: 'TPR-2', codigo: 'POSGRADO', nombre: 'Posgrado' },
];

export const MODALIDADES_PROGRAMA_MOCK: CatalogoPrograma[] = [
  { id: 'MOD-1', codigo: 'PRESENCIAL', nombre: 'Presencial' },
  { id: 'MOD-2', codigo: 'VIRTUAL', nombre: 'Virtual' },
];

export const JORNADAS_PROGRAMA_MOCK: CatalogoPrograma[] = [
  { id: 'JOR-1', codigo: 'DIURNA', nombre: 'Diurna' },
  { id: 'JOR-2', codigo: 'NOCTURNA', nombre: 'Nocturna' },
];

export const PROGRAMAS_MOCK: ProgramaAcademico[] = [
  {
    id: 'PRG-1', nombre: 'Ingeniería de Sistemas', idTipoPrograma: 'TPR-1', nombreTipoPrograma: 'Pregrado',
    idModalidad: 'MOD-1', nombreModalidad: 'Presencial', idJornada: 'JOR-1', nombreJornada: 'Diurna',
    idCoordinador: 'COO-1', nombreCoordinador: 'Coordinador de Prueba', idFacultad: 'FAC-1',
    nombreFacultad: 'Facultad de Ingeniería', estaActivo: true,
  },
  {
    id: 'PRG-2', nombre: 'Ingeniería Industrial', idTipoPrograma: 'TPR-1', nombreTipoPrograma: 'Pregrado',
    idModalidad: 'MOD-1', nombreModalidad: 'Presencial', idJornada: 'JOR-2', nombreJornada: 'Nocturna',
    idCoordinador: 'COO-1', nombreCoordinador: 'Coordinador de Prueba', idFacultad: 'FAC-1',
    nombreFacultad: 'Facultad de Ingeniería', estaActivo: true,
  },
];

/** Filtros de la consulta de programas con la misma semántica del backend (nombre contiene, estado y tipo exactos). */
export function filtrarProgramasMock(
  nombre: string | null,
  estaActivo: string | null,
  idTipoPrograma: string | null
): ProgramaAcademico[] {
  const texto = (nombre ?? '').trim().toLowerCase();
  return PROGRAMAS_MOCK.filter(
    (p) =>
      (!texto || p.nombre.toLowerCase().includes(texto)) &&
      (estaActivo === null || estaActivo === '' || p.estaActivo === (estaActivo === 'true')) &&
      (!idTipoPrograma || p.idTipoPrograma === idTipoPrograma)
  );
}
