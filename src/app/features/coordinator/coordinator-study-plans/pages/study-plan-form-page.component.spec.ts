import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { CoordinatorStudyPlanFormPageComponent } from './study-plan-form-page.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { environment } from '../../../../../environments/environment';
import { paginaApi, porUrl } from '../../../../core/testing/pagina-api';

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
        provideHttpClient(withXhr()),
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

    http.match(porUrl(`${environment.apiUrl}/coordinador/planes-estudio`)).forEach((req) =>
      req.flush(paginaApi([]))
    );
    http.match(`${environment.apiUrl}/coordinador/periodos-academicos`).forEach((req) =>
      req.flush({ exitoso: true, datos: [] })
    );
  });

  afterEach(() => {
    http.verify();
  });

  // Contrato real (GuardarPlanEstudioRequest): cuerpo { inp } y respuesta ApiDataResponse<Void> (datos null).
  it('HU079: inicia en modo CREAR y registra el plan enviando solo el INP', () => {
    expect(component.modo()).toBe('CREAR');

    component.guardarPlan(2027);

    const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ inp: 2027 });
    req.flush({ exitoso: true, mensajeUsuario: 'Plan creado.', datos: null });

    expect(toastSpy.success).toHaveBeenCalledWith('Plan creado.');
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

    component.guardarPlan(2028);

    const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio/plan-existente`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ inp: 2028 });
    req.flush({ exitoso: true, mensajeUsuario: 'Plan actualizado.', datos: null });

    expect(toastSpy.success).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/planes-estudio']);
  });

  it('muestra toast error cuando la creación o actualización de plan falla', () => {
    component.guardarPlan(2030);

    const req = http.expectOne(`${environment.apiUrl}/coordinador/planes-estudio`);
    req.flush({ error: 'Fallo' }, { status: 500, statusText: 'Internal Error' });

    expect(toastSpy.error).toHaveBeenCalled();
  });
});
