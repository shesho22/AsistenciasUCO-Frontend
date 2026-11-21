/** Categoría de justificación del catálogo administrable (`/admin/categorias-justificacion`). */
export interface CategoriaJustificacionAdmin {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  requiereSoporte: boolean;
  estaActivo: boolean;
}

export interface CategoriaJustificacionCrear {
  codigo: string;
  nombre: string;
  descripcion?: string;
  requiereSoporte: boolean;
}

export interface CategoriaJustificacionEditar {
  nombre: string;
  descripcion?: string;
  requiereSoporte: boolean;
}

/** Motivo de cancelación de sesión del catálogo administrable (`/admin/motivos-cancelacion-sesion`). */
export interface MotivoCancelacionSesionAdmin {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  estaActivo: boolean;
}

export interface MotivoCancelacionCrear {
  codigo: string;
  nombre: string;
  orden?: number;
}

export interface MotivoCancelacionEditar {
  nombre: string;
  orden: number;
}

/** Listado completo (activos e inactivos) de un catálogo administrable. */
export interface ListaCatalogoAdmin<T> {
  exitoso: boolean;
  datos: T[];
  total: number;
}

export interface CatalogoIdResultado {
  id: string;
}

export interface CatalogoEstadoResultado {
  id: string;
  estaActivo: boolean;
}
