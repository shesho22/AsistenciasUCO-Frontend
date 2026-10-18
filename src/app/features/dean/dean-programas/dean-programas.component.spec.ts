import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { DeanProgramasComponent } from './dean-programas.component';
import { environment } from '../../../../environments/environment';
import { PlanEstudioItem } from '../../../core/models/role-management.model';

describe('DeanProgramasComponent', () => {
  let fixture: ComponentFixture<DeanProgramasComponent>;
  let component: DeanProgramasComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockPlanes: PlanEstudioItem[] = [
    {
      id: 'PLAN-SIS-2024',
      codigo: 'PLAN-SIS-2024',
      nombre: 'Ingeniería de Sistemas',
      anioVigencia: 2024,
      programa: 'Ingeniería de Sistemas',
      facultad: 'Facultad de Ingeniería',
      totalSemestres: 10,
      totalCreditos: 160,
      totalAsignaturas: 54,
      estado: 'VIGENTE',
      descripcion: 'Plan vigente',
    },
  ];

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [DeanProgramasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanProgramasComponent);
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

  it('debe cargar los planes de estudio y navegar a la malla por ruta', () => {
    expect(component.planes().length).toBe(1);
    expect(component.planesVigentes()).toBe(1);

    component.verPlanEstudio(mockPlanes[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/programas', 'PLAN-SIS-2024']);
  });
});
