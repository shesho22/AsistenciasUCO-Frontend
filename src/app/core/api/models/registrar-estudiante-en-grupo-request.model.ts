export interface RegistrarEstudianteEnGrupoRequest {
  tipoIdentificacionId: string;
  numeroIdentificacion: number;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  /** CULM-001 B2NM: obligatorio solo cuando el grupo pertenece a más de un programa (EST_005 si falta). */
  idPrograma?: string;
  /** Obligatorios solo en el alta de un estudiante nuevo; al matricular a uno existente no se envían. */
  correo?: string;
  password?: string;
}
