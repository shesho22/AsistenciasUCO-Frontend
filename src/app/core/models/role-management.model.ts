export interface DecanoItem {
  id: string;
  idUsuario?: string;
  idFacultad?: string | null;
  tipoIdentificacion?: string;
  tipoIdentificacionId?: string;
  numeroIdentificacion: string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  nombreCompleto?: string;
  nombres: string;
  apellidos: string;
  correo: string;
  password?: string;
  facultad: string;
  nombreFacultad?: string;
  telefono: string;
  fechaAsignacion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  estaActivoDecano?: boolean;
}

export interface CoordinadorItem {
  id: string;
  idUsuario?: string;
  idPrograma?: string | null;
  tipoIdentificacion?: string;
  tipoIdentificacionId?: string;
  numeroIdentificacion: string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  nombreCompleto?: string;
  nombres: string;
  apellidos: string;
  correo: string;
  password?: string;
  facultad: string;
  programaAcademico: string;
  nombrePrograma?: string;
  totalDocentes: number;
  totalGrupos: number;
  estado: 'ACTIVO' | 'INACTIVO';
  estaActivoCoordinador?: boolean;
}

export interface DocenteItem {
  id: string;
  tipoIdentificacion?: string;
  tipoIdentificacionId?: string;
  numeroIdentificacion: string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  nombres: string;
  apellidos: string;
  correo: string;
  departamento: string;
  especialidad: string;
  totalGruposAsignados: number;
  estado: 'ACTIVO' | 'INACTIVO';
}

export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';

export interface HorarioItem {
  id: string;
  idGrupo?: string;
  codigoMateria: string;
  nombreMateria: string;
  grupo: string;
  dia: DiaSemana;
  horaInicio: string; // ej. '08:00'
  horaFin: string;    // ej. '10:00'
  /** HorarioEstudianteDTO no entrega aula; `null` = no informada por el backend. */
  aula: string | null;
  /** `null` = el backend no informo docente titular para el horario. */
  docente: string | null;
  colorCategory: 'emerald' | 'amber' | 'blue' | 'purple';
}

export interface HorarioDocenteItem {
  id: string;
  codigoMateria: string;
  nombreMateria: string;
  seccion: string;
  dia: DiaSemana;
  horaInicio: string;
  horaFin: string;
  /** OUT_OF_GOLDEN_PATH: HorarioDocenteDTO no entrega aula (BACKEND_GOLDEN_PATH_CONTRACT §C.1); solo lo trae el mock. */
  aula?: string;
  totalEstudiantes: number;
  colorCategory: 'emerald' | 'amber' | 'blue' | 'purple';
}

/** Indicadores de asistencia calculados por una fuente autoritativa. Hoy el backend no los entrega. */
export interface IndicadoresAsistenciaMateria {
  totalClases: number;
  asistencias: number;
  inasistencias: number;
  porcentajeAsistencia: number;
}

/**
 * Materia del estudiante tal como la entrega `GET /estudiante/materias` (una fila por asignatura + grupo).
 * Los campos de presentacion que el backend no informa son `null`; la UI muestra "No informado" / "No disponible".
 */
export interface MateriaEstudianteItem {
  /** UUID de la asignatura (`idAsignatura`); es el identificador de la ruta de sesiones. */
  id: string;
  /** UUID del grupo (`idGrupo`); identidad propia, nunca se mezcla con la asignatura. */
  idGrupo: string;
  /** Identidad compuesta asignatura+grupo; unica por tarjeta aunque haya varios grupos de una asignatura. */
  claveGrupo: string;
  nombre: string;
  /** Descripcion del grupo (`nombreGrupo`). */
  grupo: string;
  codigo: string | null;
  docente: string | null;
  aula: string | null;
  horario: string | null;
  creditos: number | null;
  /** `null` = sin fuente confiable de asistencia (nunca se sustituye por ceros). */
  indicadores: IndicadoresAsistenciaMateria | null;
  estado: 'Al día' | 'Riesgo' | 'Crítico' | null;
}

