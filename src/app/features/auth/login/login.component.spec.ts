import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let securityConfigError: ReturnType<typeof signal<string | null>>;
  let authError: ReturnType<typeof signal<string | null>>;
  let baselineMode: boolean;

  const mockUser: User = {
    id: 'usr-1',
    name: 'Docente UCO',
    email: 'docente@uco.edu.co',
    role: 'DOCENTE',
    institutionName: 'Universidad Católica de Oriente',
    status: 'active',
  };

  async function createComponent(): Promise<void> {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'loginWithCredentials',
      'isBaselineMode',
      'startBaselineLogin',
    ]);
    authServiceSpy.isBaselineMode.and.returnValue(baselineMode);
    Object.assign(authServiceSpy, { securityConfigError, authError });

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    securityConfigError = signal<string | null>(null);
    authError = signal<string | null>(null);
    baselineMode = false;
    await createComponent();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('toggleShowPassword alterna la visibilidad de la contraseña', () => {
    expect(component.showPassword()).toBeFalse();
    component.toggleShowPassword();
    expect(component.showPassword()).toBeTrue();
    component.toggleShowPassword();
    expect(component.showPassword()).toBeFalse();
  });

  it('onSubmit valida campos vacíos', async () => {
    component.username = '';
    component.password = '';
    await component.onSubmit();

    expect(component.errorMessage()).toContain('obligatorios');
    expect(authServiceSpy.loginWithCredentials).not.toHaveBeenCalled();
  });

  it('onSubmit valida formato de correo institucional', async () => {
    component.username = 'correo-invalido';
    component.password = 'password123';
    await component.onSubmit();

    expect(component.errorMessage()).toContain('formato de correo válido');
    expect(authServiceSpy.loginWithCredentials).not.toHaveBeenCalled();
  });

  it('onSubmit ejecuta loginWithCredentials con credenciales válidas', async () => {
    authServiceSpy.loginWithCredentials.and.returnValue(Promise.resolve(mockUser));
    component.username = 'docente@uco.edu.co';
    component.password = 'Temporal2026*';

    await component.onSubmit();

    expect(authServiceSpy.loginWithCredentials).toHaveBeenCalledWith('docente@uco.edu.co', 'Temporal2026*');
    expect(component.errorMessage()).toBe('');
  });

  it('onSubmit maneja errores de autenticación', async () => {
    authServiceSpy.loginWithCredentials.and.returnValue(Promise.reject(new Error('Credenciales inválidas')));
    component.username = 'docente@uco.edu.co';
    component.password = 'ClaveErronea';

    await component.onSubmit();

    expect(component.errorMessage()).toContain('Credenciales inválidas');
  });

  describe('modo baseline', () => {
    it('delega en el login institucional sin pedir ni enviar credenciales', async () => {
      TestBed.resetTestingModule();
      baselineMode = true;
      await createComponent();

      expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeNull();
      await component.onSubmit();

      expect(authServiceSpy.startBaselineLogin).toHaveBeenCalledTimes(1);
      expect(authServiceSpy.loginWithCredentials).not.toHaveBeenCalled();
    });

    it('muestra el error de conectividad y permite reintentar el login institucional', async () => {
      TestBed.resetTestingModule();
      baselineMode = true;
      authError.set('No se pudo establecer conexión con el servidor de autenticación institucional.');
      await createComponent();

      expect(fixture.nativeElement.textContent).toContain('No se pudo establecer conexión');
      expect(fixture.nativeElement.textContent).toContain('Reintentar inicio de sesión institucional');
      expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeNull();

      await component.onSubmit();

      expect(authServiceSpy.startBaselineLogin).toHaveBeenCalledTimes(1);
      expect(authServiceSpy.loginWithCredentials).not.toHaveBeenCalled();
    });

    it('muestra el error de autenticación del proveedor (p. ej. cuenta sin rol)', async () => {
      TestBed.resetTestingModule();
      baselineMode = true;
      authError.set('Tu cuenta institucional no tiene un rol válido.');
      await createComponent();

      expect(fixture.nativeElement.textContent).toContain('no tiene un rol válido');
    });
  });

  describe('SECURITY_PROVIDER inválido', () => {
    it('no ofrece ningún formulario de acceso y no inicia sesión', async () => {
      TestBed.resetTestingModule();
      securityConfigError.set('Configuración de seguridad inválida: SECURITY_PROVIDER debe ser "legacy" o "baseline".');
      await createComponent();
      component.username = 'docente@uco.edu.co';
      component.password = 'Temporal2026*';

      await component.onSubmit();

      expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('SECURITY_PROVIDER');
      expect(authServiceSpy.loginWithCredentials).not.toHaveBeenCalled();
      expect(authServiceSpy.startBaselineLogin).not.toHaveBeenCalled();
    });
  });
});
