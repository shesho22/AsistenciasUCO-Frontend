import { nivelAsistencia, redondearPorcentaje } from './nivel-asistencia';

describe('nivelAsistencia (semaforo unico)', () => {
  it('verde por debajo de 15', () => {
    expect(nivelAsistencia(0)).toBe('verde');
    expect(nivelAsistencia(14.99)).toBe('verde');
  });
  it('limite exacto 15,00 es ambar', () => {
    expect(nivelAsistencia(15)).toBe('ambar');
    expect(nivelAsistencia(19.99)).toBe('ambar');
  });
  it('limite exacto 20,00 es rojo', () => {
    expect(nivelAsistencia(20)).toBe('rojo');
    expect(nivelAsistencia(75)).toBe('rojo');
  });
  it('usa umbrales del backend cuando se informan', () => {
    expect(nivelAsistencia(12, 10, 25)).toBe('ambar');
    expect(nivelAsistencia(25, 10, 25)).toBe('rojo');
    expect(nivelAsistencia(9, 10, 25)).toBe('verde');
  });
  it('respalda 15/20 si los umbrales llegan nulos', () => {
    expect(nivelAsistencia(16, null, null)).toBe('ambar');
    expect(nivelAsistencia(20, undefined, undefined)).toBe('rojo');
  });
  it('sin dato devuelve null', () => {
    expect(nivelAsistencia(null)).toBeNull();
    expect(nivelAsistencia(undefined)).toBeNull();
    expect(nivelAsistencia(Number.NaN)).toBeNull();
  });
});

describe('VAL PRU-14: bordes del umbral con redondeo a dos decimales (decision 3A)', () => {
  it('19,99 % sigue en advertencia; 20,00 % y 20,01 % son perdida', () => {
    expect(nivelAsistencia(19.99)).toBe('ambar');
    expect(nivelAsistencia(20.0)).toBe('rojo');
    expect(nivelAsistencia(20.01)).toBe('rojo');
  });

  it('19,995 % redondea a 20,00 % y cuenta como perdida (igual que ROUND en la BD)', () => {
    expect(redondearPorcentaje(19.995)).toBe(20);
    expect(nivelAsistencia(19.995)).toBe('rojo');
  });

  it('19,994 % redondea a 19,99 % y sigue en advertencia', () => {
    expect(redondearPorcentaje(19.994)).toBe(19.99);
    expect(nivelAsistencia(19.994)).toBe('ambar');
  });

  it('el borde de advertencia se comporta igual: 14,994 verde, 14,995 ambar', () => {
    expect(nivelAsistencia(14.994)).toBe('verde');
    expect(nivelAsistencia(14.995)).toBe('ambar');
  });

  it('con umbrales del backend tambien compara despues de redondear', () => {
    expect(nivelAsistencia(24.995, 10, 25)).toBe('rojo');
    expect(nivelAsistencia(9.995, 10, 25)).toBe('ambar');
    expect(nivelAsistencia(9.994, 10, 25)).toBe('verde');
  });

  it('redondearPorcentaje conserva enteros, ceros y valores ya redondeados', () => {
    expect(redondearPorcentaje(0)).toBe(0);
    expect(redondearPorcentaje(-0.001)).toBe(0);
    expect(redondearPorcentaje(75)).toBe(75);
    expect(redondearPorcentaje(1.005)).toBe(1.01);
    expect(redondearPorcentaje(33.333333)).toBe(33.33);
  });
});
