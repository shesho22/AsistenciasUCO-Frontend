import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
  withXhr
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { environment } from '../../../environments/environment';

describe('authInterceptor 401 recovery', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let tokenValue: string | null;
  let authenticated: boolean;
  let mockMode: boolean;

  beforeEach(() => {
    tokenValue = 'old-token';
    authenticated = true;
    mockMode = false;
    authService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      [
        'getValidAccessToken',
        'refreshAccessToken',
        'notifySessionExpired',
        'clearSession',
      ]
    );
    Object.defineProperties(authService, {
      isMockMode: { configurable: true, value: () => mockMode },
      isAuthenticated: { configurable: true, value: () => authenticated },
      token: { configurable: true, value: () => tokenValue },
    });
    authService.getValidAccessToken.and.resolveTo('old-token');

    const toastService = jasmine.createSpyObj<ToastService>('ToastService', [
      'error',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), 
          withInterceptors([authInterceptor, errorInterceptor])
        ),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: ToastService, useValue: toastService },
      ],
    });

    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('401 con refresh exitoso reintenta y conserva la sesión', fakeAsync(() => {
    authService.refreshAccessToken.and.callFake(async () => {
      tokenValue = 'new-token';
      return true;
    });
    let result: unknown;

    client
      .get(`${environment.apiUrl}/probe`)
      .subscribe((response) => (result = response));
    tick();

    const first = http.expectOne(`${environment.apiUrl}/probe`);
    expect(first.request.headers.get('Authorization')).toBe('Bearer old-token');
    expect(first.request.withCredentials).toBeFalse();
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    tick();

    const retry = http.expectOne(`${environment.apiUrl}/probe`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(retry.request.withCredentials).toBeFalse();
    retry.flush({ ok: true });
    tick();

    expect(result).toEqual({ ok: true });
    expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authService.notifySessionExpired).not.toHaveBeenCalled();
  }));

  describe('política Bearer-only (sin cookies ni withCredentials)', () => {
    it('petición autenticada adjunta solo Authorization: Bearer y no usa withCredentials', fakeAsync(() => {
      client.post(`${environment.apiUrl}/probe`, {}).subscribe();
      tick();

      const pending = http.expectOne(`${environment.apiUrl}/probe`);
      expect(pending.request.headers.get('Authorization')).toBe('Bearer old-token');
      expect(pending.request.withCredentials).toBeFalse();
      pending.flush({});
    }));

    it('petición sin sesión no envía Authorization ni fuerza credenciales', fakeAsync(() => {
      authenticated = false;

      client.get(`${environment.apiUrl}/probe`).subscribe();
      tick();

      const pending = http.expectOne(`${environment.apiUrl}/probe`);
      expect(pending.request.headers.has('Authorization')).toBeFalse();
      expect(pending.request.withCredentials).toBeFalse();
      expect(authService.getValidAccessToken).not.toHaveBeenCalled();
      pending.flush({});
    }));

    it('sesión sin token disponible continúa sin Authorization ni credenciales', fakeAsync(() => {
      tokenValue = null;
      authService.getValidAccessToken.and.resolveTo(null);

      client.get(`${environment.apiUrl}/probe`).subscribe();
      tick();

      const pending = http.expectOne(`${environment.apiUrl}/probe`);
      expect(pending.request.headers.has('Authorization')).toBeFalse();
      expect(pending.request.withCredentials).toBeFalse();
      pending.flush({});
    }));

    it('modo mock con token adjunta Bearer sin withCredentials', fakeAsync(() => {
      mockMode = true;
      tokenValue = 'mock-token';

      client.get(`${environment.apiUrl}/probe`).subscribe();
      tick();

      const pending = http.expectOne(`${environment.apiUrl}/probe`);
      expect(pending.request.headers.get('Authorization')).toBe('Bearer mock-token');
      expect(pending.request.withCredentials).toBeFalse();
      pending.flush({});
    }));

    it('modo mock sin token no adjunta Authorization ni withCredentials', fakeAsync(() => {
      mockMode = true;
      tokenValue = null;

      client.get(`${environment.apiUrl}/probe`).subscribe();
      tick();

      const pending = http.expectOne(`${environment.apiUrl}/probe`);
      expect(pending.request.headers.has('Authorization')).toBeFalse();
      expect(pending.request.withCredentials).toBeFalse();
      pending.flush({});
    }));
  });

  it('401 con refresh fallido expira la sesión exactamente una vez', fakeAsync(() => {
    authService.refreshAccessToken.and.resolveTo(false);
    let receivedError: unknown;

    client.get(`${environment.apiUrl}/probe`).subscribe({
      error: (error) => (receivedError = error),
    });
    tick();

    http
      .expectOne(`${environment.apiUrl}/probe`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(receivedError).toBeTruthy();
    expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authService.notifySessionExpired).toHaveBeenCalledTimes(1);
  }));

  it('403 no intenta refresh', fakeAsync(() => {
    let receivedError: unknown;
    client.get(`${environment.apiUrl}/probe`).subscribe({
      error: (error) => (receivedError = error),
    });
    tick();

    http
      .expectOne(`${environment.apiUrl}/probe`)
      .flush({}, { status: 403, statusText: 'Forbidden' });
    tick();

    expect(receivedError).toBeTruthy();
    expect(authService.refreshAccessToken).not.toHaveBeenCalled();
    expect(authService.notifySessionExpired).not.toHaveBeenCalled();
  }));

  it('peticiones concurrentes comparten un solo refresh', fakeAsync(() => {
    let resolveRefresh!: (value: boolean) => void;
    authService.refreshAccessToken.and.returnValue(
      new Promise<boolean>((resolve) => (resolveRefresh = resolve))
    );
    const results: unknown[] = [];

    client.get(`${environment.apiUrl}/first`).subscribe((value) => results.push(value));
    client.get(`${environment.apiUrl}/second`).subscribe((value) => results.push(value));
    tick();

    http
      .expectOne(`${environment.apiUrl}/first`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne(`${environment.apiUrl}/second`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
    tokenValue = 'new-token';
    resolveRefresh(true);
    tick();

    const firstRetry = http.expectOne(`${environment.apiUrl}/first`);
    const secondRetry = http.expectOne(`${environment.apiUrl}/second`);
    expect(firstRetry.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(secondRetry.request.headers.get('Authorization')).toBe('Bearer new-token');
    expect(firstRetry.request.withCredentials).toBeFalse();
    expect(secondRetry.request.withCredentials).toBeFalse();
    firstRetry.flush({ id: 1 });
    secondRetry.flush({ id: 2 });
    tick();

    expect(results.length).toBe(2);
    expect(authService.notifySessionExpired).not.toHaveBeenCalled();
  }));
});
