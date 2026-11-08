export type EstadoRevisionCancelacion =
  | 'PENDIENTE_DOCENTE'
  | 'MANTENIDO'
  | 'PROPUESTA_COORDINACION'
  | 'PROPUESTA_DECANATURA'
  | 'PROPUESTA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'RECHAZADO'
  | 'CANCELADO_POR_INASISTENCIA'
  | string;

export type DecisionDocente = 'MANTENER' | 'PROPONER_CANCELACION' | 'PROPONER' | string;

export type DecisionResolutor =
  | 'CONFIRMAR_CANCELACION'
  | 'APROBAR'
  | 'RECHAZAR_PROPUESTA'
  | 'RECHAZAR'
  | 'ESCALAR_DECANO'
  | 'ESCALAR'
  | string;

export type PerfilResolutor = 'COORDINADOR' | 'DECANO' | string;

export interface RevisionCancelacion {
  id: string;
  idMatricula?: string;
  idGrupo?: string;
  codigoGrupo?: number | string;
  nombreGrupo?: string;
  idAsignatura?: string;
  nombreAsignatura?: string;
  idEstudiante?: string;
  nombreEstudiante?: string;
  numeroIdentificacionEstudiante?: string | null;
  porcentajeInasistencia?: number;
  estado: EstadoRevisionCancelacion;
  nombreEstado?: string;
  motivoDocente?: string | null;
  fechaPropuestaDocente?: string | null;
  fechaDecisionDocenteUtc?: string | null;
  motivoResolutor?: string | null;
  motivoResolucion?: string | null;
  fechaResolucion?: string | null;
  fechaResolucionUtc?: string | null;
  escaladoADecano?: boolean;
  requiereAccionDocente?: boolean;
  requiereAccionResolutor?: boolean;
  esResolutorActual?: boolean;
  accionesPermitidas?: string[];
  perfilResolutorActual?: PerfilResolutor;
  fechaEscalamientoUtc?: string | null;
  estudiante?: { id: string; nombreCompleto: string };
  estadoMatricula?: string;
  grupo?: { id: string; codigo: number | string; nombre: string };
  asignatura?: { id: string; nombre: string };
  docente?: { id: string; nombreCompleto: string };
  programa?: { id: string; nombre: string };
  porcentajeCreacion?: number;
  porcentajeActual?: number;
  umbralPerdida?: number;
  horasFalta?: number;
  horasDictadas?: number;
  fechaCreacionUtc?: string;
  decisionDocente?: string;
  decisionResolucion?: string | null;
  resolutor?: { id: string; nombreCompleto: string } | null;
}

export interface MarcaRevisionResumen {
  id: string;
  estado: EstadoRevisionCancelacion | string;
  nombreEstado?: string;
  requiereAccionDocente?: boolean;
  requiereAccionResolutor?: boolean;
  perfilResolutorActual?: PerfilResolutor | null;
  accionesPermitidas?: string[];
}

export interface MarcaInasistencia {
  id?: string;
  estado?:
    | 'RIESGO'
    | 'PERDIDA_PENDIENTE'
    | 'PENDIENTE_DOCENTE'
    | 'MANTENIDO'
    | 'PROPUESTA_COORDINACION'
    | 'PROPUESTA_DECANATURA'
    | 'PROPUESTA'
    | 'RECHAZADO'
    | 'CANCELADO_POR_INASISTENCIA'
    | string;
  nombreEstado?: string;
  requiereAccionDocente?: boolean;
  requiereAccionResolutor?: boolean;
  perfilResolutorActual?: PerfilResolutor | null;
  accionesPermitidas?: string[];
  porcentaje?: number;
  idRevision?: string | null;
  fechaRevision?: string | null;
  motivo?: string | null;
  advertenciaVigente?: boolean;
  fechaAdvertenciaUtc?: string | null;
  perdidaVigente?: boolean;
  fechaPerdidaUtc?: string | null;
  revision?: MarcaRevisionResumen | null;
}

export type MarcaRevisionDocente = MarcaInasistencia;

export interface FiltroRevisionesCancelacion {
  idPrograma?: string;
  programaId?: string;
  idGrupo?: string;
  grupoId?: string;
  estado?: EstadoRevisionCancelacion;
  soloPendientes?: boolean;
  pagina?: number;
  tamano?: number;
}

export interface DecisionDocentePayload {
  decision: DecisionDocente;
  motivo?: string;
}

export interface DecisionResolutorPayload {
  decision: DecisionResolutor;
  motivo: string;
}
