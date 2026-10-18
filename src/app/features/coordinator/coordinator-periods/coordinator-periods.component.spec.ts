import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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
        provideHttpClient(),
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
      req.flush({ exitoso: true, datos: mockPeriodos })
    );
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('debe inicializarse y mostrar los períodos académicos y KPIs', () => {
    expect(component).toBeTruthy();
    expect(component.periodos().length).toBe(1);
    expect(component.totalActivos()).toBe(1);
    expect(component.periodoActual()?.codigo).toBe('2026-2');
  });

  it('permite crear un nuevo período académico y recargar la lista', () => {
    component.guardarPeriodo({
      modo: 'CREAR',
      datos: {
        codigo: '2027-1',
        nombre: 'Primer Semestre 2027',
        fechaInicio: '2027-02-01',
        fechaFin: '2027-06-15',
        estado: 'PLANEACION',
      },
    });

    const postReq = http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({
      exitoso: true,
      mensajeUsuario: 'Período académico creado.',
      datos: {
        id: 'per-2027-1',
        codigo: '2027-1',
        nombre: 'Primer Semestre 2027',
        fechaInicio: '2027-02-01',
        fechaFin: '2027-06-15',
        estado: 'PLANEACION',
        esActual: false,
      },
    });

    http.expectOne(`${environment.apiUrl}/coordinador/periodos-academicos`).flush({
      exitoso: true,
      datos: mockPeriodos,
    });

    expect(toastSpy.success).toHaveBeenCalled();
  });

  it('navega de regreso a planes de estudio', () => {
    component.irAPlanes();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/coordinador/planes-estudio']);
  });
});
