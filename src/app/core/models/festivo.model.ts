/** CULM-001 B.1 (CONTRACT B 3.2.2): festivos de Colombia que administra el administrador. */

export interface DiaFestivo {
  /** `YYYY-MM-DD` (fecha civil, sin zona). */
  fecha: string;
  nombre: string;
  fuente: string;
  estaActivo: boolean;
}

export interface AtribucionFestivos {
  texto: string;
  url: string;
}

/** `datos` de `GET /admin/festivos?anio=`. */
export interface FestivosAnio {
  anio: number;
  fuenteUltimaCarga: string | null;
  fechaUltimaCargaUtc: string | null;
  diferenciasCalculoLocal: number;
  atribucion: AtribucionFestivos | null;
  festivos: DiaFestivo[];
  totalFestivos: number;
}

/** `datos` de `POST /admin/festivos/{anio}/recarga`. */
export interface RecargaFestivos {
  anio: number;
  fuente: string;
  usoRespaldo: boolean;
  totalFestivos: number;
  festivosInsertados: number;
  festivosActualizados: number;
  festivosDesactivados: number;
  diferenciasCalculoLocal: number;
  aplicacion: {
    gruposProcesados: number;
    sesionesCanceladas: number;
    sesionesConAsistencia: number;
  };
}

/** Elemento de `GET /admin/festivos/{anio}/sesiones-con-asistencia`. */
export interface SesionFestivoConAsistencia {
  idSesion: string;
  idGrupo: string;
  nombreGrupo: string;
  nombreAsignatura: string;
  nombreDocente: string;
  fechaHoraInicioUtc: string | null;
  /** `YYYY-MM-DD`. */
  fecha: string;
  nombreFestivo: string;
  totalTomas: number;
  totalRegistros: number;
}
