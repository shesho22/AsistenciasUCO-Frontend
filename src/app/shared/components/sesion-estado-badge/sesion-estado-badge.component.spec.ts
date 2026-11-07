import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SesionEstadoBadgeComponent } from './sesion-estado-badge.component';

describe('SesionEstadoBadgeComponent (CULM-001 B.1)', () => {
  let fixture: ComponentFixture<SesionEstadoBadgeComponent>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SesionEstadoBadgeComponent] });
    fixture = TestBed.createComponent(SesionEstadoBadgeComponent);
  });

  it('B1-F-08 es OnPush', () => {
    const def = (SesionEstadoBadgeComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp;
    expect(def.onPush).toBeTrue();
  });

  it('B1-F-08 no pinta nada para una sesión programada', () => {
    fixture.componentRef.setInput('estado', 'PROGRAMADA');
    fixture.detectChanges();
    expect(el().textContent?.trim()).toBe('');
  });

  it('B1-F-08 sin estado (backend antiguo) tampoco pinta nada', () => {
    fixture.detectChanges();
    expect(el().textContent?.trim()).toBe('');
  });

  it('B1-F-08 cancelada por el docente muestra "Cancelada" y el motivo con el token warning', () => {
    fixture.componentRef.setInput('estado', 'CANCELADA');
    fixture.componentRef.setInput('cancelacion', {
      tipo: 'DOCENTE',
      motivo: 'Incapacidad médica',
      nombreFestivo: null,
      fechaCancelacionUtc: null,
    });
    fixture.detectChanges();

    const badge = el().querySelector('[data-testid="sesion-cancelada-badge"]') as HTMLElement;
    expect(badge.textContent).toContain('Cancelada');
    expect(badge.innerHTML).toContain('warning');
    expect(el().querySelector('[data-testid="sesion-cancelada-detalle"]')?.textContent).toContain('Incapacidad médica');
  });

  it('B1-F-08 cancelada por festivo muestra "Día festivo: <nombre>"', () => {
    fixture.componentRef.setInput('estado', 'CANCELADA');
    fixture.componentRef.setInput('cancelacion', {
      tipo: 'FESTIVO',
      motivo: null,
      nombreFestivo: 'San José',
      fechaCancelacionUtc: null,
    });
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="sesion-cancelada-detalle"]')?.textContent).toContain('Día festivo: San José');
  });

  it('B1-F-08 cancelada sin detalle muestra solo la etiqueta', () => {
    fixture.componentRef.setInput('estado', 'CANCELADA');
    fixture.detectChanges();

    expect(el().querySelector('[data-testid="sesion-cancelada-badge"]')).not.toBeNull();
    expect(el().querySelector('[data-testid="sesion-cancelada-detalle"]')).toBeNull();
  });
});
