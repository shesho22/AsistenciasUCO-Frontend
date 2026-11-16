import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import {
  RUTA_SIN_ENTIDAD,
  coordinadorConProgramaGuard,
  decanoConFacultadGuard,
  esperarPerfilGuard,
} from './entidad-asignada.guard';

/**
 * HU178: un decano sin facultad o un coordinador sin programa no entra a las vistas que dependen de esa entidad; ve un
 * aviso único.
 */
describe('HU178: guards de entidad asignada (decano sin facultad, coordinador sin programa)', () => {
  let router: jasmine.SpyObj<Router>;
  let usuario: User | null;
  let perfilListo: jasmine.Spy;

  const user = (overrides: Partial<User>): User => ({
    id: 'user-1',
    name: 'Usuario de prueba',
    email: 'usuario@example.test',
    role: 'DECANO',
    institutionName: 'UCO',
    status: 'active',
    ...overrides,
  });

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.callFake((commands) => ({ commands }) as unknown as UrlTree);
    usuario = null;
    perfilListo = jasmine.createSpy('perfilListo').and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: { currentUser: () => usuario, perfilListo } },
      ],
    });
  });

  const correrDecano = () => TestBed.runInInjectionContext(() => decanoConFacultadGuard({} as never, {} as never));
  const correrCoordinador = () =>
    TestBed.runInInjectionContext(() => coordinadorConProgramaGuard({} as never, {} as never));
  const correrEspera = () => TestBed.runInInjectionContext(() => esperarPerfilGuard({} as never, {} as never));

  it('cada rol tiene su propio aviso', () => {
    expect(RUTA_SIN_ENTIDAD.DECANO).toBe('/app/decano/sin-facultad');
    expect(RUTA_SIN_ENTIDAD.COORDINADOR).toBe('/app/coordinador/sin-programa');
  });

  describe('decanoConFacultadGuard', () => {
    it('redirige al aviso único cuando el perfil confirma que el decano no tiene facultad', async () => {
      usuario = user({ vinculos: [] });

      const resultado = await correrDecano();

      expect(perfilListo).toHaveBeenCalled();
      expect(router.createUrlTree).toHaveBeenCalledWith([RUTA_SIN_ENTIDAD.DECANO]);
      expect(resultado).not.toBeTrue();
    });

    it('deja pasar al decano con facultad', async () => {
      usuario = user({ vinculos: [{ rol: 'DECANO', nombreEntidad: 'Facultad de Ciencias' }] });

      expect(await correrDecano()).toBeTrue();
      expect(router.createUrlTree).not.toHaveBeenCalled();
    });

    it('espera el perfil en curso y decide con el usuario ya hidratado', async () => {
      usuario = user({});
      perfilListo.and.callFake(async () => {
        usuario = user({ vinculos: [] });
      });

      await correrDecano();

      expect(router.createUrlTree).toHaveBeenCalledWith([RUTA_SIN_ENTIDAD.DECANO]);
    });

    it('si el perfil no informa vínculos no presume la falta de facultad (falla abierta)', async () => {
      usuario = user({});

      expect(await correrDecano()).toBeTrue();
    });

    it('no espera el perfil ni interviene para otros roles o sin sesión', async () => {
      usuario = user({ role: 'DOCENTE', vinculos: [] });
      expect(await correrDecano()).toBeTrue();
      usuario = null;
      expect(await correrDecano()).toBeTrue();
      expect(perfilListo).not.toHaveBeenCalled();
    });

    it('si el perfil tarda más del límite decide con lo que haya', async () => {
      jasmine.clock().install();
      try {
        usuario = user({});
        perfilListo.and.returnValue(new Promise<void>(() => undefined));
        const resultado = correrDecano() as Promise<unknown>;
        jasmine.clock().tick(10_000);
        expect(await resultado).toBeTrue();
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });

  describe('coordinadorConProgramaGuard', () => {
    it('redirige al aviso único cuando el perfil confirma que el coordinador no tiene programa', async () => {
      usuario = user({ role: 'COORDINADOR', vinculos: [] });

      const resultado = await correrCoordinador();

      expect(perfilListo).toHaveBeenCalled();
      expect(router.createUrlTree).toHaveBeenCalledWith([RUTA_SIN_ENTIDAD.COORDINADOR]);
      expect(resultado).not.toBeTrue();
    });

    it('deja pasar al coordinador con programa', async () => {
      usuario = user({ role: 'COORDINADOR', vinculos: [{ rol: 'COORDINADOR', nombreEntidad: 'Derecho' }] });

      expect(await correrCoordinador()).toBeTrue();
      expect(router.createUrlTree).not.toHaveBeenCalled();
    });

    it('el vínculo DECANO no cuenta como programa del coordinador', async () => {
      usuario = user({
        role: 'DECANO',
        roles: ['DECANO', 'COORDINADOR'],
        vinculos: [{ rol: 'DECANO', nombreEntidad: 'Facultad de Ciencias' }],
      });

      await correrCoordinador();

      expect(router.createUrlTree).toHaveBeenCalledWith([RUTA_SIN_ENTIDAD.COORDINADOR]);
    });

    it('no interviene para el decano sin el rol COORDINADOR', async () => {
      usuario = user({ vinculos: [] });

      expect(await correrCoordinador()).toBeTrue();
      expect(perfilListo).not.toHaveBeenCalled();
    });

    it('si el perfil no informa vínculos no presume la falta de programa (falla abierta)', async () => {
      usuario = user({ role: 'COORDINADOR' });

      expect(await correrCoordinador()).toBeTrue();
    });
  });

  describe('esperarPerfilGuard', () => {
    it('espera el perfil del decano y del coordinador y nunca redirige', async () => {
      usuario = user({ vinculos: [] });
      expect(await correrEspera()).toBeTrue();
      usuario = user({ role: 'COORDINADOR', vinculos: [] });
      expect(await correrEspera()).toBeTrue();

      expect(perfilListo).toHaveBeenCalledTimes(2);
      expect(router.createUrlTree).not.toHaveBeenCalled();
    });

    it('para otros roles o sin sesión no espera el perfil', async () => {
      usuario = user({ role: 'ESTUDIANTE' });
      expect(await correrEspera()).toBeTrue();
      usuario = null;
      expect(await correrEspera()).toBeTrue();

      expect(perfilListo).not.toHaveBeenCalled();
    });
  });
});
