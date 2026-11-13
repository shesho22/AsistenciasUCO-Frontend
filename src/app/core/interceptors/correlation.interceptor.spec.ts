import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { correlationInterceptor } from './correlation.interceptor';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('X-Correlation-Id (BACKEND_GOLDEN_PATH_CONTRACT §J)', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let tokenValue: string;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    tokenValue = 'old';
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getValidAccessToken',
      'refreshAccessToken',
      'notifySessionExpired',
      'clearSession',
    ]);
    Object.defineProperties(authService, {
      isMockMode: { configurable: true, value: () => false },
      isAuthenticated: { configurable: true, value: () => true },
      token: { configurable: true, value: () => tokenValue },
    });
    authService.getValidAccessToken.and.resolveTo('old');
    authService.refreshAccessToken.and.callFake(async () => {
      tokenValue = 'new';
      return true;
    });

    TestBed.configureTestingModule({
      providers: [
        // Mismo orden que app.config.ts: correlation → auth.
        provideHttpClient(withXhr(), withInterceptors([correlationInterceptor, authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cada request lleva un UUID canónico y requests distintas llevan IDs distintos', fakeAsync(() => {
    client.get(`${environment.apiUrl}/a`).subscribe();
    client.get(`${environment.apiUrl}/b`).subscribe();
    tick();
    const a = http.expectOne(`${environment.apiUrl}/a`);
    const b = http.expectOne(`${environment.apiUrl}/b`);
    expect(a.request.headers.get('X-Correlation-Id')).toMatch(UUID);
    expect(b.request.headers.get('X-Correlation-Id')).toMatch(UUID);
    expect(a.request.headers.get('X-Correlation-Id')).not.toBe(b.request.headers.get('X-Correlation-Id'));
    a.flush({});
    b.flush({});
  }));

  it('el reintento tras 401 + refresh conserva el MISMO ID de la request original', fakeAsync(() => {
    client.get(`${environment.apiUrl}/probe`).subscribe();
    tick();
    const first = http.expectOne(`${environment.apiUrl}/probe`);
    const id = first.request.headers.get('X-Correlation-Id');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    tick();
    const retry = http.expectOne(`${environment.apiUrl}/probe`);
    expect(retry.request.headers.get('X-Correlation-Id')).toBe(id);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
    retry.flush({});
  }));

  it('no se añade a URLs fuera de la API', fakeAsync(() => {
    client.get('https://example.org/x').subscribe();
    tick();
    const req = http.expectOne('https://example.org/x');
    expect(req.request.headers.has('X-Correlation-Id')).toBeFalse();
    req.flush({});
  }));
});
