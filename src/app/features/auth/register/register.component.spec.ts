import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { CatalogService } from '../../../core/services/catalog.service';
import { UserService } from '../../../core/services/user.service';

describe('RegisterComponent', () => {
  let catalogService: jasmine.SpyObj<CatalogService>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    catalogService = jasmine.createSpyObj<CatalogService>('CatalogService', [
      'getIdentityDocumentTypes',
    ]);
    catalogService.getIdentityDocumentTypes.and.returnValue(
      of([{ id: 'tipo-1', tipoIdentificacion: 'CC', nombre: 'Cédula de Ciudadanía' } as any])
    );

    userService = jasmine.createSpyObj<UserService>('UserService', ['createUser']);

    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: CatalogService, useValue: catalogService },
        { provide: UserService, useValue: userService },
      ],
    });
  });

  it('no registra un usuario sin contraseña explícita', () => {
    const component = TestBed.createComponent(RegisterComponent).componentInstance;
    component.tipoIdentificacionId = 'tipo-1';
    component.numeroIdentificacion = '123456';
    component.primerNombre = 'Ada';
    component.primerApellido = 'Lovelace';
    component.email = 'ada@example.test';
    component.password = '   ';

    component.onRegister(new Event('submit'));

    expect(userService.createUser).not.toHaveBeenCalled();
    expect(component.fieldErrors()['password']).toBeTruthy();
  });

  it('valida campos obligatorios en el registro (nombre, apellido, email)', () => {
    const component = TestBed.createComponent(RegisterComponent).componentInstance;
    component.tipoIdentificacionId = 'tipo-1';
    component.numeroIdentificacion = '1017123456';
    component.primerNombre = '';
    component.primerApellido = '';
    component.email = 'invalido';
    component.password = 'Segura123*';

    component.onRegister(new Event('submit'));

    expect(userService.createUser).not.toHaveBeenCalled();
    expect(component.fieldErrors()['primerNombre']).toBeTruthy();
    expect(component.fieldErrors()['primerApellido']).toBeTruthy();
    expect(component.fieldErrors()['correo']).toBeTruthy();
    expect(component.showToast()).toBeTrue();
    expect(component.toastType()).toBe('error');
  });

  it('registra exitosamente un usuario con datos válidos', () => {
    userService.createUser.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Registro completado' } as any)
    );

    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.tipoIdentificacionId = 'tipo-1';
    component.numeroIdentificacion = '1017123456';
    component.primerNombre = 'Alan';
    component.primerApellido = 'Turing';
    component.email = 'alan.turing@uco.edu.co';
    component.password = 'Segura123*';

    component.onRegister(new Event('submit'));

    expect(userService.createUser).toHaveBeenCalled();
    expect(component.showToast()).toBeTrue();
    expect(component.toastType()).toBe('success');
  });

  it('maneja respuesta de error en createUser', () => {
    userService.createUser.and.returnValue(
      of({ exitoso: false, mensajeUsuario: 'El usuario ya existe' } as any)
    );

    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.tipoIdentificacionId = 'tipo-1';
    component.numeroIdentificacion = '1017123456';
    component.primerNombre = 'Alan';
    component.primerApellido = 'Turing';
    component.email = 'alan.turing@uco.edu.co';
    component.password = 'Segura123*';

    component.onRegister(new Event('submit'));

    expect(component.toastType()).toBe('error');
    expect(component.toastMessage()).toBe('El usuario ya existe');
  });

  it('maneja error HTTP de red en createUser', () => {
    userService.createUser.and.returnValue(
      throwError(() => ({
        status: 400,
        error: {
          exitoso: false,
          mensajeUsuario: 'Error de validación',
          errores: { correo: 'Correo duplicado' },
        },
      }))
    );

    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.tipoIdentificacionId = 'tipo-1';
    component.numeroIdentificacion = '1017123456';
    component.primerNombre = 'Alan';
    component.primerApellido = 'Turing';
    component.email = 'alan.turing@uco.edu.co';
    component.password = 'Segura123*';

    component.onRegister(new Event('submit'));

    expect(component.toastType()).toBe('error');
    expect(component.isLoading()).toBeFalse();
  });
});
