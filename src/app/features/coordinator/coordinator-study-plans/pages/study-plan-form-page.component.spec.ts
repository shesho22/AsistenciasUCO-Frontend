import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { CoordinatorStudyPlanFormPageComponent } from './study-plan-form-page.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { environment } from '../../../../../environments/environment';

describe('CoordinatorStudyPlanFormPageComponent', () => {
  let fixture: ComponentFixture<CoordinatorStudyPlanFormPageComponent>;
  let component: CoordinatorStudyPlanFormPageComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [CoordinatorStudyPlanFormPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorStudyPlanFormPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.match(`${environment.apiUrl}/coordinador/planes-estudio`).forEach((req) =>
      req.flush({ exitoso: true, datos: [] })
    );
    http.match(`${environment.apiUrl}/coordinador/periodos-academicos`).forEach((req) =>
      req.flush({ exitoso: true, datos: [] })
    );
  });

  afterEach(() => {
    http.verify();
  });

  it('inicia en modo CREAR cuando no recibe planId y guarda el plan', () => {
    expect(component.modo()).toBe('CREAR');

    component.guardarPlan({
      codigo: 'PLAN-2027',
      nombre: 'Plan 2027',
    });

    const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`);
    expect(req.request.method).toBe('POST');
    req.flush({
      exitoso: true,
      mensajeUsuario: 'Plan creado.',
      datos: { id: 'p-1', codigo: 'PLAN-2027', nombre: 'Plan 2027' },
    });

    expect(toastSpy.success).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/planes-estudio']);
  });

  it('vuelve a la lista de planes al llamar volver()', () => {
    component.volver();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/planes-estudio']);
  });

  it('guarda en modo EDITAR cuando effectivePlanId está presente', () => {
    fixture.componentRef.setInput('planId', 'plan-existente');
    fixture.detectChanges();
    expect(component.modo()).toBe('EDITAR');

    component.guardarPlan({
      nombre: 'Plan Actualizado',
    });

    const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-existente`);
    expect(req.request.method).toBe('PUT');
    req.flush({
      exitoso: true,
      mensajeUsuario: 'Plan actualizado.',
      datos: { id: 'plan-existente', codigo: 'PLAN-2027', nombre: 'Plan Actualizado' },
    });

    expect(toastSpy.success).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/planes-estudio']);
  });

  it('muestra toast error cuando la creación o actualización de plan falla', () => {
    component.guardarPlan({
      codigo: 'PLAN-FAIL',
    });

    const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`);
    req.flush({ error: 'Fallo' }, { status: 500, statusText: 'Internal Error' });

    expect(toastSpy.error).toHaveBeenCalled();
  });
});
