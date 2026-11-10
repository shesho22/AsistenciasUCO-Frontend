import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { UserRole } from '../../core/models/user.model';

describe('DashboardLayoutComponent', () => {
  let fixture: ComponentFixture<DashboardLayoutComponent>;
  let component: DashboardLayoutComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    const mockUserSignal = signal({
      id: 'usr-1',
      name: 'Dr. Roberto Gómez',
      email: 'rgomez@uco.edu.co',
      role: 'DOCENTE' as UserRole,
    });

    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'loginAsMockUser'], {
      currentUser: mockUserSignal.asReadonly(),
      isMockMode: signal(false).asReadonly(),
    });
    authServiceSpy.logout.and.returnValue(Promise.resolve());

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['dismiss'], {
      currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(),
    });

    await TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('el pie del menu muestra el nombre completo de la persona y su rol debajo, no el usuario tecnico', () => {
    const tarjeta = (fixture.nativeElement as HTMLElement).querySelector('a[href="/app/perfil"]') as HTMLElement;
    const nombre = tarjeta.querySelector('p') as HTMLElement;
    expect(nombre.textContent?.trim()).toBe('Dr. Roberto Gómez');
    expect(tarjeta.textContent).toContain('DOCENTE');
    expect(tarjeta.textContent).not.toMatch(/uco-/);
  });

  it('toggleMobileMenu alterna el estado del menú móvil', () => {
    expect(component.isMobileMenuOpen()).toBeFalse();
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen()).toBeTrue();
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen()).toBeFalse();
  });

  it('logout llama al método de authService', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('getRoleBadgeVariant retorna variantes de color coherentes con el rol', () => {
    expect(component.getRoleBadgeVariant('ADMINISTRADOR')).toBe('danger');
    expect(component.getRoleBadgeVariant('DECANO')).toBe('warning');
    expect(component.getRoleBadgeVariant('COORDINADOR')).toBe('info');
    expect(component.getRoleBadgeVariant('DOCENTE')).toBe('success');
    expect(component.getRoleBadgeVariant('ESTUDIANTE')).toBe('neutral');
  });

  it('filteredNavItems incluye únicamente rutas permitidas para el rol activo', () => {
    const items = component.filteredNavItems();
    expect(items.length).toBeGreaterThan(0);
    // Para un docente, debe incluir grupos y reclamos
    expect(items.some((item) => item.label.includes('Grupos'))).toBeTrue();
  });

  it('F-DOC-008: el menu del docente ofrece Tomar Asistencia y Reclamos ademas de Mis Grupos y Mis Horarios', () => {
    const rutas = component.filteredNavItems().map((i) => i.route);
    expect(rutas).toContain('/app/asistencia');
    expect(rutas).toContain('/app/docente/reclamos');
    expect(rutas).toContain('/app/docente/grupos');
    expect(rutas).toContain('/app/docente/horarios');
  });
});

describe('DashboardLayoutComponent (ESTUDIANTE, CULM-001 A.1)', () => {
  it('F-RED-03 el menú del estudiante ya no ofrece Solicitudes de Ingreso y la oferta de grupos vive dentro de Mis Materias', async () => {
    const user = signal({ id: 'usr-2', name: 'Est Uno', email: 'est@uco.edu.co', role: 'ESTUDIANTE' as UserRole });
    const auth = jasmine.createSpyObj('AuthService', ['logout', 'loginAsMockUser'], {
      currentUser: user.asReadonly(),
      isMockMode: signal(false).asReadonly(),
    });
    const toast = jasmine.createSpyObj('ToastService', ['dismiss'], {
      currentToast: signal({ visible: false, message: '', type: 'info' as const }).asReadonly(),
    });
    await TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: ToastService, useValue: toast }],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardLayoutComponent);
    fixture.detectChanges();

    const items = fixture.componentInstance.filteredNavItems();
    expect(items.some((i) => i.route === '/app/estudiante/solicitudes')).toBeFalse();
    expect(items.some((i) => i.label.includes('Solicitudes de Ingreso'))).toBeFalse();
    // CULM-001 UX: la oferta de grupos pasa a ser una pestaña de Mis Materias (/app/estudiante/mis-materias/oferta).
    expect(items.some((i) => i.label === 'Oferta de Grupos')).toBeFalse();
    expect(items.some((i) => i.route === '/app/estudiante/mis-materias')).toBeTrue();
  });
});
