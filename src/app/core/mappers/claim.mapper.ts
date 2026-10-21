import {
  SolicitudRevisionItem,
  EstadoAsistenciaSesion,
  EstadoSolicitudRevision,
  CategoriaJustificacion,
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
  soporteAdjunto?: ReclamoDocenteSoporteApi | null;
}

/** Formatea un instante UTC ISO en la zona IANA del usuario; devuelve la fecha local 'yyyy-MM-dd'. */
export type InstantDateFormatter = (isoInstant: string) => string;

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
    const soporte = dto.soporteAdjunto ?? null;
    return {
      id: dto.id,
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
      soporteAdjunto: soporte
        ? {
            fileId: soporte.fileId,
            nombre: soporte.nombre,
            tipo: soporte.tipo,
            tamanioBytes: soporte.tamanioBytes,
            tamanioKb: Math.max(1, Math.round(soporte.tamanioBytes / 1024)),
            urlSimulada: soporte.url ?? undefined,
            fechaSubida: soporte.fechaSubidaUtc ? formatDate(soporte.fechaSubidaUtc) : '',
            fechaSubidaUtc: soporte.fechaSubidaUtc ?? undefined,
          }
        : undefined,
      justificacionSolicitud: dto.justificacionSolicitud,
      justificacionRespuesta: dto.justificacionRespuesta ?? undefined,
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
      categoria: model.categoria ?? null,
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
