import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileLinksComponent } from './profile-links.component';
import { BYPASS_GLOBAL_ERROR_TOAST } from '../../../core/interceptors/error.interceptor';
import { environment } from '../../../../environments/environment';

const URL = `${environment.apiUrl}/usuarios/perfil`;

const perfilApi = (vinculos: unknown[], extra: Record<string, unknown> = {}) => ({
  idUsuario: 'usr-1',
  codigoTipoIdentificacion: 'CC',
  nombreTipoIdentificacion: 'Cédula',
  numeroIdentificacion: 1017000001,
  primerNombre: 'Ana',
  segundoNombre: null,
  primerApellido: 'Pérez',
  segundoApellido: null,
  nombreCompleto: 'Ana Pérez',
  correo: 'ana@uco.edu.co',
  correoConfirmado: true,
  estaActivo: true,
  vinculos,
  ...extra,
});

/** HU006: expediente y vínculos del perfil propio (PL-01..PL-05). */
describe('ProfileLinksComponent (HU006)', () => {
  let fixture: ComponentFixture<ProfileLinksComponent>;
  let component: ProfileLinksComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProfileLinksComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ProfileLinksComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('PL-01 consulta el perfil propio sin toast global y muestra el expediente', () => {
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(BYPASS_GLOBAL_ERROR_TOAST)).toBeTrue();
    req.flush({ exitoso: true, datos: perfilApi([]) });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('CC 1017000001');
    expect(texto).toContain('ana@uco.edu.co');
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('ACTIVA');
    expect(texto).toContain('No tienes vínculos académicos registrados.');
    expect(component.cargando()).toBeFalse();
  });

  it('PL-02 lista los vínculos por rol con su estado', () => {
    http.expectOne(URL).flush({
      exitoso: true,
      datos: perfilApi([
        { rol: 'ESTUDIANTE', idEntidad: 'p1', nombreEntidad: 'Ingeniería', detalle: 'Facultad de Ingeniería', estaActivo: true },
        { rol: 'DOCENTE', idEntidad: 'p2', nombreEntidad: 'Derecho', detalle: 'Cátedra', estaActivo: false },
        { rol: 'ADMINISTRADOR', idEntidad: 'i1', nombreEntidad: 'UCO', detalle: null, estaActivo: true },
      ]),
    });
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="vinculo"]');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('Estudiante en');
    expect(items[0].textContent).toContain('Facultad de Ingeniería');
    expect(items[1].textContent).toContain('Docente en');
    expect(items[1].textContent).toContain('Inactivo');
    expect(items[2].textContent).toContain('Administra');
  });

  it('PL-03 marca el correo sin confirmar y la cuenta inactiva', () => {
    http.expectOne(URL).flush({ exitoso: true, datos: perfilApi([], { correoConfirmado: false, estaActivo: false }) });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('(sin confirmar)');
    expect(texto).toContain('INACTIVA');
  });

  it('PL-04 un error del servidor se muestra en la sección', () => {
    http.expectOne(URL).flush({ message: 'No se encontró el perfil' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(component.cargando()).toBeFalse();
  });

  it('PL-05 etiqueta desconocida cae al valor del rol', () => {
    http.expectOne(URL).flush({ exitoso: true, datos: null });
    expect(component.etiqueta('OTRO' as never)).toBe('OTRO');
    expect(component.etiqueta('DECANO')).toBe('Decano de');
    expect(component.etiqueta('COORDINADOR')).toBe('Coordina');
  });
});
