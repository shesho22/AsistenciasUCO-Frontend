import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { CoordinatorSubjectFormPageComponent } from './subject-form-page.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { environment } from '../../../../../environments/environment';
import { PlanEstudioItem } from '../../../../core/models/role-management.model';

describe('CoordinatorSubjectFormPageComponent', () => {
  let fixture: ComponentFixture<CoordinatorSubjectFormPageComponent>;
  let component: CoordinatorSubjectFormPageComponent;
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
      imports: [CoordinatorSubjectFormPageComponent],
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
    fixture = TestBed.createComponent(CoordinatorSubjectFormPageComponent);
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
      .forEach((req) => req.flush({ exitoso: true, datos: [] }));
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('guarda una nueva asignatura y regresa a la malla curricular del plan', () => {
    expect(component.modo()).toBe('CREAR');

    component.guardarAsignatura({
      datos: {
        codigo: 'SIS-201',
        nombre: 'Estructuras de Datos',
        creditos: 4,
        semestre: 2,
      },
    });

    const req = http.expectOne(
      `${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/asignaturas`
    );
    expect(req.request.method).toBe('POST');
    req.flush({
      exitoso: true,
      mensajeUsuario: 'Asignatura registrada.',
      datos: { id: 'asig-2', codigo: 'SIS-201', nombre: 'Estructuras de Datos' },
    });

    expect(toastSpy.success).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/app/coordinador/planes-estudio',
      'PLAN-SIS-2024',
      'malla',
    ]);
  });

  it('vuelve a la malla al llamar volverAMalla()', () => {
    component.volverAMalla();
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/app/coordinador/planes-estudio',
      'PLAN-SIS-2024',
      'malla',
    ]);
  });

  it('actualiza una asignatura existente en modo EDITAR', () => {
    fixture.componentRef.setInput('asignaturaId', 'asig-existente');
    fixture.detectChanges();
    expect(component.modo()).toBe('EDITAR');

    component.guardarAsignatura({
      id: 'asig-existente',
      datos: {
        nombre: 'Estructuras II',
      },
    });

    const req = http.expectOne(
      `${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/asignaturas/asig-existente`
    );
    expect(req.request.method).toBe('PUT');
    req.flush({
      exitoso: true,
      mensajeUsuario: 'Asignatura actualizada.',
      datos: { id: 'asig-existente', nombre: 'Estructuras II' },
    });

    expect(toastSpy.success).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith([
      '/app/coordinador/planes-estudio',
      'PLAN-SIS-2024',
      'malla',
    ]);
  });

  it('muestra toast error si la creación de asignatura falla', () => {
    component.guardarAsignatura({
      datos: { codigo: 'FAIL' },
    });

    const req = http.expectOne(
      `${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/asignaturas`
    );
    req.flush({ error: 'Error' }, { status: 400, statusText: 'Bad Request' });

    expect(toastSpy.error).toHaveBeenCalled();
  });
});
