import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { DeanPlanMallaComponent } from './dean-plan-malla.component';
import { environment } from '../../../../environments/environment';
import { paginaApi, porUrl } from '../../../core/testing/pagina-api';

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

/** Respuesta del backend: una fila por vínculo asignatura-plan (AsignaturaPlanDTO). */
const vinculo = (id: string, codigo: string, nombre: string, credito: number, semestre: number, caracter: 'OBL' | 'OPT', compartida = false) => ({
  idAsignatura: id, codigo, nombre, credito, idArea: 'ar-1', nombreArea: 'Software', idComponente: 'cmp-1', nombreComponente: 'Obligatoria',
  idPlanEstudio: 'PLAN-SIS-2024', inpPlanEstudio: '20241', idPrograma: 'PRG-1', nombrePrograma: 'Ingeniería de Sistemas',
  idSemestrePlanEstudio: `sem-${semestre}`, numeroSemestre: semestre, codigoSemestre: `S${semestre}`,
  codigoCaracter: caracter, nombreCaracter: caracter === 'OBL' ? 'Obligatoria' : 'Optativa',
  estaActivoVinculo: true, estaActivaAsignatura: true, compartida,
});
const asignaturasApi = [
  vinculo('asig-1', 'SIS-101', 'Algoritmos I', 4, 1, 'OBL', true),
  vinculo('asig-2', 'SIS-201', 'Estructuras de Datos', 3, 2, 'OPT'),
];
const urlMalla = `${API}/decano/planes-estudio/PLAN-SIS-2024/asignaturas`;

describe('DeanPlanMallaComponent (HU108, B2NM)', () => {
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

  it('carga la ficha desde la estructura y la primera página de la malla del decano', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: estructura });
    const req = http.expectOne(porUrl(urlMalla));
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('9');
    req.flush(paginaApi(asignaturasApi, 1, 9));
    http.expectNone(`${API}/coordinador/planes-estudio`);
    fixture.detectChanges();

    const plan = component.selectedPlan();
    expect(plan?.codigo).toBe('INP-20241');
    expect(plan?.programa).toBe('Ingeniería de Sistemas');
    expect(component.totalAsignaturas()).toBe(2);
    expect(component.asignaturas()[0].creditos).toBe(4);
    expect(component.asignaturas()[0].area).toBe('Software');
    expect(fixture.nativeElement.textContent).toContain('10 semestres');
    expect(fixture.nativeElement.textContent).toContain('2 asignaturas en la malla');
  });

  it('muestra la insignia de carácter y marca la asignatura compartida', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: estructura });
    http.expectOne(porUrl(urlMalla)).flush(paginaApi(asignaturasApi, 1, 9));
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Obligatoria');
    expect(texto).toContain('Optativa');
    expect(texto).toContain('Compartida');
    expect(component.caracteres().map((c) => c.codigo)).toEqual(['OBL', 'OPT']);
  });

  it('el semestre, el carácter y la página se filtran en el servidor', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: estructura });
    http.expectOne(porUrl(urlMalla)).flush(paginaApi(asignaturasApi, 1, 9));

    component.onSemestreChange(2);
    let req = http.expectOne(porUrl(urlMalla));
    expect(req.request.params.get('semestre')).toBe('2');
    req.flush(paginaApi([asignaturasApi[1]], 1, 9));
    expect(component.asignaturas().map((a) => a.codigo)).toEqual(['SIS-201']);

    component.onSemestreChange(0);
    http.expectOne(porUrl(urlMalla)).flush(paginaApi(asignaturasApi, 1, 9));

    component.onCaracterChange('OPT');
    req = http.expectOne(porUrl(urlMalla));
    expect(req.request.params.get('caracter')).toBe('OPT');
    expect(req.request.params.has('semestre')).toBeFalse();
    req.flush(paginaApi([asignaturasApi[1]], 1, 9));

    component.onPageChange(2);
    req = http.expectOne(porUrl(urlMalla));
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush(paginaApi([], 2, 9, 12));
    expect(component.totalAsignaturas()).toBe(12);
  });

  it('la búsqueda por texto espera a que se deje de escribir y reinicia la página', fakeAsync(() => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: estructura });
    http.expectOne(porUrl(urlMalla)).flush(paginaApi(asignaturasApi, 1, 9));

    component.currentPage.set(3);
    component.onFiltroChange('algor');
    expect(component.currentPage()).toBe(1);
    http.expectNone(porUrl(urlMalla));
    tick(300);
    const req = http.expectOne(porUrl(urlMalla));
    expect(req.request.params.get('busqueda')).toBe('algor');
    req.flush(paginaApi([asignaturasApi[0]], 1, 9));
    expect(component.asignaturas().map((a) => a.codigo)).toEqual(['SIS-101']);
  }));

  // Certificación Fase 3: plan con 1 semestre registrado y la asignatura en S8; el selector solo ofrecía "Semestre 1".
  it('el selector de semestres cubre el semestre más alto de las asignaturas, sin inventar 10', () => {
    crear();
    const unSemestre = estructura.map((f: any) => ({
      ...f,
      programas: f.programas.map((p: any) => ({ ...p, planes: p.planes.map((pl: any) => ({ ...pl, totalSemestres: 1 })) })),
    }));
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: unSemestre });
    http.expectOne(porUrl(urlMalla)).flush(paginaApi([vinculo('asig-8', 'SIS-801', 'Arquitectura', 3, 8, 'OBL')], 1, 9));
    const maximo = Math.max(...component.asignaturas().map((a) => a.semestre));
    expect(component.semestresDisponibles().length).toBe(Math.max(1, maximo));
    expect(component.semestresDisponibles()).toContain(maximo);
  });

  it('un plan ajeno o inexistente (404 PLA_002) muestra "Plan no encontrado"', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: estructura });
    http
      .expectOne(porUrl(urlMalla))
      .flush({ exitoso: false, code: 'PLA_002', message: 'El plan no existe.' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.mensajeError()).toBe('Plan no encontrado');
    expect(component.asignaturas()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Plan no encontrado');
  });

  it('muestra el mensaje del backend si el plan no es de la facultad (403)', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: true, datos: [] });
    http
      .expectOne(porUrl(urlMalla))
      .flush({ exitoso: false, mensajeUsuario: 'Plan fuera de su facultad' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(component.selectedPlan()).toBeNull();
    expect(component.mensajeError()).not.toBe('');
    expect(component.mensajeError()).not.toBe('Plan no encontrado');
  });

  it('error al cargar la estructura muestra el mensaje', () => {
    crear();
    http.expectOne(`${API}/decano/estructura`).flush({ exitoso: false }, { status: 500, statusText: 'Error' });
    http.expectOne(porUrl(urlMalla)).flush(paginaApi([], 1, 9));
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
