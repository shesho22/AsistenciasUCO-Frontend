import {
  DetalleReclamoDocenteItem,
  SolicitudRevisionItem,
  EstadoAsistenciaSesion,
  EstadoSolicitudRevision,
  CategoriaJustificacion,
  EstadoTomaEstudiante,
  ResultadoAprobacionReclamo,
  SoporteAdjuntoItem,
} from '../models/role-management.model';

/**
 * Data Transfer Object (DTO) para solicitudes de reclamo e inasistencias justificadas.
 */
export interface SolicitudRevisionDTO {
  id_solicitud: string;
  id_estudiante: string;
  nombre_estudiante: string;
  correo_estudiante: string;
  avatar_estudiante?: string | null;
  id_materia: string;
  codigo_materia: string;
  nombre_materia: string;
  grupo: string;
  id_sesion: string;
  numero_sesion: number;
  fecha_sesion: string;
  estado_original: string;
  fecha_solicitud: string;
  estado_solicitud: string;
  categoria?: string | null;
  soporte_adjunto?: {
    nombre: string;
    tipo: string;
    tamanio_kb: number;
    url_simulada?: string | null;
    fecha_subida: string;
  } | null;
  justificacion_solicitud: string;
  justificacion_respuesta?: string | null;
  fecha_respuesta?: string | null;
}

/** Soporte vinculado tal como lo devuelve GET /docente/reclamos (LB-004D). */
export interface ReclamoDocenteSoporteApi {
  fileId: string;
  nombre: string;
  tipo: string;
  tamanioBytes: number;
  fechaSubidaUtc?: string | null;
  url?: string | null;
}

/** Elemento de `datos` de GET /docente/reclamos (camelCase, instantes UTC con 'Z', fechaSolicitud = DATE). */
export interface ReclamoDocenteApi {
  id: string;
  nombre?: string | null;
  fechaSolicitud: string;
  estadoSolicitud: string;
  justificacionSolicitud: string;
  justificacionRespuesta?: string | null;
  estudianteId: string;
  estudianteNombre: string;
  sesionId: string;
  sesionNumero: number;
  fechaSesionUtc?: string | null;
  procedenciaTemporalSesion?: string | null;
  grupoId?: string;
  grupoCodigo?: number | null;
  grupoNombre?: string | null;
  materiaId: string;
  materiaCodigo: string;
  materiaNombre: string;
  /** CULM-001 D.2: Categoría persistida del reclamo (código y nombre o texto simple). */
  categoria?: string | { codigo: string; nombre: string } | null;
  codigoCategoria?: string | null;
  nombreCategoria?: string | null;
  soporteAdjunto?: ReclamoDocenteSoporteApi | null;
  /** CULM-001 D.2: Colección completa de soportes documentales adjuntos. */
  soportes?: Array<{
    fileId: string;
    nombre: string;
    tipo?: string;
    tipoContenido?: string;
    tamanioBytes: number;
    fechaSubidaUtc?: string | null;
    url?: string | null;
  }> | null;
  /** Reclamo por toma (puntos de control); `null`/ausentes si el reclamo es de la sesión. */
  idToma?: string | null;
  numeroToma?: number | null;
  fechaPuntoControlUtc?: string | null;
  /** `PRESENTE | JUSTIFICADA` o `null` mientras no esté aprobado. */
  resultadoAprobacion?: string | null;
}

/**
 * Elemento de `datos` de GET /estudiante/reclamos (HU010/HU011): los mismos campos del listado docente sin los datos
 * del estudiante (son los del propio usuario autenticado).
 */
export type ReclamoEstudianteApi = Omit<ReclamoDocenteApi, 'estudianteId' | 'estudianteNombre'>;

/** `datos` de GET /docente/reclamos/{id} (HU036): el elemento del listado más causal y estado legible. */
export interface DetalleReclamoDocenteApi extends ReclamoDocenteApi {
  codigoEstado?: string | null;
    nombreEstado?: string | null;
  /** `PRESENTE | AUSENTE | JUSTIFICADA | SIN_REGISTRO`; `null` si el reclamo es de la sesión. */
  estadoToma?: string | null;
  minutosSesion?: number | null;
  minutosAsistidos?: number | null;
  causalInasistencia?: {
    codigo: string;
    nombre: string;
    asistio?: boolean | null;
  } | null;
}

/** Formatea un instante UTC ISO en la zona IANA del usuario; devuelve la fecha local 'yyyy-MM-dd'. */
export type InstantDateFormatter = (isoInstant: string) => string;

