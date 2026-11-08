import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { AlertaInasistenciaService } from '../../core/services/alerta-inasistencia.service';
import { RevisionCancelacionService } from '../../core/services/revision-cancelacion.service';
import { UserRole } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

describe('DashboardLayoutComponent - Cancelación por Inasistencia C.1 (C-F-58..C-F-59)', () => {
  let fixture: ComponentFixture<DashboardLayoutComponent>;
  let component: DashboardLayoutComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let alertaServiceSpy: jasmine.SpyObj<AlertaInasistenciaService>;
  let revisionServiceSpy: jasmine.SpyObj<RevisionCancelacionService>;
  let mockUserSignal: ReturnType<typeof signal>;

  function setup(role: UserRole, cancelacionEnabled: boolean): void {
    (environment.features as any).cancelacionInasistenciaEnabled = cancelacionEnabled;

    mockUserSignal = signal({
      id: 'usr-test',
      name: 'Usuario Prueba',
      email: 'test@uco.edu.co',
      role,
    });

    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'loginAsMockUser'], {
      currentUser: mockUserSignal.asReadonly(),
      isMockMode: signal(false).asReadonly(),
    });
    authServiceSpy.logout.and.returnValue(Promise.resolve());

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['dismiss'], {
      currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(),
    });

    alertaServiceSpy = jasmine.createSpyObj('AlertaInasistenciaService', ['contarVigentes', 'contarNoLeidas']);
    alertaServiceSpy.contarVigentes.and.returnValue(of(3));
    alertaServiceSpy.contarNoLeidas.and.returnValue(of(2));

    revisionServiceSpy = jasmine.createSpyObj('RevisionCancelacionService', ['contarPendientes']);
    revisionServiceSpy.contarPendientes.and.returnValue(of(5));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: AlertaInasistenciaService, useValue: alertaServiceSpy },
        { provide: RevisionCancelacionService, useValue: revisionServiceSpy },
      ],
    });

    fixture = TestBed.createComponent(DashboardLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    (environment.features as any).cancelacionInasistenciaEnabled = true;
  });

  it('C-F-58: con cancelacionInasistenciaEnabled=true, muestra opciones correspondientes y consulta contadores', () => {
    // 1. Estudiante
    setup('ESTUDIANTE', true);
    let items = component.filteredNavItems();
    const alertaItem = items.find((i) => i.route === '/app/estudiante/alertas');
    expect(alertaItem).toBeDefined();
    expect(alertaItem?.label).toBe('Mis Alertas');
    expect(alertaServiceSpy.contarVigentes).toHaveBeenCalled();

    // 2. Coordinador
    setup('COORDINADOR', true);
    items = component.filteredNavItems();
    const coordItem = items.find((i) => i.route === '/app/coordinador/revisiones-cancelacion');
    expect(coordItem).toBeDefined();
    expect(coordItem?.label).toBe('Revisiones de Cancelación');
    expect(revisionServiceSpy.contarPendientes).toHaveBeenCalledWith('COORDINADOR');

    // 3. Decano
    setup('DECANO', true);
    items = component.filteredNavItems();
    const decanoItem = items.find((i) => i.route === '/app/decano/revisiones-cancelacion');
    expect(decanoItem).toBeDefined();
    expect(decanoItem?.label).toBe('Revisiones de Cancelación');
    expect(revisionServiceSpy.contarPendientes).toHaveBeenCalledWith('DECANO');
  });

  it('C-F-59: con cancelacionInasistenciaEnabled=false, no muestra opciones ni consulta contadores', () => {
    setup('ESTUDIANTE', false);
    let items = component.filteredNavItems();
    expect(items.find((i) => i.route === '/app/estudiante/alertas')).toBeUndefined();
    expect(alertaServiceSpy.contarVigentes).not.toHaveBeenCalled();

    setup('COORDINADOR', false);
    items = component.filteredNavItems();
    expect(items.find((i) => i.route === '/app/coordinador/revisiones-cancelacion')).toBeUndefined();
    expect(revisionServiceSpy.contarPendientes).not.toHaveBeenCalled();

    setup('DECANO', false);
    items = component.filteredNavItems();
    expect(items.find((i) => i.route === '/app/decano/revisiones-cancelacion')).toBeUndefined();
    expect(revisionServiceSpy.contarPendientes).not.toHaveBeenCalled();
  });
});
