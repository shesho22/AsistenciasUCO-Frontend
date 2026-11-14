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

  it('verde: texto, icono y aria-label', () => {
    crear({ porcentaje: 5 });
    expect(chip()?.getAttribute('data-nivel')).toBe('verde');
    expect(chip()?.getAttribute('aria-label')).toBe('Inasistencia 5 %: nivel normal');
    expect(chip()?.textContent).toContain('Normal');
    expect(chip()?.querySelector('svg')).not.toBeNull();
  });
  it('ambar en 15 exacto', () => {
    crear({ porcentaje: 15 });
    expect(chip()?.getAttribute('data-nivel')).toBe('ambar');
    expect(chip()?.getAttribute('aria-label')).toContain('advertencia');
  });
  it('rojo en 20 exacto y respeta umbrales informados', () => {
    crear({ porcentaje: 20 });
    expect(chip()?.getAttribute('data-nivel')).toBe('rojo');
    fixture.destroy();
    crear({ porcentaje: 20, umbralAdvertencia: 10, umbralPerdida: 30 });
    expect(chip()?.getAttribute('data-nivel')).toBe('ambar');
  });
  it('sin dato no pinta nada', () => {
    crear({ porcentaje: null });
    expect(chip()).toBeNull();
  });
  it('modo compacto oculta el texto visible pero conserva aria-label', () => {
    crear({ porcentaje: 25, compacto: true });
    expect(chip()?.getAttribute('aria-label')).toContain('pérdida');
    expect(chip()?.querySelector('[data-testid="semaforo-texto"]')).toBeNull();
  });

  describe('VAL PRU-14: presentacion del borde del umbral', () => {
    const casos: Array<{ porcentaje: number; nivel: string; texto: string; aria: string }> = [
      { porcentaje: 19.99, nivel: 'ambar', texto: 'Advertencia', aria: 'Inasistencia 19,99 %: advertencia' },
      { porcentaje: 19.995, nivel: 'rojo', texto: 'Pérdida', aria: 'Inasistencia 20 %: pérdida de la asignatura' },
      { porcentaje: 20, nivel: 'rojo', texto: 'Pérdida', aria: 'Inasistencia 20 %: pérdida de la asignatura' },
      { porcentaje: 20.01, nivel: 'rojo', texto: 'Pérdida', aria: 'Inasistencia 20,01 %: pérdida de la asignatura' },
    ];
    for (const c of casos) {
      it(`${c.porcentaje} % se presenta como ${c.texto} y anuncia el valor redondeado`, () => {
        crear({ porcentaje: c.porcentaje });
        expect(chip()?.getAttribute('data-nivel')).toBe(c.nivel);
        expect(chip()?.textContent).toContain(c.texto);
        expect(chip()?.getAttribute('aria-label')).toBe(c.aria);
      });
    }
  });
});
