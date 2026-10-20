import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';

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
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/admin/decanos']);
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

  it('redirige a vistas iniciales por rol si no tiene permiso', () => {
    expect(runFor('DECANO')).not.toBeTrue();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/decano/coordinadores']);

    expect(runFor('COORDINADOR')).not.toBeTrue();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/coordinador/docentes']);

    expect(runFor('ESTUDIANTE')).not.toBeTrue();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/estudiante/horarios']);

    expect(runFor('OTRO' as any)).not.toBeTrue();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app/dashboard']);
  });
});
