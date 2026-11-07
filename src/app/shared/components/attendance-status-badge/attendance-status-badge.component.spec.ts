import { TestBed } from '@angular/core/testing';
import { AttendanceStatusBadgeComponent } from './attendance-status-badge.component';
import { CodigoPermanencia } from '../../../core/models/indicadores-asistencia.model';

describe('AttendanceStatusBadgeComponent (CULM-001 B.2, F-EST-009)', () => {
  function render(codigo: CodigoPermanencia | null) {
    const fixture = TestBed.configureTestingModule({ imports: [AttendanceStatusBadgeComponent] }).createComponent(
      AttendanceStatusBadgeComponent
    );
    fixture.componentRef.setInput('codigoPermanencia', codigo);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('[data-testid="semaforo-asistencia"]') as HTMLElement | null;
  }

  it('B2-F-19 REGULAR usa los tokens attendance-present', () => {
    const el = render('REGULAR')!;
    expect(el.textContent).toContain('Regular');
    expect(el.className).toContain('attendance-present');
  });

  it('B2-F-19 RIESGO usa los tokens attendance-risk', () => {
    const el = render('RIESGO')!;
    expect(el.textContent).toContain('En riesgo');
    expect(el.className).toContain('attendance-risk');
  });

  it('B2-F-19 PERDIDA usa los tokens attendance-absent', () => {
    const el = render('PERDIDA')!;
    expect(el.textContent).toContain('Pérdida');
    expect(el.className).toContain('attendance-absent');
  });

  it('B2-F-19 sin codigo del backend no pinta semaforo', () => {
    expect(render(null)).toBeNull();
  });
});
