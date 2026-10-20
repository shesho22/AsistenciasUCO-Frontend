import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockUser: User = {
    id: 'usr-1',
    name: 'Docente UCO',
    email: 'docente@uco.edu.co',
    role: 'DOCENTE',
    institutionName: 'Universidad Católica de Oriente',
    status: 'active',
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['loginWithCredentials']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
});
