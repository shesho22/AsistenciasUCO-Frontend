import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { AdminSystemComponent } from './admin-system.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';

describe('AdminSystemComponent - Cierre Masivo RCN_012 (C-F-57)', () => {
  let fixture: ComponentFixture<AdminSystemComponent>;
  let component: AdminSystemComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminManagementService>;
  let coordServiceSpy: jasmine.SpyObj<CoordinatorManagementService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    toastSpy = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info', 'warning']);

    adminServiceSpy = jasmine.createSpyObj<AdminManagementService>(
      'AdminManagementService',
      ['cargarParametros', 'ejecutarCierreMasivo'],
      {
        parametros: signal([]).asReadonly(),
        reportesCierre: signal([]).asReadonly(),
      }
    );
    adminServiceSpy.cargarParametros.and.returnValue(of({ exitoso: true, datos: [] }));

    coordServiceSpy = jasmine.createSpyObj<CoordinatorManagementService>(
      'CoordinatorManagementService',
      ['cargarPeriodosAcademicosBase'],
      {
        periodos: signal([
          {
            id: 'per-2026-2',
            codigo: '2026-2',
            nombre: '2026-2',
            fechaInicio: '2026-08-01',
            fechaFin: '2026-12-15',
            estado: 'ACTIVO' as const,
          },
        ]).asReadonly(),
      }
    );

    await TestBed.configureTestingModule({
      imports: [AdminSystemComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminManagementService, useValue: adminServiceSpy },
        { provide: CoordinatorManagementService, useValue: coordServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('C-F-57: cuando el backend responde 409 con RCN_012 (revisiones pendientes), muestra mensaje y desactiva procesando', () => {
    const errorMsg = 'No es posible ejecutar el cierre masivo porque existen revisiones de cancelación pendientes para el período.';
    const httpError = new HttpErrorResponse({
      status: 409,
      statusText: 'Conflict',
      error: {
        idResultado: 0,
        exitoso: false,
        codigoError: 'RCN_012',
        mensajeUsuario: errorMsg,
        mensajeTecnico: 'Hay 3 revisiones pendientes',
      },
    });

    adminServiceSpy.ejecutarCierreMasivo.and.returnValue(throwError(() => httpError));

    component.periodoSeleccionadoCierre = '2026-2';
    component.confirmarCierre();

    expect(component.isProcesandoCierre()).toBeFalse();
    expect(toastSpy.error).toHaveBeenCalledWith(errorMsg);
  });
});
