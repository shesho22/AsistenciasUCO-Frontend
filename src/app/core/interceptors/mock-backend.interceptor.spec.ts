import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { mockBackendInterceptor } from './mock-backend.interceptor';

describe('mockBackendInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.setMockMode(false);
  });

  afterEach(() => {
    localStorage.removeItem('USE_MOCKS');
    http.verify();
  });

  it('en modo mock no deja pasar a red una ruta API sin simulación', () => {
    auth.setMockMode(true);
    let error: HttpErrorResponse | undefined;
    httpClient.get(`${environment.apiUrl}/ruta-no-simulada`).subscribe({ error: (value) => (error = value) });

    expect(error?.status).toBe(501);
    expect(error?.error?.code).toBe('MOCK_ROUTE_NOT_IMPLEMENTED');
    http.expectNone(`${environment.apiUrl}/ruta-no-simulada`);
  });

  it('el cambio a real en runtime deja continuar la petición y no conserva el token mock', () => {
    auth.setMockMode(true);
    auth.loginAsMockUser('DOCENTE', false);
    auth.setMockMode(false);

    httpClient.get(`${environment.apiUrl}/probe`).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/probe`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ exitoso: true, datos: [] });
  });

  it('en modo mock no intercepta recursos externos', () => {
    auth.setMockMode(true);
    httpClient.get('https://cdn.example.test/font.css').subscribe();
    const request = http.expectOne('https://cdn.example.test/font.css');
    request.flush('body');
  });
});
