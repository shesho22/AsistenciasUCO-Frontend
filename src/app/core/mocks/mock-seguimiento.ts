import { HttpRequest } from '@angular/common/http';
import { RespuestaSimulada } from './mock-consultas-transversales';
import { AlertaTemprana } from '../models/coordinator-indicators.model';
import { AforoGrupo, ComparativaPrograma } from '../models/dean-indicators.model';

/**
 * Simulacion de las consultas de seguimiento por rol: alertas tempranas del coordinador y comparativa de programas y aforo de
 * grupos del decano (rutas y campos del contrato). Las pantallas las piden al cargar: sin simularlas responderian 501.
 */
const ALERTAS: AlertaTemprana[] = [
  { idEstudiante: 'EST-MOCK-1', nombreCompleto: 'Ana Ruiz', numeroIdentificacion: 1017000111, correo: 'ana.ruiz@uco.edu.co', totalMatriculasActivas: 2, porcentajeInasistencia: 24, faltasSinJustaCausa: 4, codigoPermanencia: 'PERDIDA', semaforo: 'ROJO' },
  { idEstudiante: 'EST-MOCK-2', nombreCompleto: 'Luis Gómez', numeroIdentificacion: 1017000112, correo: 'luis.gomez@uco.edu.co', totalMatriculasActivas: 1, porcentajeInasistencia: 16.5, faltasSinJustaCausa: 2, codigoPermanencia: 'RIESGO', semaforo: 'AMBAR' },
];

const COMPARATIVA: ComparativaPrograma[] = [
  { idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas', estaActivoPrograma: true, totalEstudiantes: 35, estudiantesRiesgo: 6, estudiantesPerdida: 2, tasaRetencion: 94.29, sesionesEjecutadas: 14, faltasSinJustaCausa: 12, porcentajeAusentismo: 8.5, horasDictadas: 56, horasFalta: 4.76 },
  { idPrograma: 'PRG-2', nombrePrograma: 'Ingeniería Industrial', estaActivoPrograma: true, totalEstudiantes: 20, estudiantesRiesgo: 3, estudiantesPerdida: 1, tasaRetencion: 95, sesionesEjecutadas: 10, faltasSinJustaCausa: 5, porcentajeAusentismo: 6.2, horasDictadas: 40, horasFalta: 2.48 },
];

const AFORO: AforoGrupo[] = [
  { idGrupo: 'GRP-1', codigoGrupo: 1, idAsignatura: 'ASG-1', nombreAsignatura: 'Cálculo I', programas: ['Ingeniería de Sistemas'], cupoMaximo: 30, matriculadosActivos: 20, cuposDisponibles: 10, tasaAforo: 66.67, grupoEstaHabilitado: true },
  { idGrupo: 'GRP-2', codigoGrupo: 2, idAsignatura: 'ASG-2', nombreAsignatura: 'Programación', programas: ['Ingeniería de Sistemas', 'Ingeniería Industrial'], cupoMaximo: 30, matriculadosActivos: 15, cuposDisponibles: 15, tasaAforo: 50, grupoEstaHabilitado: true },
];

/** `null` si la ruta no es de este modulo. Las listas se entregan completas: el interceptor las pagina como el backend. */
export function respuestaSeguimiento(req: HttpRequest<unknown>, url: string): RespuestaSimulada | null {
  if (req.method !== 'GET') return null;
  const ruta = url.split('?')[0];
  if (ruta.endsWith('/coordinador/alertas-tempranas')) {
    const semaforo = req.params.get('semaforo');
    const nombre = (req.params.get('nombre') ?? '').toLowerCase();
    const filas = ALERTAS.filter((a) => (!semaforo || a.semaforo === semaforo) && a.nombreCompleto.toLowerCase().includes(nombre));
    return { datos: filas, total: filas.length, esPaginada: true };
  }
  if (ruta.endsWith('/decano/comparativa-programas')) return { datos: COMPARATIVA };
  if (ruta.endsWith('/decano/aforo-grupos')) {
    const idPrograma = req.params.get('idPrograma');
    const nombrePrograma = COMPARATIVA.find((p) => p.idPrograma === idPrograma)?.nombrePrograma;
    const filas = AFORO.filter((g) => !nombrePrograma || g.programas.includes(nombrePrograma));
    return { datos: filas, total: filas.length, esPaginada: true };
  }
  return null;
}
