import { HttpRequest } from '@angular/common/http';
import {
  AsignaturaInstitucionItem,
  CategoriaJustificacionItem,
  ComponenteFormacionItem,
  ConsolidadoGrupoItem,
  DocenteFacultadItem,
  EstudianteInstitucionItem,
  EstadoSistemaItem,
  EventoAuditoriaItem,
  FichaUnificadaEstudiante,
  ProgramaCreditosItem,
} from '../models/consultas-transversales.model';

/** Respuesta simulada: datos y total (para las listas paginadas). */
export interface RespuestaSimulada {
  datos: unknown;
  total?: number;
  esPaginada?: boolean;
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
    totalGrupos: 2, primerNombre: 'María', segundoNombre: null, primerApellido: 'Rostagno', segundoApellido: null,
    nombres: 'María', apellidos: 'Rostagno', idTipoIdentificacion: 'TID-CC', codigoTipoIdentificacion: 'CC',
  },
  {
    idDocente: 'DOC-MOCK-2', numeroIdentificacion: '43000222', nombreCompleto: 'Jorge Iván Cardona Silva',
    correo: 'jorge.cardona@uco.edu.co', activo: true, programas: 'Ingeniería Industrial', totalProgramas: 1,
    totalGrupos: 1, primerNombre: 'Jorge', segundoNombre: 'Iván', primerApellido: 'Cardona', segundoApellido: 'Silva',
    nombres: 'Jorge Iván', apellidos: 'Cardona Silva', idTipoIdentificacion: 'TID-CC', codigoTipoIdentificacion: 'CC',
  },
];

const ASIGNATURAS: AsignaturaInstitucionItem[] = [
  {
    idAsignatura: 'ASG-1', codigo: 'SIS-101', nombre: 'Cálculo Diferencial', creditos: 4, nombreArea: 'Ciencias Básicas',
    nombreComponente: 'Obligatorio', planes: 'Ingeniería de Sistemas (Plan 20241); Ingeniería de Software (Plan 20241)',
    totalPlanes: 2, activa: true,
  },
  {
    idAsignatura: 'ASG-2', codigo: 'SIS-201', nombre: 'Estructuras de Datos', creditos: 3, nombreArea: 'Software',
    nombreComponente: 'Obligatorio', planes: 'Ingeniería de Sistemas (Plan 20241)',
    totalPlanes: 1, activa: true,
  },
];

