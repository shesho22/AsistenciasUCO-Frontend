import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MessageAdminHandle, MessageAdminOptions } from 'minifront-mensajes';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { MESSAGE_ADMIN_MOUNT, MessageAdministrationComponent } from './message-administration.component';

describe('MessageAdministrationComponent', () => {
  let fixture: ComponentFixture<MessageAdministrationComponent>;
  let component: MessageAdministrationComponent;
  let authService: {
    isBaselineMode: jasmine.Spy;
    currentUser: ReturnType<typeof signal<User | null>>;
    startBaselineLogin: jasmine.Spy;
  };
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

  function lastOptions(): MessageAdminOptions {
    return mountSpy.calls.mostRecent().args[1] as MessageAdminOptions;
  }

  async function createComponent(): Promise<void> {
    fixture = TestBed.createComponent(MessageAdministrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    originalRuntimeEnv = (window as unknown as { env?: unknown }).env;
    (window as unknown as { env: Record<string, string> }).env = {
      SECURITY_PROVIDER: 'baseline',
      MESSAGEUCOLAB_API_BASE_URL: '/mensajes-api/',
      MESSAGEUCOLAB_APPLICATION_NAME: 'Asistencias Test',
      MESSAGEUCOLAB_ENVIRONMENT_NAME: 'Testing',
    };

    authService = {
      isBaselineMode: jasmine.createSpy('isBaselineMode').and.returnValue(true),
      currentUser: signal<User | null>(adminUser),
      startBaselineLogin: jasmine.createSpy('startBaselineLogin'),
    };
    unmountSpy = jasmine.createSpy('unmount');
    mountSpy = jasmine.createSpy('mount').and.returnValue({ unmount: unmountSpy } as unknown as MessageAdminHandle);

    await TestBed.configureTestingModule({
      imports: [MessageAdministrationComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MESSAGE_ADMIN_MOUNT, useValue: mountSpy },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    (window as unknown as { env?: unknown }).env = originalRuntimeEnv;
  });

  it('monta la administración de MessageUcoLab con la configuración de runtime', async () => {
    await createComponent();

    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(lastOptions().apiBaseUrl).toBe('/mensajes-api');
    expect(lastOptions().applicationName).toBe('Asistencias Test');
    expect(lastOptions().environmentName).toBe('Testing');
    expect(lastOptions().lockContext).toBeTrue();
    expect(lastOptions().allowApplicationCreation).toBeFalse();
    expect(lastOptions().loginUrl).toBe(`${window.location.origin}/login`);
    expect(component.state()).toBe('ready');
  });

  it('usa los valores por defecto cuando env.js no define MessageUcoLab', async () => {
    (window as unknown as { env: Record<string, string> }).env = { SECURITY_PROVIDER: 'baseline' };

    await createComponent();

    expect(lastOptions().apiBaseUrl).toBe('/messageucolab');
    expect(lastOptions().applicationName).toBe('Asistencias UCO');
    expect(lastOptions().environmentName).toBe('Develop');
  });

  it('no monta nada en modo legacy y lo informa', async () => {
    authService.isBaselineMode.and.returnValue(false);

    await createComponent();

    expect(mountSpy).not.toHaveBeenCalled();
    expect(component.state()).toBe('forbidden');
    expect(fixture.nativeElement.textContent).toContain('SECURITY_PROVIDER=baseline');
  });

  it('no monta nada si el usuario no es administrador', async () => {
    authService.currentUser.set({ ...adminUser, role: 'DOCENTE' });

    await createComponent();

    expect(mountSpy).not.toHaveBeenCalled();
    expect(component.state()).toBe('forbidden');
    expect(fixture.nativeElement.textContent).toContain('reservada a ADMINISTRADOR');
  });

  it('no monta nada si no hay usuario autenticado', async () => {
    authService.currentUser.set(null);

    await createComponent();

    expect(mountSpy).not.toHaveBeenCalled();
    expect(component.state()).toBe('forbidden');
  });

  it('acepta el alias ADMIN como administrador', async () => {
    authService.currentUser.set({ ...adminUser, role: 'ADMIN' as User['role'] });

    await createComponent();

    expect(mountSpy).toHaveBeenCalledTimes(1);
    expect(component.state()).toBe('ready');
  });

  it('muestra el error y permite reintentar cuando el montaje falla', async () => {
    mountSpy.and.throwError('boom');

    await createComponent();

    expect(component.state()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar la administración de mensajes');

    mountSpy.and.returnValue({ unmount: unmountSpy });
    component.load();
    fixture.detectChanges();

    expect(component.state()).toBe('ready');
  });

  it('ofrece iniciar sesión cuando el componente responde 401 y vuelve a esta ruta', async () => {
    await createComponent();

    lastOptions().onUnauthorized?.(new Error('401'));
    fixture.detectChanges();

    expect(component.state()).toBe('unauthorized');
    const signIn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button');
    expect(signIn?.textContent).toContain('Iniciar sesión institucional');

    signIn?.click();

    expect(authService.startBaselineLogin).toHaveBeenCalledWith('/app/admin/configuracion/mensajes');
  });

  it('desmonta el micro frontend al recargar y al destruir el componente', async () => {
    await createComponent();

    component.load();
    expect(unmountSpy).toHaveBeenCalledTimes(1);

    fixture.destroy();

    expect(unmountSpy).toHaveBeenCalledTimes(2);
  });
});
