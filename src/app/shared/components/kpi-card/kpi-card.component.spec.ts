import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiCardComponent } from './kpi-card.component';

describe('KpiCardComponent', () => {
  let fixture: ComponentFixture<KpiCardComponent>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = (id: string): HTMLElement | null => root().querySelector(`[data-testid="${id}"]`);
  function crear(inputs: Record<string, unknown>): void {
    fixture = TestBed.createComponent(KpiCardComponent);
    for (const [k, v] of Object.entries({ etiqueta: 'Ausentismo', ...inputs })) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  }
  beforeEach(() => TestBed.configureTestingModule({ imports: [KpiCardComponent] }));

  it('muestra etiqueta, valor, unidad y descripcion; sin variacion no la pinta', () => {
    crear({ valor: 12.5, unidad: '%', descripcion: 'Por horas dictadas' });
    expect(q('kpi-etiqueta')?.textContent).toContain('Ausentismo');
    expect(q('kpi-valor')?.textContent?.trim()).toBe('12.5%');
    expect(q('kpi-descripcion')?.textContent).toContain('Por horas dictadas');
    expect(q('kpi-variacion')).toBeNull();
  });

  it('valor nulo muestra "Sin datos" sin unidad ni descripcion vacia', () => {
    crear({ valor: null, unidad: '%' });
    expect(q('kpi-valor')?.textContent?.trim()).toBe('Sin datos');
    expect(q('kpi-unidad')).toBeNull();
    expect(q('kpi-descripcion')).toBeNull();
  });

  it('variacion que sube en un indicador donde menos es mejor empeora (rojo, flecha, aria)', () => {
    crear({ valor: 10, variacion: 2.5, sentido: 'menor-mejor' });
    expect(q('kpi-variacion')?.getAttribute('data-tono')).toBe('empeora');
    expect(q('kpi-variacion')?.className).toContain('text-danger-700');
    expect(q('kpi-variacion')?.textContent).toContain('vs período anterior');
    expect(q('kpi-variacion')?.getAttribute('aria-label')).toContain('sube');
    expect(q('kpi-variacion')?.querySelector('svg')).not.toBeNull();
  });

  it('variacion que baja con menos-es-mejor mejora (verde)', () => {
    crear({ valor: 10, variacion: -1, sentido: 'menor-mejor' });
    expect(q('kpi-variacion')?.getAttribute('data-tono')).toBe('mejora');
    expect(q('kpi-variacion')?.className).toContain('text-success-700');
    expect(q('kpi-variacion')?.getAttribute('aria-label')).toContain('baja');
  });

  it('sentido mayor-mejor invierte el tono', () => {
    crear({ valor: 90, variacion: 3, sentido: 'mayor-mejor' });
    expect(q('kpi-variacion')?.getAttribute('data-tono')).toBe('mejora');
  });

  it('variacion cero es neutra y sin cambio', () => {
    crear({ valor: 5, variacion: 0 });
    expect(q('kpi-variacion')?.getAttribute('data-tono')).toBe('neutro');
    expect(q('kpi-variacion')?.textContent).toContain('Sin cambio');
  });
});
