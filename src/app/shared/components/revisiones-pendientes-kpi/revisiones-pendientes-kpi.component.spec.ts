import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RevisionesPendientesKpiComponent } from './revisiones-pendientes-kpi.component';
import { RevisionCancelacionService } from '../../../core/services/revision-cancelacion.service';
import { environment } from '../../../../environments/environment';
import { apiHttpError } from '../../../core/testing/api-error.fixture';

describe('RevisionesPendientesKpiComponent', () => {
  let servicio: jasmine.SpyObj<RevisionCancelacionService>;

  function crear(rol: 'DOCENTE' | 'COORDINADOR') {
    TestBed.configureTestingModule({
      imports: [RevisionesPendientesKpiComponent],
      providers: [provideRouter([]), { provide: RevisionCancelacionService, useValue: servicio }],
    });
    const fixture = TestBed.createComponent(RevisionesPendientesKpiComponent);
    fixture.componentRef.setInput('rol', rol);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    servicio = jasmine.createSpyObj('RevisionCancelacionService', ['contarPendientes']);
  });

  afterEach(() => {
    (environment.features as { cancelacionInasistenciaEnabled: boolean }).cancelacionInasistenciaEnabled = true;
  });

  it('docente: muestra el conteo global y enlaza a sus grupos', () => {
    servicio.contarPendientes.and.returnValue(of(3));
    const fixture = crear('DOCENTE');
    const el = fixture.nativeElement as HTMLElement;
    expect(servicio.contarPendientes).toHaveBeenCalledWith('DOCENTE');
    expect(el.querySelector('[data-testid="kpi-etiqueta"]')?.textContent).toContain('Revisiones pendientes de decisión');
    expect(el.querySelector('[data-testid="kpi-valor"]')?.textContent).toContain('3');
    expect(el.querySelector('[data-testid="revisiones-pendientes-enlace"]')?.getAttribute('href')).toBe('/app/docente/grupos');
  });

  it('coordinador: etiqueta "Revisiones por resolver" y enlace a sus revisiones', () => {
    servicio.contarPendientes.and.returnValue(of(0));
    const fixture = crear('COORDINADOR');
    const el = fixture.nativeElement as HTMLElement;
    expect(servicio.contarPendientes).toHaveBeenCalledWith('COORDINADOR');
    expect(el.querySelector('[data-testid="kpi-etiqueta"]')?.textContent).toContain('Revisiones por resolver');
    expect(el.querySelector('[data-testid="kpi-valor"]')?.textContent).toContain('0');
    expect(el.querySelector('[data-testid="revisiones-pendientes-enlace"]')?.getAttribute('href')).toBe('/app/coordinador/revisiones-cancelacion');
  });

  it('si el conteo falla (500) muestra "Sin datos" y conserva el enlace', () => {
    servicio.contarPendientes.and.returnValue(throwError(() => apiHttpError(500, 'Error')));
    const fixture = crear('DOCENTE');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="kpi-valor"]')?.textContent).toContain('Sin datos');
    expect(el.querySelector('[data-testid="revisiones-pendientes-enlace"]')).toBeTruthy();
  });

  it('con la funcionalidad apagada no consulta ni pinta nada', () => {
    (environment.features as { cancelacionInasistenciaEnabled: boolean }).cancelacionInasistenciaEnabled = false;
    const fixture = crear('DOCENTE');
    expect(servicio.contarPendientes).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="revisiones-pendientes-kpi"]')).toBeNull();
  });
});
