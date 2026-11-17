/** Quita todas las barras `/` del final de un texto (equivale a `texto.replace(/\/+$/, '')`, sin backtracking). */
export function quitarBarrasFinales(texto: string): string {
  let fin = texto.length;
  while (fin > 0 && texto[fin - 1] === '/') {
    fin--;
  }
  return texto.slice(0, fin);
}
