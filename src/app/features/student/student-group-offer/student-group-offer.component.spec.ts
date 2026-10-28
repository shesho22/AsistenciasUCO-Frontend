import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StudentGroupOfferComponent } from './student-group-offer.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

const OFERTA = `${environment.apiUrl}/estudiante/oferta-academica`;
const SOLICITUDES = `${environment.apiUrl}/estudiante/solicitudes-matricula`;

const grupoApi = (id: string, extra: Record<string, unknown> = {}) => ({
  idGrupo: id,
  codigoGrupo: 1,
  nombreGrupo: `Grupo ${id}`,
  idAsignatura: 'asg-1',
  codigoAsignatura: 'MAT1',
  nombreAsignatura: 'Álgebra',
  nombreDocente: 'Doc Uno',
  idPeriodoAcademico: 'per-1',
  nombrePeriodoAcademico: '2026-2',
  fechaInicioPeriodo: '2026-07-20',
  fechaFinPeriodo: '2026-12-10',
  estadoPeriodo: 'VIGENTE',
  horario: 'Lunes 08:00-10:00',
  capacidadMaxima: 30,
  estudiantesActivos: 25,
  cuposDisponibles: 5,
  matriculado: false,
  idSolicitudAbierta: null,
  estadoSolicitud: null,
  tipoAsignatura: 'ESPECIFICA',
  transversal: false,
  ...extra,
});

/** HU008: pantalla "Oferta de grupos" del estudiante (OF-01..OF-07). */
describe('StudentGroupOfferComponent (HU008: oferta de grupos)', () => {
  let fixture: ComponentFixture<StudentGroupOfferComponent>;
  let component: StudentGroupOfferComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  function crear(): void {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [StudentGroupOfferComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
    });
    fixture = TestBed.createComponent(StudentGroupOfferComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function responderOferta(datos: unknown[], total = datos.length): void {
    http.expectOne((r) => r.url === OFERTA).flush({ exitoso: true, datos, total });
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('OF-01 carga la oferta al entrar y muestra cupos, horario y estado del período', () => {
    crear();
    responderOferta([grupoApi('g1'), grupoApi('g2', { estadoPeriodo: 'PROXIMO', cuposDisponibles: 0, horario: null }),
      grupoApi('g3', { tipoAsignatura: 'INSTITUCIONAL', transversal: true }), grupoApi('g4', { tipoAsignatura: 'BASICA', transversal: true })], 12);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('[data-testid="grupo-oferta"]').length).toBe(4);
    const etiquetas = Array.from(el.querySelectorAll('[data-testid="etiqueta-transversal"]')).map((e) => e.textContent?.trim());
    expect(etiquetas).toEqual(['Transversal · Institucional', 'Transversal · Básica']);
    expect(el.textContent).toContain('5 de 30');
    expect(el.textContent).toContain('Lunes 08:00-10:00');
    expect(el.textContent).toContain('Sin horario registrado');
    expect(el.textContent).toContain('Próximo');
    expect(el.textContent).toContain('Solicitar ingreso (lista de espera)');
    expect(component.total()).toBe(12);
  });

  it('OF-02 matriculado o con solicitud abierta no muestra el botón de solicitar', () => {
    crear();
    responderOferta([grupoApi('g1', { matriculado: true }), grupoApi('g2', { estadoSolicitud: 'EN_ESPERA', idSolicitudAbierta: 's1' }),
      grupoApi('g3', { estadoSolicitud: 'PENDIENTE', idSolicitudAbierta: 's2' })]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('[data-accion="solicitar-ingreso"]').length).toBe(0);
    expect(el.textContent).toContain('Ya estás matriculado');
    expect(el.textContent).toContain('Solicitud en espera');
    expect(el.textContent).toContain('Solicitud pendiente');
  });

  it('OF-03 solicitar ingreso envía el grupo, avisa y recarga la oferta', () => {
    crear();
    responderOferta([grupoApi('g1')]);

    (fixture.nativeElement.querySelector('[data-accion="solicitar-ingreso"]') as HTMLButtonElement).click();
    expect(component.enviando()).toBe('g1');
    const post = http.expectOne(SOLICITUDES);
    expect(post.request.body).toEqual({ grupoId: 'g1' });
    post.flush({ exitoso: true, datos: { id: 's1' } });

    expect(toastSpy.success).toHaveBeenCalled();
    expect(component.enviando()).toBeNull();
    responderOferta([grupoApi('g1', { estadoSolicitud: 'PENDIENTE', idSolicitudAbierta: 's1' })]);
    component.solicitar(grupoApi('g1') as never);
    http.expectOne(SOLICITUDES).flush({ message: 'Ya existe una solicitud abierta.' }, { status: 409, statusText: 'Conflict' });
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('OF-04 no envía dos solicitudes a la vez', () => {
    crear();
    responderOferta([grupoApi('g1'), grupoApi('g2')]);

    component.solicitar(grupoApi('g1') as never);
    component.solicitar(grupoApi('g2') as never);

    const posts = http.match(SOLICITUDES);
    expect(posts.length).toBe(1);
    posts[0].flush({ exitoso: true, datos: { id: 's1' } });
    responderOferta([]);
  });

  it('OF-05 la búsqueda consulta al servidor con debounce y vuelve a la página 1', fakeAsync(() => {
    crear();
    responderOferta([grupoApi('g1')], 30);
    component.cambiarPagina(3);
    http.expectOne((r) => r.url === OFERTA && r.params.get('pagina') === '3').flush({ exitoso: true, datos: [], total: 30 });

    component.onBusquedaChange('álgebra');
    tick(300);
    const req = http.expectOne((r) => r.url === OFERTA);
    expect(req.request.params.get('busqueda')).toBe('álgebra');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush({ exitoso: true, datos: [], total: 0 });
  }));

  it('OF-06 cambiar el tamaño de página vuelve a la primera', () => {
    crear();
    responderOferta([grupoApi('g1')], 30);

    component.cambiarTamano(20);
    const req = http.expectOne((r) => r.url === OFERTA);
    expect(req.request.params.get('tamano')).toBe('20');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('OF-07 un error del servidor se muestra y deja la lista vacía', () => {
    crear();
    http.expectOne((r) => r.url === OFERTA).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.grupos()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});
