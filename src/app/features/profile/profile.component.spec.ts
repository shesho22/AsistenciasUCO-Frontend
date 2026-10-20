import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { User, UserRole } from '../../core/models/user.model';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let locationSpy: jasmine.SpyObj<Location>;

  const mockUser: User = {
    id: 'usr-1',
    name: 'Roberto Gómez',
    email: 'rgomez@uco.edu.co',
    role: 'DOCENTE',
    primerNombre: 'Roberto',
    segundoNombre: '',
    primerApellido: 'Gómez',
    segundoApellido: '',
    institutionName: 'Universidad Católica de Oriente',
    status: 'active',
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['fetchProfileFromBackend', 'updateUserProfile'], {
      currentUser: signal(mockUser).asReadonly(),
      isMockMode: signal(true).asReadonly(),
    });
    authServiceSpy.fetchProfileFromBackend.and.returnValue(Promise.resolve(mockUser));
    authServiceSpy.updateUserProfile.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Ok', datos: mockUser })
    );

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show', 'success', 'error', 'info', 'warning']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    locationSpy = jasmine.createSpyObj('Location', ['back']);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar formulario con los datos del usuario', () => {
    expect(component).toBeTruthy();
    expect(component.formModel.primerNombre).toBe('Roberto');
    expect(component.formModel.primerApellido).toBe('Gómez');
  });

  it('computedFullName calcula el nombre completo correctamente', () => {
    expect(component.computedFullName()).toBe('Roberto Gómez');
  });

  it('enableEditing activa el modo edición cuando canEditProfile es true', () => {
    component.enableEditing();
    expect(component.isEditing()).toBeTrue();
  });

  it('cancelEditing restablece formulario y apaga modo edición', () => {
    component.enableEditing();
    component.formModel.primerNombre = 'Modificado';
    component.cancelEditing();

    expect(component.isEditing()).toBeFalse();
    expect(component.formModel.primerNombre).toBe('Roberto');
  });

  it('saveProfile valida campos obligatorios y envía actualización', () => {
    component.enableEditing();
    component.formModel.primerNombre = 'Roberto';
    component.formModel.primerApellido = 'Gómez';

    component.saveProfile();

    expect(authServiceSpy.updateUserProfile).toHaveBeenCalled();
    expect(toastServiceSpy.show).toHaveBeenCalledWith('¡Perfil actualizado con éxito!', 'success');
    expect(component.isEditing()).toBeFalse();
  });

  it('saveProfile advierte si falta primerNombre o primerApellido', () => {
    component.enableEditing();
    component.formModel.primerNombre = '   ';
    component.saveProfile();
    expect(toastServiceSpy.show).toHaveBeenCalledWith('El campo Primer Nombre es obligatorio.', 'warning');

    component.formModel.primerNombre = 'Roberto';
    component.formModel.primerApellido = '   ';
    component.saveProfile();
    expect(toastServiceSpy.show).toHaveBeenCalledWith('El campo Primer Apellido es obligatorio.', 'warning');
  });

  it('saveProfile muestra error cuando el backend responde no exitoso', () => {
    authServiceSpy.updateUserProfile.and.returnValue(
      of({ exitoso: false, mensajeUsuario: 'Error de validación en backend' } as any)
    );
    component.enableEditing();
    component.formModel.primerNombre = 'Roberto';
    component.formModel.primerApellido = 'Gómez';
    component.saveProfile();

    expect(toastServiceSpy.show).toHaveBeenCalledWith('Error de validación en backend', 'error');
  });

  it('saveProfile muestra error cuando el observable falla', () => {
    authServiceSpy.updateUserProfile.and.returnValue(throwError(() => new Error('Network error')));
    component.enableEditing();
    component.formModel.primerNombre = 'Roberto';
    component.formModel.primerApellido = 'Gómez';
    component.saveProfile();

    expect(toastServiceSpy.show).toHaveBeenCalledWith(
      'Ocurrió un error al intentar guardar los cambios.',
      'error'
    );
  });

  it('goBack invoca location.back cuando window.history.length > 1', () => {
    spyOnProperty(window.history, 'length', 'get').and.returnValue(3);
    component.goBack();
    expect(locationSpy.back).toHaveBeenCalled();
  });

  it('goBack invoca router.navigate cuando window.history.length <= 1', () => {
    spyOnProperty(window.history, 'length', 'get').and.returnValue(1);
    component.goBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/dashboard']);
  });

  it('getRoleBadgeVariant retorna la variante visual esperada', () => {
    expect(component.getRoleBadgeVariant('DOCENTE')).toBe('info');
    expect(component.getRoleBadgeVariant('ESTUDIANTE')).toBe('success');
    expect(component.getRoleBadgeVariant('ADMINISTRADOR')).toBe('danger');
    expect(component.getRoleBadgeVariant('COORDINADOR')).toBe('warning');
    expect(component.getRoleBadgeVariant('DECANO')).toBe('info');
  });
});
