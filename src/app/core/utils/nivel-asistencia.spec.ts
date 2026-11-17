import { nivelDesdeCodigo } from './nivel-asistencia';

describe('nivelDesdeCodigo (semaforo unico; el nivel lo clasifica el servidor)', () => {
  it('traduce los codigos de permanencia del servidor', () => {
    expect(nivelDesdeCodigo('REGULAR')).toBe('verde');
    expect(nivelDesdeCodigo('RIESGO')).toBe('ambar');
    expect(nivelDesdeCodigo('PERDIDA')).toBe('rojo');
  });
  it('traduce el semaforo de las alertas tempranas del coordinador', () => {
    expect(nivelDesdeCodigo('VERDE')).toBe('verde');
    expect(nivelDesdeCodigo('AMBAR')).toBe('ambar');
    expect(nivelDesdeCodigo('ROJO')).toBe('rojo');
  });
  it('ignora mayusculas y espacios', () => {
    expect(nivelDesdeCodigo(' perdida ')).toBe('rojo');
  });
  it('sin codigo o con un codigo desconocido no inventa un nivel', () => {
    expect(nivelDesdeCodigo(null)).toBeNull();
    expect(nivelDesdeCodigo(undefined)).toBeNull();
    expect(nivelDesdeCodigo('')).toBeNull();
    expect(nivelDesdeCodigo('OTRO')).toBeNull();
  });
});
