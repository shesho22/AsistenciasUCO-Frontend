import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { DeanPlanMallaComponent } from './dean-plan-malla.component';
import { environment } from '../../../../environments/environment';
import { PlanEstudioItem } from '../../../core/models/role-management.model';

describe('DeanPlanMallaComponent', () => {
  let fixture: ComponentFixture<DeanPlanMallaComponent>;
  let component: DeanPlanMallaComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockPlan: PlanEstudioItem = {
    id: 'PLAN-SIS-2024',
    codigo: 'PLAN-SIS-2024',
    nombre: 'Ingeniería de Sistemas',
    anioVigencia: 2024,
    programa: 'Ingeniería de Sistemas',
    facultad: 'Facultad de Ingeniería',
    totalSemestres: 10,
    totalCreditos: 160,
    totalAsignaturas: 2,
    estado: 'VIGENTE',
    descripcion: 'Malla curricular',
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [DeanPlanMallaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ planId: 'PLAN-SIS-2024' }) } },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanPlanMallaComponent);
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
            {
              id: 'asig-2',
              codigo: 'SIS-201',
              nombre: 'Estructuras de Datos',
              creditos: 4,
              semestre: 2,
              area: 'Software',
              componente: 'Obligatoria',
              horasSemanales: 4,
              prerrequisitos: ['SIS-101'],
            },
          ],
        })
      );
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('carga la malla curricular y filtra asignaturas por semestre', () => {
    expect(component.selectedPlan()?.codigo).toBe('PLAN-SIS-2024');
    expect(component.asignaturas().length).toBe(2);

    component.onSemestreChange(2);
    expect(component.asignaturasFiltradas().length).toBe(1);
    expect(component.asignaturasFiltradas()[0].codigo).toBe('SIS-201');
  });

  it('regresa al listado de programas', () => {
    component.volverAProgramas();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/programas']);
  });
});
