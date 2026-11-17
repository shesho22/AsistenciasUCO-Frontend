import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { CoordinatorPeriodsComponent } from './coordinator-periods.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';

describe('CoordinatorPeriodsComponent', () => {
  let fixture: ComponentFixture<CoordinatorPeriodsComponent>;
  let component: CoordinatorPeriodsComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockPeriodos: PeriodoAcademicoItem[] = [
    {
      id: 'per-2026-2',
      codigo: '2026-2',
      nombre: 'Segundo Semestre 2026',
      fechaInicio: '2026-07-15',
      fechaFin: '2026-11-30',
      estado: 'ACTIVO',
      esActual: true,
    },
  ];

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [CoordinatorPeriodsComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorPeriodsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.match(`${environment.apiUrl}/coordinador/planes-estudio`).forEach((req) =>
      req.flush({ exitoso: true, datos: [] })
    );
    http.match(`${environment.apiUrl}/coordinador/periodos-academicos`).forEach((req) =>
      req.flush({ exitoso: true, datos: mockPeriodos, total: 3 })
    );
    // CIERRE-W2A: los activos los cuenta el servidor con el filtro `estado`, no la pantalla
    http.match(`${environment.apiUrl}/coordinador/periodos-academicos?estado=ACTIVO`).forEach((req) =>
      req.flush({ exitoso: true, datos: mockPeriodos, total: 1 })
    );
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('debe inicializarse y mostrar los períodos académicos y KPIs', () => {
    expect(component).toBeTruthy();
    expect(component.periodos().length).toBe(1);
    expect(component.periodoActual()?.codigo).toBe('2026-2');
  });

  it('los totales salen del servidor y no de contar las filas cargadas', () => {
    // La lista trae 1 fila, pero el servidor informa 3 períodos en total y 1 activo
    expect(component.periodos().length).toBe(1);
    expect(component.totalPeriodos()).toBe(3);
    expect(component.totalActivos()).toBe(1);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('3 Períodos');
  });

  it('muestra toast error si cargarPeriodos falla', () => {
    component.cargarPeriodos();
    const req = http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`);
    req.flush({ error: 'Network error' }, { status: 500, statusText: 'Server Error' });
    http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos?estado=ACTIVO`).flush({ exitoso: true, datos: [], total: 0 });

    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('muestra toast error si falla el total de períodos activos', () => {
    component.cargarPeriodos();
    http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush({ exitoso: true, datos: [], total: 0 });
    http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos?estado=ACTIVO`)
      .flush({ error: 'x' }, { status: 500, statusText: 'Server Error' });

    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('navega de regreso a planes de estudio', () => {
    component.irAPlanes();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/planes-estudio']);
  });
});

