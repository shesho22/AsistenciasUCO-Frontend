import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { DeanFacultyComponent } from './dean-faculty.component';
import { environment } from '../../../../environments/environment';
import { Course } from '../../../core/models/course.model';
import { FacultadNodo } from '../../../core/models/facultad-decano.model';
import { grupoFacultadApi, paginaApi, porUrl } from '../../../core/testing/pagina-api';

// LB-001B.1B (DB source of truth cleanup): AS-IS #14 (tabla de cursos), #15 (ficha resumen) y #17 (filtro de
// búsqueda por docenteName). INT-05/AUTH-03/AUTH-04/DAT-06/UX-09: el decano solo consume rutas de lectura que su
// rol tiene autorizadas y un error HTTP no se presenta como "0".

describe('DeanFacultyComponent', () => {
  let fixture: ComponentFixture<DeanFacultyComponent>;
  let component: DeanFacultyComponent;
  let http: HttpTestingController;

  const MARCADOR_DOCENTE = 'MARCADOR-DOCENTE-NO-DEBE-RENDERIZARSE';
  const api = environment.apiUrl;

  const course: Course = {
    id: 'crs-1',
    code: 'MAT-301',
    name: 'Matemática Avanzada III',
    section: 'Sección A',
    schedule: 'Lun, Mié 08:00 - 10:00 AM',
    room: 'Aula A-204',
    enrolledStudentsCount: 32,
    cupoMaximo: 35,
    docenteName: MARCADOR_DOCENTE,
    colorCategory: 'emerald',
  };

  const estructura: FacultadNodo[] = [
    {
      id: 'fac-1',
      nombre: 'Facultad de Ingeniería',
      nombreDecano: 'PRUEBA INTEGRACION DECANO UCO',
      activa: true,
      programas: [
        {
          id: 'prog-1',
          nombre: 'Ingeniería de Sistemas',
          activo: true,
          planes: [
            { id: 'plan-1', inp: 2024, activo: true, totalSemestres: 8 },
            { id: 'plan-2', inp: 2019, activo: false, totalSemestres: 10 },
          ],
        },
      ],
    } as unknown as FacultadNodo,
  ];

  type Respuesta = { status?: number; body: object };
  const ok = (datos: unknown[]): Respuesta => ({ body: { exitoso: true, total: datos.length, datos } });
  const fallo = (status: number): Respuesta => ({
    status,
    body: { exitoso: false, codigo: status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR', mensajeUsuario: 'Error de prueba.' },
  });

  function responder(ruta: string, r: Respuesta): void {
    const req = http.expectOne(porUrl(`${api}${ruta}`));
    req.flush(r.body, { status: r.status ?? 200, statusText: r.status && r.status >= 400 ? 'Error' : 'OK' });
  }

  function crear(respuestas: Partial<Record<string, Respuesta>> = {}): void {
    fixture = TestBed.createComponent(DeanFacultyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    responder('/decano/grupos', respuestas['/decano/grupos'] ?? { body: paginaApi([]) });
    responder('/decano/estructura', respuestas['/decano/estructura'] ?? ok(estructura));
    responder('/admin/areas', respuestas['/admin/areas'] ?? ok([{ id: 'a1', nombre: 'Matemáticas', estado: 'ACTIVO' }]));
    responder('/coordinador/periodos-academicos', respuestas['/coordinador/periodos-academicos'] ?? ok([
      { id: 'p1', codigo: '2026-2', nombre: 'Segundo 2026', fechaInicio: '2026-07-15', fechaFin: '2026-11-30', estado: 'ACTIVO', esActual: true },
    ]));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeanFacultyComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('F-DEC-009: la tarjeta de areas no habla de infraestructura ni de coordinadores de area', () => {
    crear();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toMatch(/infraestructura/i);
    expect(texto).not.toContain('coordinadores de área');
    expect(texto).toContain('Áreas de Conocimiento');
  });

  // INT-05: estas rutas son del ADMINISTRADOR o del COORDINADOR; el decano recibía 403 en cada carga.
  it('no consume rutas de otros roles (sedes, espacios, facultades, parámetros, auditoría ni planes del coordinador)', () => {
    crear();
    for (const ruta of [
      '/admin/sedes',
      '/admin/espacios-fisicos',
      '/admin/facultades',
      '/admin/parametros',
      '/admin/auditoria',
      '/coordinador/planes-estudio',
    ]) {
      http.expectNone(`${api}${ruta}`);
    }
    expect(component).toBeTruthy();
  });

  // DAT-06: el total de planes sale de la estructura de la facultad (GET /decano/estructura), no de /coordinador.
  it('muestra facultad, decano titular y planes reales de la estructura', () => {
    crear();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(component.planes().length).toBe(2);
    expect(text).toContain('Facultad de Ingeniería');
    expect(text).toContain('PRUEBA INTEGRACION DECANO UCO');
    expect(text).not.toContain('Decanatura Titular');
    expect(text).not.toContain('Campus Principal Rionegro');
    expect(text).not.toContain('FAC-ING');
  });

  it('suma cupos solo con los valores recibidos (sin inventar 30 por grupo)', () => {
    crear();
    component.courses.set([{ ...course, cupoMaximo: undefined, enrolledStudentsCount: 10 }]);
    expect(component.totalCupos()).toBe(0);
    component.courses.set([{ ...course, cupoMaximo: 35 }]);
    expect(component.totalCupos()).toBe(35);
  });

  // UX-09: un 403/500 no es "0 períodos"; se informa y la tarjeta muestra un guion.
  it('un error HTTP en períodos se informa y no se muestra como 0', () => {
    crear({ '/coordinador/periodos-academicos': fallo(403) });
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(component.errorPeriodos()).toBeTrue();
    expect(component.periodosTotal()).toBe('—');
    expect(text).not.toContain('0 períodos');
    expect(text).toContain('No fue posible cargar');
  });

  // Sedes y espacios físicos no se piden (HU020/HU140 descartadas, 2026-11-06): la ficha ya no los muestra.
  it('no muestra sedes ni espacios físicos', () => {
    crear();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Sede Principal');
    expect(text).not.toContain('Espacios Físicos');
    expect(text).toContain('Áreas de Conocimiento');
  });

  it('un 200 vacío sí es cero legítimo', () => {
    crear({ '/coordinador/periodos-academicos': ok([]) });
    expect(component.errorPeriodos()).toBeFalse();
    expect(component.periodosTotal()).toBe('0');
  });

  it('no renderiza docenteName en la tabla de grupos de la facultad', () => {
    crear();
    component.courses.set([course]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain(MARCADOR_DOCENTE);
  });

  // CULM-001: la cabecera de la facultad solo lleva tres cifras (grupos, planes y áreas); los accesos a otras
  // pantallas son ahora las pestañas de Mi facultad.
  it('CULM-001 muestra tres chips: grupos, planes y áreas, con los valores recibidos', () => {
    crear({ '/decano/grupos': { body: paginaApi([grupoFacultadApi({ idGrupo: 'crs-1', estudiantesActivos: 32, capacidadMaximaPermitida: 35 })]) } });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('[aria-label="Cifras de la facultad"] li').length).toBe(3);
    expect(el.querySelector('[data-testid="chip-grupos"]')?.textContent).toContain('1');
    expect(el.querySelector('[data-testid="chip-grupos"]')?.textContent).toContain('32 inscritos de 35 cupos');
    expect(el.querySelector('[data-testid="chip-planes"]')?.textContent).toContain('2');
    expect(el.querySelector('[data-testid="chip-areas"]')?.textContent).toContain('1');
  });

  it('CULM-001 un error en una sección muestra «—» en su chip y no un cero', () => {
    crear({ '/admin/areas': fallo(500) });
    const chip = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="chip-areas"]');
    expect(chip?.textContent).toContain('—');
  });

  it('CULM-001 ya no ofrece tarjetas de navegación a otros módulos', () => {
    crear();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Módulos de Supervisión');
    expect(text).not.toContain('Ir a Grupos');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('button').length).toBe(0);
  });
});
