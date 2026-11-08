export interface KpisDecano {
  idFacultad: string;
  nombreFacultad: string;
  idPeriodoAcademico: string | null;
  nombrePeriodoAcademico: string | null;
  totalProgramas: number;
  totalEstudiantes: number;
  estudiantesRegulares: number;
  estudiantesRiesgo: number;
  estudiantesPerdida: number;
  tasaRetencion: number | null;
  sesionesEjecutadas: number;
  faltasSinJustaCausa: number;
  porcentajeAusentismo: number | null;
  porcentajeAsistencia: number | null;
  gruposActivos: number;
  cupoTotal: number;
  matriculadosActivos: number;
  tasaAforo: number | null;
  umbralAdvertencia: number;
  umbralPerdida: number;
}

export interface ComparativaPrograma {
  idPrograma: string;
  nombrePrograma: string;
  estaActivoPrograma: boolean;
  totalEstudiantes: number;
  estudiantesRiesgo: number;
  estudiantesPerdida: number;
  tasaRetencion: number | null;
  sesionesEjecutadas: number;
  faltasSinJustaCausa: number;
  /** Calculado por horas (D.8): 100 × horasFalta / horasDictadas de las matrículas activas del programa. */
  porcentajeAusentismo: number | null;
  /** Horas dictadas y horas de falta sin justa causa de esas matrículas (horas, 2 decimales). */
  horasDictadas: number;
  horasFalta: number;
}

export interface AforoGrupo {
  idGrupo: string;
  codigoGrupo: number;
  idAsignatura: string;
  nombreAsignatura: string;
  /** CULM-001 B2NM: una fila por grupo con los nombres de todos sus programas (sin idPrograma ni nombrePrograma). */
  programas: string[];
  cupoMaximo: number;
  matriculadosActivos: number;
  cuposDisponibles: number;
  tasaAforo: number | null;
  grupoEstaHabilitado: boolean;
}

export interface AforoFiltro {
  pagina: number;
  tamano: number;
  idPrograma?: string;
  idPeriodoAcademico?: string;
  soloHabilitados?: boolean;
}
