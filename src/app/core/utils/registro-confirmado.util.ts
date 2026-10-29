export interface IdentidadEsperada {
  numeroIdentificacion: string;
  correo: string;
}

export const REGISTRO_NO_LISTADO_WARNING =
  'El backend confirmó el registro, pero la lista aún no devuelve la persona. No repita el alta; verifique el estado de acceso.';

/** Indica si la lista devuelta incluye a la persona recién registrada (por documento o correo). */
export function listaIncluyeIdentidad(
  items: ReadonlyArray<{ numeroIdentificacion?: string | number | null; correo?: string | null }>,
  esperada: IdentidadEsperada,
): boolean {
  const correoEsperado = esperada.correo.toLowerCase();
  return items.some((item) =>
    String(item.numeroIdentificacion) === esperada.numeroIdentificacion
    || item.correo?.trim().toLowerCase() === correoEsperado);
}

/** Descarta respuestas antiguas: solo la última petición iniciada es vigente. */
export class UltimaPeticion {
  private version = 0;

  iniciar(): number {
    return ++this.version;
  }

  esVigente(version: number): boolean {
    return version === this.version;
  }
}

/** Avisa cuando el backend confirmó el alta pero la lista recargada todavía no incluye a la persona. */
export function advertirRegistroNoListado(
  items: ReadonlyArray<{ numeroIdentificacion?: string | number | null; correo?: string | null }>,
  esperada: IdentidadEsperada | undefined,
  advertir: (mensaje: string) => void,
): void {
  if (esperada && !listaIncluyeIdentidad(items, esperada)) {
    advertir(REGISTRO_NO_LISTADO_WARNING);
  }
}
