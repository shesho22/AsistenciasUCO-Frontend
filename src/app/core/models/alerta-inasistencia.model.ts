export type TipoAlerta = 'RIESGO' | 'ADVERTENCIA' | 'PERDIDA';
export type EstadoAlerta = 'VIGENTE' | 'SUPERADA' | 'RESUELTA';

export interface AlertaInasistencia {
  id: string;
  /** Valores conocidos: ver `TipoAlerta`. */
  tipo?: string;
  /** Valores conocidos: ver `TipoAlerta`. */
  tipoAlerta?: string;
  nombreTipo?: string;
  /** Valores conocidos: ver `EstadoAlerta`. */
  estado: string;
  mensaje: string;
  porcentajeCruce?: number;
  porcentajeActual?: number;
  umbral?: number;
  umbralPerdida?: number;
  /** CIERRE-W3I: nivel de permanencia vigente que clasifica el servidor (REGULAR, RIESGO o PERDIDA); el semaforo solo lo pinta. */
  codigoPermanenciaActual?: string | null;
  limitePorcentaje?: number;
  horasFalta?: number;
  horasDictadas?: number;
  fechaCruceUtc?: string;
  fechaGeneracion?: string;
  leida: boolean;
  fechaLecturaUtc?: string | null;
  fechaLectura?: string | null;
  grupo?: { id: string; codigo: number | string; nombre: string };
  asignatura?: { id: string; nombre: string; codigo?: string };
  idMatricula?: string;
  idGrupo?: string;
  codigoGrupo?: number | string;
  nombreGrupo?: string;
  idAsignatura?: string;
  codigoAsignatura?: string;
  nombreAsignatura?: string;
  idEstudiante?: string;
  estadoMatricula?: string;
}

export interface FiltroAlertasEstudiante {
  idGrupo?: string;
  grupoId?: string;
  /** Valores conocidos: ver `TipoAlerta`. */
  tipo?: string;
  soloVigentes?: boolean;
  soloNoLeidas?: boolean;
  pagina?: number;
  tamano?: number;
}
