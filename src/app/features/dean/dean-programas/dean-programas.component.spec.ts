import { ComponentFixture, TestBed } from '@angular/core/testing';
import { paginaApi, porUrl } from '../../../core/testing/pagina-api';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { DeanProgramasComponent } from './dean-programas.component';
import { environment } from '../../../../environments/environment';
import { PlanEstudioItem } from '../../../core/models/role-management.model';
import { ProgramaCreditosItem } from '../../../core/models/consultas-transversales.model';

function filaCreditos(idPlan: string, inp: number, asignaturas: number, creditos: number): ProgramaCreditosItem {
  return {
    idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas', nombreTipoPrograma: 'Pregrado', nombreModalidad: null,
    nombreJornada: null, programaActivo: true, idPlanEstudio: idPlan, inpPlanEstudio: inp, planActivo: true,
    totalSemestres: 10, totalAsignaturas: asignaturas, totalCreditos: creditos,
  };
}

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
        provideHttpClient(withXhr()),
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
    // HU112 (DAT-06): créditos y asignaturas salen de la tabla unificada, en UNA consulta y no una malla por plan.
    const creditos = http.expectOne((r) => r.url === `${environment.apiUrl}/decano/programas-creditos`);
    expect(creditos.request.params.get('pagina')).toBe('1');
    expect(creditos.request.params.get('tamano')).toBe('100');
    creditos.flush({
      exitoso: true,
      datos: [
        filaCreditos('PLAN-SIS-2024', 20241, 2, 7),
        filaCreditos('PLAN-SIS-2019', 20191, 0, 0),
      ],
      total: 2,
    });
    http.expectNone((r) => r.url.includes('/asignaturas'));
    http.match((r) => r.url === `${environment.apiUrl}/decano/programas`).forEach((req) =>
      req.flush({ exitoso: true, datos: [], total: 0 })
    );
    http.match(porUrl(`${environment.apiUrl}/decano/coordinadores`)).forEach((req) => req.flush(paginaApi([])));
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
    expect(component.totalesDe('PLAN-SIS-2024')?.totalCreditos).toBe(7);
    expect(component.totalesDe('PLAN-SIS-2024')?.totalAsignaturas).toBe(2);
    expect(component.totalAsignaturasTexto()).toBe('2');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Programas y Créditos');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('7 créditos en 2 planes');

    component.verPlanEstudio(mockPlanes[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/programas', 'PLAN-SIS-2024']);
  });
});

describe('DeanProgramasComponent sin estructura', () => {
  it('deja la lista de planes vacía si la estructura falla', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }],
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

// DAT-06: si la tabla de créditos falla, créditos y asignaturas no se muestran como 0.
describe('DeanProgramasComponent con créditos no disponibles', () => {
  it('muestra «—» y no un total parcial', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanProgramasComponent);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/decano/estructura`).flush({
      exitoso: true,
      datos: [{ id: 'F', nombre: 'F', nombreDecano: null, activa: true, programas: [{ id: 'P', nombre: 'Prog', activo: true, planes: [{ id: 'PL', inp: 20241, activo: true, totalSemestres: 8 }] }] }],
    });
    http
      .expectOne((r) => r.url === `${environment.apiUrl}/decano/programas-creditos`)
      .flush({ exitoso: false }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.creditosCargados('PL')).toBeFalse();
    expect(fixture.componentInstance.totalAsignaturasTexto()).toBe('—');
    expect(fixture.componentInstance.errorCreditos()).toBeTruthy();
    http.match(() => true).forEach((req) => req.flush({ exitoso: true, datos: [] }));
  });
});

// HU112: una facultad con más filas que el tamaño máximo de página pide las páginas siguientes.
describe('DeanProgramasComponent con más de una página de créditos', () => {
  it('acumula las páginas de la tabla unificada', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanProgramasComponent);
    fixture.detectChanges();
    const url = `${environment.apiUrl}/decano/programas-creditos`;
    http.expectOne((r) => r.url === url && r.params.get('pagina') === '1').flush({ exitoso: true, datos: [filaCreditos('A', 1, 1, 3)], total: 101 });
    http.expectOne((r) => r.url === url && r.params.get('pagina') === '2').flush({ exitoso: true, datos: [filaCreditos('B', 2, 1, 4)], total: 101 });

    expect(fixture.componentInstance.creditos().length).toBe(2);
    expect(fixture.componentInstance.totalesDe('B')?.totalCreditos).toBe(4);
    http.match(() => true).forEach((req) => req.flush({ exitoso: true, datos: [] }));
  });
});

// F-DEC-S08: mientras la estructura carga no se muestra "0 Planes" ni "No se encontraron planes".
describe('DeanProgramasComponent mientras carga', () => {
  it('muestra el estado de carga en lugar de ceros y vacios engañosos', () => {
    TestBed.configureTestingModule({
      imports: [DeanProgramasComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanProgramasComponent);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cargando planes de estudio');
    expect(texto).not.toContain('0 Planes');
    expect(texto).not.toContain('No se encontraron planes');
    http.expectOne(`${environment.apiUrl}/decano/estructura`).flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.cargandoEstructura()).toBeFalse();
    http.match(() => true).forEach((req) => req.flush({ exitoso: true, datos: [] }));
  });
});
