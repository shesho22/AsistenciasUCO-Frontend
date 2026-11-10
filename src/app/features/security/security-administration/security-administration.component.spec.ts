import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { readDesignToken } from '../../../shared/utils/design-tokens';
import { ComponentesExternosService } from '../../../core/services/componentes-externos.service';
import {
  SECURITY_UI_LOADER,
  SecurityAdministrationComponent,
  SecurityUiModuleLoader,
  ensureBrowserProcessShim,
} from './security-administration.component';

describe('SecurityAdministrationComponent', () => {
  let fixture: ComponentFixture<SecurityAdministrationComponent>;
  let component: SecurityAdministrationComponent;
  let fetchSpy: jasmine.Spy;
  let authService: {
    isBaselineMode: jasmine.Spy;
    currentUser: ReturnType<typeof signal<User | null>>;
    startBaselineLogin: jasmine.Spy;
  };
  let securityUiLoader: jasmine.SpyObj<SecurityUiModuleLoader>;
  let mountSpy: jasmine.Spy;
  let unmountSpy: jasmine.Spy;
  let originalRuntimeEnv: unknown;

  const adminUser: User = {
    id: 'admin-1',
    name: 'Administrador',
    email: 'admin@uco.edu.co',
    role: 'ADMINISTRADOR',
    institutionName: 'Universidad Católica de Oriente',
    status: 'active',
  };

  const nonAdminUser: User = {
    ...adminUser,
    id: 'teacher-1',
    role: 'DOCENTE',
  };

  function response(status: number): Response {
    return { status, ok: status >= 200 && status < 300 } as Response;
  }

  async function finishInitialLoad(): Promise<void> {
    fixture.detectChanges();
    await component.load();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    originalRuntimeEnv = (window as unknown as { env?: unknown }).env;
    (window as unknown as { env: Record<string, string> }).env = {
      SECURITY_PROVIDER: 'baseline',
      SECURITY_BASELINE_URL: 'http://pdp.test',
      SECURITY_BASELINE_UI_URL: 'http://security-ui.test',
      SECURITY_BASELINE_APPLICATION_ID: 'application-test',
    };

    authService = {
      isBaselineMode: jasmine.createSpy('isBaselineMode').and.returnValue(true),
      currentUser: signal<User | null>(adminUser),
      startBaselineLogin: jasmine.createSpy('startBaselineLogin'),
    };
    securityUiLoader = jasmine.createSpyObj<SecurityUiModuleLoader>('SecurityUiModuleLoader', ['load']);
    mountSpy = jasmine.createSpy('mount');
    unmountSpy = jasmine.createSpy('unmount');
    mountSpy.and.returnValue({ unmount: unmountSpy });
    securityUiLoader.load.and.resolveTo({ mount: mountSpy });

    await TestBed.configureTestingModule({
      imports: [SecurityAdministrationComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SECURITY_UI_LOADER, useValue: securityUiLoader },
      ],
    }).compileComponents();

    fetchSpy = spyOn(window, 'fetch');
    fetchSpy.and.resolveTo(response(200));
    fixture = TestBed.createComponent(SecurityAdministrationComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    (window as unknown as { env?: unknown }).env = originalRuntimeEnv;
  });

  it('empieza en estado loading antes de inicializar la vista', () => {
    expect(component.state()).toBe('loading');
    expect(component.message()).toBe('');
  });

  it('F-ADM-S14: el contenedor del modulo externo permite desplazar las pestanas en 375 px', () => {
    fixture.detectChanges();
    const punto = (fixture.nativeElement as HTMLElement).querySelector('div.mt-4') as HTMLElement;
    expect(punto.className).toContain('overflow-x-auto');
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.className).toContain('font-serif');
  });

  it('rechaza el modo legacy sin consultar el BFF ni asignar permisos', async () => {
    authService.isBaselineMode.and.returnValue(false);

    await finishInitialLoad();

    expect(component.state()).toBe('forbidden');
    expect(component.message()).toContain('SECURITY_PROVIDER=baseline');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(authService.startBaselineLogin).not.toHaveBeenCalled();
  });

  it('rechaza una sesión sin usuario autenticado', async () => {
    authService.currentUser.set(null);

    await finishInitialLoad();

    expect(component.state()).toBe('forbidden');
    expect(component.message()).toContain('ADMINISTRADOR');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rechaza un usuario que no tiene rol administrador', async () => {
    authService.currentUser.set(nonAdminUser);

    await finishInitialLoad();

    expect(component.state()).toBe('forbidden');
    expect(component.message()).toContain('ADMINISTRADOR');
    expect(securityUiLoader.load).not.toHaveBeenCalled();
  });

  it('permite ADMIN y monta Security UI con las opciones del contrato', async () => {
    authService.currentUser.set({ ...adminUser, role: 'ADMIN' });

    await finishInitialLoad();

    expect(component.state()).toBe('ready');
    expect(fetchSpy).toHaveBeenCalledWith('http://pdp.test/api/v1/session', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    expect(securityUiLoader.load).toHaveBeenCalledWith('http://security-ui.test/security-administration.js');
    expect(mountSpy).toHaveBeenCalled();
    const options = mountSpy.calls.mostRecent().args[1];
    expect(options).toEqual({
      applicationId: 'application-test',
      applicationName: 'AsistenciasUCO',
      apiBaseUrl: 'http://pdp.test',
      allowApplicationLifecycleManagement: false,
      theme: { accent: readDesignToken('--color-primary-700'), fontFamily: readDesignToken('--font-sans'), radius: '12px' },
    });
  });

  it('mantiene ready para una respuesta BFF 200 y limpia el módulo al destruirse', async () => {
    await finishInitialLoad();

    expect(component.state()).toBe('ready');
    fixture.destroy();
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('muestra login para una respuesta BFF 401 y permite iniciar sesión', async () => {
    fetchSpy.and.resolveTo(response(401));

    await finishInitialLoad();
    component.signInBff();

    expect(component.state()).toBe('unauthorized');
    expect(component.message()).toContain('no está activa');
    expect(authService.startBaselineLogin).toHaveBeenCalledWith('/app/admin/seguridad');
    expect(securityUiLoader.load).not.toHaveBeenCalled();
  });

  it('muestra forbidden cuando el PDP responde 403', async () => {
    fetchSpy.and.resolveTo(response(403));

    await finishInitialLoad();

    expect(component.state()).toBe('forbidden');
    expect(component.message()).toContain('rechazó');
  });

  it('muestra error para otros estados HTTP del BFF', async () => {
    fetchSpy.and.resolveTo(response(503));

    await finishInitialLoad();

    expect(component.state()).toBe('error');
    expect(component.message()).toContain('HTTP 503');
  });

  it('muestra error cuando falla la consulta de red al BFF', async () => {
    fetchSpy.and.rejectWith(new Error('network'));

    await finishInitialLoad();

    expect(component.state()).toBe('error');
    expect(component.message()).toContain('contactar la sesión BFF');
  });

  it('muestra error cuando el módulo remoto no puede importarse', async () => {
    securityUiLoader.load.and.rejectWith(new Error('module unavailable'));

    await finishInitialLoad();

    expect(component.state()).toBe('error');
    expect(component.message()).toContain('cargar Security UI');
  });

  it('muestra error si el módulo remoto no exporta mount', async () => {
    securityUiLoader.load.and.resolveTo({} as never);

    await finishInitialLoad();

    expect(component.state()).toBe('error');
    expect(mountSpy).not.toHaveBeenCalled();
  });

  it('muestra error si el montaje remoto lanza una excepción', async () => {
    mountSpy.and.throwError('mount failed');

    await finishInitialLoad();

    expect(component.state()).toBe('error');
    expect(component.message()).toContain('cargar Security UI');
  });

  it('muestra error si falta el contenedor de montaje', async () => {
    (component as unknown as { mountPoint?: unknown }).mountPoint = undefined;

    await finishInitialLoad();

    expect(component.state()).toBe('error');
    expect(mountSpy).not.toHaveBeenCalled();
  });

  it('comparte la misma promesa para llamadas load concurrentes', async () => {
    let resolveFetch!: (value: Response) => void;
    fetchSpy.and.returnValue(new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));

    const first = component.load();
    const second = component.load();

    resolveFetch(response(401));
    await Promise.all([first, second]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('permite reintentar después de un fallo BFF y recuperarse', async () => {
    fetchSpy.and.returnValue(Promise.resolve(response(500)));
    await finishInitialLoad();
    expect(component.state()).toBe('error');

    fetchSpy.and.returnValue(Promise.resolve(response(200)));
    await component.load();

    expect(component.state()).toBe('ready');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('no concede roles ni privilegios automáticamente desde Angular', async () => {
    authService.currentUser.set({ ...nonAdminUser, roles: [] });

    await finishInitialLoad();

    expect(component.state()).toBe('forbidden');
    expect(authService.currentUser()).toEqual(jasmine.objectContaining({ role: 'DOCENTE', roles: [] }));
    expect(securityUiLoader.load).not.toHaveBeenCalled();
  });

  describe('F3-ADM-07: estado explicativo sin exponer direcciones locales y aviso al menu', () => {
    const FILTRADOS = ['localhost', '127.0.0.1', '5175', '18080', 'http://'];

    function sinDireccionesLocales(texto: string): void {
      for (const fragmento of FILTRADOS) {
        expect(texto).not.toContain(fragmento);
      }
    }

    it('si el BFF no responde, el mensaje no expone puertos ni URLs y el menu oculta la entrada', async () => {
      fetchSpy.and.rejectWith(new Error('network'));

      await finishInitialLoad();

      expect(component.state()).toBe('error');
      sinDireccionesLocales(component.message());
      sinDireccionesLocales((fixture.nativeElement as HTMLElement).textContent ?? '');
      expect(TestBed.inject(ComponentesExternosService).disponible('seguridad')).toBeFalse();
    });

    it('si el modulo remoto no carga, el mensaje no expone la URL del servidor local', async () => {
      securityUiLoader.load.and.rejectWith(new Error('module unavailable'));

      await finishInitialLoad();

      sinDireccionesLocales(component.message());
      expect(TestBed.inject(ComponentesExternosService).disponible('seguridad')).toBeFalse();
    });

    it('al cargar correctamente el componente queda disponible para el menu', async () => {
      const externos = TestBed.inject(ComponentesExternosService);
      externos.marcarNoDisponible('seguridad');

      await finishInitialLoad();

      expect(component.state()).toBe('ready');
      expect(externos.disponible('seguridad')).toBeTrue();
    });
  });
});

/**
 * El bundle publicado de security-ui referencia `process.env.NODE_ENV` (184 veces) y su build no lo reemplaza: en el
 * navegador `import()` falla con "process is not defined". El anfitrion lo define de forma minima antes de importarlo.
 */
describe('SecurityAdministrationComponent: process para el bundle de Security UI', () => {
  const global = globalThis as { process?: unknown };
  let procesoOriginal: unknown;
  let teniaProceso: boolean;

  beforeEach(() => {
    teniaProceso = 'process' in global;
    procesoOriginal = global.process;
    delete global.process;
  });

  afterEach(() => {
    if (teniaProceso) {
      global.process = procesoOriginal;
    } else {
      delete global.process;
    }
  });

  it('define process.env.NODE_ENV=production cuando el navegador no tiene process', () => {
    ensureBrowserProcessShim();

    expect((global.process as { env: { NODE_ENV: string } }).env.NODE_ENV).toBe('production');
  });

  it('no pisa un process existente ni su NODE_ENV', () => {
    global.process = { env: { NODE_ENV: 'development', OTRA: 'x' } };

    ensureBrowserProcessShim();

    expect(global.process).toEqual({ env: { NODE_ENV: 'development', OTRA: 'x' } });
  });

  it('completa env/NODE_ENV si process existe pero sin env', () => {
    global.process = { version: 'v0' };

    ensureBrowserProcessShim();

    expect(global.process).toEqual({ version: 'v0', env: { NODE_ENV: 'production' } });
  });

  it('el cargador por defecto define process antes de intentar importar el modulo remoto', async () => {
    // Karma reescribe el import() dinamico con su empaquetador, por lo que no se puede evaluar un modulo real aqui: se
    // comprueba el orden, es decir, que process ya existe cuando el import se intenta (aunque este falle).
    TestBed.configureTestingModule({});
    const loader = TestBed.inject(SECURITY_UI_LOADER);
    expect('process' in global).toBeFalse();

    await loader.load('http://127.0.0.1:1/no-existe.js').catch(() => undefined);

    expect((global.process as { env: { NODE_ENV: string } }).env.NODE_ENV).toBe('production');
  });

});
