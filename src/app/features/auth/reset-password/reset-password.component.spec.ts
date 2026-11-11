import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { PasswordRecoveryService } from '../../../core/services/password-recovery.service';

describe('ResetPasswordComponent (HU177)', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let resetPassword: jasmine.Spy;
  let navigate: jasmine.Spy;

  const TOKEN = 'A'.repeat(43);
  const CLAVE = 'ClaveTemporal-2026';
  const EXITO = 'Su contraseña fue actualizada. Ya puede iniciar sesión.';

  function crear(fragment: string | null, respuesta: Observable<string>): void {
    resetPassword = jasmine.createSpy('resetPassword').and.returnValue(respuesta);
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: PasswordRecoveryService, useValue: { resetPassword } },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
  }

  const el = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  const escribir = (clave: string, confirmacion = clave) => {
    fixture.componentInstance.clave.set(clave);
    fixture.componentInstance.confirmacion.set(confirmacion);
    fixture.detectChanges();
  };
  const boton = () => el('reset-submit') as HTMLButtonElement;

  it('lee el token del fragmento y lo borra de la URL sin llamar todavía al backend', () => {
    crear(`token=${TOKEN}`, of(EXITO));

    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ fragment: undefined, replaceUrl: true }));
    expect(resetPassword).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(TOKEN);
  });

  it('solo habilita guardar cuando la contraseña cumple la política y coincide con la confirmación', () => {
    crear(`token=${TOKEN}`, of(EXITO));
    expect(boton().disabled).toBeTrue();

    for (const debil of ['Ab1-', 'sinmayuscula-2026', 'SINMINUSCULA-2026', 'SinNumero-abc', 'SinEspecial2026', 'Con Espacio-2026']) {
      escribir(debil);
      expect(boton().disabled).withContext(debil).toBeTrue();
    }

    escribir(CLAVE, 'Otra-Clave-2026');
    expect(boton().disabled).toBeTrue();

    escribir(CLAVE);
    expect(boton().disabled).toBeFalse();
    expect(el('reset-requisitos')!.querySelectorAll('li').length).toBe(6);
    expect(el('reset-requisitos')!.textContent).not.toContain('(pendiente)');
  });

  it('envía el token y la contraseña, muestra el éxito y no deja la contraseña en memoria', () => {
    crear(`token=${TOKEN}`, of(EXITO));
    escribir(CLAVE);

    boton().click();
    fixture.detectChanges();

    expect(resetPassword).toHaveBeenCalledOnceWith(TOKEN, CLAVE);
    expect(fixture.componentInstance.state()).toBe('EXITO');
    expect(el('reset-success')!.textContent).toContain(EXITO);
    expect(el('reset-success')!.querySelector('a')?.getAttribute('href')).toBe('/login');
    expect(fixture.componentInstance.clave()).toBe('');
    expect(fixture.componentInstance.confirmacion()).toBe('');
  });

  it('sin token en el enlace envía vacío para que el backend responda igual que con cualquier enlace que no sirve', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        status: 400,
        code: 'RCL_002',
        message: 'El enlace para definir la contraseña no es válido o ya venció. Solicite uno nuevo.',
        correlationId: null,
      },
    });
    crear(null, throwError(() => error));
    escribir(CLAVE);

    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(resetPassword).toHaveBeenCalledOnceWith('', CLAVE);
    expect(fixture.componentInstance.state()).toBe('FORMULARIO');
    expect(el('reset-error')!.textContent).toContain('no es válido o ya venció');
    expect(el('reset-error')!.querySelector('a')?.getAttribute('href')).toBe('/recuperar-clave');
  });

  it('mientras guarda deshabilita el formulario y no envía dos veces', () => {
    const pendiente = new Subject<string>();
    crear(`token=${TOKEN}`, pendiente.asObservable());
    escribir(CLAVE);

    fixture.componentInstance.onSubmit();
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(resetPassword).toHaveBeenCalledTimes(1);
    expect(boton().disabled).toBeTrue();
    expect(boton().textContent).toContain('Guardando');
  });

  it('permite mostrar u ocultar las contraseñas', () => {
    crear(`token=${TOKEN}`, of(EXITO));
    expect((el('reset-clave') as HTMLInputElement).type).toBe('password');

    fixture.componentInstance.mostrar.set(true);
    fixture.detectChanges();

    expect((el('reset-clave') as HTMLInputElement).type).toBe('text');
    expect((el('reset-confirmacion') as HTMLInputElement).type).toBe('text');
  });
});
