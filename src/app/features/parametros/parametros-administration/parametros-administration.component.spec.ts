import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import {
  PARAMETROS_ADMIN_LOADER,
  ParametrosAdminHandle,
  ParametrosAdminModule,
  ParametrosAdminOptions,
} from './parametros-administration.contract';
import {
  PARAMETROS_REFRESH_INTERVAL_MS,
  ParametrosAdministrationComponent,
} from './parametros-administration.component';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Evita avisos de rechazo no manejado cuando la prueba rechaza antes de que el componente espere.
  promise.catch(() => undefined);
  return { promise, resolve, reject };
}

const APPLICATION_ID = '0d24a3a4-8c9d-4ac3-9b1a-a97ef16ea186';

describe('ParametrosAdministrationComponent', () => {
  let fixture: ComponentFixture<ParametrosAdministrationComponent>;
  let component: ParametrosAdministrationComponent;
  let authService: {
    isBaselineMode: jasmine.Spy;
    currentUser: ReturnType<typeof signal<User | null>>;
    startBaselineLogin: jasmine.Spy;
  };
  let loaderSpy: jasmine.Spy;
  let mountSpy: jasmine.Spy;
  let unmountSpy: jasmine.Spy;
  let ready: Deferred<void>;
  let originalRuntimeEnv: unknown;

  const adminUser: User = {
    id: 'admin-1',
    name: 'Administrador',
    email: 'admin@uco.edu.co',
    role: 'ADMINISTRADOR',
    institutionName: 'Universidad Católica de Oriente',
    status: 'active',
  };

  function setEnv(env: Record<string, string>): void {
    (window as unknown as { env: Record<string, string> }).env = env;
  }

  function lastOptions(): ParametrosAdminOptions {
    return mountSpy.calls.mostRecent().args[1] as ParametrosAdminOptions;
  }

  function handle(): ParametrosAdminHandle {
    return {
      element: document.createElement('uco-parametros-administration'),
      ready: ready.promise,
      refresh: () => Promise.resolve(),
      unmount: unmountSpy,
    };
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function createComponent(): Promise<void> {
    fixture = TestBed.createComponent(ParametrosAdministrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await settle();
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  beforeEach(async () => {
    originalRuntimeEnv = (window as unknown as { env?: unknown }).env;
    setEnv({
      SECURITY_PROVIDER: 'baseline',
      CATALOGO_PARAMETROS_APPLICATION_ID: ` ${APPLICATION_ID} `,
      CATALOGO_PARAMETROS_UI_URL: '/otro-ui/parametros-administration.js',
      CATALOGO_PARAMETROS_API_BASE_URL: '/otro-catalogo/api/v1/',
    });

    authService = {
      isBaselineMode: jasmine.createSpy('isBaselineMode').and.returnValue(true),
      currentUser: signal<User | null>(adminUser),
      startBaselineLogin: jasmine.createSpy('startBaselineLogin'),
    };
    ready = deferred<void>();
    unmountSpy = jasmine.createSpy('unmount');
    mountSpy = jasmine.createSpy('mount').and.callFake(() => handle());
    loaderSpy = jasmine
      .createSpy('loader')
      .and.callFake(() => Promise.resolve({ mount: mountSpy } as unknown as ParametrosAdminModule));

    await TestBed.configureTestingModule({
      imports: [ParametrosAdministrationComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: PARAMETROS_ADMIN_LOADER, useValue: loaderSpy },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    (window as unknown as { env?: unknown }).env = originalRuntimeEnv;
  });

  it('descarga el módulo y lo monta con la configuración de runtime y el refresco periódico desactivado', async () => {
    await createComponent();

    expect(loaderSpy).toHaveBeenCalledOnceWith('/otro-ui/parametros-administration.js');
    expect(mountSpy).toHaveBeenCalledTimes(1);
    const [element, options] = mountSpy.calls.mostRecent().args as [HTMLElement, ParametrosAdminOptions];
    expect(element instanceof HTMLElement).toBeTrue();
    expect(options.applicationId).toBe(APPLICATION_ID);
    expect(options.apiBaseUrl).toBe('/otro-catalogo/api/v1');
    expect(PARAMETROS_REFRESH_INTERVAL_MS).toBe(0);
    expect(options.refreshIntervalMs).toBe(0);
    expect(options.theme?.radius).toBe('12px');
    expect(options.theme?.accent).toBeTruthy();
    expect(typeof options.onAuthenticationRequired).toBe('function');
    expect(Object.keys(options)).not.toContain('secret');
    // Mientras handle.ready no se resuelve la pantalla informa la carga y oculta el punto de montaje.
    expect(component.state()).toBe('loading');
    expect(text()).toContain('Cargando la administración de parámetros');
    expect(element.hidden).toBeTrue();

    ready.resolve();
    await settle();

    expect(component.state()).toBe('ready');
    expect(element.hidden).toBeFalse();
    expect(text()).not.toContain('Cargando la administración de parámetros');
  });

  it('usa las rutas del mismo origen por defecto cuando env.js solo define el UUID', async () => {
    setEnv({ SECURITY_PROVIDER: 'baseline', CATALOGO_PARAMETROS_APPLICATION_ID: APPLICATION_ID });

    await createComponent();

    expect(loaderSpy).toHaveBeenCalledOnceWith('/parametros-ui/parametros-administration.js');
    expect(lastOptions().apiBaseUrl).toBe('/catalogo-parametros/api/v1');
  });

  it('no descarga nada si falta el UUID de la aplicación y lo informa sin ofrecer reintento', async () => {
    setEnv({ SECURITY_PROVIDER: 'baseline' });

    await createComponent();

    expect(loaderSpy).not.toHaveBeenCalled();
    expect(component.state()).toBe('misconfigured');
    expect(text()).toContain('CATALOGO_PARAMETROS_APPLICATION_ID');
    expect(text()).not.toContain('Reintentar');
  });

  it('no monta nada en modo legacy y lo informa', async () => {
    authService.isBaselineMode.and.returnValue(false);

    await createComponent();

    expect(loaderSpy).not.toHaveBeenCalled();
    expect(component.state()).toBe('forbidden');
    expect(text()).toContain('SECURITY_PROVIDER=baseline');
  });

  it('no monta nada si el usuario no es administrador', async () => {
    authService.currentUser.set({ ...adminUser, role: 'DOCENTE' });

    await createComponent();

    expect(loaderSpy).not.toHaveBeenCalled();
    expect(component.state()).toBe('forbidden');
    expect(text()).toContain('reservada a ADMINISTRADOR');
    expect(text()).not.toContain('Reintentar');
  });

  it('no monta nada si no hay usuario autenticado', async () => {
    authService.currentUser.set(null);

    await createComponent();

    expect(loaderSpy).not.toHaveBeenCalled();
    expect(component.state()).toBe('forbidden');
  });

  it('acepta el alias ADMIN como administrador', async () => {
    authService.currentUser.set({ ...adminUser, role: 'ADMIN' as User['role'] });

    await createComponent();
    ready.resolve();
    await settle();

    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(component.state()).toBe('ready');
  });

  it('muestra el error y permite reintentar cuando falla la descarga del módulo', async () => {
    loaderSpy.and.returnValue(Promise.reject(new TypeError('Failed to fetch dynamically imported module')));

    await createComponent();

    expect(mountSpy).not.toHaveBeenCalled();
    expect(component.state()).toBe('error');
    expect(text()).toContain('No se pudo cargar la administración de parámetros');
    expect(text()).toContain('Reintentar');

    loaderSpy.and.callFake(() => Promise.resolve({ mount: mountSpy } as unknown as ParametrosAdminModule));
    const reintento = component.load();
    ready.resolve();
    await reintento;
    fixture.detectChanges();

    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(component.state()).toBe('ready');
  });

  it('muestra el error cuando mount rechaza las opciones (TypeError síncrono)', async () => {
    mountSpy.and.throwError(new TypeError('applicationId debe ser el UUID de una aplicación del catálogo.'));

    await createComponent();

    expect(component.state()).toBe('error');
    expect(unmountSpy).not.toHaveBeenCalled();
  });

  it('desmonta y muestra el error cuando handle.ready se rechaza', async () => {
    await createComponent();

    ready.reject(new Error('No fue posible iniciar la administración de parámetros.'));
    await settle();

    expect(component.state()).toBe('error');
    expect(unmountSpy).toHaveBeenCalledTimes(1);
    expect(text()).toContain('No se pudo cargar la administración de parámetros');
  });

  it('ante un 401 pide iniciar sesión, desmonta el micro frontend y vuelve a la ruta actual', async () => {
    await createComponent();
    ready.resolve();
    await settle();
    expect(component.state()).toBe('ready');

    lastOptions().onAuthenticationRequired?.();
    fixture.detectChanges();

    expect(component.state()).toBe('unauthorized');
    expect(text()).toContain('Inicia sesión para continuar');
    await settle();
    expect(unmountSpy).toHaveBeenCalledTimes(1);

    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/app/admin/configuracion/parametros');
    const boton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Iniciar sesión institucional')
    ) as HTMLButtonElement;
    boton.click();

    expect(authService.startBaselineLogin).toHaveBeenCalledOnceWith('/app/admin/configuracion/parametros');
  });

  it('si el 401 llega en la carga inicial, el rechazo posterior de ready no lo reemplaza por un error genérico', async () => {
    await createComponent();

    lastOptions().onAuthenticationRequired?.();
    ready.reject(new Error('401'));
    await settle();

    expect(component.state()).toBe('unauthorized');
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('si el 401 llega en la carga inicial y ready se resuelve, la pantalla sigue pidiendo iniciar sesión', async () => {
    await createComponent();

    lastOptions().onAuthenticationRequired?.();
    ready.resolve();
    await settle();

    expect(component.state()).toBe('unauthorized');
  });

  it('el login usa la ruta de administración del sistema si la ruta actual es la raíz', async () => {
    await createComponent();

    component.signIn();

    expect(authService.startBaselineLogin).toHaveBeenCalledOnceWith('/app/admin/sistema');
  });

  it('desmonta al destruirse y no monta si el módulo llega después', async () => {
    const descarga = deferred<ParametrosAdminModule>();
    loaderSpy.and.returnValue(descarga.promise);
    await createComponent();

    fixture.destroy();
    descarga.resolve({ mount: mountSpy } as unknown as ParametrosAdminModule);
    await descarga.promise;
    await Promise.resolve();

    expect(mountSpy).not.toHaveBeenCalled();
  });

  it('desmonta el micro frontend montado cuando se destruye la pantalla', async () => {
    await createComponent();
    ready.resolve();
    await settle();

    fixture.destroy();

    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('ignora el 401 y el ready de un montaje anterior tras reintentar', async () => {
    await createComponent();
    const opcionesViejas = lastOptions();
    const readyViejo = ready;

    ready = deferred<void>();
    const reintento = component.load();
    expect(unmountSpy).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();

    opcionesViejas.onAuthenticationRequired?.();
    readyViejo.reject(new Error('viejo'));
    ready.resolve();
    await reintento;
    await settle();

    expect(mountSpy).toHaveBeenCalledTimes(2);
    expect(component.state()).toBe('ready');
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('un unmount que falla no impide reintentar', async () => {
    unmountSpy.and.throwError('ya desmontado');
    await createComponent();

    ready = deferred<void>();
    ready.resolve();
    await component.load();
    fixture.detectChanges();

    expect(component.state()).toBe('ready');
    expect(mountSpy).toHaveBeenCalledTimes(2);
  });
});