export type EstadoAsistenciaSesion = 'PRESENTE' | 'AUSENTE' | 'RETARDO' | 'JUSTIFICADA';
export type EstadoSolicitudRevision = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export type CategoriaJustificacion =
  | 'Médico / Salud'
  | 'Calamidad Doméstica'
  | 'Académico / Representación'
  | 'Fuerza Mayor'
  | 'Laboral'
  | 'Otro';

export interface SoporteAdjuntoItem {
  /** Identificador opaco generado por el backend; unica fuente de verdad del vinculo del soporte. */
  fileId?: string;
  nombre: string;
  tipo: string;
  tamanioKb: number;
  /** Tamano exacto reportado por el backend (bytes); `tamanioKb` es solo presentacion. */
  tamanioBytes?: number;
  /** Ruta relativa al backend autenticado (`/api/v1/archivos/{fileId}`), nunca una URL del storage. */
  urlSimulada?: string;
  fechaSubida: string;
  /** Instante UTC original de registro del soporte; se presenta en la zona IANA del usuario. */
  fechaSubidaUtc?: string;
}

/** Estado de asistencia de una sesion vista por el estudiante; `NO_DISPONIBLE` jamas equivale a `AUSENTE`. */
export type EstadoAsistenciaSesionEstudiante = EstadoAsistenciaSesion | 'NO_DISPONIBLE';

/**
 * Sesion de una materia del estudiante. `estadoAsistencia` proviene del backend para el estudiante autenticado y es
 * `NO_DISPONIBLE` cuando no hay un registro confirmable: nunca se infiere AUSENTE para habilitar radicaciones.
 * `reclamable` solo es verdadero si el backend lo indica Y el estado es AUSENTE/RETARDO; no sustituye la validacion
 * del backend al radicar.
 */
export interface SesionMateriaDetalle {
  id: string;
  /** UUID de la asignatura consultada (ruta). */
  materiaId: string;
  /** UUID del grupo al que pertenece la sesion. */
  grupoId: string;
  numeroSesion: number;
  /** Fecha presentada (zona IANA del usuario cuando el instante es UTC explicito). */
  fecha: string;
  horario: string;
  /** `UTC` = instante con offset/Z convertido a la zona del usuario; `SIN_ZONA` = el backend envio hora sin zona. */
  temporalidad: 'UTC' | 'SIN_ZONA';
  /** Instante UTC normalizado (RFC 3339 con `Z`) cuando fue confirmable. */
  fechaHoraInicioUtc?: string;
  tema: string;
  estadoAsistencia: EstadoAsistenciaSesionEstudiante;
  /** El backend ya tiene una solicitud de revision para la asistencia de esta sesion (estado informado). */
  solicitudRevision: EstadoSolicitudRevision | 'DESCONOCIDA' | null;
  reclamable: boolean;
  reclamoId?: string;
  estadoReclamo?: EstadoSolicitudRevision;
  categoriaReclamo?: CategoriaJustificacion;
  justificacionEstudiante?: string;
  soporteAdjuntoNombre?: string;
  respuestaDocente?: string;
}

export interface SolicitudRevisionItem {
  id: string;
  estudianteId: string;
  estudianteNombre: string;
  estudianteCorreo: string;
  estudianteAvatar?: string;
  materiaId: string;
  materiaCodigo: string;
  materiaNombre: string;
  grupo: string;
  sesionId: string;
  sesionNumero: number;
  fechaSesion: string;
  /** Instante UTC de inicio de la sesion; ausente cuando el dato historico no tiene procedencia verificable. */
  fechaSesionUtc?: string;
  /** El estado original no lo informa el backend en el listado del docente. */
  estadoOriginal?: EstadoAsistenciaSesion;
  fechaSolicitud: string;
  estadoSolicitud: EstadoSolicitudRevision;
  categoria?: CategoriaJustificacion;
  soporteAdjunto?: SoporteAdjuntoItem;
  justificacionSolicitud: string;
  justificacionRespuesta?: string;
  fechaRespuesta?: string;
}

export interface PlanEstudioItem {
  id: string;
  codigo: string;
  nombre: string;
  anioVigencia: number;
  programa: string;
  facultad: string;
  totalCreditos: number;
  totalSemestres: number;
  totalAsignaturas: number;
  estado: 'VIGENTE' | 'EN_TRANSICION' | 'HISTORICO' | 'INACTIVO';
  descripcion: string;
}

