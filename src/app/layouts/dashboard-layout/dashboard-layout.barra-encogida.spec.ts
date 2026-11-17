import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { DashboardLayoutComponent } from './dashboard-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';

/**
 * Pie de usuario con la barra lateral encogida (80 px). Con el relleno amplio (p-4) la tarjeta quedaba en 47 px, más
 * angosta que el avatar de 40 px con su enlace, y el avatar se salía del borde.
 */
describe('DashboardLayoutComponent pie de usuario con la barra encogida', () => {
  let original!: unknown;
  let fixture: ComponentFixture<DashboardLayoutComponent>;

  beforeEach(() => {
    original = (window as unknown as { env?: unknown }).env;
    (window as unknown as { env: Record<string, string> }).env = { SECURITY_PROVIDER: 'legacy' };
    const user = signal({ id: 'u', name: 'Gabriel Esteban Vélez Uribe', email: 'u@uco.edu.co', role: 'ADMINISTRADOR' as const });
    TestBed.configureTestingModule({
      imports: [DashboardLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: jasmine.createSpyObj('AuthService', ['logout'], {
            currentUser: user.asReadonly(),
            cerrandoSesion: signal(false).asReadonly(),
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
    fixture = TestBed.createComponent(DashboardLayoutComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    (window as unknown as { env?: unknown }).env = original;
  });

  const pie = () => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="pie-usuario"]') as HTMLElement;
  const perfil = () => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="pie-usuario-perfil"]') as HTMLElement;

  it('extendida usa el relleno amplio, sin centrar, con nombre y botón de cierre de sesión', () => {
    expect(pie().classList.contains('p-4')).toBeTrue();
    expect(pie().classList.contains('p-2')).toBeFalse();
    expect(perfil().classList.contains('justify-center')).toBeFalse();
    expect(pie().textContent).toContain('Gabriel Esteban Vélez Uribe');
    expect(pie().querySelector('button[aria-label="Cerrar sesión"]')).not.toBeNull();
  });

  it('encogida reduce el relleno y centra el avatar para que quepa en la barra de 80 px', () => {
    fixture.componentInstance.toggleCollapsed();
    fixture.detectChanges();

    expect(pie().classList.contains('p-2')).toBeTrue();
    expect(pie().classList.contains('p-4')).toBeFalse();
    expect(perfil().classList.contains('justify-center')).toBeTrue();
    expect(perfil().querySelector('app-avatar')).not.toBeNull();
    expect(pie().textContent).not.toContain('Gabriel Esteban Vélez Uribe');
  });

  it('al volver a extenderla recupera el relleno amplio', () => {
    fixture.componentInstance.toggleCollapsed();
    fixture.componentInstance.toggleCollapsed();
    fixture.detectChanges();

    expect(pie().classList.contains('p-4')).toBeTrue();
    expect(perfil().classList.contains('justify-center')).toBeFalse();
  });
});
