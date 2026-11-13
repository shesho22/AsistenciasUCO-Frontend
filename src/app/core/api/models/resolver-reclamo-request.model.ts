export interface ResolverReclamoRequest {
  accion: 'APROBADA' | 'RECHAZADA';
  respuestaDocente: string;
  /** Solo con `APROBADA`: "PRESENTE" (solo si el reclamo tiene toma) o "JUSTIFICADA" (por defecto en el backend). */
  resultado?: 'PRESENTE' | 'JUSTIFICADA';
}
