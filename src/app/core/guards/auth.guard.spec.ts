import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { QR_RETORNO_STORAGE_KEY } from '../utils/qr-return-url.util';

describe('authGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    router.createUrlTree.and.callFake((commands, extras) => ({ commands, extras } as any));

    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
  });

  it('permite el acceso si el usuario está autenticado', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/app/dashboard' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeTrue();
  });

  it('redirige a /login con returnUrl si no está autenticado', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/app/estudiante/horarios' } as RouterStateSnapshot;

    TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/app/estudiante/horarios' },
    });
  });

  describe('NB-8: asistencia por QR (CULM-001 B.2)', () => {
    beforeEach(() => sessionStorage.removeItem(QR_RETORNO_STORAGE_KEY));
    afterEach(() => sessionStorage.removeItem(QR_RETORNO_STORAGE_KEY));

    it('B2-F-22 sin sesion en /app/asistencia/qr?t=... guarda la URL en sessionStorage y va a /login sin returnUrl', () => {
      authServiceSpy.isAuthenticated.and.returnValue(false);
      const state = { url: '/app/asistencia/qr?t=SECRETO' } as RouterStateSnapshot;

      TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state));

      expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/login']);
      expect(JSON.stringify(router.createUrlTree.calls.allArgs())).not.toContain('SECRETO');
      expect(sessionStorage.getItem(QR_RETORNO_STORAGE_KEY)).toContain('/app/asistencia/qr?t=SECRETO');
    });

    it('B2-F-22 con sesion deja pasar sin tocar el almacenamiento', () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);
      const result = TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, { url: '/app/asistencia/qr?t=X' } as RouterStateSnapshot)
      );
      expect(result).toBeTrue();
      expect(sessionStorage.getItem(QR_RETORNO_STORAGE_KEY)).toBeNull();
    });

    it('B2-F-22 las demas rutas conservan el returnUrl de siempre', () => {
      authServiceSpy.isAuthenticated.and.returnValue(false);
      TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, { url: '/app/asistencia' } as RouterStateSnapshot)
      );
      expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/app/asistencia' } });
      expect(sessionStorage.getItem(QR_RETORNO_STORAGE_KEY)).toBeNull();
    });
  });
});
