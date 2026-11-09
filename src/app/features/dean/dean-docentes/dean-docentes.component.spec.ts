import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { DeanDocentesComponent } from './dean-docentes.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import {
  EscenarioListado,
  afirmarAutorizacionDenegadaSinReintento,
  afirmarFalloRecuperableConReintento,
  afirmarNoImplementadoSinReintento,
} from '../../../shared/testing/listado-error.helper';

const DOCENTES = `${environment.apiUrl}/decano/docentes`;
const ESTRUCTURA = `${environment.apiUrl}/decano/estructura`;

describe('DeanDocentesComponent (HU128)', () => {
  let fixture: ComponentFixture<DeanDocentesComponent>;
  let component: DeanDocentesComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [DeanDocentesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanDocentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === DOCENTES);
    expect(req.request.params.has('idPrograma')).toBeFalse();
    req.flush({
      exitoso: true,
      datos: [
        {
          idDocente: 'd-1', numeroIdentificacion: '43000111', nombreCompleto: 'María Rostagno', correo: null, activo: true,
          programas: 'Ingeniería de Sistemas', totalProgramas: 1, totalGrupos: 2,
        },
      ],
      total: 1,
    });
    http.expectOne(ESTRUCTURA).flush({
      exitoso: true,
      datos: [{ id: 'f-1', nombre: 'Ingeniería', nombreDecano: null, activa: true, programas: [{ id: 'p-1', nombre: 'Sistemas', planes: [] }] }],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista los docentes con sus programas y ofrece los programas de la facultad', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('María Rostagno');
    expect(texto).toContain('Ingeniería de Sistemas');
    expect(texto).toContain('1 Docentes');
    expect(component.programas()).toEqual([{ id: 'p-1', nombre: 'Sistemas' }]);
  });

  it('filtra por programa, estado y texto volviendo a la primera página', () => {
    component.listado.pagina.set(4);
    component.onPrograma('p-1');
    const porPrograma = http.expectOne((r) => r.url === DOCENTES);
    expect(porPrograma.request.params.get('idPrograma')).toBe('p-1');
    expect(porPrograma.request.params.get('pagina')).toBe('1');
    porPrograma.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay docentes que coincidan con los filtros.');

    component.onEstado('INACTIVO');
    expect(http.expectOne((r) => r.url === DOCENTES).request.params.get('estaActivo')).toBe('false');

    component.busqueda.set('maria');
    component.listado.buscar();
    expect(http.expectOne((r) => r.url === DOCENTES).request.params.get('busqueda')).toBe('maria');
  });

  it('un error muestra el mensaje del servidor', () => {
    component.listado.irAPagina(2);
    http.expectOne((r) => r.url === DOCENTES).flush({ exitoso: false }, { status: 403, statusText: 'Forbidden' });
    expect(component.listado.filas()).toEqual([]);
    expect(toastSpy.error).toHaveBeenCalled();
  });
});

