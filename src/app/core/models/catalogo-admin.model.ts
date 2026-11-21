/** Categoría de justificación del catálogo predefinido (`GET /admin/categorias-justificacion`, solo consulta). */
export interface CategoriaJustificacionAdmin {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  requiereSoporte: boolean;
  estaActivo: boolean;
}

/** Motivo de cancelación de sesión del catálogo predefinido (`GET /admin/motivos-cancelacion-sesion`, solo consulta). */
export interface MotivoCancelacionSesionAdmin {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  estaActivo: boolean;
}

/** Listado completo (activos e inactivos) de un catálogo predefinido. */
export interface ListaCatalogoAdmin<T> {
  exitoso: boolean;
  datos: T[];
  total: number;
}
