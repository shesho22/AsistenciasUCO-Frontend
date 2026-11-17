import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SemaforoAsistenciaComponent } from './semaforo-asistencia.component';

describe('SemaforoAsistenciaComponent', () => {
  let fixture: ComponentFixture<SemaforoAsistenciaComponent>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const chip = (): HTMLElement | null => root().querySelector('[data-testid="semaforo-nivel"]');
  function crear(inputs: Record<string, unknown>): void {
    fixture = TestBed.createComponent(SemaforoAsistenciaComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  }
  beforeEach(() => TestBed.configureTestingModule({ imports: [SemaforoAsistenciaComponent] }));

  it('verde (REGULAR): texto, icono y aria-label con el porcentaje del servidor', () => {
    crear({ codigoPermanencia: 'REGULAR', porcentaje: 5 });
    expect(chip()?.getAttribute('data-nivel')).toBe('verde');
    expect(chip()?.getAttribute('aria-label')).toBe('Inasistencia 5 %: nivel normal');
    expect(chip()?.textContent).toContain('Normal');
    expect(chip()?.querySelector('svg')).not.toBeNull();
  });
  it('ambar (RIESGO)', () => {
    crear({ codigoPermanencia: 'RIESGO', porcentaje: 15 });
    expect(chip()?.getAttribute('data-nivel')).toBe('ambar');
    expect(chip()?.getAttribute('aria-label')).toContain('advertencia');
    expect(chip()?.textContent).toContain('Advertencia');
  });
  it('rojo (PERDIDA) y el nivel no depende del porcentaje que se anuncia', () => {
    crear({ codigoPermanencia: 'PERDIDA', porcentaje: 1 });
    expect(chip()?.getAttribute('data-nivel')).toBe('rojo');
    expect(chip()?.textContent).toContain('Pérdida');
  });
  it('acepta el semaforo de las alertas tempranas (ROJO)', () => {
    crear({ codigoPermanencia: 'ROJO' });
    expect(chip()?.getAttribute('data-nivel')).toBe('rojo');
  });
  it('sin porcentaje anuncia el nivel', () => {
    crear({ codigoPermanencia: 'RIESGO' });
    expect(chip()?.getAttribute('aria-label')).toBe('Nivel de asistencia: advertencia');
  });
  it('decimales con coma en el aria-label', () => {
    crear({ codigoPermanencia: 'RIESGO', porcentaje: 19.99 });
    expect(chip()?.getAttribute('aria-label')).toBe('Inasistencia 19,99 %: advertencia');
  });
  it('sin codigo del servidor no pinta nada', () => {
    crear({ codigoPermanencia: null, porcentaje: 80 });
    expect(chip()).toBeNull();
  });
  it('con un codigo desconocido no pinta nada', () => {
    crear({ codigoPermanencia: 'OTRO', porcentaje: 80 });
    expect(chip()).toBeNull();
  });
  it('modo compacto oculta el texto visible pero conserva aria-label', () => {
    crear({ codigoPermanencia: 'PERDIDA', porcentaje: 25, compacto: true });
    expect(chip()?.getAttribute('aria-label')).toContain('pérdida');
    expect(chip()?.querySelector('[data-testid="semaforo-texto"]')).toBeNull();
  });
});
