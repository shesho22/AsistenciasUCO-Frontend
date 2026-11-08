/**
 * Fila del padron de un grupo tal como la consumen las vistas del docente. Reune la forma del backend
 * (`EstudianteGrupoApiDto`: idEstudiante, nombreCompleto, documento) y la forma heredada de las vistas
 * (studentId, studentName, studentCode, nombres/apellidos); todos los campos son opcionales.
 */
export interface EstudianteGrupoItem {
  id?: string;
  idEstudiante?: string;
  studentId?: string;
  studentName?: string;
  studentCode?: string;
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
  documento?: string;
  numeroIdentificacion?: string | number;
  correo?: string;
  codigoEstado?: string;
  codigoEstadoEstudiante?: string;
  nombreEstado?: string;
}

/** Identificador del estudiante en cualquiera de las formas de la fila. */
export function idEstudianteDe(est: EstudianteGrupoItem): string {
  return est.idEstudiante ?? est.studentId ?? est.id ?? '';
}
