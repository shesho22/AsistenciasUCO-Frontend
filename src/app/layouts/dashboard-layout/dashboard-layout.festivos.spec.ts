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

  const SUELTAS = [
    '/app/admin/instituciones', '/app/admin/catalogos', '/app/admin/estados', '/app/admin/festivos',
    '/app/admin/areas', '/app/admin/correos',
  ];

  it('el administrador ve una sola entrada "Configuración" hacia /app/admin/configuracion', () => {
    const items = crear('ADMINISTRADOR').filteredNavItems();
    const cfg = items.filter((i) => i.route === '/app/admin/configuracion');
    expect(cfg.length).toBe(1);
    expect(cfg[0].label).toBe('Configuración');
  });

  it('las entradas sueltas de variables y pre-registros ya no aparecen en el menu del administrador', () => {
    const rutas = crear('ADMINISTRADOR').filteredNavItems().map((i) => i.route);
    for (const suelta of SUELTAS) {
      expect(rutas).not.toContain(suelta);
    }
    expect(rutas).toContain('/app/admin/sistema');
  });

  it('los demás roles no ven la opción de configuración', () => {
    for (const role of ['DOCENTE', 'ESTUDIANTE', 'COORDINADOR', 'DECANO'] as UserRole[]) {
      TestBed.resetTestingModule();
      expect(crear(role).filteredNavItems().some((i) => i.route === '/app/admin/configuracion')).toBeFalse();
    }
  });
});
