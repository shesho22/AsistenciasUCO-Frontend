import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { RecoverPasswordComponent } from './recover-password.component';
import { PasswordRecoveryService } from '../../../core/services/password-recovery.service';

describe('RecoverPasswordComponent (HU177)', () => {
  let fixture: ComponentFixture<RecoverPasswordComponent>;
  let requestLink: jasmine.Spy;

  const MENSAJE = 'Si el correo está registrado, recibirá un enlace para definir una contraseña nueva.';

  function crear(respuesta: Observable<string>): void {
    requestLink = jasmine.createSpy('requestLink').and.returnValue(respuesta);
    TestBed.configureTestingModule({
      imports: [RecoverPasswordComponent],
      providers: [provideRouter([]), { provide: PasswordRecoveryService, useValue: { requestLink } }],
    });
    fixture = TestBed.createComponent(RecoverPasswordComponent);
    fixture.detectChanges();
  }

  const el = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  const escribirCorreo = (valor: string) => {
    fixture.componentInstance.correo.set(valor);
    fixture.detectChanges();
  };

  it('no deja enviar sin correo', () => {
    crear(of(MENSAJE));

    expect((el('recover-submit') as HTMLButtonElement).disabled).toBeTrue();
    fixture.componentInstance.onSubmit();
    expect(requestLink).not.toHaveBeenCalled();

    escribirCorreo('   ');
    expect((el('recover-submit') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('envía el correo recortado y muestra el mensaje uniforme del backend', () => {
    crear(of(MENSAJE));
    escribirCorreo('  ana.perez@uco.edu.co ');

    (el('recover-submit') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(requestLink).toHaveBeenCalledOnceWith('ana.perez@uco.edu.co');
    expect(fixture.componentInstance.state()).toBe('ENVIADO');
    expect(el('recover-sent')!.textContent).toContain(MENSAJE);
    expect(el('recover-sent')!.querySelector('a')?.getAttribute('href')).toBe('/login');
    expect(el('recover-correo')).toBeNull();
  });

  it('mientras envía deshabilita el formulario y no envía dos veces', () => {
    const pendiente = new Subject<string>();
    crear(pendiente.asObservable());
    escribirCorreo('ana.perez@uco.edu.co');

    fixture.componentInstance.onSubmit();
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(requestLink).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.state()).toBe('ENVIANDO');
    expect(el('recover-submit')!.textContent).toContain('Enviando');
    expect((el('recover-submit') as HTMLButtonElement).disabled).toBeTrue();

    pendiente.next(MENSAJE);
    fixture.detectChanges();
    expect(fixture.componentInstance.state()).toBe('ENVIADO');
  });

  it('ante un error del backend (por ejemplo, demasiados intentos) muestra el mensaje y deja reintentar', () => {
    const error = new HttpErrorResponse({
      status: 429,
      error: { status: 429, code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Espere un momento.', correlationId: null },
    });
    crear(throwError(() => error));
    escribirCorreo('ana.perez@uco.edu.co');

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(fixture.componentInstance.state()).toBe('FORMULARIO');
    expect(el('recover-error')!.textContent).toContain('Demasiados intentos');
    expect((el('recover-submit') as HTMLButtonElement).disabled).toBeFalse();
  });
});
