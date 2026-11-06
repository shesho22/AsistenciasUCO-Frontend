import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { DeanPlanMallaComponent } from './dean-plan-malla.component';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

const estructura = [
  {
    id: 'FAC-1',
    nombre: 'Facultad de Ingeniería',
    nombreDecano: 'Decano',
    activa: true,
    programas: [
      {
        id: 'PRG-1',
        nombre: 'Ingeniería de Sistemas',
        nombreCoordinador: 'Coord',
        activo: true,
        nombreTipoPrograma: 'Pregrado',
        nombreModalidad: 'Presencial',
        nombreJornada: 'Diurna',
        planes: [{ id: 'PLAN-SIS-2024', inp: 20241, activo: true, totalSemestres: 10 }],
      },
    ],
  },
];

/** Respuesta del backend: forma de AsignaturaDTO (credito, codigoSemestre, nombreArea...). */
const asignaturasApi = [
  { id: 'asig-1', codigo: 'SIS-101', nombre: 'Algoritmos I', credito: 4, codigoSemestre: 'S1', nombreArea: 'Software', nombreComponente: 'Obligatoria' },
  { id: 'asig-2', codigo: 'SIS-201', nombre: 'Estructuras de Datos', credito: 3, codigoSemestre: 'S2', nombreArea: 'Software', nombreComponente: 'Obligatoria' },
];

describe('DeanPlanMallaComponent (HU108)', () => {
  let fixture: ComponentFixture<DeanPlanMallaComponent>;
  let component: DeanPlanMallaComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  function crear(planId = 'PLAN-SIS-2024'): void {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      imports: [DeanPlanMallaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ planId }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanPlanMallaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('carga la ficha desde la estructura y la malla desde el endpoint del decano', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: estructura });
    http.expectOne(`${API}/decano/planes-estudio/PLAN-SIS-2024/asignaturas`).flush({ exitoso: true, datos: asignaturasApi });
    http.expectNone(`${API}/coordinador/planes-estudio`);
    fixture.detectChanges();

    const plan = component.selectedPlan();
    expect(plan?.codigo).toBe('INP-20241');
    expect(plan?.programa).toBe('Ingeniería de Sistemas');
    expect(plan?.totalCreditos).toBe(7);
    expect(plan?.totalAsignaturas).toBe(2);
    expect(component.asignaturas()[0].creditos).toBe(4);
    expect(component.asignaturas()[0].area).toBe('Software');
    expect(fixture.nativeElement.textContent).toContain('7 créditos en 10 semestres');
  });

  it('filtra asignaturas por semestre y por texto', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: estructura });
    http.expectOne(`${API}/decano/planes-estudio/PLAN-SIS-2024/asignaturas`).flush({ exitoso: true, datos: asignaturasApi });

    component.onSemestreChange(2);
    expect(component.asignaturasFiltradas().length).toBe(1);
    expect(component.asignaturasFiltradas()[0].codigo).toBe('SIS-201');

    component.onSemestreChange(0);
    component.onFiltroChange('algor');
    expect(component.asignaturasFiltradas().map((a) => a.codigo)).toEqual(['SIS-101']);
  });

  // Certificación Fase 3: plan con 1 semestre registrado y la asignatura en S8; el selector solo ofrecía "Semestre 1".
  it('el selector de semestres cubre el semestre más alto de las asignaturas, sin inventar 10', () => {
    crear();
    const unSemestre = estructura.map((f: any) => ({
      ...f,
      programas: f.programas.map((p: any) => ({ ...p, planes: p.planes.map((pl: any) => ({ ...pl, totalSemestres: 1 })) })),
    }));
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: unSemestre });
    http.expectOne(`${API}/decano/planes-estudio/PLAN-SIS-2024/asignaturas`).flush({ exitoso: true, datos: asignaturasApi });
    const maximo = Math.max(...component.asignaturas().map((a) => a.semestre));
    expect(component.semestresDisponibles().length).toBe(Math.max(1, maximo));
    expect(component.semestresDisponibles()).toContain(maximo);
  });

  it('muestra el mensaje del backend si el plan no es de la facultad (403)', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: [] });
    http
      .expectOne(`${API}/decano/planes-estudio/PLAN-SIS-2024/asignaturas`)
      .flush({ exitoso: false, mensajeUsuario: 'Plan fuera de su facultad' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(component.selectedPlan()).toBeNull();
    expect(component.mensajeError()).not.toBe('');
  });

  it('error al cargar la estructura muestra el mensaje', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: false }, { status: 500, statusText: 'Error' });
    http.expectOne(`${API}/decano/planes-estudio/PLAN-SIS-2024/asignaturas`).flush({ exitoso: true, datos: [] });
    expect(component.mensajeError()).not.toBe('');
  });

  it('sin plan en la ruta no consulta la malla y regresa al listado', () => {
    crear('');
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: estructura });
    http.expectNone((r) => r.url.includes('/asignaturas'));
    expect(component.selectedPlan()).toBeNull();

    component.volverAProgramas();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/programas']);
  });
});
