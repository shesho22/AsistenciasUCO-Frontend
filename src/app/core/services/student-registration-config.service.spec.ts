import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StudentRegistrationConfigService } from './student-registration-config.service';
import { environment } from '../../../environments/environment';

describe('StudentRegistrationConfigService (IDENT-001)', () => {
  let service: StudentRegistrationConfigService;
  let http: HttpTestingController;
  const url = () => `${environment.apiUrl}/configuracion/registro-estudiante`;

  beforeEach(() => {
    localStorage.setItem('USE_MOCKS', 'false');
    TestBed.configureTestingModule({
      providers: [StudentRegistrationConfigService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentRegistrationConfigService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('USE_MOCKS');
  });

  it('obtiene el dominio del backend y lo reutiliza sin volver a consultarlo', () => {
    const recibidos: string[] = [];

    service.getEmailDomain().subscribe((dominio) => recibidos.push(dominio));
    const req = http.expectOne(url());
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: { dominioCorreo: '@uco.edu.co' } });

    service.getEmailDomain().subscribe((dominio) => recibidos.push(dominio));
    http.expectNone(url());

    expect(recibidos).toEqual(['@uco.edu.co', '@uco.edu.co']);
  });

  it('un fallo no queda en cache y el siguiente intento consulta de nuevo', () => {
    let error: unknown;
    service.getEmailDomain().subscribe({ error: (e) => (error = e) });
    http.expectOne(url()).flush({ message: 'caido' }, { status: 500, statusText: 'Server Error' });
    expect(error).toBeTruthy();

    let dominio = '';
    service.getEmailDomain().subscribe((d) => (dominio = d));
    http.expectOne(url()).flush({ exitoso: true, datos: { dominioCorreo: '@otra.edu' } });

    expect(dominio).toBe('@otra.edu');
  });

  it('con mocks no llama al backend', () => {
    localStorage.setItem('USE_MOCKS', 'true');
    let dominio = '';

    service.getEmailDomain().subscribe((d) => (dominio = d));

    http.expectNone(url());
    expect(dominio).toBe('@uco.edu.co');
  });
});
