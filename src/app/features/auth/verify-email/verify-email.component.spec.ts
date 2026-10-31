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

  function crear(fragment: string | null, respuesta: Observable<string>): void {
    verifyEmail = jasmine.createSpy('verifyEmail').and.returnValue(respuesta);
    TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideRouter([]),
        { provide: EmailVerificationService, useValue: { verifyEmail } },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(VerifyEmailComponent);
    fixture.detectChanges();
  }

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('lee el token del fragmento, lo borra de la URL y lo envia al backend', () => {
    crear(`token=${'A'.repeat(43)}`, of('Su correo fue verificado. Ya puede iniciar sesión.'));

    expect(verifyEmail).toHaveBeenCalledOnceWith('A'.repeat(43));
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

    expect(verifyEmail).toHaveBeenCalledOnceWith('');
    expect(fixture.componentInstance.state()).toBe('ERROR');
  });

  it('un fragmento sin token envia un token vacio', () => {
    crear('otro=valor', throwError(() => new HttpErrorResponse({ status: 400 })));

    expect(verifyEmail).toHaveBeenCalledOnceWith('');
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
});
