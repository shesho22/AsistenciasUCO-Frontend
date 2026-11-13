import { RevisionCancelacion } from './revision-cancelacion.model';

/** % de inasistencia vigente de una revisión: el backend lo entrega; el cliente solo elige el campo disponible. */
export function porcentajeRevision(rev: RevisionCancelacion): number | null {
  return rev.porcentajeActual ?? rev.porcentajeInasistencia ?? rev.porcentajeCreacion ?? null;
}

export function nombreEstudianteRevision(rev: RevisionCancelacion): string {
  return rev.estudiante?.nombreCompleto || rev.nombreEstudiante || 'Estudiante';
}
