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
    router.createUrlTree.and.callFake((commands, extras) => ({ commands, extras } as never));

    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'initializeSessionOnce',
      'hasPendingAuthenticationRedirect',
    ]);
    authServiceSpy.initializeSessionOnce.and.resolveTo(false);
    authServiceSpy.hasPendingAuthenticationRedirect.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
  });

  it('permite el acceso si el usuario está autenticado', async () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/app/dashboard' } as RouterStateSnapshot;

    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeTrue();
    expect(authServiceSpy.initializeSessionOnce).not.toHaveBeenCalled();
  });

  it('espera la restauración y redirige a /login con returnUrl si no hay sesión', async () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/app/estudiante/horarios' } as RouterStateSnapshot;

    await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(authServiceSpy.initializeSessionOnce).toHaveBeenCalledOnceWith();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/app/estudiante/horarios' },
    });
  });

  it('no decide redirigir antes de que termine la restauración de sesión', async () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    let terminarRestauracion!: (restaurada: boolean) => void;
    authServiceSpy.initializeSessionOnce.and.returnValue(
      new Promise<boolean>((resolve) => {
        terminarRestauracion = resolve;
      })
    );

    const navegacion = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/app/docente/grupos' } as RouterStateSnapshot)
    );
    await Promise.resolve();
    expect(router.createUrlTree).not.toHaveBeenCalled();

    terminarRestauracion(true);
    await navegacion;
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/app/docente/grupos' },
    });
  });

  it('cancela la navegación protegida mientras inicia la redirección OIDC silenciosa', async () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    authServiceSpy.hasPendingAuthenticationRedirect.and.returnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/app/docente/grupos' } as RouterStateSnapshot)
    );

    expect(result).toBeFalse();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  describe('NB-8: asistencia por QR (CULM-001 B.2)', () => {
    beforeEach(() => sessionStorage.removeItem(QR_RETORNO_STORAGE_KEY));
    afterEach(() => sessionStorage.removeItem(QR_RETORNO_STORAGE_KEY));

    it('B2-F-22 sin sesion en /app/asistencia/qr?t=... guarda la URL en sessionStorage y va a /login sin returnUrl', async () => {
      authServiceSpy.isAuthenticated.and.returnValue(false);
      const state = { url: '/app/asistencia/qr?t=SECRETO' } as RouterStateSnapshot;

      await TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state));

      expect(router.createUrlTree).toHaveBeenCalledOnceWith(['/login']);
      expect(JSON.stringify(router.createUrlTree.calls.allArgs())).not.toContain('SECRETO');
      expect(sessionStorage.getItem(QR_RETORNO_STORAGE_KEY)).toContain('/app/asistencia/qr?t=SECRETO');
    });

    it('B2-F-22 con sesion deja pasar sin tocar el almacenamiento', async () => {
      authServiceSpy.isAuthenticated.and.returnValue(true);
      const result = await TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, { url: '/app/asistencia/qr?t=X' } as RouterStateSnapshot)
      );
      expect(result).toBeTrue();
      expect(sessionStorage.getItem(QR_RETORNO_STORAGE_KEY)).toBeNull();
    });

    it('B2-F-22 las demas rutas conservan el returnUrl de siempre', async () => {
      authServiceSpy.isAuthenticated.and.returnValue(false);
      await TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, { url: '/app/asistencia' } as RouterStateSnapshot)
      );
      expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/app/asistencia' } });
      expect(sessionStorage.getItem(QR_RETORNO_STORAGE_KEY)).toBeNull();
    });
  });
});
