import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminEstudiantesComponent } from './admin-estudiantes.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { EstudianteInstitucionItem } from '../../../core/models/consultas-transversales.model';

const BASE = `${environment.apiUrl}/admin/estudiantes`;

const estudiante: EstudianteInstitucionItem = {
  idEstudiante: 'e-1', numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz', correo: 'ana@uco.edu.co',
  activo: true, facultades: 'Ingeniería', programas: 'Sistemas', totalGrupos: 2,
};

describe('AdminEstudiantesComponent (HU157)', () => {
  let fixture: ComponentFixture<AdminEstudiantesComponent>;
  let component: AdminEstudiantesComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [AdminEstudiantesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminEstudiantesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url === BASE).flush({ exitoso: true, datos: [estudiante], total: 1 });
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: [{ id: 'f-1', nombreFacultad: 'Ingeniería' }] });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista los estudiantes de la institución con facultades y programas', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ana Ruiz');
    expect(texto).toContain('Sistemas');
    expect(texto).toContain('1 Estudiantes');
    expect(component.facultades()).toEqual([{ id: 'f-1', nombre: 'Ingeniería' }]);
  });

  it('filtra por facultad, estado y texto', () => {
    component.onFacultad('f-1');
    expect(http.expectOne((r) => r.url === BASE).request.params.get('idFacultad')).toBe('f-1');
    component.onEstado('ACTIVO');
    expect(http.expectOne((r) => r.url === BASE).request.params.get('estaActivo')).toBe('true');
    component.busqueda.set('1017');
    component.listado.buscar();
    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('busqueda')).toBe('1017');
    req.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay estudiantes que coincidan con la búsqueda.');
  });

  it('abre la ficha unificada con el historial y la cierra', () => {
    component.verFicha(estudiante);
    http.expectOne(`${BASE}/e-1/historial`).flush({
      exitoso: true,
      datos: {
        idEstudiante: 'e-1', tipoIdentificacion: 'CC', numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz',
        correo: null, activo: true,
        matriculas: [
          {
            idFacultad: 'f-1', nombreFacultad: 'Ingeniería', idPrograma: 'p-1', nombrePrograma: 'Sistemas', inpPlanEstudio: 20241,
            idPeriodoAcademico: null, codigoPeriodo: null, nombrePeriodo: null, idGrupo: null, codigoGrupo: null,
            idAsignatura: null, nombreAsignatura: null, codigoEstadoEstudiante: null, nombreEstadoEstudiante: null, resumen: null,
          },
        ],
      },
    });
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Historial completo · 1 matrículas');
    expect(texto).toContain('Sin grupos');

    component.ficha.set(null);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[aria-label="Ficha unificada del estudiante"]')).toBeNull();
  });

  it('un error al abrir la ficha muestra el mensaje', () => {
    component.verFicha(estudiante);
    http.expectOne(`${BASE}/e-1/historial`).flush({ exitoso: false }, { status: 404, statusText: 'Not Found' });
    expect(component.ficha()).toBeNull();
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('si las facultades fallan, el selector queda vacío', () => {
    component.facultades.set([]);
    component.ngOnInit();
    http.expectOne((r) => r.url === BASE).flush({ exitoso: true, datos: [], total: 0 });
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: false }, { status: 500, statusText: 'Server Error' });
    expect(component.facultades()).toEqual([]);
  });
});
