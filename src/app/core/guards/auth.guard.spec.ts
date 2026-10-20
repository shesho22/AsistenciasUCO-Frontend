import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

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
});
