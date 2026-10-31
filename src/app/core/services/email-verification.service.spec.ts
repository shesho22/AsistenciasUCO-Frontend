import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmailVerificationService } from './email-verification.service';
import { environment } from '../../../environments/environment';

describe('EmailVerificationService (IDENT-001)', () => {
  let service: EmailVerificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('USE_MOCKS', 'false');
    TestBed.configureTestingModule({
      providers: [EmailVerificationService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmailVerificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('USE_MOCKS');
  });

  it('verifica el correo enviando el token solo en el cuerpo y devuelve el mensaje del backend', () => {
    let mensaje = '';

    service.verifyEmail('T'.repeat(43)).subscribe((m) => (mensaje = m));

    const req = http.expectOne(`${environment.apiUrl}/public/verificar-correo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'T'.repeat(43) });
    expect(req.request.urlWithParams).not.toContain('T'.repeat(10));
    req.flush({ exitoso: true, datos: { mensaje: 'Su correo fue verificado.' } });
    expect(mensaje).toBe('Su correo fue verificado.');
  });

  it('propaga el error del backend cuando el token no es valido', () => {
    let error: unknown;

    service.verifyEmail('x').subscribe({ error: (e) => (error = e) });
    http.expectOne(`${environment.apiUrl}/public/verificar-correo`).flush(
      { status: 400, code: 'VCE_002', message: 'El enlace de verificación no es válido o ya venció.' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(error).toBeTruthy();
  });

  it('reenvia el enlace con la ruta del grupo y del estudiante', () => {
    let exitoso = false;

    service.resendVerification('g-1', 'e-2').subscribe((r) => (exitoso = r.exitoso));

    const req = http.expectOne(`${environment.apiUrl}/grupos/g-1/estudiantes/e-2/reenviar-verificacion`);
    expect(req.request.method).toBe('POST');
    req.flush({ exitoso: true, datos: null });
    expect(exitoso).toBeTrue();
  });

  it('con mocks no llama al backend', fakeAsync(() => {
    localStorage.setItem('USE_MOCKS', 'true');
    let mensaje = '';
    let reenvio = false;

    service.verifyEmail('t').subscribe((m) => (mensaje = m));
    service.resendVerification('g', 'e').subscribe((r) => (reenvio = r.exitoso));
    tick(400);

    http.expectNone(`${environment.apiUrl}/public/verificar-correo`);
    expect(mensaje).toContain('verificado');
    expect(reenvio).toBeTrue();
  }));
});
