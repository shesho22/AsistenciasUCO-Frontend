import {
  DecanoItem,
  CoordinadorItem,
  DocenteItem,
  HorarioItem,
  HorarioDocenteItem,
  SolicitudRevisionItem,
  PlanEstudioItem,
  AsignaturaPlanItem,
  EstudianteDirectorioItem,
  SolicitudMatriculaItem,
  PeriodoAcademicoItem,
  SedeInstitucionalItem,
  EspacioFisicoItem,
  FacultadItem,
  AreaConocimientoItem,
  ParametroInstitucionalItem,
  RegistroAuditoriaItem,
  CierrePeriodoReporte,
  InstitucionItem,
} from '../models/role-management.model';
import {
  MOCK_DECANOS,
  MOCK_COORDINADORES,
  MOCK_DOCENTES,
  MOCK_HORARIOS_ESTUDIANTE,
  MOCK_HORARIOS_DOCENTE,
  MOCK_MATERIAS_ESTUDIANTE,
  MOCK_SESIONES_MATERIAS,
  MockMateriaEstudiante,
  MockSesionMateria,
  MOCK_SOLICITUDES_REVISION,
  MOCK_PLANES_ESTUDIO,
  MOCK_ASIGNATURAS_PLAN,
  MOCK_ESTUDIANTES_DIRECTORIO,
  MOCK_SOLICITUDES_MATRICULA,
  MOCK_PERIODOS_ACADEMICOS,
  MOCK_SEDES,
  MOCK_ESPACIOS_FISICOS,
  MOCK_FACULTADES,
  MOCK_AREAS_CONOCIMIENTO,
  MOCK_PARAMETROS,
  MOCK_REGISTROS_AUDITORIA,
  MOCK_REPORTES_CIERRE,
  MOCK_INSTITUCIONES,
} from './role-management.mock';

/**
 * Almacén mutable en memoria exclusivo para el entorno de desarrollo y pruebas locales.
 * Mantiene la reactividad e interactividad de la SPA cuando environment.useMocks === true.
 * Nunca es referenciado por servicios de producción.
 */
class MockDataStore {
  decanos: DecanoItem[] = JSON.parse(JSON.stringify(MOCK_DECANOS));
  coordinadores: CoordinadorItem[] = JSON.parse(JSON.stringify(MOCK_COORDINADORES));
  docentes: DocenteItem[] = JSON.parse(JSON.stringify(MOCK_DOCENTES));
  horariosEstudiante: HorarioItem[] = JSON.parse(JSON.stringify(MOCK_HORARIOS_ESTUDIANTE));
  horariosDocente: HorarioDocenteItem[] = JSON.parse(JSON.stringify(MOCK_HORARIOS_DOCENTE));
  materiasEstudiante: MockMateriaEstudiante[] = JSON.parse(JSON.stringify(MOCK_MATERIAS_ESTUDIANTE));
  sesionesMaterias: Record<string, MockSesionMateria[]> = JSON.parse(JSON.stringify(MOCK_SESIONES_MATERIAS));
  solicitudesRevision: SolicitudRevisionItem[] = JSON.parse(JSON.stringify(MOCK_SOLICITUDES_REVISION));
  planesEstudio: PlanEstudioItem[] = JSON.parse(JSON.stringify(MOCK_PLANES_ESTUDIO));
  asignaturasPlan: Record<string, AsignaturaPlanItem[]> = JSON.parse(JSON.stringify(MOCK_ASIGNATURAS_PLAN));
  estudiantesDirectorio: EstudianteDirectorioItem[] = JSON.parse(JSON.stringify(MOCK_ESTUDIANTES_DIRECTORIO));
  solicitudesMatricula: SolicitudMatriculaItem[] = JSON.parse(JSON.stringify(MOCK_SOLICITUDES_MATRICULA));
  periodosAcademicos: PeriodoAcademicoItem[] = JSON.parse(JSON.stringify(MOCK_PERIODOS_ACADEMICOS));
  sedes: SedeInstitucionalItem[] = JSON.parse(JSON.stringify(MOCK_SEDES));
  espaciosFisicos: EspacioFisicoItem[] = JSON.parse(JSON.stringify(MOCK_ESPACIOS_FISICOS));
  facultades: FacultadItem[] = JSON.parse(JSON.stringify(MOCK_FACULTADES));
  areasConocimiento: AreaConocimientoItem[] = JSON.parse(JSON.stringify(MOCK_AREAS_CONOCIMIENTO));
  parametros: ParametroInstitucionalItem[] = JSON.parse(JSON.stringify(MOCK_PARAMETROS));
  auditoria: RegistroAuditoriaItem[] = JSON.parse(JSON.stringify(MOCK_REGISTROS_AUDITORIA));
  reportesCierre: CierrePeriodoReporte[] = JSON.parse(JSON.stringify(MOCK_REPORTES_CIERRE));
  instituciones: InstitucionItem[] = JSON.parse(JSON.stringify(MOCK_INSTITUCIONES));

  registrarAuditoria(evento: {
    modulo: RegistroAuditoriaItem['modulo'];
    accion: RegistroAuditoriaItem['accion'];
    descripcion: string;
    nivel: RegistroAuditoriaItem['nivel'];
  }): void {
    const item: RegistroAuditoriaItem = {
      id: `mock-aud-${this.auditoria.length + 1}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      usuarioId: 'ADMIN-ACTUAL',
      usuarioNombre: 'Administrador del Sistema',
      rol: 'ADMINISTRADOR',
      modulo: evento.modulo,
      accion: evento.accion,
      descripcion: evento.descripcion,
      direccionIp: '10.0.0.1',
      nivel: evento.nivel,
    };
    this.auditoria = [item, ...this.auditoria];
  }
}

export const mockStore = new MockDataStore();
