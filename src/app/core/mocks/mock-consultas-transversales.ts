import { HttpRequest } from '@angular/common/http';
import {
  AsignaturaInstitucionItem,
  ComponenteFormacionItem,
  ConsolidadoGrupoItem,
  DocenteFacultadItem,
  EstudianteInstitucionItem,
  EventoAuditoriaItem,
  FichaUnificadaEstudiante,
  ProgramaCreditosItem,
} from '../models/consultas-transversales.model';

/** Respuesta simulada: datos y total (para las listas paginadas). */
export interface RespuestaSimulada {
  datos: unknown;
  total?: number;
}

const PROGRAMAS_CREDITOS: ProgramaCreditosItem[] = [
  {
    idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas', nombreTipoPrograma: 'Pregrado',
    nombreModalidad: 'Presencial', nombreJornada: 'Diurna', programaActivo: true, idPlanEstudio: 'PLAN-1',
    inpPlanEstudio: 20241, planActivo: true, totalSemestres: 10, totalAsignaturas: 2, totalCreditos: 7,
  },
  {
    idPrograma: 'PRG-2', nombrePrograma: 'Ingeniería Industrial', nombreTipoPrograma: 'Pregrado',
    nombreModalidad: 'Presencial', nombreJornada: 'Nocturna', programaActivo: true, idPlanEstudio: null,
    inpPlanEstudio: null, planActivo: false, totalSemestres: 0, totalAsignaturas: 0, totalCreditos: 0,
  },
];

const DOCENTES: DocenteFacultadItem[] = [
  {
    idDocente: 'DOC-MOCK-1', numeroIdentificacion: '43000111', nombreCompleto: 'María Rostagno',
    correo: 'maria.rostagno@uco.edu.co', activo: true, programas: 'Ingeniería de Sistemas', totalProgramas: 1,
    totalGrupos: 2,
  },
];

const ASIGNATURAS: AsignaturaInstitucionItem[] = [
  {
    idAsignatura: 'ASG-1', codigo: 'SIS-101', nombre: 'Cálculo Diferencial', creditos: 4, nombreArea: 'Ciencias Básicas',
    nombreComponente: 'Obligatorio', codigoSemestre: 'S1', idPlanEstudio: 'PLAN-1', inpPlanEstudio: 20241,
    idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas', idFacultad: 'FAC-1',
    nombreFacultad: 'Facultad de Ingeniería', activa: true,
  },
  {
    idAsignatura: 'ASG-2', codigo: 'SIS-201', nombre: 'Estructuras de Datos', creditos: 3, nombreArea: 'Software',
    nombreComponente: 'Obligatorio', codigoSemestre: 'S2', idPlanEstudio: 'PLAN-1', inpPlanEstudio: 20241,
    idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas', idFacultad: 'FAC-1',
    nombreFacultad: 'Facultad de Ingeniería', activa: true,
  },
];

const ESTUDIANTES: EstudianteInstitucionItem[] = [
  {
    idEstudiante: 'EST-MOCK-1', numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz',
    correo: 'ana.ruiz@uco.edu.co', activo: true, facultades: 'Facultad de Ingeniería',
    programas: 'Ingeniería de Sistemas', totalGrupos: 2,
  },
];

function historial(idEstudiante: string): FichaUnificadaEstudiante {
  return {
    idEstudiante, tipoIdentificacion: 'CC', numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz',
    correo: 'ana.ruiz@uco.edu.co', activo: true,
    matriculas: [
      {
        idFacultad: 'FAC-1', nombreFacultad: 'Facultad de Ingeniería', idPrograma: 'PRG-1',
        nombrePrograma: 'Ingeniería de Sistemas', inpPlanEstudio: 20241, idPeriodoAcademico: 'PER-1',
        codigoPeriodo: '2026-1', nombrePeriodo: 'Primer semestre 2026', idGrupo: 'GRP-MOCK-1', codigoGrupo: 1,
        idAsignatura: 'ASG-1', nombreAsignatura: 'Cálculo Diferencial', codigoEstadoEstudiante: 'MAT',
        nombreEstadoEstudiante: 'Matriculado',
        resumen: {
          sesionesEjecutadas: 10, asistencias: 8, faltasSinJustaCausa: 2, excusas: 0, porcentajeInasistencia: 20,
          codigoPermanencia: 'RIESGO',
        },
      },
    ],
  };
}

