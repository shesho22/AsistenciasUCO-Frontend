import { TipoPlantillaAdminDto } from '../../../core/services/admin-email-notification.service';

/** Fecha corta local de una marca ISO; '—' si no hay valor. */
export function formatearFechaCorreo(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

/** Texto que identifica a un tipo de plantilla: la descripción del servicio o, sin ella, el código del tipo. */
export function etiquetaPlantilla(plantilla: Pick<TipoPlantillaAdminDto, 'tipo' | 'descripcion'>): string {
  const descripcion = plantilla.descripcion?.trim();
  return descripcion ? descripcion : plantilla.tipo;
}
