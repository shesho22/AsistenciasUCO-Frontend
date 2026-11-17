/**
 * CIERRE-W3I: totales de los grupos habilitados del docente titular (`GET /docente/resumen-grupos`). Los calcula la base de datos:
 * el cliente no suma inscritos ni cupos. `tasaOcupacion` es null cuando el cupo total es 0.
 */
export interface ResumenGruposDocente {
  gruposHabilitados: number;
  estudiantesActivos: number;
  cupoTotal: number;
  tasaOcupacion: number | null;
}
