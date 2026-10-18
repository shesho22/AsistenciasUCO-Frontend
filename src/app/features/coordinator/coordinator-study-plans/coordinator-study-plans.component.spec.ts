import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { CoordinatorStudyPlansComponent } from './coordinator-study-plans.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { PlanEstudioItem } from '../../../core/models/role-management.model';

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

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [CoordinatorStudyPlansComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorStudyPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.match(`${environment.apiUrl}/coordinador/planes-estudio`).forEach((req) =>
      req.flush({ exitoso: true, datos: mockPlanes })
    );
    http.match(`${environment.apiUrl}/coordinador/periodos-academicos`).forEach((req) =>
      req.flush({ exitoso: true, datos: [] })
    );
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('debe cargar el listado de planes de estudio y calcular KPIs', () => {
    expect(component).toBeTruthy();
    expect(component.planes().length).toBe(1);
    expect(component.totalVigentes()).toBe(1);
    expect(component.totalAsignaturasVinculadas()).toBe(54);
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
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/periodos']);
  });
});
