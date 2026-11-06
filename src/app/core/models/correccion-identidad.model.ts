/**
 * HU159 (decisión de John, 2026-11-05): corrección de los datos de identidad por jerarquía. El administrador corrige al
 * decano, el decano al coordinador (HU121), el coordinador al docente (HU092) y al estudiante de su programa. El tipo y
 * el número de documento son opcionales (se apagan con el parámetro IDENTIDAD.PERMITIR_CORREGIR_DOCUMENTO) y, si
 * cambian, exigen motivo; la corrección de estudiante y decano exige motivo siempre.
 */

/** Documento corregido (tipo y número van juntos). */
export interface DocumentoCorregido {
  idTipoIdentificacion: string;
  numeroIdentificacion: number;
}

/** Estado del bloque de documento y motivo que emite `app-correccion-documento`. */
export interface EstadoCorreccionDocumento {
  valido: boolean;
  /** Documento nuevo, o `null` si no cambia o la corrección del documento está apagada. */
  documento: DocumentoCorregido | null;
  motivo: string;
}

export interface CorregirIdentidadPayload {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  idTipoIdentificacion?: string;
  numeroIdentificacion?: number;
  motivo: string;
}

export interface ResultadoCorreccionIdentidad {
  idRegistro: string;
  sincronizacionIdentidad: 'OK' | 'PENDIENTE';
  mensajeUsuario: string | null;
}

export interface ConfiguracionCorreccionIdentidad {
  permitirCorregirDocumento: boolean;
}

/** Datos actuales de la persona que se van a corregir. */
export interface IdentidadActual {
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  numeroIdentificacion: string | number | null;
  codigoTipoIdentificacion: string | null;
  idTipoIdentificacion?: string | null;
}
