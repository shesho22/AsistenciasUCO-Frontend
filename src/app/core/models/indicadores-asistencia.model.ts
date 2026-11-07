/** CULM-001 B.2 (CONTRACT B 3.2.8): indicadores por horas entregados por el backend; el cliente solo los pinta. */

export type CodigoPermanencia = 'REGULAR' | 'RIESGO' | 'PERDIDA';

export interface IndicadoresAsistenciaResponse {
  sesionesEjecutadas: number;
  horasDictadas: number;
  horasAsistidas: number;
  horasFalta: number;
  horasExcusa: number;
  horasSinRegistro: number;
  porcentajeInasistencia: number;
  porcentajeAsistencia: number;
  codigoPermanencia: CodigoPermanencia | null;
  umbralAdvertencia: number;
  umbralPerdida: number;
}

export interface ResumenAsistenciaEstudiante extends IndicadoresAsistenciaResponse {
  estudianteId: string;
  nombreCompleto: string;
  codigoEstadoEstudiante: string;
}
