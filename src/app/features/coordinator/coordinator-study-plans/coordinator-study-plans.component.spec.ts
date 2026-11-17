import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpRequest, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { CoordinatorStudyPlansComponent } from './coordinator-study-plans.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { PlanEstudioItem } from '../../../core/models/role-management.model';
import { paginaApi, porUrl } from '../../../core/testing/pagina-api';

describe('CoordinatorStudyPlansComponent', () => {
  let fixture: ComponentFixture<CoordinatorStudyPlansComponent>;
  let component: CoordinatorStudyPlansComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockPlanes: PlanEstudioItem[] = [
    {
      id: 'PLAN-SIS-2024',
      codigo: 'PLAN-SIS-2024',
      nombre: 'Plan Ingeniería de Sistemas 2024',
      anioVigencia: 2024,
      programa: 'Ingeniería de Sistemas',
      facultad: 'Facultad de Ingeniería',
      totalSemestres: 10,
      totalCreditos: 160,
      totalAsignaturas: 54,
      estado: 'VIGENTE',
      descripcion: 'Plan vigente por competencias',
    },
  ];

  const urlPlanes = `${environment.apiUrl}/coordinador/planes-estudio`;
  /** La lista de planes (sin el filtro `estaActivo` que usa el total de vigentes). */
  const listaPlanes = (req: HttpRequest<unknown>) => porUrl(urlPlanes)(req) && !req.params.has('estaActivo');
  const vigentesPlanes = (req: HttpRequest<unknown>) => porUrl(urlPlanes)(req) && req.params.get('estaActivo') === 'true';
  const vinculos = (req: HttpRequest<unknown>) => porUrl(`${environment.apiUrl}/coordinador/asignaturas`)(req);

  /** Responde las tres consultas de la carga: lista, total de vigentes y total de vínculos (los totales los da el servidor). */
  function responderCarga(planes: PlanEstudioItem[], totalLista: number, vigentes: number, vinculados: number): void {
    http.expectOne(listaPlanes).flush(paginaApi(planes, 1, 100, totalLista));
    http.expectOne(vigentesPlanes).flush(paginaApi([], 1, 1, vigentes));
    http.expectOne(vinculos).flush(paginaApi([], 1, 1, vinculados));
  }

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [CoordinatorStudyPlansComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorStudyPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.match(`${environment.apiUrl}/coordinador/periodos-academicos`).forEach((req) =>
      req.flush({ exitoso: true, datos: [] })
    );
    // Totales distintos de la longitud de la lista: la pantalla debe mostrar los del servidor
    responderCarga(mockPlanes, 7, 5, 120);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('debe cargar el listado de planes de estudio y mostrar los totales del servidor', () => {
    expect(component).toBeTruthy();
    expect(component.planes().length).toBe(1);
    expect(component.totalPlanes()).toBe(7);
    expect(component.totalVigentes()).toBe(5);
    expect(component.totalAsignaturasVinculadas()).toBe(120);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('7 Planes');
  });

  it('navega a la ruta de creación de plan de estudio', () => {
    component.abrirCrearPlan();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/planes-estudio/nuevo']);
  });

  it('navega a la ruta de edición y malla de un plan de estudio', () => {
    component.abrirEditarPlan(mockPlanes[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/app/coordinador/planes-estudio',
      'PLAN-SIS-2024',
      'editar',
    ]);

    component.verMallaCurricular(mockPlanes[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/app/coordinador/planes-estudio',
      'PLAN-SIS-2024',
      'malla',
    ]);
  });

  it('navega a la vista independiente de períodos académicos', () => {
    component.irAPeriodos();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/programa/periodos']);
  });

  it('permite alternar el estado de un plan de estudio con éxito', () => {
    component.toggleEstadoPlan(mockPlanes[0]);

    const patchReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/toggle-estado`);
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush({
      exitoso: true,
      mensajeUsuario: 'Estado actualizado correctamente.',
    });

    responderCarga([{ ...mockPlanes[0], estado: 'INACTIVO' }], 7, 4, 120);

    expect(component.totalVigentes()).toBe(4);
    expect(toastSpy.success).toHaveBeenCalledWith('Estado actualizado correctamente.');
  });

  it('muestra error toast si alternar el estado del plan falla', () => {
    component.toggleEstadoPlan(mockPlanes[0]);

    const patchReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/toggle-estado`);
    patchReq.flush({ error: 'Error del servidor' }, { status: 500, statusText: 'Server Error' });

    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('muestra error toast si cargarPlanes falla', () => {
    component.cargarPlanes();
    const req = http.expectOne(listaPlanes);
    req.flush({ error: 'Fallo al cargar' }, { status: 500, statusText: 'Server Error' });
    http.expectOne(vigentesPlanes).flush(paginaApi([], 1, 1, 0));
    http.expectOne(vinculos).flush(paginaApi([], 1, 1, 0));

    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('muestra error toast si fallan los totales de vigentes o de asignaturas vinculadas', () => {
    component.cargarPlanes();
    http.expectOne(listaPlanes).flush(paginaApi(mockPlanes));
    http.expectOne(vigentesPlanes).flush({ error: 'x' }, { status: 500, statusText: 'Server Error' });
    http.expectOne(vinculos).flush({ error: 'x' }, { status: 500, statusText: 'Server Error' });

    expect(toastSpy.error).toHaveBeenCalledTimes(2);
  });
});

