import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminInstitucionesComponent } from './admin-instituciones.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { apiHttpError } from '../../../core/testing/api-error.fixture';

describe('AdminInstitucionesComponent ante un fallo de carga', () => {
  it('muestra el error (no "No hay instituciones") y reintenta', () => {
    const service = jasmine.createSpyObj('AdminManagementService', ['getInstituciones']);
    service.getInstituciones.and.returnValue(throwError(() => apiHttpError(500, 'Fallo interno')));
    TestBed.configureTestingModule({
      imports: [AdminInstitucionesComponent],
      providers: [
        { provide: AdminManagementService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    const fixture = TestBed.createComponent(AdminInstitucionesComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay instituciones registradas');

    service.getInstituciones.and.returnValue(of({ exitoso: true, datos: [{ id: 'i-1', codigo: 'UCO', nombre: 'Universidad' }] }));
    (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.getInstituciones).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="error-carga"]')).toBeNull();
    expect(el.textContent).toContain('Universidad');
  });
});
