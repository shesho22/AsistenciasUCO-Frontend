import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/components/toast/toast.component';
import { User } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

const URL = `${environment.apiUrl}/usuarios/perfil`;

/** Usuario armado desde el token: su documento NO es fuente valida para la pantalla (APP-06). */
const usuarioToken: User = {
  id: 'usr-est',
  name: 'Nombre Token',
  email: 'token@uco.edu.co',
  role: 'ESTUDIANTE',
  primerNombre: 'Nombre',
  primerApellido: 'Token',
  institutionName: 'Universidad Católica de Oriente',
  status: 'active',
  numeroIdentificacion: 999000111,
};

const perfilApi = (extra: Record<string, unknown> = {}) => ({
  idUsuario: 'usr-est',
  codigoTipoIdentificacion: 'CC',
  nombreTipoIdentificacion: 'Cédula de ciudadanía',
  numeroIdentificacion: 1017000001,
  primerNombre: 'Ana',
  segundoNombre: 'María',
  primerApellido: 'Pérez',
  segundoApellido: null,
  nombreCompleto: 'Ana María Pérez',
  correo: 'ana.perez@uco.edu.co',
  correoConfirmado: true,
  estaActivo: true,
  vinculos: [
    { rol: 'ESTUDIANTE', idEntidad: 'prog-1', nombreEntidad: 'Ingeniería de Sistemas', detalle: 'Facultad de Ingeniería', estaActivo: true },
  ],
  ...extra,
});

/** APP-06: identificacion del perfil propio leida del GET institucional (ID-01..ID-12). */
describe('ProfileComponent — identificación institucional (APP-06)', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;
  let mockMode: ReturnType<typeof signal<boolean>>;

  const texto = (testId: string): string =>
    (fixture.nativeElement.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const responder = (body: object, init?: { status: number; statusText: string }) => {
    http.expectOne(URL).flush(body, init);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    mockMode = signal(false);
    const auth = jasmine.createSpyObj('AuthService', ['fetchProfileFromBackend', 'updateUserProfile'], {
      currentUser: signal<User | null>(usuarioToken).asReadonly(),
      isMockMode: mockMode.asReadonly(),
    });
    auth.fetchProfileFromBackend.and.returnValue(Promise.resolve(usuarioToken));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['show']);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: Location, useValue: jasmine.createSpyObj('Location', ['back']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('ID-01/ID-05 consulta una sola vez el GET propio, sin parámetros de usuario', () => {
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.urlWithParams).toBe(URL);
    req.flush({ exitoso: true, datos: perfilApi() });
  });

  it('ID-02 muestra el tipo y el número de identificación entregados por la API', () => {
    responder({ exitoso: true, datos: perfilApi() });

    expect(texto('perfil-resumen-documento')).toBe('CC 1017000001');
    expect(texto('perfil-tipo-identificacion')).toBe('Cédula de ciudadanía (CC)');
    expect(texto('perfil-numero-identificacion')).toBe('1017000001');
    expect(fixture.nativeElement.textContent).not.toContain('999000111');
  });

  it('ID-03 un documento null se presenta como no registrado, sin usar el token', () => {
    responder({
      exitoso: true,
      datos: perfilApi({ codigoTipoIdentificacion: null, nombreTipoIdentificacion: null, numeroIdentificacion: null }),
    });

    expect(texto('perfil-resumen-documento')).toBe('Sin registrar');
    expect(texto('perfil-tipo-identificacion')).toBe('Sin registrar');
    expect(texto('perfil-numero-identificacion')).toBe('Sin registrar');
    expect(texto('perfil-expediente-documento')).toBe('Sin registrar');
    expect(fixture.nativeElement.textContent).not.toContain('999000111');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('ID-04 el resumen y el expediente muestran el mismo documento, nombre y correo', () => {
    responder({ exitoso: true, datos: perfilApi() });

    expect(texto('perfil-resumen-documento')).toBe(texto('perfil-expediente-documento'));
    expect(texto('perfil-resumen-nombre')).toBe('Ana María Pérez');
    expect(texto('perfil-resumen-correo')).toBe('ana.perez@uco.edu.co');
    expect(texto('perfil-correo-institucional')).toBe('ana.perez@uco.edu.co');
    expect(component.formModel.primerNombre).toBe('Ana');
    expect(component.formModel.segundoNombre).toBe('María');
    expect(fixture.nativeElement.textContent).toContain('Ingeniería de Sistemas');
  });

  for (const [status, statusText] of [[401, 'Unauthorized'], [403, 'Forbidden']] as const) {
    it(`ID-06 un ${status} se informa como error y no como dato ausente`, () => {
      responder({}, { status, statusText });

      expect(texto('perfil-resumen-documento')).toBe('No disponible');
      expect(texto('perfil-numero-identificacion')).toBe('No disponible');
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Sin registrar');
      expect(fixture.nativeElement.textContent).not.toContain('999000111');
    });
  }

  it('ID-07 un 404 se informa como error', () => {
    responder({}, { status: 404, statusText: 'Not Found' });

    expect(texto('perfil-resumen-documento')).toBe('No disponible');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('no fue encontrado');
  });

  it('ID-08 un fallo de conexión se informa como error de red', () => {
    http.expectOne(URL).error(new ProgressEvent('error'), { status: 0, statusText: '' });
    fixture.detectChanges();

    expect(texto('perfil-resumen-documento')).toBe('No disponible');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('No fue posible conectar');
  });

  it('ID-09 una respuesta válida sin datos se informa sin inventar un documento', () => {
    responder({ exitoso: true, datos: null });

    expect(texto('perfil-resumen-documento')).toBe('No disponible');
    expect(texto('perfil-expediente-sin-datos')).toContain('no devolvió');
    expect(fixture.nativeElement.textContent).not.toContain('999000111');
  });

  it('ID-10 mientras la consulta está activa, nuevas cargas no repiten el GET', () => {
    fixture.detectChanges();
    component.ngOnInit();
    fixture.detectChanges();

    expect(texto('perfil-resumen-documento')).toBe('Consultando…');
    responder({ exitoso: true, datos: perfilApi() });
    http.expectNone(URL);
  });

  it('ID-11 no persiste datos personales en el almacenamiento del navegador', () => {
    responder({ exitoso: true, datos: perfilApi() });

    const almacenado = [localStorage, sessionStorage]
      .flatMap((s) => Array.from({ length: s.length }, (_, i) => `${s.key(i)}=${s.getItem(s.key(i) ?? '')}`))
      .join('|');
    for (const dato of ['1017000001', 'Ana María Pérez', 'ana.perez@uco.edu.co']) {
      expect(almacenado).not.toContain(dato);
    }
  });

  it('ID-12 en sesión institucional real se conserva el modo consulta, sin edición ni PUT', () => {
    responder({ exitoso: true, datos: perfilApi() });

    const botones = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(botones.some((b) => /Editar/.test(b.textContent ?? ''))).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Modo Consulta');
    http.expectNone((req) => req.method === 'PUT');
  });
});
