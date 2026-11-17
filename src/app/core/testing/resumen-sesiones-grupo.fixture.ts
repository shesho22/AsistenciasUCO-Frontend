import { ResumenSesionesGrupo, SesionResumenGrupo } from '../models/resumen-sesiones-grupo.model';

/** Sesion del resumen del servidor con conteos en cero; cada prueba cambia solo lo que verifica. */
export const sesionResumen = (idSesion: string, parcial: Partial<SesionResumenGrupo> = {}): SesionResumenGrupo => ({
  idSesion,
  numero: 1,
  nombre: 'Sesion',
  fechaHoraInicioUtc: '2026-09-14T13:00:00Z',
  fechaHoraFinUtc: '2026-09-14T15:00:00Z',
  horarioConfirmado: true,
  estadoSesion: 'EJECUTADA',
  estadoSolicitud: null,
  pendienteAprobacion: false,
  totalEstudiantes: 0,
  presentes: 0,
  parciales: 0,
  justificadas: 0,
  ausentes: 0,
  sinRegistro: 0,
  ...parcial,
});

/** Resumen del grupo tal como lo entrega el servidor: sin sesiones, sin horas dictadas (promedio nulo) y sin riesgo. */
export const resumenSesiones = (parcial: Partial<ResumenSesionesGrupo> = {}): ResumenSesionesGrupo => ({
  sesionesProgramadas: 0,
  sesionesEjecutadas: 0,
  sesionesCanceladas: 0,
  sesionesEnCurso: 0,
  idSesionEnCurso: null,
  idSesionProxima: null,
  estudiantesActivos: 0,
  estudiantesEnRiesgo: 0,
  promedioAsistencia: null,
  umbralAdvertencia: 15,
  umbralPerdida: 20,
  sesiones: [],
  ...parcial,
});
