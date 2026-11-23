import { FranjaHorario } from '../models/course.model';
import { DIAS_SEMANA, franjaNueva, validarFranjas } from './franjas.util';

describe('franjas.util', () => {
  const franja = (dia: string, horaInicio: string, horaFin: string): FranjaHorario => ({ dia, horaInicio, horaFin });

  it('DIAS_SEMANA lista los siete días en el orden de la semana', () => {
    expect(DIAS_SEMANA.map((d) => d.codigo)).toEqual(['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO']);
  });

  it('franjaNueva propone lunes de 08:00 a 10:00 y es válida', () => {
    const nueva = franjaNueva();
    expect(nueva).toEqual({ dia: 'LU', horaInicio: '08:00', horaFin: '10:00' });
    expect(validarFranjas([nueva])).toBeNull();
  });

  it('acepta una lista vacía y franjas contiguas o en días distintos', () => {
    expect(validarFranjas([])).toBeNull();
    expect(validarFranjas([franja('LU', '08:00', '10:00'), franja('LU', '10:00', '12:00')])).toBeNull();
    expect(validarFranjas([franja('LU', '08:00', '10:00'), franja('MA', '08:00', '10:00')])).toBeNull();
  });

  it('rechaza horas vacías, fin igual al inicio o fin menor que el inicio', () => {
    const mensaje = 'En cada franja la hora de fin debe ser mayor que la de inicio.';
    expect(validarFranjas([franja('LU', '', '10:00')])).toBe(mensaje);
    expect(validarFranjas([franja('LU', '08:00', '')])).toBe(mensaje);
    expect(validarFranjas([franja('LU', '10:00', '10:00')])).toBe(mensaje);
    expect(validarFranjas([franja('LU', '11:00', '09:00')])).toBe(mensaje);
  });

  it('rechaza franjas que se cruzan el mismo día, sin importar el orden', () => {
    const mensaje = 'Las franjas del horario no pueden cruzarse entre sí.';
    expect(validarFranjas([franja('LU', '08:00', '10:00'), franja('LU', '09:00', '11:00')])).toBe(mensaje);
    expect(validarFranjas([franja('LU', '09:00', '11:00'), franja('LU', '08:00', '10:00')])).toBe(mensaje);
    expect(validarFranjas([franja('LU', '08:00', '12:00'), franja('LU', '09:00', '10:00')])).toBe(mensaje);
  });
});
