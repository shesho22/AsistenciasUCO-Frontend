import { signal } from '@angular/core';

/**
 * VAL MSG-06: textos de la interfaz que llegaron del catálogo de MessageUcoLab en esta sesión del navegador.
 *
 * `mensajeUi()` (síncrona, usada en toasts, validaciones y plantillas) consulta aquí primero y, si el texto aún no llegó,
 * usa el de respaldo de `mensajes-ui.ts` y pide el del catálogo. `versionTextosCatalogo` es una signal: las plantillas y
 * los `computed` que llamaron a `mensajeUi()` se vuelven a evaluar solos cuando llega un texto del catálogo (sin sondeo).
 */
const textos = new Map<string, string>();
const versionTextos = signal(0);
let solicitar: ((codigo: string) => void) | null = null;

/** Lee la versión para que el contexto reactivo que pide un texto dependa de la llegada de textos del catálogo. */
export function versionTextosCatalogo(): number {
  return versionTextos();
}

/** Texto del catálogo para el código canónico, o `undefined` si aún no llegó (y en ese caso lo pide, una vez). */
export function textoCatalogo(codigo: string): string | undefined {
  const texto = textos.get(codigo);
  if (texto === undefined && solicitar) {
    solicitar(codigo);
  }
  return texto;
}

/** Guarda el texto que entregó el catálogo y avisa a las vistas reactivas. Un texto vacío se ignora. */
export function registrarTextoCatalogo(codigo: string, texto: string): void {
  const limpio = texto.trim();
  if (!limpio || textos.get(codigo) === limpio) {
    return;
  }
  textos.set(codigo, limpio);
  // Diferido: la llegada nunca escribe una signal dentro del computed o la plantilla que pidió el texto.
  queueMicrotask(() => versionTextos.update((v) => v + 1));
}

/** Registra quién pide los textos al catálogo (lo hace CatalogoMensajesUiService al iniciar la aplicación). */
export function registrarSolicitudCatalogo(fn: ((codigo: string) => void) | null): void {
  solicitar = fn;
}

/** Solo para pruebas: deja el registro como al arrancar. */
export function reiniciarCatalogoMensajesUi(): void {
  textos.clear();
  solicitar = null;
  versionTextos.set(0);
}
