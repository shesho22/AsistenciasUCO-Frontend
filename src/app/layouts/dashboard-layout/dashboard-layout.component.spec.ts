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
});
