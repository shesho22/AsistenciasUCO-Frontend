import { CancelacionSesion, EstadoSesion } from './sesion-estado.model';

/** HU104/HU105/HU109/HU119/HU145: consultas de solo lectura del decano sobre su facultad. */
export interface EstudianteFacultadItem {
  idEstudiante: string;
  numeroIdentificacion: string | null;
  nombreCompleto: string;
  correo: string | null;
  activo: boolean;
  programas: string | null;
  totalGrupos: number | null;
}

export interface MatriculaEstudianteItem {
  idPrograma: string;
  nombrePrograma: string;
  inpPlanEstudio: number | null;
  idAsignatura: string;
  nombreAsignatura: string;
  idGrupo: string;
  nombreGrupo: string;
}

export interface FichaEstudianteFacultad {
  idEstudiante: string;
  numeroIdentificacion: string | null;
  nombreCompleto: string;
  activo: boolean;
  matriculas: MatriculaEstudianteItem[];
}

export interface PlanEstudioNodo {
  id: string;
  inp: number | null;
  activo: boolean;
  totalSemestres: number | null;
}

export interface ProgramaNodo {
  id: string;
  nombre: string;
  nombreCoordinador: string | null;
  activo: boolean;
  nombreTipoPrograma: string | null;
  nombreModalidad: string | null;
  nombreJornada: string | null;
  planes: PlanEstudioNodo[];
}

export interface FacultadNodo {
  id: string;
  nombre: string;
  nombreDecano: string | null;
  activa: boolean;
  programas: ProgramaNodo[];
}

export interface SesionFacultadItem {
  id: string;
  nombre: string;
  codigo: string;
  numeroSemana: number | null;
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  idGrupo: string;
  codigoGrupo: number | null;
  nombreGrupo: string;
  idAsignatura: string;
  nombreAsignatura: string;
  idPrograma: string;
  nombrePrograma: string;
  /** HU145 / APP-04 (aditivo): instantes UTC con `Z`, presentes solo si `estadoTemporal = CONFIRMADA`. */
  fechaHoraInicioUtc?: string | null;
  fechaHoraFinUtc?: string | null;
  estadoTemporal?: 'CONFIRMADA' | 'INDETERMINADA' | null;
  /** CULM-001 B.1 (aditivo): estado de la sesion y detalle de la cancelacion. */
  estado?: EstadoSesion;
  cancelacion?: CancelacionSesion | null;
}
