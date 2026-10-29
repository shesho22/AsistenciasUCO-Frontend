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

    // HU108: los planes salen de la estructura de la facultad del decano (no de la ruta del coordinador).
    http.expectOne(`${environment.apiUrl}/decano/estructura`).flush({
      exitoso: true,
      datos: [
        {
          id: 'FAC-1',
          nombre: 'Facultad de Ingeniería',
          nombreDecano: 'Decano',
          activa: true,
          programas: [
            {
              id: 'PRG-1',
              nombre: 'Ingeniería de Sistemas',
              nombreCoordinador: null,
              activo: true,
              nombreTipoPrograma: null,
              nombreModalidad: null,
              nombreJornada: null,
              planes: [
                { id: 'PLAN-SIS-2024', inp: 20241, activo: true, totalSemestres: 10 },
                { id: 'PLAN-SIS-2019', inp: 20191, activo: false, totalSemestres: 9 },
              ],
            },
          ],
        },
      ],
    });
    http.expectNone(`${environment.apiUrl}/coordinador/planes-estudio`);
    // DAT-06: créditos y asignaturas salen de la malla real de cada plan, no de ceros fijos.
    http.expectOne(`${environment.apiUrl}/decano/planes-estudio/PLAN-SIS-2024/asignaturas`).flush({
      exitoso: true,
      datos: [
        { id: 'a1', codigo: 'ARQ-402', nombre: 'Arquitectura de Software', creditos: 3, semestre: 8, area: 'Software', componente: 'Obligatoria', horasSemanales: 4 },
        { id: 'a2', codigo: 'BD-201', nombre: 'Bases de Datos', creditos: 4, semestre: 4, area: 'Datos', componente: 'Obligatoria', horasSemanales: 4 },
      ],
    });
    http.expectOne(`${environment.apiUrl}/decano/planes-estudio/PLAN-SIS-2019/asignaturas`).flush({ exitoso: true, datos: [] });
    http.match((r) => r.url === `${environment.apiUrl}/decano/programas`).forEach((req) =>
      req.flush({ exitoso: true, datos: [], total: 0 })
    );
    http.match(`${environment.apiUrl}/decano/coordinadores`).forEach((req) => req.flush({ exitoso: true, datos: [] }));
    http.match(`${environment.apiUrl}/tipos-programa`).forEach((req) => req.flush([]));
    http.match(`${environment.apiUrl}/modalidades-programa`).forEach((req) => req.flush([]));
    http.match(`${environment.apiUrl}/jornadas-programa`).forEach((req) => req.flush([]));
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('debe cargar los planes de estudio y navegar a la malla por ruta', () => {
    expect(component.planes().length).toBe(2);
    expect(component.planesVigentes()).toBe(1);
    expect(component.planes()[0].codigo).toBe('INP-20241');
    expect(component.planes()[0].programa).toBe('Ingeniería de Sistemas');
    expect(component.planes()[1].estado).toBe('INACTIVO');
    expect(component.planes()[0].totalCreditos).toBe(7);
    expect(component.planes()[0].totalAsignaturas).toBe(2);
    expect(component.totalAsignaturasTexto()).toBe('2');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('7');

    component.verPlanEstudio(mockPlanes[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/programas', 'PLAN-SIS-2024']);
  });
});

describe('DeanProgramasComponent sin estructura', () => {
  it('deja la lista de planes vacía si la estructura falla', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanProgramasComponent);
    fixture.detectChanges();
    http
      .expectOne(`${environment.apiUrl}/decano/estructura`)
      .flush({ exitoso: false }, { status: 403, statusText: 'Forbidden' });
    expect(fixture.componentInstance.planes()).toEqual([]);
    expect(fixture.componentInstance.errorEstructura()).toBeTruthy();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No fue posible cargar los planes de estudio');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('No se encontraron planes de estudio registrados.');
    http.match(() => true).forEach((req) => req.flush({ exitoso: true, datos: [] }));
  });
});

// DAT-06: si la malla de un plan falla, créditos y asignaturas no se muestran como 0.
describe('DeanProgramasComponent con malla no disponible', () => {
  it('muestra «—» y no un total parcial', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanProgramasComponent);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/decano/estructura`).flush({
      exitoso: true,
      datos: [{ id: 'F', nombre: 'F', nombreDecano: null, activa: true, programas: [{ id: 'P', nombre: 'Prog', activo: true, planes: [{ id: 'PL', inp: 20241, activo: true, totalSemestres: 8 }] }] }],
    });
    http.expectOne(`${environment.apiUrl}/decano/planes-estudio/PL/asignaturas`).flush({ exitoso: false }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.mallaCargada('PL')).toBeFalse();
    expect(fixture.componentInstance.totalAsignaturasTexto()).toBe('—');
    http.match(() => true).forEach((req) => req.flush({ exitoso: true, datos: [] }));
  });
});
