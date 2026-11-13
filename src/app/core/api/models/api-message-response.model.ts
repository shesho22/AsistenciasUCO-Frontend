export interface ApiMessageResponse {
  exitoso: boolean;
  mensaje: string;
  /** DEC-065 (2): mensaje institucional del backend (p. ej. la sesión queda pendiente de aprobación). */
  mensajeUsuario?: string;
}
