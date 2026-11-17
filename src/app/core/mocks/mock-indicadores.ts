import { RespuestaSimulada } from './mock-consultas-transversales';
import { KpisInstitucion } from '../models/admin-indicators.model';
import { KpisCoordinador } from '../models/coordinator-indicators.model';
import { KpisDecano } from '../models/dean-indicators.model';
import { ResumenGruposDocente } from '../models/docente-resumen-grupos.model';

/**
 * CIERRE-W3I: simulacion fiel de los indicadores que el backend calcula para los tableros por rol (los campos y las rutas son los
 * del contrato). El tablero de cada rol los pide al cargar: sin simularlos responderian 501 y avisarian al usuario.
 */
const UMBRALES = { umbralAdvertencia: 15, umbralPerdida: 20 };

const KPIS_INSTITUCION: KpisInstitucion = {
  idInstitucion: 'INS-1', nombreInstitucion: 'Universidad Católica de Oriente', idPeriodoAcademico: 'PER-2026-2', nombrePeriodoAcademico: '2026-2',
  totalFacultades: 2, totalProgramas: 3, totalEstudiantes: 40, estudiantesRegulares: 30, estudiantesRiesgo: 8, estudiantesPerdida: 2,
  tasaRetencion: 95, sesionesEjecutadas: 14, faltasSinJustaCausa: 12, porcentajeAusentismo: 8.5, porcentajeAsistencia: 91.5,
  sesionesVencidas: 14, sesionesConRegistro: 14, porcentajeCumplimiento: 100, estudiantesConMatriculaActiva: 40, estudiantesRegistrados: 52,
  docentesConGrupoActivo: 4, docentesRegistrados: 6, ...UMBRALES, facultadesActivas: 2, totalDecanos: 2, decanosActivos: 2,
};

const KPIS_DECANO: KpisDecano = {
  idFacultad: 'FAC-1', nombreFacultad: 'Facultad de Ingeniería', idPeriodoAcademico: 'PER-2026-2', nombrePeriodoAcademico: '2026-2',
  totalProgramas: 1, totalEstudiantes: 35, estudiantesRegulares: 27, estudiantesRiesgo: 6, estudiantesPerdida: 2, tasaRetencion: 94.29,
  sesionesEjecutadas: 14, faltasSinJustaCausa: 12, porcentajeAusentismo: 8.5, porcentajeAsistencia: 91.5, gruposActivos: 2, cupoTotal: 60,
  matriculadosActivos: 35, tasaAforo: 58.33, ...UMBRALES, totalCoordinadores: 1, totalDocentes: 3,
};

const KPIS_COORDINADOR: KpisCoordinador = {
  idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas', idPeriodoAcademico: 'PER-2026-2', nombrePeriodoAcademico: '2026-2',
  totalEstudiantes: 35, estudiantesRegulares: 27, estudiantesRiesgo: 6, estudiantesPerdida: 2, tasaPermanencia: 94.29, sesionesProgramadas: 20,
  sesionesVencidas: 14, sesionesEjecutadas: 14, sesionesVencidasSinRegistro: 0, sesionesSinProcedenciaTemporal: 0, porcentajeCumplimiento: 100,
  porcentajeProgresoCalendario: 70, ...UMBRALES, totalDocentes: 3, gruposActivos: 2, cupoTotal: 60, matriculadosActivos: 35, tasaAforo: 58.33,
  estudiantesRegistrados: 52,
};

const RESUMEN_GRUPOS_DOCENTE: ResumenGruposDocente = { gruposHabilitados: 2, estudiantesActivos: 35, cupoTotal: 60, tasaOcupacion: 58.33 };

/** Rutas de los indicadores por rol; `null` si la ruta no es de este modulo. */
export function respuestaIndicadores(method: string, url: string): RespuestaSimulada | null {
  if (method !== 'GET') return null;
  const ruta = url.split('?')[0];
  if (ruta.endsWith('/admin/indicadores')) return { datos: KPIS_INSTITUCION };
  if (ruta.endsWith('/decano/indicadores')) return { datos: KPIS_DECANO };
  if (ruta.endsWith('/coordinador/indicadores')) return { datos: KPIS_COORDINADOR };
  if (ruta.endsWith('/docente/resumen-grupos')) return { datos: RESUMEN_GRUPOS_DOCENTE };
  return null;
}