export interface AsignaturaPlanItem {
  id: string;
  planEstudioId: string;
  codigo: string;
  nombre: string;
  creditos: number;
  semestre: number;
  area: string;
  componente: 'Obligatoria' | 'Electiva' | 'Complementaria';
  prerrequisitos: string[];
  horasSemanales: number;
}

export interface EstudianteDirectorioItem {
  id: string;
  documento: string;
  codigo: string;
  nombreCompleto: string;
  correo: string;
  programa: string;
  semestreActual?: number;
  estadoMatricula: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  promedioAcumulado?: number;
  gruposInscritos?: string[];
}

export interface SolicitudMatriculaItem {
  id: string;
  estudianteId: string;
  estudianteNombre: string;
  estudianteCodigo: string;
  estudianteCorreo: string;
  cursoId: string;
  cursoCodigo: string;
  cursoNombre: string;
  grupo: string;
  fechaSolicitud: string;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  respuestaCoordinador?: string;
  fechaRespuesta?: string;
}

export interface PeriodoAcademicoItem {
  id: string;
  codigo: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  fechaLimiteNotas?: string;
  estado: 'ACTIVO' | 'PLANEACION' | 'CERRADO' | 'INACTIVO';
  esActual?: boolean;
}

// ================= FASE 5: CATÁLOGOS INSTITUCIONALES =================

export interface InstitucionItem {
  id: string;
  codigo?: string;
  nombre: string;
  nit?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  estado?: number;
  estaActivaInstitucion?: boolean;
  estaActivaTextoInstitucion?: string;
}

export interface SedeInstitucionalItem {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  municipio: string;
  telefono: string;
  estado: 'ACTIVO' | 'INACTIVO';
  totalBloques?: number;
  totalAulas?: number;
}

export interface EspacioFisicoItem {
  id: string;
  sedeId: string;
  sedeNombre?: string;
  codigo: string;
  bloque: string;
  piso: string;
  tipo: 'AULA_REGULAR' | 'LABORATORIO' | 'AUDITORIO' | 'SALA_SISTEMAS' | 'TALLER';
  capacidad: number;
  tieneProyector: boolean;
  tieneAireAcondicionado: boolean;
  estado: 'DISPONIBLE' | 'MANTENIMIENTO' | 'INACTIVO';
}

export interface FacultadItem {
  id: string;
  codigo: string;
  nombre: string;
  decanoId?: string;
  decanoNombre?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  totalProgramas?: number;
  totalEstudiantes?: number;
}

export interface AreaConocimientoItem {
  id: string;
  codigo: string;
  nombre: string;
  facultadId: string;
  facultadNombre?: string;
  coordinadorArea?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  totalAsignaturas?: number;
}

// ================= FASE 6: PARÁMETROS, AUDITORÍA Y CIERRE MASIVO =================

export interface ParametroInstitucionalItem {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string;
  valor: string;
  tipo: 'NUMERO' | 'PORCENTAJE' | 'TEXTO' | 'BOOLEANO';
  categoria: 'ASISTENCIA' | 'PLAZOS' | 'SEGURIDAD' | 'NOTIFICACIONES';
  ultimaModificacion?: string;
}

export interface RegistroAuditoriaItem {
  id: string;
  timestamp: string;
  usuarioId: string;
  usuarioNombre: string;
  rol: string;
  modulo: 'ASISTENCIA' | 'NOTAS' | 'MATRICULA' | 'PLANES_ESTUDIO' | 'USUARIOS' | 'SISTEMA';
  accion: 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR' | 'CIERRE_MASIVO' | 'APROBACION';
  descripcion: string;
  direccionIp: string;
  nivel: 'INFO' | 'WARNING' | 'CRITICO';
}

export interface CierrePeriodoReporte {
  id: string;
  periodoCodigo: string;
  fechaEjecucion: string;
  totalEstudiantesProcesados: number;
  totalMateriasAfectadas: number;
  totalAprobadosAsistencia: number;
  totalReprobadosFallas: number;
  estado: 'COMPLETADO' | 'CON_ALERTAS' | 'REVERTIDO';
  ejecutadoPor: string;
}

