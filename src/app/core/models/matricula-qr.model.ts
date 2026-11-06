/**
 * HU176B: contratos HTTP de la matricula por QR/PIN rotativo. Los nombres son los del backend. El token solo existe
 * dentro de `urlMatricula` y del QR; nunca se persiste en el cliente.
 */

/** Respuesta de abrir/regenerar la ventana de matricula (`POST /grupos/{id}/matricula-qr[/rotacion]`). */
export interface VentanaMatricula {
  idVentana: string;
  pin: string;
  urlMatricula: string;
  /** PNG en base64 generado por el backend; se muestra como `data:image/png;base64,...`. */
  qrPngBase64: string;
  fechaRotacionUtc: string;
  fechaExpiracionUtc: string;
}

/** Exactamente uno de `token` o `pin`. */
export interface CredencialMatricula {
  token?: string;
  pin?: string;
}

/** Tipo de documento para el formulario publico (el catalogo autenticado no esta disponible sin sesion). */
export interface TipoIdentificacionMatriculaQr {
  id: string;
  tipoIdentificacion: string;
  nombre: string;
}

/** Datos minimos del curso que devuelve la validacion publica. */
export interface CursoMatriculaQr {
  idGrupo: string;
  nombreAsignatura: string;
  nombreGrupo: string;
  nombreDocente: string;
  fechaExpiracionUtc: string;
  cupoDisponible: number;
  tiposIdentificacion: TipoIdentificacionMatriculaQr[];
}

/** Alta publica: credencial mas los datos de la persona. */
export interface RegistroMatriculaQrPayload extends CredencialMatricula {
  idTipoIdentificacion: string;
  numeroIdentificacion: number;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  correo: string;
  password: string;
}

/** `usuario` es el numero de identificacion con el que inicia sesion; no hay token de sesion. */
export interface MatriculaQrResultado {
  idGrupo: string;
  usuario: string;
}

export interface MatriculaGrupoResultado {
  idGrupo: string;
}

/** Eventos SSE del stream del grupo (clave `grupo`, CONTRACT A3). */
export const MATRICULA_QR_EVENT = {
  ROTADO: 'MATRICULA_QR_ROTADO',
  MATRICULADO: 'ESTUDIANTE_MATRICULADO',
} as const;

export interface MatriculaQrRotadoPayload {
  grupo: string;
  pin: string;
  urlMatricula: string;
  qrPngBase64: string;
  fechaRotacionUtc: string;
  fechaExpiracionUtc: string;
}

export interface EstudianteMatriculadoPayload {
  grupo: string;
  origen: string;
}
