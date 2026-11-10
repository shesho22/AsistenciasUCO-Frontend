import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CifraConBaseComponent } from './cifra-con-base.component';

describe('CifraConBaseComponent', () => {
  let fixture: ComponentFixture<CifraConBaseComponent>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const txt = (): string => (root().textContent ?? '').replace(/\s+/g, ' ').trim();
  function crear(inputs: Record<string, unknown>): void {
    fixture = TestBed.createComponent(CifraConBaseComponent);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  }
  beforeEach(() => TestBed.configureTestingModule({ imports: [CifraConBaseComponent] }));

  it('muestra valor y base en una sola frase con etiquetas por defecto', () => {
    crear({ valor: 13, base: 16 });
    expect(txt()).toBe('13 activos de 16 registrados');
    expect(root().querySelector('[data-testid="cifra-con-base"]')?.getAttribute('aria-label')).toBe('13 activos de 16 registrados');
  });

  it('acepta etiquetas propias', () => {
    crear({ valor: 3, base: 5, etiquetaValor: 'inscritos', etiquetaBase: 'cupos' });
    expect(txt()).toBe('3 inscritos de 5 cupos');
  });

  it('soloBase omite el valor y conserva la base', () => {
    crear({ valor: 13, base: 16, soloBase: true });
    expect(txt()).toBe('de 16 registrados');
    expect(root().querySelector('[data-testid="cifra-valor"]')).toBeNull();
    expect(root().querySelector('[data-testid="cifra-con-base"]')?.getAttribute('aria-label')).toBe('de 16 registrados');
  });

  it('admite cero', () => {
    crear({ valor: 0, base: 0 });
    expect(txt()).toBe('0 activos de 0 registrados');
  });
});
