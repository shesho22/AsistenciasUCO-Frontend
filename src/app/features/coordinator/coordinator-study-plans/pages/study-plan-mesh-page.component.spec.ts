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

  it('agregarSemestre agrega el siguiente semestre con el endpoint HU082', () => {
    component.planes.set([{ ...mockPlan, totalSemestres: 9 }]);
    component.agregarSemestre();

    const postReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ exitoso: true, datos: null });

    expect(toastSpy.success).toHaveBeenCalledWith('Semestre 10 agregado al plan.');
    expect(component.selectedPlan()?.totalSemestres).toBe(10);
    expect(component.aviso()).toBeNull();
  });

  it('agregarSemestre en el máximo de 10 avisa sin llamar al backend', () => {
    component.agregarSemestre();

    http.expectNone(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres`);
    expect(component.aviso()).toContain('máximo de 10 semestres');
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('agregarSemestre rechazado por el backend muestra el aviso y recarga los planes', () => {
    component.planes.set([{ ...mockPlan, totalSemestres: 9 }]);
    component.agregarSemestre();

    http
      .expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres`)
      .flush({ exitoso: false }, { status: 409, statusText: 'Conflict' });
    http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`).flush({ exitoso: true, datos: [mockPlan] });

    expect(component.aviso()).toBeTruthy();
    expect(component.selectedPlan()?.totalSemestres).toBe(10);
  });

  it('eliminarSemestreVacio avisa sin llamar al backend si el último semestre tiene asignaturas (codigoSemestre)', () => {
    component.asignaturas.set([{ id: 'a-10', codigoSemestre: 'S10' } as any]);
    component.eliminarSemestreVacio();

    http.expectNone(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres/10`);
    expect(component.aviso()).toContain('El semestre 10 tiene asignaturas');
  });

  it('eliminarSemestreVacio con un solo semestre avisa que debe conservarlo', () => {
    component.planes.set([{ ...mockPlan, totalSemestres: 1 }]);
    component.eliminarSemestreVacio();
    expect(component.aviso()).toContain('al menos un semestre');
  });

  it('eliminarSemestreVacio quita el último semestre con el endpoint HU083', () => {
    component.eliminarSemestreVacio();

    const delReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres/10`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ exitoso: true, datos: null });

    expect(toastSpy.success).toHaveBeenCalledWith('Semestre 10 vacío eliminado.');
    expect(component.selectedPlan()?.totalSemestres).toBe(9);
  });

  it('eliminarSemestreVacio muestra el rechazo del backend sin cambiar el plan', () => {
    component.eliminarSemestreVacio();

    const delReq = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/PLAN-SIS-2024/semestres/10`);
    delReq.flush(
      { exitoso: false, mensajeUsuario: 'El semestre tiene asignaturas asociadas. Reubíquelas o elimínelas primero.' },
      { status: 409, statusText: 'Conflict' }
    );
    http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`).flush({ exitoso: true, datos: [mockPlan] });

    expect(toastSpy.error).toHaveBeenCalled();
    expect(component.aviso()).toBeTruthy();
    expect(component.selectedPlan()?.totalSemestres).toBe(10);
  });
});
