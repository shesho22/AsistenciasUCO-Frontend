import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AdminSystemComponent } from './admin-system.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { HttpTestingController } from '@angular/common/http/testing';
import { ParametroAdminDto } from '../../../core/models/role-management.model';
import { environment } from '../../../../environments/environment';

describe('AdminSystemComponent', () => {
  let fixture: ComponentFixture<AdminSystemComponent>;
  let component: AdminSystemComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminManagementService>;
  let coordServiceSpy: jasmine.SpyObj<CoordinatorManagementService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockParametros: ParametroAdminDto[] = [
    {
      id: 'param-1',
      grupo: 'ASISTENCIA',
      clave: 'asistencias.limite.inasistencia',
      valor: '20',
      tipoDato: 'NUMERO',
      valorDefecto: '0',
      estaActivo: true,
    },
  ];

  beforeEach(async () => {
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    adminServiceSpy = jasmine.createSpyObj(
      'AdminManagementService',
      ['cargarParametros', 'ejecutarCierreMasivo'],
      {
        parametros: signal(mockParametros).asReadonly(),
        reportesCierre: signal([]).asReadonly(),
      }
    );
    adminServiceSpy.cargarParametros.and.returnValue(of({ exitoso: true, datos: mockParametros }));

    coordServiceSpy = jasmine.createSpyObj('CoordinatorManagementService', ['cargarPeriodosAcademicosBase'], {
      periodos: signal([
        {
          id: 'per-1',
          codigo: '2026-2',
          nombre: 'Segundo Semestre 2026',
          fechaInicio: '2026-08-01',
          fechaFin: '2026-12-15',
          estado: 'ACTIVO' as const,
        },
      ]).asReadonly(),
    });

    await TestBed.configureTestingModule({
      imports: [AdminSystemComponent],
      providers: [
        provideRouter([]),
        { provide: AdminManagementService, useValue: adminServiceSpy },
        { provide: CoordinatorManagementService, useValue: coordServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar los parámetros', () => {
    expect(component).toBeTruthy();
    expect(coordServiceSpy.cargarPeriodosAcademicosBase).toHaveBeenCalled();
    expect(adminServiceSpy.cargarParametros).toHaveBeenCalled();
    expect(component.parametros().length).toBe(1);
  });

  it('tabActiva alterna correctamente entre pestañas', () => {
    expect(component.tabActiva()).toBe('PARAMETROS');
    component.tabActiva.set('AUDITORIA');
    expect(component.tabActiva()).toBe('AUDITORIA');
    component.tabActiva.set('CIERRE_MASIVO');
    expect(component.tabActiva()).toBe('CIERRE_MASIVO');
  });

  it('HU172: la pestaña de auditoría consulta el rastro real paginado del backend', () => {
    const http = TestBed.inject(HttpTestingController);
    component.tabActiva.set('AUDITORIA');
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/admin/auditoria`);
    expect(req.request.params.get('soloAsistencia')).toBe('true');
    expect(req.request.params.get('desde')).toBeTruthy();
    req.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay eventos de auditoría');
  });

  it('muestra el parámetro real en modo consulta y no ofrece una acción de guardado', () => {
    const host = fixture.nativeElement as HTMLElement;
    const card = host.querySelector('.bg-warm-50') as HTMLElement;
    const valueInput = card.querySelector('input') as HTMLInputElement;

    expect(host.textContent).toContain('Edición de parámetros no disponible');
    expect(host.textContent).toContain('ASISTENCIA');
    expect(host.textContent).toContain('NUMERO');
    expect(valueInput.value).toBe('20');
    expect(valueInput.readOnly).toBeTrue();
    expect(card.querySelectorAll('button').length).toBe(0);
    expect(toastServiceSpy.success).not.toHaveBeenCalled();
  });
});