const ESTUDIANTES: EstudianteInstitucionItem[] = [
  {
    idEstudiante: 'EST-MOCK-1', tipoIdentificacion: 'CC', numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz',
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
    horasDictadas: 16, porcentajeExcusa: 0, porcentajeSinRegistro: 0, codigoPermanencia: 'REGULAR',
  },
  {
    idGrupo: 'GRP-2', codigoGrupo: 2, nombreGrupo: 'Grupo 02', idPeriodoAcademico: 'PER-2026-2',
    nombrePeriodoAcademico: '2026-2', idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas',
    idAsignatura: 'ASG-2', nombreAsignatura: 'Estructuras de Datos', idDocente: 'DOC-2', nombreDocente: 'Lucía Gómez',
    estudiantesActivos: 15, sesionesEjecutadas: 6, asistencias: 88, faltasSinJustaCausa: 2, excusas: 0,
    porcentajeAsistencia: 97.78, porcentajeInasistencia: 2.22, estudiantesRiesgo: 0, estudiantesPerdida: 0,
    horasDictadas: 12, porcentajeExcusa: 0, porcentajeSinRegistro: 0, codigoPermanencia: 'REGULAR',
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

/** HU155: estados de negocio del seed. */
const ESTADOS: EstadoSistemaItem[] = [
  { catalogo: 'SOLICITUD', id: 'EST-P', codigo: 'P', nombre: 'Pendiente' },
  { catalogo: 'SOLICITUD', id: 'EST-A', codigo: 'A', nombre: 'Aceptada' },
  { catalogo: 'SOLICITUD', id: 'EST-R', codigo: 'R', nombre: 'Rechazada' },
  { catalogo: 'SOLICITUD', id: 'EST-X', codigo: 'X', nombre: 'Retirada' },
  { catalogo: 'ESTUDIANTE_GRUPO', id: 'EEG-A', codigo: 'A', nombre: 'Activo' },
  { catalogo: 'ESTUDIANTE_GRUPO', id: 'EEG-CI', codigo: 'CI', nombre: 'Cancelado por inasistencia' },
];

/** HU005/HU016: categorías de justificación del seed. */
const CATEGORIAS_JUSTIFICACION: CategoriaJustificacionItem[] = [
  { id: 'CAT-MED', codigo: 'MED', nombre: 'Médico / Salud', descripcion: 'Enfermedad, cita o urgencia médica, incapacidad u hospitalización.' },
  { id: 'CAT-CAL', codigo: 'CAL', nombre: 'Calamidad Doméstica', descripcion: 'Situación grave e imprevista del núcleo familiar.' },
  { id: 'CAT-ACA', codigo: 'ACA', nombre: 'Académico / Representación', descripcion: 'Actividad en representación de la universidad.' },
  { id: 'CAT-FMA', codigo: 'FMA', nombre: 'Fuerza Mayor', descripcion: 'Hecho imprevisible e irresistible ajeno al estudiante.' },
  { id: 'CAT-LAB', codigo: 'LAB', nombre: 'Laboral', descripcion: 'Obligación laboral comprobable que coincidió con la sesión.' },
  { id: 'CAT-OTR', codigo: 'OTR', nombre: 'Otro', descripcion: 'Motivo distinto a los anteriores.' },
];

const COMPONENTES: ComponenteFormacionItem[] = [
  { idComponente: 'CMP-BAS', codigo: 'BAS', nombre: 'Básicas', totalAsignaturas: 1 },
  { idComponente: 'CMP-ESP', codigo: 'ESP', nombre: 'Específicas', totalAsignaturas: 1 },
  { idComponente: 'CMP-INS', codigo: 'INS', nombre: 'Institucionales', totalAsignaturas: 0 },
  { idComponente: 'CMP-ELE', codigo: 'ELE', nombre: 'Electivas', totalAsignaturas: 0 },
];

/** Como el backend: busca por subcadena en los campos indicados y respeta `estaActivo`; el interceptor pagina. */
function filtrar<T>(req: HttpRequest<unknown>, filas: T[], campos: (keyof T)[]): RespuestaSimulada {
  const busqueda = (req.params.get('busqueda') ?? '').toLowerCase();
  const estaActivo = req.params.get('estaActivo');
  const datos = filas.filter((f) => {
    const coincide = !busqueda || campos.some((c) => String(f[c] ?? '').toLowerCase().includes(busqueda));
    const activo = (f as { activo?: boolean }).activo;
    return coincide && (estaActivo === null || activo === undefined || String(activo) === estaActivo);
  });
  return { datos, total: datos.length, esPaginada: true };
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
  if (url.endsWith('/decano/docentes') || url.endsWith('/admin/docentes')) {
    return filtrar(req, DOCENTES, ['nombreCompleto', 'numeroIdentificacion']);
  }
  if (url.endsWith('/decano/asignaturas') || url.endsWith('/admin/asignaturas')) {
    return filtrar(req, ASIGNATURAS, ['codigo', 'nombre']);
  }
  if (url.endsWith('/consolidado-asistencia/opciones')) {
    // CIERRE-W2A: asignaturas y docentes de TODOS los grupos del ambito (no solo los de la pagina), ordenados por nombre
    const unicos = (pares: [string | null, string | null][]) =>
      [...new Map(pares.filter((p): p is [string, string | null] => !!p[0]).map(([id, nombre]) => [id, { id, nombre: nombre ?? id }])).values()]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const periodo = req.params.get('idPeriodoAcademico');
    const grupos = CONSOLIDADO.filter((g) => !periodo || g.idPeriodoAcademico === periodo);
    return {
      datos: {
        asignaturas: unicos(grupos.map((g) => [g.idAsignatura, g.nombreAsignatura] as [string | null, string | null])),
        docentes: unicos(grupos.map((g) => [g.idDocente, g.nombreDocente] as [string | null, string | null])),
      },
    };
  }
  if (url.endsWith('/consolidado-asistencia')) {
    const asignatura = req.params.get('idAsignatura');
    const datos = CONSOLIDADO.filter((g) => !asignatura || g.idAsignatura === asignatura);
    return { datos, total: datos.length, esPaginada: true };
  }
  if (url.endsWith('/admin/auditoria')) {
    const datos = AUDITORIA.filter((e) => req.params.get('soloAsistencia') === 'false' || e.accionAsistencia);
    return { datos, total: datos.length, esPaginada: true };
  }
  if (url.endsWith('/categorias-justificacion')) {
    return { datos: CATEGORIAS_JUSTIFICACION, total: CATEGORIAS_JUSTIFICACION.length };
  }
  if (url.endsWith('/admin/estados')) return { datos: ESTADOS, total: ESTADOS.length };
  if (url.endsWith('/coordinador/componentes-formacion')) return { datos: COMPONENTES, total: COMPONENTES.length };
  if (url.endsWith('/admin/estudiantes')) return filtrar(req, ESTUDIANTES, ['nombreCompleto', 'numeroIdentificacion']);
  return null;
}
