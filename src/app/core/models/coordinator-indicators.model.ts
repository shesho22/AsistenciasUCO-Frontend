export type SemaforoAlerta = 'ROJO' | 'AMBAR' | 'VERDE';

export interface KpisCoordinador {
  idPrograma: string;
  nombrePrograma: string;
  idPeriodoAcademico: string | null;
  nombrePeriodoAcademico: string | null;
  totalEstudiantes: number;
  estudiantesRegulares: number;
  estudiantesRiesgo: number;
  estudiantesPerdida: number;
  tasaPermanencia: number | null;
  sesionesProgramadas: number;
  sesionesVencidas: number;
  sesionesEjecutadas: number;
  sesionesVencidasSinRegistro: number;
  sesionesSinProcedenciaTemporal: number;
  porcentajeCumplimiento: number | null;
  porcentajeProgresoCalendario: number | null;
  umbralAdvertencia: number;
  umbralPerdida: number;
  /** CIERRE-W3I: docentes con vinculo activo en el programa (sin tope de pagina). */
  totalDocentes: number;
  /** CIERRE-W3I: grupos habilitados del programa en el periodo resuelto y su aforo (`tasaAforo` es null con cupo 0). */
  gruposActivos: number;
  cupoTotal: number;
  matriculadosActivos: number;
  tasaAforo: number | null;
  /** CIERRE-W3I: padron del programa (estudiantes con vinculo al programa). */
  estudiantesRegistrados: number;
}

export interface AlertaTemprana {
  idEstudiante: string;
  nombreCompleto: string;
  numeroIdentificacion: number;
  correo: string;
  totalMatriculasActivas: number;
  porcentajeInasistencia: number | null;
  faltasSinJustaCausa: number;
  codigoPermanencia: string;
  semaforo: SemaforoAlerta;
}

export interface AlertasFiltro {
  pagina: number;
  tamano: number;
  semaforo?: SemaforoAlerta;
  nombre?: string;
  idPeriodoAcademico?: string;
}

export interface BitacoraSesion {
  idSesion: string;
  numeroSesion: number;
  nombreSesion: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  idGrupo: string;
  codigoGrupo: number;
  idAsignatura: string;
  nombreAsignatura: string;
  asistio: boolean | null;
  codigoRazonCausa: string | null;
  nombreRazonCausa: string | null;
}

export interface ResumenAsignaturaEstudiante {
  idGrupo: string;
  codigoGrupo: number;
  idAsignatura: string;
  nombreAsignatura: string;
  codigoEstadoEstudiante: string;
  nombreEstadoEstudiante: string;
  sesionesEjecutadas: number;
  asistencias: number;
  faltasSinJustaCausa: number;
  excusas: number;
  porcentajeInasistencia: number | null;
  codigoPermanencia: string;
}

export interface FichaEstudiante {
  idEstudiante: string;
  tipoIdentificacion: string;
  numeroIdentificacion: number;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  correo: string;
  estaActivoUsuario: boolean;
  idPrograma: string;
  nombrePrograma: string;
  resumenPorAsignatura: ResumenAsignaturaEstudiante[];
}
