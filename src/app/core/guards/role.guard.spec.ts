import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { ToastService } from '../../shared/components/toast/toast.component';

describe('roleGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let authService: AuthService;
  let currentRole: User['role'];

  const user = (role: User['role']): User => ({
    id: 'user-1',
    name: 'Usuario de prueba',
    email: 'user@example.test',
    role,
    institutionName: 'UCO',
    status: 'active',
  });

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.callFake((commands) => ({ commands } as any));
    currentRole = 'DOCENTE';
    authService = {
      currentUser: () => user(currentRole),
    } as unknown as AuthService;

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  function runFor(role: User['role']): unknown {
    currentRole = role;
    const route = {
      data: { roles: ['DOCENTE'] },
    } as unknown as ActivatedRouteSnapshot;

    return TestBed.runInInjectionContext(() => roleGuard(route, {} as any));
  }

  it('permite DOCENTE en la ruta de asistencia', () => {
    expect(runFor('DOCENTE')).toBeTrue();
  });

  it('rechaza roles administrativos en la ruta exclusiva de DOCENTE', () => {
    expect(runFor('ADMINISTRADOR')).not.toBeTrue();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/acceso-denegado']);
  });

  it('redirige a login si no hay usuario', () => {
    authService = { currentUser: () => null } as unknown as AuthService;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
    const route = { data: { roles: ['DOCENTE'] } } as unknown as ActivatedRouteSnapshot;
    TestBed.runInInjectionContext(() => roleGuard(route, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('permite acceso si no hay allowedRoles configurados', () => {
    const route = { data: {} } as unknown as ActivatedRouteSnapshot;
    const res = TestBed.runInInjectionContext(() => roleGuard(route, {} as any));
    expect(res).toBeTrue();
  });

  it('F3-TRX-01: toda ruta ajena al rol lleva a la página 403 dentro del layout, sea cual sea el rol', () => {
    for (const rol of ['DECANO', 'COORDINADOR', 'ESTUDIANTE', 'ADMINISTRADOR', 'OTRO' as any]) {
      router.createUrlTree.calls.reset();
      expect(runFor(rol)).not.toBeTrue();
      expect(router.createUrlTree).toHaveBeenCalledWith(['/app/acceso-denegado']);
    }
  });

  it('permite la ruta si CUALQUIERA de los roles efectivos del usuario está permitido', () => {
    authService = {
      currentUser: () => ({ ...user('COORDINADOR'), roles: ['COORDINADOR', 'DOCENTE'] as User['roles'] }),
    } as unknown as AuthService;
    TestBed.overrideProvider(AuthService, { useValue: authService });
    const route = { data: { roles: ['DOCENTE'] } } as unknown as ActivatedRouteSnapshot;

    expect(TestBed.runInInjectionContext(() => roleGuard(route, {} as any))).toBeTrue();
  });

  it('un rol solo en `roles` pero no efectivo para la ruta no concede acceso', () => {
    authService = {
      currentUser: () => ({ ...user('ESTUDIANTE'), roles: ['ESTUDIANTE'] as User['roles'] }),
    } as unknown as AuthService;
    TestBed.overrideProvider(AuthService, { useValue: authService });
    const route = { data: { roles: ['DOCENTE'] } } as unknown as ActivatedRouteSnapshot;

    expect(TestBed.runInInjectionContext(() => roleGuard(route, {} as any))).not.toBeTrue();
  });

  it('F-DEC-S09: al denegar el acceso avisa con un error visible y no avisa cuando permite', () => {
    const toast = TestBed.inject(ToastService);
    spyOn(toast, 'error');
    runFor('DOCENTE');
    expect(toast.error).not.toHaveBeenCalled();
    runFor('DECANO');
    expect(toast.error).toHaveBeenCalledWith(jasmine.stringContaining('Acceso denegado'));
  });
});
