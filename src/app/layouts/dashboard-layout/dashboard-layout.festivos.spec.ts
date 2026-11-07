import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { UserRole } from '../../core/models/user.model';

describe('DashboardLayoutComponent menú de festivos (CULM-001 B.1)', () => {
  function crear(role: UserRole): DashboardLayoutComponent {
    const user = signal({ id: 'u', name: 'Usuario', email: 'u@uco.edu.co', role });
    TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: jasmine.createSpyObj('AuthService', ['logout'], {
            currentUser: user.asReadonly(),
            isMockMode: signal(false).asReadonly(),
          }),
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['dismiss'], {
            currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(),
          }),
        },
      ],
    });
    const fixture = TestBed.createComponent(DashboardLayoutComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('B1-F-40 el administrador ve "Festivos" en el menú lateral hacia /app/admin/festivos', () => {
    const item = crear('ADMINISTRADOR').filteredNavItems().find((i) => i.route === '/app/admin/festivos');
    expect(item?.label).toBe('Festivos');
  });

  it('B1-F-40 los demás roles no ven la opción', () => {
    for (const role of ['DOCENTE', 'ESTUDIANTE', 'COORDINADOR', 'DECANO'] as UserRole[]) {
      TestBed.resetTestingModule();
      expect(crear(role).filteredNavItems().some((i) => i.route === '/app/admin/festivos')).toBeFalse();
    }
  });
});
