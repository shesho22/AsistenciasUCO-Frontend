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
  PeriodoAcademicoItem,
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
  MOCK_PERIODOS_ACADEMICOS,
  MOCK_FACULTADES,
  MOCK_AREAS_CONOCIMIENTO,
  MOCK_PARAMETROS,
  MOCK_REGISTROS_AUDITORIA,
  MOCK_REPORTES_CIERRE,
  MOCK_INSTITUCIONES,
} from './role-management.mock';
import { RecesoAcademico } from '../models/receso-academico.model';
import { mockUuid } from './student-portal-mock.adapter';

/**
 * Almacén mutable en memoria exclusivo para el entorno de desarrollo y pruebas locales.
 * Mantiene la reactividad e interactividad de la SPA cuando environment.useMocks === true.
 * Nunca es referenciado por servicios de producción.
 */
class MockDataStore {
  decanos: DecanoItem[] = structuredClone(MOCK_DECANOS);
  coordinadores: CoordinadorItem[] = structuredClone(MOCK_COORDINADORES);
  docentes: DocenteItem[] = structuredClone(MOCK_DOCENTES);
  horariosEstudiante: HorarioItem[] = structuredClone(MOCK_HORARIOS_ESTUDIANTE);
  horariosDocente: HorarioDocenteItem[] = structuredClone(MOCK_HORARIOS_DOCENTE);
  materiasEstudiante: MockMateriaEstudiante[] = structuredClone(MOCK_MATERIAS_ESTUDIANTE);
  sesionesMaterias: Record<string, MockSesionMateria[]> = structuredClone(MOCK_SESIONES_MATERIAS);
  // REC-001 es un reclamo de la toma 2 (a mitad de clase) de la sesion SES-001-03; el resto son reclamos de la sesion completa.
  solicitudesRevision: SolicitudRevisionItem[] = structuredClone(MOCK_SOLICITUDES_REVISION).map((r) =>
    r.id === 'REC-001' ? { ...r, idToma: mockUuid('toma:SES-001-03:2') } : r
  );
  planesEstudio: PlanEstudioItem[] = structuredClone(MOCK_PLANES_ESTUDIO);
  asignaturasPlan: Record<string, AsignaturaPlanItem[]> = structuredClone(MOCK_ASIGNATURAS_PLAN);
  estudiantesDirectorio: EstudianteDirectorioItem[] = structuredClone(MOCK_ESTUDIANTES_DIRECTORIO);
  periodosAcademicos: PeriodoAcademicoItem[] = structuredClone(MOCK_PERIODOS_ACADEMICOS);
  /** DEC-081: días de receso por id de período. Uno ya aplicado (canceló clases) y uno sin aplicar. */
  recesosAcademicos: Record<string, RecesoAcademico[]> = {
    'PER-2026-2': [
      { id: 'REC-MOCK-1', fecha: '2026-12-03', motivo: 'Semana institucional', sesionesCanceladas: 6, estaAplicado: true, puedeRetirarse: false },
    ],
    'PER-2027-1': [
      { id: 'REC-MOCK-2', fecha: '2027-03-25', motivo: 'Jueves Santo', sesionesCanceladas: 0, estaAplicado: false, puedeRetirarse: true },
    ],
  };
  facultades: FacultadItem[] = structuredClone(MOCK_FACULTADES);
  areasConocimiento: AreaConocimientoItem[] = structuredClone(MOCK_AREAS_CONOCIMIENTO);
  parametros: ParametroInstitucionalItem[] = structuredClone(MOCK_PARAMETROS);
  auditoria: RegistroAuditoriaItem[] = structuredClone(MOCK_REGISTROS_AUDITORIA);
  reportesCierre: CierrePeriodoReporte[] = structuredClone(MOCK_REPORTES_CIERRE);
  instituciones: InstitucionItem[] = structuredClone(MOCK_INSTITUCIONES);

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
      direccionIp: '198.51.100.1',
      nivel: evento.nivel,
    };
    this.auditoria = [item, ...this.auditoria];
  }
}

export const mockStore = new MockDataStore();
