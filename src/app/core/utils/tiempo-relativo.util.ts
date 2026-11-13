/**
 * Texto "hace 5 min" / "hace 2 h" / "hace 3 días" para un instante ISO. Se calcula una vez al cargar la lista (sin
 * timers). Un instante ausente o inválido se presenta como «—»; uno futuro o de menos de un minuto, «hace un momento».
 */
export function formatearHace(iso: string | null | undefined, ahora: Date): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const minutos = Math.floor((ahora.getTime() - t) / 60000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}
