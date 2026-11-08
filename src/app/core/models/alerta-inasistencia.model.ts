export type TipoAlerta = 'RIESGO' | 'ADVERTENCIA' | 'PERDIDA';
export type EstadoAlerta = 'VIGENTE' | 'SUPERADA' | 'RESUELTA';

export interface AlertaInasistencia {
  id: string;
  tipo?: TipoAlerta | string;
  tipoAlerta?: TipoAlerta | string;
  nombreTipo?: string;
  estado: EstadoAlerta | string;
  mensaje: string;
  porcentajeCruce?: number;
  porcentajeActual?: number;
  umbral?: number;
  umbralPerdida?: number;
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
  tipo?: TipoAlerta | string;
  soloVigentes?: boolean;
  soloNoLeidas?: boolean;
  pagina?: number;
  tamano?: number;
}

export interface MarcarLecturaResponse {
  marcadas: number;
}
