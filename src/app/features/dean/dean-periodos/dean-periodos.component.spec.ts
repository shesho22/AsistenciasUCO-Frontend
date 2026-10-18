import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { DeanPeriodosComponent } from './dean-periodos.component';
import { environment } from '../../../../environments/environment';
import { PeriodoAcademicoItem } from '../../../core/models/role-management.model';

describe('DeanPeriodosComponent', () => {
  let fixture: ComponentFixture<DeanPeriodosComponent>;
  let component: DeanPeriodosComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

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

    TestBed.configureTestingModule({
      imports: [DeanPeriodosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanPeriodosComponent);
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

  it('carga explícitamente los períodos académicos y permite filtrarlos', () => {
    expect(component.periodos().length).toBe(1);
    component.filtroTexto.set('2026-2');
    expect(component.periodosFiltrados().length).toBe(1);
  });
});
