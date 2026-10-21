import { ClassSession } from './attendance.model';

export interface Course {
  id: string;
  /** Código de materia; ausente cuando el contrato de origen no lo entrega (no se sintetiza). */
  code?: string;
  name: string;
  section: string;
  /** Vacío cuando el grupo aún no tiene horario semanal. */
  schedule: string;
  /**
   * OUT_OF_GOLDEN_PATH: HorarioDocente no entrega aula (BACKEND_GOLDEN_PATH_CONTRACT §C.1), por lo
   * que el mapping real nunca lo asigna. Solo lo usan verticales legacy (grupos/mocks/decano/coordinador).
   */
  room?: string;
  /** Ausente cuando el contrato de origen no entrega el total de estudiantes. */
  enrolledStudentsCount?: number;
  cupoMaximo?: number;
  docenteName?: string;
  docenteId?: string;
  colorCategory: 'emerald' | 'amber' | 'blue' | 'purple';
  sessions?: ClassSession[];
  /** `idAsignatura` de la asignación académica (GET /docente/asignaturas). */
  asignaturaId?: string;
  dias?: string[];
  horaInicio?: string;
  horaFin?: string;
}
