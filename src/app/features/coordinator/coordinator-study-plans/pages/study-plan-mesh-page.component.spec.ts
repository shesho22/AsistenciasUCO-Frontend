import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { CoordinatorStudyPlanMeshPageComponent } from './study-plan-mesh-page.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { environment } from '../../../../../environments/environment';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';

describe('CoordinatorStudyPlanMeshPageComponent', () => {
  let fixture: ComponentFixture<CoordinatorStudyPlanMeshPageComponent>;
  let component: CoordinatorStudyPlanMeshPageComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockPlan: PlanEstudioItem = {
    id: 'PLAN-SIS-2024',
    codigo: 'PLAN-SIS-2024',
    nombre: 'Ingeniería de Sistemas',
    anioVigencia: 2024,
    programa: 'Ingeniería de Sistemas',
    facultad: 'Facultad de Ingeniería',
    totalSemestres: 10,
    totalCreditos: 160,
    totalAsignaturas: 1,
    estado: 'VIGENTE',
    descripcion: 'Malla curricular',
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [CoordinatorStudyPlanMeshPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ planId: 'PLAN-SIS-2024' }) } },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorStudyPlanMeshPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.match(`${environment.apiUrl}/coordinador/planes-estudio`).forEach((req) =>
      req.flush({ exitoso: true, datos: [mockPlan] })
    );
    http.match(`${environment.apiUrl}/coordinador/periodos-academicos`).forEach((req) =>
      req.flush({ exitoso: true, datos: [] })
    );
    http
      .match(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/asignaturas`)
      .forEach((req) =>
        req.flush({
          exitoso: true,
          datos: [
            {
              id: 'asig-1',
              codigo: 'SIS-101',
              nombre: 'Algoritmos I',
              creditos: 4,
              semestre: 1,
              area: 'Software',
              componente: 'Obligatoria',
              horasSemanales: 4,
              prerrequisitos: [],
            },
          ],
        })
      );
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('resuelve el plan por planId y carga sus asignaturas', () => {
    expect(component.selectedPlan()?.codigo).toBe('PLAN-SIS-2024');
    expect(component.asignaturas().length).toBe(1);
  });

  it('navega a crear y editar asignatura usando rutas con planId', () => {
    component.abrirCrearAsignatura();
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/app/coordinador/planes-estudio',
      'PLAN-SIS-2024',
      'asignaturas',
      'nueva',
    ]);

    component.abrirEditarAsignatura(component.asignaturas()[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/app/coordinador/planes-estudio',
      'PLAN-SIS-2024',
      'asignaturas',
      'asig-1',
      'editar',
    ]);
  });

  it('volver navega a la lista de planes de estudio', () => {
    component.volver();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/planes-estudio']);
  });

  it('agregarSemestre incrementa el total de semestres del plan', () => {
    component.agregarSemestre();

    const putReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ exitoso: true, datos: { ...mockPlan, totalSemestres: 11 } });

    expect(toastSpy.success).toHaveBeenCalledWith('Semestre 11 agregado al plan.');
  });

  it('eliminarSemestreVacio disminuye semestres si el último no tiene asignaturas', () => {
    component.eliminarSemestreVacio();

    const putReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ exitoso: true, datos: { ...mockPlan, totalSemestres: 9 } });

    expect(toastSpy.success).toHaveBeenCalledWith('Semestre 10 vacío eliminado.');
  });
});
