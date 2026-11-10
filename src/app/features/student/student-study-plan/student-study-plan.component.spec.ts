import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StudentStudyPlanComponent } from './student-study-plan.component';
import { environment } from '../../../../environments/environment';

const PLAN = `${environment.apiUrl}/estudiante/plan-estudio`;

const asignatura = (id: string, extra: Record<string, unknown> = {}) => ({
  idAsignatura: id,
  codigo: `COD-${id}`,
  nombre: `Asignatura ${id}`,
  creditos: 3,
  tipoAsignatura: 'ESPECIFICA',
  codigoCaracter: 'OBL',
  nombreCaracter: 'Obligatoria',
  cursando: false,
  idGrupoCursando: null,
  nombreGrupoCursando: null,
  ...extra,
});

const semestre = (numero: number, asignaturas: ReturnType<typeof asignatura>[]) => ({
  idSemestrePlanEstudio: `sem-${numero}`,
  numeroSemestre: numero,
  totalAsignaturas: asignaturas.length,
  totalCreditos: asignaturas.reduce((suma, a) => suma + (a.creditos ?? 0), 0),
  asignaturas,
});

const plan = (extra: Record<string, unknown> = {}) => ({
  idPlanEstudio: 'pl-1',
  inp: 2024,
  idPrograma: 'pr-1',
  nombrePrograma: 'Ingeniería de Sistemas',
  totalSemestres: 8,
  totalAsignaturas: 3,
  totalCreditos: 10,
  asignaturasCursando: 1,
  creditosCursando: 3,
  semestres: [
    semestre(1, [asignatura('a1'), asignatura('a2', { creditos: 4, codigoCaracter: 'OPT', nombreCaracter: 'Optativa', tipoAsignatura: 'BASICA' })]),
    semestre(2, []),
    semestre(8, [asignatura('a8', { cursando: true, idGrupoCursando: 'g-1', nombreGrupoCursando: 'Grupo 001 - Arq Software' })]),
  ],
  ...extra,
});

