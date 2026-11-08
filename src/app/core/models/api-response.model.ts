export interface ApiResponse<T> {
  idTransaccion?: string;
  exitoso: boolean;
  mensajeUsuario?: string;
  mensajeTecnico?: string;
  datos: T;
  total?: number;
  token?: string;
}

export interface ApiPageResponse<T> {
  exitoso?: boolean;
  elementos: T[];
  numeroPagina: number;
  tamanoPagina: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface UserAuthResponse {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: string;
}

