/**
 * ATA D10 (J.2): una toma en falta que el estudiante aún puede reclamar. Una fila por toma; las tomas de una misma sesión
 * comparten `idSesion`. Las fechas llegan en ISO UTC con `Z`; `fechaLimiteReclamoUtc` es el instante exclusivo del plazo.
 */
export interface FaltaReclamable {
  idGrupo: string;
  nombreGrupo: string;
  idAsignatura: string;
  nombreAsignatura: string;
  idSesion: string;
  numeroSesion: number;
  fechaHoraInicioUtc: string;
  fechaHoraFinUtc: string;
  idToma: string;
  numeroToma: number;
  fechaPuntoControlUtc: string;
  fechaLimiteReclamoUtc: string;
}

/** Filas de una misma sesión, agrupadas solo para presentarlas (una tarjeta por sesión). */
export interface FaltasReclamablesSesion {
  idSesion: string;
  idGrupo: string;
  nombreGrupo: string;
  idAsignatura: string;
  nombreAsignatura: string;
  numeroSesion: number;
  fechaHoraInicioUtc: string;
  fechaHoraFinUtc: string;
  fechaLimiteReclamoUtc: string;
  tomas: FaltaReclamable[];
}

export interface FiltroFaltasReclamables {
  pagina?: number;
  tamano?: number;
}
