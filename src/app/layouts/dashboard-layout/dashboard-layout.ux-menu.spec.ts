import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ComponentesExternosService } from '../../core/services/componentes-externos.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { UserRole } from '../../core/models/user.model';

describe('DashboardLayoutComponent menu simplificado (CULM-001 UX)', () => {
  let original: unknown;

  beforeEach(() => {
    original = (window as unknown as { env?: unknown }).env;
  });

  afterEach(() => {
    (window as unknown as { env?: unknown }).env = original;
  });

  function crear(role: UserRole, provider: 'baseline' | 'legacy' = 'legacy'): DashboardLayoutComponent {
    (window as unknown as { env: Record<string, string> }).env = { SECURITY_PROVIDER: provider };
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

  const etiquetas = (c: DashboardLayoutComponent): string[] => c.filteredNavItems().map((i) => i.label);
  const rutas = (c: DashboardLayoutComponent): string[] => c.filteredNavItems().map((i) => i.route);

  it('administrador sin componentes externos: Personas, Estructura, Configuracion, Sistema e Indicadores', () => {
    const c = crear('ADMINISTRADOR', 'legacy');
    expect(rutas(c)).toEqual([
      '/app/dashboard',
      '/app/admin/personas',
      '/app/admin/estructura',
      '/app/admin/configuracion',
      '/app/admin/sistema',
      '/app/admin/indicadores',
    ]);
    expect(etiquetas(c)).toContain('Personas');
    expect(etiquetas(c)).toContain('Estructura');
  });

  it('administrador con el proveedor baseline ve ademas Seguridad y Mensajes', () => {
    const c = crear('ADMINISTRADOR', 'baseline');
    expect(rutas(c)).toContain('/app/admin/seguridad');
    expect(rutas(c)).toContain('/app/admin/mensajes');
  });

  it('si el componente externo informa que no responde, su entrada desaparece del menu sin afectar la otra', () => {
    const c = crear('ADMINISTRADOR', 'baseline');
    const externos = TestBed.inject(ComponentesExternosService);
    externos.marcarNoDisponible('seguridad');
    expect(rutas(c)).not.toContain('/app/admin/seguridad');
    expect(rutas(c)).toContain('/app/admin/mensajes');
    externos.marcarNoDisponible('mensajes');
    expect(rutas(c)).not.toContain('/app/admin/mensajes');
    externos.marcarDisponible('seguridad');
    expect(rutas(c)).toContain('/app/admin/seguridad');
  });

  it('las entradas antiguas del administrador ya no estan en el menu', () => {
    const r = rutas(crear('ADMINISTRADOR', 'baseline'));
    for (const antigua of [
      '/app/admin/facultades', '/app/admin/decanos', '/app/admin/docentes', '/app/admin/estudiantes',
      '/app/admin/asignaturas', '/app/admin/periodos',
    ]) {
      expect(r).not.toContain(antigua);
    }
  });

  it('estudiante: Mis materias unifica materias, horarios y oferta; se mantienen alertas y reclamos', () => {
    const c = crear('ESTUDIANTE');
    const r = rutas(c);
    expect(r).toContain('/app/estudiante/mis-materias');
    expect(r).toContain('/app/estudiante/reclamos');
    expect(r).toContain('/app/estudiante/alertas');
    for (const antigua of ['/app/estudiante/materias', '/app/estudiante/horarios', '/app/estudiante/oferta']) {
      expect(r).not.toContain(antigua);
    }
    expect(etiquetas(c)).toContain('Mis Materias');
  });

  it('los demas roles no ven Seguridad ni Mensajes aunque el proveedor sea baseline', () => {
    for (const role of ['DOCENTE', 'ESTUDIANTE', 'COORDINADOR', 'DECANO'] as UserRole[]) {
      TestBed.resetTestingModule();
      const r = rutas(crear(role, 'baseline'));
      expect(r).not.toContain('/app/admin/seguridad');
      expect(r).not.toContain('/app/admin/mensajes');
    }
  });
});
