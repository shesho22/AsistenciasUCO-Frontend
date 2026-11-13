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

  it('DEC-065 (2) pendiente de aprobación muestra la insignia ámbar y no "Cancelada"', () => {
    fixture.componentRef.setInput('estadoSolicitud', 'PENDIENTE');
    fixture.componentRef.setInput('pendienteAprobacion', true);
    fixture.detectChanges();

    const badge = el().querySelector('[data-testid="sesion-pendiente-badge"]') as HTMLElement;
    expect(badge.textContent).toContain('Pendiente de aprobación');
    expect(badge.innerHTML).toContain('warning');
    expect(el().querySelector('[data-testid="sesion-cancelada-badge"]')).toBeNull();
  });

  it('DEC-065 (2) pendienteAprobacion=true basta aunque falte el estado de la solicitud', () => {
    fixture.componentRef.setInput('pendienteAprobacion', true);
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="sesion-pendiente-badge"]')).not.toBeNull();
  });

  it('DEC-065 (2) rechazada muestra la insignia roja y conserva el detalle de la cancelación', () => {
    fixture.componentRef.setInput('estado', 'CANCELADA');
    fixture.componentRef.setInput('estadoSolicitud', 'RECHAZADA');
    fixture.componentRef.setInput('cancelacion', { tipo: 'COORDINADOR', motivo: 'Sin cupo de aula', nombreFestivo: null, fechaCancelacionUtc: null });
    fixture.detectChanges();

    const badge = el().querySelector('[data-testid="sesion-rechazada-badge"]') as HTMLElement;
    expect(badge.textContent).toContain('Rechazada');
    expect(badge.innerHTML).toContain('danger');
    expect(el().querySelector('[data-testid="sesion-cancelada-badge"]')).toBeNull();
    expect(el().querySelector('[data-testid="sesion-cancelada-detalle"]')?.textContent).toContain('Sin cupo de aula');
  });

  it('DEC-065 (2) una sesión aprobada o sin solicitud no pinta insignia de solicitud', () => {
    fixture.componentRef.setInput('estadoSolicitud', 'APROBADA');
    fixture.componentRef.setInput('pendienteAprobacion', false);
    fixture.detectChanges();
    expect(el().textContent?.trim()).toBe('');
  });
});
