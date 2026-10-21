/**
 * Identidad del intento logico de radicacion de un reclamo.
 *
 * Un reintento tecnico (timeout, respuesta perdida, error 5xx) del MISMO contenido reutiliza el mismo identificador
 * para que el backend/SQL lo reconozca como la misma operacion. Cualquier cambio del contenido radicado (sesion,
 * categoria, justificacion o soporte) o una radicacion ya completada produce un identificador nuevo.
 */
export class RadicacionIntento {
  private huella: string | null = null;
  private id: string | null = null;

  /** Identificador del intento para este contenido; estable mientras la huella no cambie. */
  idPara(huella: string): string {
    if (this.id === null || this.huella !== huella) {
      this.huella = huella;
      this.id = crypto.randomUUID();
    }
    return this.id;
  }

  /** La radicacion termino (o el formulario se reinicio): el siguiente envio es una solicitud nueva. */
  reiniciar(): void {
    this.huella = null;
    this.id = null;
  }
}

export function huellaRadicacion(partes: {
  sesionId: string;
  categoria: string;
  justificacion: string;
  soporteId?: string;
}): string {
  return JSON.stringify([partes.sesionId, partes.categoria, partes.justificacion, partes.soporteId ?? null]);
}
