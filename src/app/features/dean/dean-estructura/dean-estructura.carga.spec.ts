import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DeanEstructuraComponent } from './dean-estructura.component';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { apiHttpError } from '../../../core/testing/api-error.fixture';

describe('DeanEstructuraComponent ante un fallo de carga', () => {
  it('no afirma "No hay una facultad asociada" cuando la consulta falla y permite reintentar', () => {
    const service = jasmine.createSpyObj('DeanFacultadService', ['getEstructura']);
    service.getEstructura.and.returnValue(throwError(() => apiHttpError(503, 'No disponible')));
    TestBed.configureTestingModule({
      imports: [DeanEstructuraComponent],
      providers: [
        provideRouter([]),
        { provide: DeanFacultadService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    const fixture = TestBed.createComponent(DeanEstructuraComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay una facultad asociada a tu usuario.');

    service.getEstructura.and.returnValue(of({ exitoso: true, datos: [] }));
    (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.getEstructura).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="error-carga"]')).toBeNull();
    expect(el.textContent).toContain('No hay una facultad asociada a tu usuario.');
  });
});
