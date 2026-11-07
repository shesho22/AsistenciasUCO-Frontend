export interface RegistrarEstudianteEnGrupoRequest {
  tipoIdentificacionId: string;
  numeroIdentificacion: number;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  /** Obligatorios solo en el alta de un estudiante nuevo; al matricular a uno existente no se envían. */
  correo?: string;
  password?: string;
}