/** Pantalla "Plan de estudios" del estudiante (PL-01..PL-07). */
describe('StudentStudyPlanComponent (plan de estudios del estudiante)', () => {
  let fixture: ComponentFixture<StudentStudyPlanComponent>;
  let component: StudentStudyPlanComponent;
  let http: HttpTestingController;

  function crear(): void {
    TestBed.configureTestingModule({
      imports: [StudentStudyPlanComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(StudentStudyPlanComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  function responder(datos: unknown[]): void {
    http.expectOne((r) => r.url === PLAN).flush({ exitoso: true, datos, total: datos.length });
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => el().textContent!.replace(/\s+/g, ' ');
  const semestres = () => Array.from(el().querySelectorAll('[data-testid="semestre-plan"]')) as HTMLDetailsElement[];

  afterEach(() => http.verify());

  it('PL-01 mientras carga muestra el estado de carga y luego el plan con sus totales', () => {
    crear();
    expect(el().querySelector('[data-testid="plan-cargando"]')).not.toBeNull();

    responder([plan()]);

    expect(el().querySelector('[data-testid="plan-cargando"]')).toBeNull();
    expect(el().querySelectorAll('[data-testid="plan-estudio"]').length).toBe(1);
    expect(texto()).toContain('Ingeniería de Sistemas');
    expect(texto()).toContain('Plan de estudios 2024');
    const cifras = Array.from(el().querySelectorAll('dl dd')).map((dd) => dd.textContent!.replace(/\s+/g, ' ').trim());
    expect(cifras).toEqual(['8', '3', '10', '1 asignatura · 3 créditos']);
  });

  it('PL-02 lista los semestres en orden con sus asignaturas, créditos, carácter y tipo', () => {
    crear();
    responder([plan()]);

    expect(semestres().map((s) => s.querySelector('h3')!.textContent!.trim())).toEqual(['Semestre 1', 'Semestre 2', 'Semestre 8']);
    expect(semestres()[0].querySelector('summary')!.textContent!.replace(/\s+/g, ' ')).toContain('2 asignaturas · 7 créditos');
    const detalles = Array.from(semestres()[0].querySelectorAll('[data-testid="asignatura-detalle"]')).map((d) => d.textContent!.trim());
    expect(detalles).toEqual(['3 créditos · Obligatoria · Específica', '4 créditos · Optativa · Básica']);
    expect(semestres()[0].textContent).toContain('COD-a1');
    expect(semestres()[0].textContent).toContain('Asignatura a2');
  });

  it('PL-03 marca lo que cursa hoy, con su grupo, y abre solo los semestres donde cursa algo', () => {
    crear();
    responder([plan()]);

    expect(semestres().map((s) => s.open)).toEqual([false, false, true]);
    const insignias = el().querySelectorAll('[data-testid="insignia-cursando"]');
    expect(insignias.length).toBe(1);
    expect(semestres()[2].textContent).toContain('Cursando');
    expect(semestres()[2].textContent).toContain('Grupo: Grupo 001 - Arq Software');
    expect(semestres()[2].querySelector('summary')!.textContent).toContain('Cursas 1');
    expect(semestres()[0].querySelector('summary')!.textContent).not.toContain('Cursas');
  });

  it('PL-04 un semestre sin asignaturas lo dice, y un plan de un solo semestre lo muestra abierto', () => {
    crear();
    responder([plan()]);
    expect(semestres()[1].querySelector('[data-testid="semestre-vacio"]')!.textContent).toContain('aún no tiene asignaturas');
    expect(semestres()[1].querySelector('summary')!.textContent!.replace(/\s+/g, ' ')).toContain('0 asignaturas · 0 créditos');

    component.planes.set([plan({ semestres: [semestre(8, [asignatura('a8', { creditos: 1 })])] }) as never]);
    fixture.detectChanges();
    expect(semestres().map((s) => s.open)).toEqual([true]);
    expect(semestres()[0].querySelector('summary')!.textContent!.replace(/\s+/g, ' ')).toContain('1 asignatura · 1 crédito');
  });

  it('PL-05 sin planes muestra el estado vacío, sin error', () => {
    crear();
    responder([]);

    expect(el().querySelector('[data-testid="plan-vacio"]')!.textContent).toContain('aún no tienen un plan de estudios activo');
    expect(el().querySelector('[data-testid="plan-error"]')).toBeNull();
    expect(el().querySelectorAll('[data-testid="plan-estudio"]').length).toBe(0);
  });

  it('PL-06 un error muestra el mensaje del backend y permite reintentar', () => {
    crear();
    http.expectOne((r) => r.url === PLAN).flush(
      {
        timestamp: '2026-11-10T06:00:00Z', status: 403, error: 'Forbidden', code: 'FORBIDDEN',
        message: 'No fue posible resolver el estudiante autenticado.', path: '/api/v1/estudiante/plan-estudio', correlationId: null,
      },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    const error = el().querySelector('[data-testid="plan-error"]')!;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toContain('No fue posible resolver el estudiante autenticado.');
    expect(el().querySelector('[data-testid="plan-vacio"]')).toBeNull();

    (error.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    responder([plan()]);
    expect(el().querySelector('[data-testid="plan-error"]')).toBeNull();
    expect(el().querySelectorAll('[data-testid="plan-estudio"]').length).toBe(1);
  });

  it('PL-07 omite lo que el backend no informa: sin código, sin créditos, sin carácter y con un tipo desconocido', () => {
    crear();
    responder([plan({
      inp: null,
      semestres: [semestre(1, [
        asignatura('x1', { codigo: null, creditos: null, nombreCaracter: null, tipoAsignatura: 'OTRO' }),
        asignatura('x2', { creditos: 1, nombreCaracter: null, tipoAsignatura: 'INSTITUCIONAL', cursando: true }),
      ])],
    })]);

    expect(texto()).not.toContain('Plan de estudios null');
    const detalles = Array.from(el().querySelectorAll('[data-testid="asignatura-detalle"]')).map((d) => d.textContent!.trim());
    expect(detalles).toEqual(['Sin información de créditos', '1 crédito · Institucional']);
    expect(el().querySelector('[data-testid="asignatura-plan"]')!.textContent).not.toContain('COD-');
    expect(texto()).not.toContain('Grupo:');
    expect(texto()).not.toContain('null');
  });
});
