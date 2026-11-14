import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DeanCronogramaComponent } from './dean-cronograma.component';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { apiHttpError } from '../../../core/testing/api-error.fixture';
import { paginaApi } from '../../../core/testing/pagina-api';

describe('DeanCronogramaComponent ante un fallo de carga', () => {
  it('no afirma "No hay sesiones programadas" cuando la consulta falla y permite reintentar', () => {
    const service = jasmine.createSpyObj('DeanFacultadService', ['getSesiones']);
    service.getSesiones.and.returnValue(throwError(() => apiHttpError(500, 'Fallo interno')));
    TestBed.configureTestingModule({
      imports: [DeanCronogramaComponent],
      providers: [
        { provide: DeanFacultadService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    const fixture = TestBed.createComponent(DeanCronogramaComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay sesiones programadas en el rango seleccionado.');

    service.getSesiones.and.returnValue(of(paginaApi([])));
    (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.getSesiones).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="error-carga"]')).toBeNull();
    expect(el.textContent).toContain('No hay sesiones programadas en el rango seleccionado.');
  });
});
