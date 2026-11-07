import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { User, UserRole } from '../../core/models/user.model';
import { PerfilService } from '../../core/services/perfil.service';

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
    authServiceSpy = jasmine.createSpyObj('AuthService', ['fetchProfileFromBackend'], {
      currentUser: signal(mockUser).asReadonly(),
      isMockMode: signal(true).asReadonly(),
    });
    authServiceSpy.fetchProfileFromBackend.and.returnValue(Promise.resolve(mockUser));

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
        { provide: PerfilService, useValue: { consultar: () => of({ exitoso: true, datos: null }) } },
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

  it('A2-F-05 el perfil es solo consulta: no hay botones "Editar" ni formulario de edición', () => {
    const botones = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(botones.some((b) => /Editar/.test(b.textContent ?? ''))).toBeFalse();
    expect(fixture.nativeElement.querySelector('input[name="primerNombre"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Modo Consulta');
    for (const miembro of ['enableEditing', 'cancelEditing', 'saveProfile', 'isEditing', 'canEditProfile']) {
      expect(miembro in component).withContext(miembro).toBeFalse();
    }
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
