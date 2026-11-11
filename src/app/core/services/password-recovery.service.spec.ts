import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PasswordRecoveryService } from './password-recovery.service';
import { environment } from '../../../environments/environment';

describe('PasswordRecoveryService (HU177)', () => {
  let service: PasswordRecoveryService;
  let http: HttpTestingController;

  const SOLICITUD = `${environment.apiUrl}/public/recuperacion-clave/solicitud`;
  const CONFIRMACION = `${environment.apiUrl}/public/recuperacion-clave/confirmacion`;
  const TOKEN = 'T'.repeat(43);
  const CLAVE = 'ClaveTemporal-2026';

  beforeEach(() => {
    localStorage.setItem('USE_MOCKS', 'false');
    TestBed.configureTestingModule({
      providers: [PasswordRecoveryService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PasswordRecoveryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('USE_MOCKS');
  });

  it('pide el enlace enviando el correo solo en el cuerpo y devuelve el mensaje del backend', () => {
    let mensaje = '';

    service.requestLink('ana.perez@uco.edu.co').subscribe((m) => (mensaje = m));

    const req = http.expectOne(SOLICITUD);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'ana.perez@uco.edu.co' });
    expect(req.request.urlWithParams).not.toContain('ana.perez');
    req.flush({ exitoso: true, datos: { mensaje: 'Si el correo está registrado, recibirá un enlace.' } });
    expect(mensaje).toBe('Si el correo está registrado, recibirá un enlace.');
  });

  it('define la contraseña enviando el token y la clave solo en el cuerpo', () => {
    let mensaje = '';

    service.resetPassword(TOKEN, CLAVE).subscribe((m) => (mensaje = m));

    const req = http.expectOne(CONFIRMACION);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: TOKEN, clave: CLAVE });
    expect(req.request.urlWithParams).not.toContain('T'.repeat(10));
    expect(req.request.urlWithParams).not.toContain('ClaveTemporal');
    req.flush({ exitoso: true, datos: { mensaje: 'Su contraseña fue actualizada. Ya puede iniciar sesión.' } });
    expect(mensaje).toBe('Su contraseña fue actualizada. Ya puede iniciar sesión.');
  });

  it('propaga el error del backend cuando el enlace no sirve', () => {
    let error: unknown;

    service.resetPassword('x', CLAVE).subscribe({ error: (e) => (error = e) });
    http.expectOne(CONFIRMACION).flush(
      { status: 400, code: 'RCL_002', message: 'El enlace para definir la contraseña no es válido o ya venció.' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(error).toBeTruthy();
  });

  it('con mocks de frontend responde sin llamar al backend', fakeAsync(() => {
    const prevEnv = (window as any)['env'];
    (window as any)['env'] = { USE_MOCKS: 'true' };
    const mensajes: string[] = [];

    service.requestLink('ana.perez@uco.edu.co').subscribe((m) => mensajes.push(m));
    service.resetPassword(TOKEN, CLAVE).subscribe((m) => mensajes.push(m));
    tick(300);

    http.expectNone(SOLICITUD);
    http.expectNone(CONFIRMACION);
    expect(mensajes.length).toBe(2);
    expect(mensajes[0]).toContain('Si el correo está registrado');
    expect(mensajes[1]).toContain('Su contraseña fue actualizada');
    (window as any)['env'] = prevEnv;
  }));
});
