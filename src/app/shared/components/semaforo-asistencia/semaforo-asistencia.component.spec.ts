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
});
