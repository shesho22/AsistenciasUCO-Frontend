import { nivelAsistencia } from './nivel-asistencia';

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