/** Solo se aceptan los valores que define el contrato; cualquier otro queda en `null`. */
function resultadoAprobacion(valor: string | null | undefined): ResultadoAprobacionReclamo | null {
  return valor === 'PRESENTE' || valor === 'JUSTIFICADA' ? valor : null;
}

function estadoToma(valor: string | null | undefined): EstadoTomaEstudiante | null {
  return valor === 'PRESENTE' || valor === 'AUSENTE' || valor === 'JUSTIFICADA' || valor === 'SIN_REGISTRO' ? valor : null;
}

/**
 * Mapper para Serialización y Deserialización de Solicitudes y Reclamos de Asistencia.
 */
export class ClaimMapper {
  /**
   * Convierte un reclamo del backend (LB-004D) al modelo de UI. Conserva el instante UTC original de la sesion
   * (`fechaSesionUtc`) y solo presenta una fecha cuando el backend afirma un instante verificable; no aplica
   * offsets manuales: la zona la resuelve el formateador inyectado (IANA, con DST).
   */
  static fromReclamoDocente(dto: ReclamoDocenteApi, formatDate: InstantDateFormatter): SolicitudRevisionItem {
    const soportesMapeados: SoporteAdjuntoItem[] | undefined = dto.soportes && dto.soportes.length > 0
      ? dto.soportes.map((s) => ({
          fileId: s.fileId,
          nombre: s.nombre,
          tipo: s.tipoContenido || s.tipo || '',
          tipoContenido: s.tipoContenido || s.tipo || '',
          tamanioBytes: s.tamanioBytes,
          tamanioKb: Math.max(1, Math.round((s.tamanioBytes ?? 0) / 1024)),
          urlSimulada: s.url ?? undefined,
          fechaSubida: s.fechaSubidaUtc ? formatDate(s.fechaSubidaUtc) : '',
          fechaSubidaUtc: s.fechaSubidaUtc ?? undefined,
          estado: 'LISTO' as const,
        }))
      : (dto.soporteAdjunto ? [{
          fileId: dto.soporteAdjunto.fileId,
          nombre: dto.soporteAdjunto.nombre,
          tipo: dto.soporteAdjunto.tipo,
          tipoContenido: dto.soporteAdjunto.tipo,
          tamanioBytes: dto.soporteAdjunto.tamanioBytes,
          tamanioKb: Math.max(1, Math.round((dto.soporteAdjunto.tamanioBytes ?? 0) / 1024)),
          urlSimulada: dto.soporteAdjunto.url ?? undefined,
          fechaSubida: dto.soporteAdjunto.fechaSubidaUtc ? formatDate(dto.soporteAdjunto.fechaSubidaUtc) : '',
          fechaSubidaUtc: dto.soporteAdjunto.fechaSubidaUtc ?? undefined,
          estado: 'LISTO' as const,
        }] : undefined);

    const soporte = soportesMapeados && soportesMapeados.length > 0 ? soportesMapeados[0] : undefined;

    let categoria: CategoriaJustificacion | undefined;
    if (dto.categoria) {
      categoria = typeof dto.categoria === 'object' ? dto.categoria : dto.categoria;
    } else if (dto.codigoCategoria || dto.nombreCategoria) {
      categoria = {
        codigo: dto.codigoCategoria ?? '',
        nombre: dto.nombreCategoria ?? '',
      };
    }

    return {
      id: dto.id,
      grupoId: dto.grupoId,
      estudianteId: dto.estudianteId,
      estudianteNombre: dto.estudianteNombre,
      // El listado del docente no expone el correo del estudiante (datos personales minimos).
      estudianteCorreo: '',
      materiaId: dto.materiaId,
      materiaCodigo: dto.materiaCodigo,
      materiaNombre: dto.materiaNombre,
      grupo: dto.grupoNombre || (dto.grupoCodigo == null ? '' : String(dto.grupoCodigo)),
      sesionId: dto.sesionId,
      sesionNumero: dto.sesionNumero,
      fechaSesion: dto.fechaSesionUtc ? formatDate(dto.fechaSesionUtc) : '',
      fechaSesionUtc: dto.fechaSesionUtc ?? undefined,
      fechaSolicitud: dto.fechaSolicitud,
      estadoSolicitud: dto.estadoSolicitud as EstadoSolicitudRevision,
      categoria,
      soporteAdjunto: soporte,
      soportes: soportesMapeados,
      justificacionSolicitud: dto.justificacionSolicitud,
      justificacionRespuesta: dto.justificacionRespuesta ?? undefined,
      idToma: dto.idToma ?? null,
      numeroToma: dto.numeroToma ?? null,
      fechaPuntoControlUtc: dto.fechaPuntoControlUtc ?? null,
      resultadoAprobacion: resultadoAprobacion(dto.resultadoAprobacion),
    };
  }

