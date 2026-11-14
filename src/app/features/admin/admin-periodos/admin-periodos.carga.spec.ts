import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminPeriodosComponent } from './admin-periodos.component';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { apiHttpError } from '../../../core/testing/api-error.fixture';

describe('AdminPeriodosComponent ante un fallo de carga', () => {
  it('muestra el error (no "No hay períodos académicos registrados") y reintenta', () => {
    const service = Object.assign(jasmine.createSpyObj('CoordinatorManagementService', ['getPeriodosAcademicos']), {
      periodos: signal([]).asReadonly(),
    });
    service.getPeriodosAcademicos.and.returnValue(throwError(() => apiHttpError(0, 'Sin red')));
    TestBed.configureTestingModule({
      imports: [AdminPeriodosComponent],
      providers: [
        { provide: CoordinatorManagementService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    const fixture = TestBed.createComponent(AdminPeriodosComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay períodos académicos registrados.');

    service.getPeriodosAcademicos.and.returnValue(of({ exitoso: true, datos: [] }));
    (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.getPeriodosAcademicos).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="error-carga"]')).toBeNull();
    expect(el.textContent).toContain('No hay períodos académicos registrados.');
  });
});
