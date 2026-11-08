export type GranularidadTendencia = 'SEMANA' | 'MES';

export interface KpisInstitucion {
  idInstitucion: string;
  nombreInstitucion: string;
  idPeriodoAcademico: string | null;
  nombrePeriodoAcademico: string | null;
  totalFacultades: number;
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
  sesionesVencidas: number;
  sesionesConRegistro: number;
  porcentajeCumplimiento: number | null;
  estudiantesConMatriculaActiva: number;
  estudiantesRegistrados: number;
  docentesConGrupoActivo: number;
  docentesRegistrados: number;
  umbralAdvertencia: number;
  umbralPerdida: number;
}

export interface ComparativaFacultad {
  idFacultad: string;
  nombreFacultad: string;
  estaActivaFacultad: boolean;
  totalProgramas: number;
  totalEstudiantes: number;
  estudiantesRiesgo: number;
  estudiantesPerdida: number;
  tasaRetencion: number | null;
  sesionesEjecutadas: number;
  faltasSinJustaCausa: number;
  /** Calculado por horas (D.8): 100 × horasFalta / horasDictadas de las matrículas activas de la facultad. */
  porcentajeAusentismo: number | null;
  /** Horas dictadas y horas de falta sin justa causa de esas matrículas (horas, 2 decimales). */
  horasDictadas: number;
  horasFalta: number;
}

export interface PuntoTendencia {
  inicioIntervalo: string;
  finIntervalo: string;
  sesionesEjecutadas: number;
  faltasSinJustaCausa: number;
  /** Calculado por horas (D.8): 100 × horasFalta / horasDictadasEstudiante del intervalo. */
  porcentajeAusentismo: number | null;
  /** Horas-estudiante dictadas (horas de la sesión × matrículas activas) y horas de falta sin justa causa del intervalo. */
  horasDictadasEstudiante: number;
  horasFalta: number;
}