  /** Solicitud propia del estudiante: mismo mapeo que el docente; los datos del estudiante quedan vacíos (es el propio usuario). */
  static fromReclamoEstudiante(dto: ReclamoEstudianteApi, formatDate: InstantDateFormatter): SolicitudRevisionItem {
    return ClaimMapper.fromReclamoDocente({ ...dto, estudianteId: '', estudianteNombre: '' }, formatDate);
  }

  /** Adapta el detalle del backend: mismo mapeo que el listado más la causal real (`null` si no hay detalle de asistencia). */
  static fromDetalleReclamoDocente(dto: DetalleReclamoDocenteApi, formatDate: InstantDateFormatter): DetalleReclamoDocenteItem {
    const causal = dto.causalInasistencia ?? null;
    return {
      ...ClaimMapper.fromReclamoDocente(dto, formatDate),
      nombreEstado: dto.nombreEstado ?? '',
      estadoToma: estadoToma(dto.estadoToma),
      minutosSesion: dto.minutosSesion ?? null,
      minutosAsistidos: dto.minutosAsistidos ?? null,
      causalInasistencia: causal
        ? { codigo: causal.codigo, nombre: causal.nombre, asistio: causal.asistio ?? null }
        : null,
    };
  }

  static fromDTO(dto: SolicitudRevisionDTO): SolicitudRevisionItem {
    return {
      id: dto.id_solicitud,
      estudianteId: dto.id_estudiante,
      estudianteNombre: dto.nombre_estudiante,
      estudianteCorreo: dto.correo_estudiante,
      estudianteAvatar: dto.avatar_estudiante ?? undefined,
      materiaId: dto.id_materia,
      materiaCodigo: dto.codigo_materia,
      materiaNombre: dto.nombre_materia,
      grupo: dto.grupo,
      sesionId: dto.id_sesion,
      sesionNumero: dto.numero_sesion,
      fechaSesion: dto.fecha_sesion,
      estadoOriginal: dto.estado_original as EstadoAsistenciaSesion,
      fechaSolicitud: dto.fecha_solicitud,
      estadoSolicitud: dto.estado_solicitud as EstadoSolicitudRevision,
      categoria: dto.categoria ? (dto.categoria as CategoriaJustificacion) : undefined,
      soporteAdjunto: dto.soporte_adjunto
        ? {
            nombre: dto.soporte_adjunto.nombre,
            tipo: dto.soporte_adjunto.tipo,
            tamanioKb: dto.soporte_adjunto.tamanio_kb,
            urlSimulada: dto.soporte_adjunto.url_simulada ?? undefined,
            fechaSubida: dto.soporte_adjunto.fecha_subida,
          }
        : undefined,
      justificacionSolicitud: dto.justificacion_solicitud,
      justificacionRespuesta: dto.justificacion_respuesta ?? undefined,
      fechaRespuesta: dto.fecha_respuesta ?? undefined,
    };
  }

  static toDTO(model: SolicitudRevisionItem): SolicitudRevisionDTO {
    return {
      id_solicitud: model.id,
      id_estudiante: model.estudianteId,
      nombre_estudiante: model.estudianteNombre,
      correo_estudiante: model.estudianteCorreo,
      avatar_estudiante: model.estudianteAvatar ?? null,
      id_materia: model.materiaId,
      codigo_materia: model.materiaCodigo,
      nombre_materia: model.materiaNombre,
      grupo: model.grupo,
      id_sesion: model.sesionId,
      numero_sesion: model.sesionNumero,
      fecha_sesion: model.fechaSesion,
      estado_original: model.estadoOriginal ?? '',
      fecha_solicitud: model.fechaSolicitud,
      estado_solicitud: model.estadoSolicitud,
      categoria: typeof model.categoria === 'object' ? (model.categoria?.nombre || model.categoria?.codigo || null) : (model.categoria ?? null),
      soporte_adjunto: model.soporteAdjunto
        ? {
            nombre: model.soporteAdjunto.nombre,
            tipo: model.soporteAdjunto.tipo,
            tamanio_kb: model.soporteAdjunto.tamanioKb,
            url_simulada: model.soporteAdjunto.urlSimulada ?? null,
            fecha_subida: model.soporteAdjunto.fechaSubida,
          }
        : null,
      justificacion_solicitud: model.justificacionSolicitud,
      justificacion_respuesta: model.justificacionRespuesta ?? null,
      fecha_respuesta: model.fechaRespuesta ?? null,
    };
  }
}
