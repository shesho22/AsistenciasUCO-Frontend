/**
 * Lee un token de diseno definido en el bloque @theme de src/styles.css.
 * Sirve para librerias externas que reciben colores o fuentes como valores JS
 * (no pueden usar clases de Tailwind). Si el token no esta disponible devuelve
 * la referencia var(--token), que el navegador resuelve al aplicarla en CSS.
 */
export function readDesignToken(name: string): string {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || `var(${name})`;
  } catch {
    return `var(${name})`;
  }
}
