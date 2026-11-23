/** Resumen compacto de una lista de nombres que el servidor entrega unida con ", " (p. ej. programas o facultades). */
export interface ResumenLista {
  /** Primer elemento (el "principal"); cadena vacia si no hay lista. */
  readonly principal: string;
  /** Cuantos elementos mas hay ademas del principal. */
  readonly adicionales: number;
  /** Texto completo original (para un `title` o tooltip). */
  readonly completo: string;
}

export function resumirLista(texto: string | null | undefined, separador = ', '): ResumenLista {
  const completo = (texto ?? '').trim();
  if (!completo) {
    return { principal: '', adicionales: 0, completo: '' };
  }
  const elementos = completo.split(separador).map((e) => e.trim()).filter((e) => e.length > 0);
  return { principal: elementos[0] ?? completo, adicionales: Math.max(0, elementos.length - 1), completo };
}