describe('DeanDocentesComponent sin estructura', () => {
  it('si la estructura falla, el selector queda vacío y la lista sigue', () => {
    TestBed.configureTestingModule({
      imports: [DeanDocentesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanDocentesComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url === DOCENTES).flush({ exitoso: true, datos: [], total: 0 });
    http.expectOne(ESTRUCTURA).flush({ exitoso: false }, { status: 500, statusText: 'Server Error' });
    expect(fixture.componentInstance.programas()).toEqual([]);
    http.verify();
  });
});

describe('DeanDocentesComponent (HU136, administrador)', () => {
  const ADMIN_DOCENTES = `${environment.apiUrl}/admin/docentes`;
  let fixture: ComponentFixture<DeanDocentesComponent>;
  let component: DeanDocentesComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeanDocentesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { comoAdministrador: true } } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanDocentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url === ADMIN_DOCENTES).flush({
      exitoso: true,
      datos: [{ idDocente: 'd-1', numeroIdentificacion: '43000111', nombreCompleto: 'María Rostagno', correo: 'maria@uco.edu.co',
        activo: true, programas: 'Ingeniería de Sistemas, Derecho', totalProgramas: 2, totalGrupos: 3 }],
      total: 1,
    });
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
      exitoso: true, datos: [{ id: 'f-1', nombre: 'Ingeniería' }, { id: 'f-2', nombre: 'Derecho' }],
    });
    http.expectOne((r) => r.url === `${environment.apiUrl}/decano/programas`).flush({
      datos: [{ id: 'p-1', nombre: 'Sistemas', nombreFacultad: 'Ingeniería' }, { id: 'p-2', nombre: 'Derecho', nombreFacultad: 'Derecho' }],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra los docentes de la institución con los textos del administrador', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(component.comoAdministrador).toBeTrue();
    expect(texto).toContain('Docentes de la Institución');
    expect(texto).toContain('Administración');
    expect(texto).toContain('María Rostagno');
    expect(component.programasVisibles().length).toBe(2);
  });

  it('filtrar por facultad acota los programas, limpia el programa y consulta con la facultad', () => {
    component.idPrograma.set('p-2');
    component.onFacultad('f-1');
    const req = http.expectOne((r) => r.url === ADMIN_DOCENTES);
    expect(req.request.params.get('idFacultad')).toBe('f-1');
    expect(req.request.params.has('idPrograma')).toBeFalse();
    req.flush({ exitoso: true, datos: [], total: 0 });
    expect(component.programasVisibles()).toEqual([{ id: 'p-1', nombre: 'Sistemas', facultad: 'Ingeniería' }]);

    component.onPrograma('p-1');
    const porPrograma = http.expectOne((r) => r.url === ADMIN_DOCENTES);
    expect(porPrograma.request.params.get('idPrograma')).toBe('p-1');
    expect(porPrograma.request.params.get('idFacultad')).toBe('f-1');
    porPrograma.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('el filtro de vínculo consulta sin vínculo y marca a los docentes retirados', () => {
    component.onEstadoVinculo('SIN_VINCULO');
    const req = http.expectOne((r) => r.url === ADMIN_DOCENTES);
    expect(req.request.params.get('estadoVinculo')).toBe('SIN_VINCULO');
    req.flush({
      exitoso: true,
      datos: [{ idDocente: 'd-9', numeroIdentificacion: '9', nombreCompleto: 'Luis Retirado', correo: null, activo: true,
        programas: null, totalProgramas: 0, totalGrupos: 0, tieneVinculoActivo: false }],
      total: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="sin-vinculo"]')).not.toBeNull();

    component.onEstadoVinculo('ACTIVO');
    expect(http.expectOne((r) => r.url === ADMIN_DOCENTES).request.params.has('estadoVinculo')).toBeFalse();
  });
});

describe('DeanDocentesComponent estados de error de carga', () => {
  function escenario(): EscenarioListado {
    TestBed.configureTestingModule({
      imports: [DeanDocentesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']) },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanDocentesComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url === DOCENTES).flush({ exitoso: true, datos: [], total: 0 });
    http.expectOne(ESTRUCTURA).flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    return {
      fixture, http,
      textoVacio: 'No hay docentes que coincidan con los filtros.',
      recargar: () => fixture.componentInstance.listado.irAPagina(2),
      coincide: (r) => r.url === DOCENTES,
      responderExito: (req) => req.flush({ exitoso: true, datos: [], total: 0 }),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('un fallo recuperable muestra alerta con Reintentar y no el vacío', () => afirmarFalloRecuperableConReintento(escenario()));
  it('403 se anuncia como sin autorización, sin Reintentar', () => afirmarAutorizacionDenegadaSinReintento(escenario()));
  it('501 se anuncia como no disponible, sin Reintentar', () => afirmarNoImplementadoSinReintento(escenario()));
});
