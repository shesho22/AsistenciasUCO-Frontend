import { Course } from '../../models/course.model';
import { AsignacionDocenteApiDto } from '../models/docente-api-dto.model';
import { GrupoApiDto } from '../models/grupo-api-dto.model';

const COURSE_COLORS: Course['colorCategory'][] = [
  'emerald',
  'amber',
  'blue',
  'purple',
];

export function mapTeacherAssignmentToCourse(
  assignment: AsignacionDocenteApiDto,
  group: GrupoApiDto | undefined,
  index: number
): Course {
  return {
    id: assignment.idGrupo,
    code: group?.codigo ?? '-',
    name: assignment.nombreAsignatura,
    section: assignment.nombreGrupo,
    schedule: 'No disponible',
    room: 'No disponible',
    enrolledStudentsCount: group?.estudiantesActivos ?? 0,
    docenteName: assignment.nombreCompleto,
    colorCategory: COURSE_COLORS[index % COURSE_COLORS.length] ?? 'emerald',
  };
}
