import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanDocentesComponent } from './dean-docentes.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

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
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
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
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) }],
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
