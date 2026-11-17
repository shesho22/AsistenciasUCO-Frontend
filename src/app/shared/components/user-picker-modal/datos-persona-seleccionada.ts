import { UserPickerItem } from './user-picker-modal.component';

/** Tipo de identificación tal como lo entrega el catálogo (solo lo que se necesita aquí). */
export interface TipoIdentificacionSeleccionable {
  id: string;
  tipoIdentificacion: string;
}

/** Campos de identidad que el selector de personas precarga en un formulario de alta. */
export interface DatosPersonaSeleccionada {
  tipoIdentificacionId: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  correo: string;
}

/**
 * Traduce la persona elegida en el selector a los campos de identidad del formulario de alta.
 * Los nombres y apellidos se toman tal como los entrega el backend: no se parten cadenas ni se deducen datos.
 * El tipo de identificación se busca en el catálogo por su código; si la persona no lo trae, se conserva el
 * comportamiento previo del formulario (primer tipo del catálogo).
 */
export function datosDePersonaSeleccionada(
  persona: UserPickerItem,
  tipos: readonly TipoIdentificacionSeleccionable[],
): DatosPersonaSeleccionada {
  const tipoIdentificacionId =
    tipos.find((t) => t.tipoIdentificacion === persona.tipoIdentificacion)?.id || (tipos.length > 0 ? tipos[0].id : '');
  return {
    tipoIdentificacionId,
    tipoIdentificacion: persona.tipoIdentificacion || 'CC',
    numeroIdentificacion: String(persona.numeroIdentificacion || ''),
    primerNombre: persona.primerNombre ?? '',
    segundoNombre: persona.segundoNombre ?? '',
    primerApellido: persona.primerApellido ?? '',
    segundoApellido: persona.segundoApellido ?? '',
    correo: persona.correo ?? '',
  };
}
