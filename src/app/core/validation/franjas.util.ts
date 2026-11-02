import { FranjaHorario } from '../models/course.model';

/** Días de dbo.Dia en el orden de la semana (código y nombre visible). */
export const DIAS_SEMANA: ReadonlyArray<{ codigo: string; nombre: string }> = [
  { codigo: 'LU', nombre: 'Lunes' },
  { codigo: 'MA', nombre: 'Martes' },
  { codigo: 'MI', nombre: 'Miércoles' },
  { codigo: 'JU', nombre: 'Jueves' },
  { codigo: 'VI', nombre: 'Viernes' },
  { codigo: 'SA', nombre: 'Sábado' },
  { codigo: 'DO', nombre: 'Domingo' },
];

/** Franja nueva con valores por defecto (lunes 08:00-10:00). */
export function franjaNueva(): FranjaHorario {
  return { dia: 'LU', horaInicio: '08:00', horaFin: '10:00' };
}

/**
 * Validaciones de formato del horario antes de llamar al backend: horas completas, fin mayor que inicio y franjas que no se
 * cruzan en el mismo día. Las reglas de negocio (cruce del docente, HOR_002) las confirma la DB.
 */
export function validarFranjas(franjas: FranjaHorario[]): string | null {
  for (const franja of franjas) {
    if (!franja.horaInicio || !franja.horaFin || franja.horaFin <= franja.horaInicio) {
      return 'En cada franja la hora de fin debe ser mayor que la de inicio.';
    }
  }
  const cruce = franjas.some((a, i) =>
    franjas.some((b, j) => j > i && a.dia === b.dia && a.horaInicio < b.horaFin && a.horaFin > b.horaInicio)
  );
  return cruce ? 'Las franjas del horario no pueden cruzarse entre sí.' : null;
}
