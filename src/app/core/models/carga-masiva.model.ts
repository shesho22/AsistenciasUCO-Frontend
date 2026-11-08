export type DestinoCargaMasiva = 'DOCENTE' | 'COORDINADOR' | 'DECANO';

export type EstadoFilaValidacion = 'VALIDA' | 'YA_EXISTE' | 'ERROR';

export interface ErrorFilaCargaDTO {
  campo?: string;
  codigo: string;
  mensaje: string;
}

export interface FilaValidacionCargaDTO {
  numeroFila: number;
  documento?: string;
  correo?: string;
  estado: EstadoFilaValidacion;
  errores?: ErrorFilaCargaDTO[];
}

export interface ResultadoValidacionCargaDTO {
  huella: string;
  perfilDestino: DestinoCargaMasiva;
  totalFilas: number;
  filasValidas: number;
  filasYaExistentes: number;
  filasConError: number;
  filas: FilaValidacionCargaDTO[];
}

export type EstadoFilaCarga =
  | 'CREADA'
  | 'CREADA_CUENTA_PENDIENTE'
  | 'YA_EXISTE'
  | 'YA_EXISTE_CUENTA_REPARADA'
  | 'ERROR';

export interface FilaResultadoCargaDTO {
  numeroFila: number;
  documento?: string;
  correo?: string;
  estado: EstadoFilaCarga;
  idUsuario?: string;
  errores?: ErrorFilaCargaDTO[];
}

export interface ResultadoCargaDTO {
  totalFilas: number;
  creadas: number;
  yaExistentes: number;
  conError: number;
  cuentasPendientes: number;
  filas: FilaResultadoCargaDTO[];
  mensaje?: string;
}