/** Filtra por el texto de `busqueda` en los campos indicados (sin distinguir mayúsculas). */
/** HU061: dos grupos del período 2026-2 (uno con estudiantes en riesgo). */
const CONSOLIDADO: ConsolidadoGrupoItem[] = [
  {
    idGrupo: 'GRP-1', codigoGrupo: 1, nombreGrupo: 'Grupo 01', idPeriodoAcademico: 'PER-2026-2',
    nombrePeriodoAcademico: '2026-2', idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas',
    idAsignatura: 'ASG-1', nombreAsignatura: 'Cálculo Diferencial', idDocente: 'DOC-1', nombreDocente: 'Carlos Pérez',
    estudiantesActivos: 20, sesionesEjecutadas: 8, asistencias: 150, faltasSinJustaCausa: 10, excusas: 0,
    porcentajeAsistencia: 93.75, porcentajeInasistencia: 6.25, estudiantesRiesgo: 2, estudiantesPerdida: 1,
  },
  {
    idGrupo: 'GRP-2', codigoGrupo: 2, nombreGrupo: 'Grupo 02', idPeriodoAcademico: 'PER-2026-2',
    nombrePeriodoAcademico: '2026-2', idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas',
    idAsignatura: 'ASG-2', nombreAsignatura: 'Estructuras de Datos', idDocente: 'DOC-2', nombreDocente: 'Lucía Gómez',
    estudiantesActivos: 15, sesionesEjecutadas: 6, asistencias: 88, faltasSinJustaCausa: 2, excusas: 0,
    porcentajeAsistencia: 97.78, porcentajeInasistencia: 2.22, estudiantesRiesgo: 0, estudiantesPerdida: 0,
  },
];

/** HU172: un evento de asistencia y uno administrativo con fallo. */
const AUDITORIA: EventoAuditoriaItem[] = [
  {
    id: 'AUD-1', ocurridoEn: '2026-11-04T14:05:00Z', idActor: 'USR-DOC-1', tipoActor: 'USER', nombreActor: 'Carlos Pérez',
    accion: 'REGISTRAR_ASISTENCIAS_SESION', tipoRecurso: 'SESION', idRecurso: 'SES-1', resultado: 'SUCCESS',
    idTraza: 'COR-1', metodoHttp: 'POST', ruta: '/api/v1/asistencias/sesion', estadoHttp: 200, ipCliente: null,
    codigoError: null, metadatos: null, accionAsistencia: true,
  },
  {
    id: 'AUD-2', ocurridoEn: '2026-11-03T10:00:00Z', idActor: 'USR-COO-1', tipoActor: 'USER', nombreActor: 'Ana Ruiz',
    accion: 'VINCULAR_DOCENTE_PROGRAMA', tipoRecurso: 'DOCENTE', idRecurso: 'DOC-9', resultado: 'FAILURE',
    idTraza: 'COR-2', metodoHttp: 'POST', ruta: '/api/v1/coordinador/docentes', estadoHttp: 409, ipCliente: null,
    codigoError: 'CONFLICT', metadatos: null, accionAsistencia: false,
  },
];

const COMPONENTES: ComponenteFormacionItem[] = [
  { idComponente: 'CMP-BAS', codigo: 'BAS', nombre: 'Básicas', totalAsignaturas: 1 },
  { idComponente: 'CMP-ESP', codigo: 'ESP', nombre: 'Específicas', totalAsignaturas: 1 },
  { idComponente: 'CMP-INS', codigo: 'INS', nombre: 'Institucionales', totalAsignaturas: 0 },
];

function filtrar<T>(req: HttpRequest<unknown>, filas: T[], campos: (keyof T)[]): RespuestaSimulada {
  const busqueda = (req.params.get('busqueda') ?? '').toLowerCase();
  const datos = filas.filter((f) => !busqueda || campos.some((c) => String(f[c] ?? '').toLowerCase().includes(busqueda)));
  return { datos, total: datos.length };
}

/**
 * HU112/HU128/HU143/HU157: respuestas del modo mock para las consultas del decano y del administrador; `null` si la
 * petición no es una de ellas. Se evalúa antes de las rutas genéricas de `/decano/estudiantes/{id}`.
 */
export function respuestaConsultasTransversales(req: HttpRequest<unknown>, url: string): RespuestaSimulada | null {
  if (req.method !== 'GET') return null;
  if (url.includes('/estudiantes/') && url.endsWith('/historial')) {
    const partes = url.split('/');
    return { datos: historial(partes[partes.length - 2]) };
  }
  if (url.endsWith('/decano/programas-creditos')) return filtrar(req, PROGRAMAS_CREDITOS, ['nombrePrograma']);
  if (url.endsWith('/decano/docentes')) return filtrar(req, DOCENTES, ['nombreCompleto', 'numeroIdentificacion']);
  if (url.endsWith('/decano/asignaturas') || url.endsWith('/admin/asignaturas')) {
    return filtrar(req, ASIGNATURAS, ['codigo', 'nombre']);
  }
  if (url.endsWith('/consolidado-asistencia')) {
    const asignatura = req.params.get('idAsignatura');
    const datos = CONSOLIDADO.filter((g) => !asignatura || g.idAsignatura === asignatura);
    return { datos, total: datos.length };
  }
  if (url.endsWith('/admin/auditoria')) {
    const datos = AUDITORIA.filter((e) => req.params.get('soloAsistencia') === 'false' || e.accionAsistencia);
    return { datos, total: datos.length };
  }
  if (url.endsWith('/coordinador/componentes-formacion')) return { datos: COMPONENTES, total: COMPONENTES.length };
  if (url.endsWith('/admin/estudiantes')) return filtrar(req, ESTUDIANTES, ['nombreCompleto', 'numeroIdentificacion']);
  return null;
}
