import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { VerifyEmailComponent } from './verify-email.component';
import { EmailVerificationService } from '../../../core/services/email-verification.service';

describe('VerifyEmailComponent (IDENT-001)', () => {
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let verifyEmail: jasmine.Spy;
  let navigate: jasmine.Spy;

  function crear(fragment: string | null, respuesta: Observable<string>, data: Record<string, unknown> = {}): void {
    verifyEmail = jasmine.createSpy('verifyEmail').and.returnValue(respuesta);
    TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideRouter([]),
        { provide: EmailVerificationService, useValue: { verifyEmail } },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment, data } } },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('lee el token del fragmento, lo borra de la URL y lo envia al backend', () => {
    crear(`token=${'A'.repeat(43)}`, of('Su correo fue verificado. Ya puede iniciar sesión.'));

    expect(verifyEmail).toHaveBeenCalledOnceWith('A'.repeat(43), undefined);
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ fragment: undefined, replaceUrl: true }));
  });

  it('muestra el mensaje de exito del backend y el acceso al inicio de sesion', () => {
    crear(`token=${'A'.repeat(43)}`, of('Su correo fue verificado. Ya puede iniciar sesión.'));

    expect(fixture.componentInstance.state()).toBe('EXITO');
    expect(texto()).toContain('Su correo fue verificado. Ya puede iniciar sesión.');
    expect(fixture.nativeElement.querySelector('[data-testid="verify-success"] a')?.getAttribute('href')).toBe('/login');
  });

  it('muestra el mensaje del backend ante un token invalido, vencido o usado', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        timestamp: '2026-10-31T12:00:00-05:00',
        status: 400,
        error: 'Bad Request',
        code: 'VCE_002',
        message: 'El enlace de verificación no es válido o ya venció.',
        path: '/api/v1/public/verificar-correo',
        correlationId: null,
      },
    });
    crear(`token=${'B'.repeat(43)}`, throwError(() => error));

    expect(fixture.componentInstance.state()).toBe('ERROR');
    expect(texto()).toContain('El enlace de verificación no es válido o ya venció.');
  });

  it('sin fragmento consulta igual al backend con un token vacio (respuesta uniforme)', () => {
    crear(null, throwError(() => new HttpErrorResponse({ status: 400 })));

    expect(verifyEmail).toHaveBeenCalledOnceWith('', undefined);
    expect(fixture.componentInstance.state()).toBe('ERROR');
  });

  it('un fragmento sin token envia un token vacio', () => {
    crear('otro=valor', throwError(() => new HttpErrorResponse({ status: 400 })));

    expect(verifyEmail).toHaveBeenCalledOnceWith('', undefined);
  });

  it('mientras espera la respuesta muestra el estado de carga', () => {
    crear(`token=${'C'.repeat(43)}`, new Subject<string>());

    expect(fixture.componentInstance.state()).toBe('VERIFICANDO');
    expect(fixture.nativeElement.querySelector('[data-testid="verify-loading"]')).not.toBeNull();
  });

  it('no guarda el token en ningun almacenamiento del navegador', () => {
    const setItem = spyOn(Storage.prototype, 'setItem').and.callThrough();
    crear(`token=${'D'.repeat(43)}`, of('ok'));

    expect(setItem).not.toHaveBeenCalled();
  });

  describe('IDENT-002 activación de cuenta', () => {
    const errorApi = (code: string, message: string) =>
      new HttpErrorResponse({
        status: 400,
        error: { timestamp: '2026-11-15T12:00:00-05:00', status: 400, error: 'Bad Request', code, message,
          path: '/api/v1/public/verificar-correo', correlationId: null },
      });
    const host = () => fixture.nativeElement as HTMLElement;

    it('en /activar-cuenta pide la contraseña antes de llamar al backend y borra el token de la URL', () => {
      crear(`token=${'E'.repeat(43)}`, of('Su cuenta quedó activa.'), { modo: 'ACTIVACION' });

      expect(verifyEmail).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ fragment: undefined, replaceUrl: true }));
      expect(fixture.componentInstance.state()).toBe('DEFINIR_CONTRASENA');
      expect(host().querySelector('[data-testid="verify-password-form"]')).not.toBeNull();
      expect(host().textContent).toContain('Activación de cuenta');
    });

    it('valida política y confirmación en el cliente sin enviar', () => {
      crear(`token=${'E'.repeat(43)}`, of('ok'), { modo: 'ACTIVACION' });
      const componente = fixture.componentInstance;

      componente.password.set('corta');
      componente.activar();
      expect(componente.formError()).toContain('Contraseña');

      componente.password.set('MiClaveSegura2026!');
      componente.confirmPassword.set('OtraClave2026!');
      componente.activar();
      expect(componente.formError()).toBe('Las contraseñas no coinciden.');
      expect(verifyEmail).not.toHaveBeenCalled();
    });

    it('con la contraseña válida activa la cuenta y muestra el mensaje del backend', () => {
      crear(`token=${'E'.repeat(43)}`, of('Su cuenta quedó activa. Ya puede iniciar sesión.'), { modo: 'ACTIVACION' });
      const componente = fixture.componentInstance;
      componente.password.set('MiClaveSegura2026!');
      componente.confirmPassword.set('MiClaveSegura2026!');

      componente.activar();
      fixture.detectChanges();

      expect(verifyEmail).toHaveBeenCalledOnceWith('E'.repeat(43), 'MiClaveSegura2026!');
      expect(componente.state()).toBe('EXITO');
      expect(componente.password()).toBe('');
      expect(host().textContent).toContain('Su cuenta quedó activa. Ya puede iniciar sesión.');
    });

    it('un error de política del backend deja el formulario abierto con su mensaje', () => {
      crear(`token=${'E'.repeat(43)}`, throwError(() => errorApi('ERR_PASSWORD_POLITICA_INVALIDA', 'La contraseña no cumple la política.')),
        { modo: 'ACTIVACION' });
      const componente = fixture.componentInstance;
      componente.password.set('MiClaveSegura2026!');
      componente.confirmPassword.set('MiClaveSegura2026!');

      componente.activar();

      expect(componente.state()).toBe('DEFINIR_CONTRASENA');
      expect(componente.formError()).toBe('La contraseña no cumple la política.');
    });

    it('un enlace vencido muestra el error del backend y limpia la contraseña', () => {
      crear(`token=${'E'.repeat(43)}`, throwError(() => errorApi('VCE_002', 'El enlace no es válido o ya venció.')), { modo: 'ACTIVACION' });
      const componente = fixture.componentInstance;
      componente.password.set('MiClaveSegura2026!');
      componente.confirmPassword.set('MiClaveSegura2026!');

      componente.activar();
      fixture.detectChanges();

      expect(componente.state()).toBe('ERROR');
      expect(componente.password()).toBe('');
      expect(host().textContent).toContain('El enlace no es válido o ya venció.');
    });

    it('un enlace de verificación de una cuenta sin contraseña (VCE_009) abre el formulario sin mostrar error', () => {
      crear(`token=${'F'.repeat(43)}`, throwError(() => errorApi('VCE_009', 'Defina su contraseña.')));

      expect(verifyEmail).toHaveBeenCalledOnceWith('F'.repeat(43), undefined);
      expect(fixture.componentInstance.state()).toBe('DEFINIR_CONTRASENA');
      expect(fixture.componentInstance.activacion()).toBeTrue();
      expect(fixture.componentInstance.formError()).toBe('');
    });

    it('/activar-cuenta sin token consulta al backend para obtener la respuesta uniforme', () => {
      crear(null, throwError(() => errorApi('VCE_002', 'El enlace no es válido.')), { modo: 'ACTIVACION' });

      expect(verifyEmail).toHaveBeenCalledOnceWith('', undefined);
      expect(fixture.componentInstance.state()).toBe('ERROR');
    });

    it('no reenvía mientras hay un envío en curso', () => {
      crear(`token=${'E'.repeat(43)}`, new Subject<string>(), { modo: 'ACTIVACION' });
      const componente = fixture.componentInstance;
      componente.password.set('MiClaveSegura2026!');
      componente.confirmPassword.set('MiClaveSegura2026!');

      componente.activar();
      componente.activar();

      expect(verifyEmail).toHaveBeenCalledTimes(1);
    });
  });
});
