import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DeanDirectorioComponent, ENTIDADES_DIRECTORIO, entidadValida } from './dean-directorio.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { FichaUnificadaEstudiante } from '../../../core/models/consultas-transversales.model';
import { grupoFacultadApi, paginaApi, porUrl } from '../../../core/testing/pagina-api';
import {
  EscenarioListado,
  afirmarAutorizacionDenegadaSinReintento,
  afirmarFalloRecuperableConReintento,
  afirmarNoImplementadoSinReintento,
} from '../../../shared/testing/listado-error.helper';

const API = environment.apiUrl;
const DOCENTES = `${API}/decano/docentes`;
const ESTUDIANTES = `${API}/decano/estudiantes`;
const ASIGNATURAS = `${API}/decano/asignaturas`;
const GRUPOS = `${API}/decano/grupos`;
const ESTRUCTURA = `${API}/decano/estructura`;

const HISTORIAL: FichaUnificadaEstudiante = {
  idEstudiante: 'est-1',
  tipoIdentificacion: 'CC',
  numeroIdentificacion: '1017000111',
  nombreCompleto: 'Ana Ruiz',
  correo: 'ana@uco.edu.co',
  activo: true,
  matriculas: [
    {
      idFacultad: 'f-1', nombreFacultad: 'Ingeniería', idPrograma: 'p-1', nombrePrograma: 'Ingeniería de Sistemas',
      inpPlanEstudio: 20241, idPeriodoAcademico: 'per-1', codigoPeriodo: '2026-1', nombrePeriodo: 'Primer semestre 2026',
      idGrupo: 'g-1', codigoGrupo: 1, idAsignatura: 'a-1', nombreAsignatura: 'Cálculo', codigoEstadoEstudiante: 'MAT',
      nombreEstadoEstudiante: 'Matriculado',
      resumen: { sesionesEjecutadas: 10, asistencias: 8, faltasSinJustaCausa: 2, excusas: 0, porcentajeInasistencia: 20, codigoPermanencia: 'RIESGO' },
    },
  ],
};

const docente = {
  idDocente: 'd-1', numeroIdentificacion: '43000111', nombreCompleto: 'María Rostagno', correo: null, activo: true,
  programas: 'Ingeniería de Sistemas', totalProgramas: 1, totalGrupos: 2,
};
const estudiante = {
  idEstudiante: 'est-1', numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz', correo: 'ana@uco.edu.co', activo: true,
  programas: 'Ingeniería de Sistemas', totalGrupos: 2,
};
const asignatura = {
  idAsignatura: 'a-1', codigo: 'MAT-301', nombre: 'Cálculo', creditos: 3, planes: 'Plan 2024', totalPlanes: 1,
  nombreArea: 'Matemáticas', nombreComponente: 'Básico', activa: true,
};

describe('DeanDirectorioComponent (CULM-001)', () => {
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;
  let router: Router;

  function crear(entidad?: string): ComponentFixture<DeanDirectorioComponent> {
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [DeanDirectorioComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(DeanDirectorioComponent);
    if (entidad !== undefined) fixture.componentRef.setInput('entidad', entidad);
    fixture.detectChanges();
    return fixture;
  }

  const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const texto = (f: ComponentFixture<unknown>) => el(f).textContent ?? '';

  /** Resuelve la primera carga de docentes (con la estructura que alimenta el filtro de programa). */
  function cargarDocentes(f: ComponentFixture<DeanDirectorioComponent>, datos: unknown[] = [docente]): void {
    const req = http.expectOne((r) => r.url === DOCENTES);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('10');
    expect(req.request.params.has('idPrograma')).toBeFalse();
    req.flush({ exitoso: true, datos, total: datos.length });
    http.expectOne(ESTRUCTURA).flush({ exitoso: true, datos: [{ id: 'f-1', nombre: 'Ingeniería', programas: [{ id: 'p-1', nombre: 'Sistemas', planes: [] }] }] });
    f.detectChanges();
  }

  afterEach(() => http?.verify());

  describe('selector de entidad', () => {
    it('ofrece las cuatro entidades en el orden docentes, estudiantes, asignaturas y grupos', () => {
      expect(ENTIDADES_DIRECTORIO.map((e) => e.id)).toEqual(['docentes', 'estudiantes', 'asignaturas', 'grupos']);
      const f = crear('docentes');
      cargarDocentes(f);
      const pestanas = Array.from(el(f).querySelectorAll('[role="tab"]')).map((t) => t.textContent?.trim());
      expect(pestanas).toEqual(['Docentes', 'Estudiantes', 'Asignaturas', 'Grupos']);
      expect(el(f).querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Entidad del directorio');
    });

    it('la entidad activa sale de la URL y las demás pestañas no se marcan', () => {
      const f = crear('estudiantes');
      http.expectOne((r) => r.url === ESTUDIANTES).flush({ exitoso: true, datos: [estudiante], total: 1 });
      f.detectChanges();
      expect(el(f).querySelector('[role="tab"][aria-selected="true"]')?.id).toBe('tab-estudiantes');
      expect(el(f).querySelectorAll('[role="tab"][aria-selected="true"]').length).toBe(1);
    });

    it('una entidad desconocida o ausente cae en docentes', () => {
      expect(entidadValida('xyz')).toBe('docentes');
      expect(entidadValida(null)).toBe('docentes');
      expect(entidadValida(undefined)).toBe('docentes');
      expect(entidadValida('grupos')).toBe('grupos');
      const f = crear();
      cargarDocentes(f);
      expect(el(f).querySelector('[role="tab"][aria-selected="true"]')?.id).toBe('tab-docentes');
    });

    it('elegir una entidad navega a su URL', () => {
      const f = crear('docentes');
      cargarDocentes(f);
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);
      (el(f).querySelector('#tab-grupos') as HTMLButtonElement).click();
      expect(navegar).toHaveBeenCalledWith(['/app/decano/directorio', 'grupos']);
    });

    it('al cambiar la entidad limpia los filtros, cierra la ficha y consulta la nueva fuente desde la página 1', () => {
      const f = crear('estudiantes');
      http.expectOne((r) => r.url === ESTUDIANTES).flush({ exitoso: true, datos: [estudiante], total: 1 });
      f.componentInstance.busqueda.set('ana');
      f.componentInstance.estado.set('INACTIVO');
      f.componentInstance.ficha.set({ idEstudiante: 'est-1', numeroIdentificacion: null, nombreCompleto: 'Ana', activo: true, matriculas: [] } as never);

      f.componentRef.setInput('entidad', 'asignaturas');
      f.detectChanges();

      const req = http.expectOne((r) => r.url === ASIGNATURAS);
      expect(req.request.params.get('pagina')).toBe('1');
      expect(req.request.params.has('busqueda')).toBeFalse();
      expect(req.request.params.has('estaActiva')).toBeFalse();
      req.flush({ exitoso: true, datos: [asignatura], total: 1 });
      expect(f.componentInstance.busqueda()).toBe('');
      expect(f.componentInstance.estado()).toBe('TODOS');
      expect(f.componentInstance.ficha()).toBeNull();
    });
  });

  describe('docentes', () => {
    it('lista los docentes con su programa y total, y ofrece los programas de la facultad', () => {
      const f = crear('docentes');
      cargarDocentes(f);
      expect(texto(f)).toContain('María Rostagno');
      expect(texto(f)).toContain('Ingeniería de Sistemas');
      expect(el(f).querySelector('[data-testid="total-directorio"]')?.textContent).toContain('1 Docentes');
      expect(f.componentInstance.programas()).toEqual([{ id: 'p-1', nombre: 'Sistemas' }]);
    });

    it('filtra por programa, estado y texto volviendo a la primera página', () => {
      const f = crear('docentes');
      cargarDocentes(f);
      f.componentInstance.listado.pagina.set(3);
      f.componentInstance.onPrograma('p-1');
      const porPrograma = http.expectOne((r) => r.url === DOCENTES);
      expect(porPrograma.request.params.get('idPrograma')).toBe('p-1');
      expect(porPrograma.request.params.get('pagina')).toBe('1');
      porPrograma.flush({ exitoso: true, datos: [], total: 0 });
      f.detectChanges();
      expect(texto(f)).toContain('No hay docentes que coincidan con los filtros.');
      expect(f.componentInstance.filtrosActivos()).toBe(1);

      f.componentInstance.onEstado('INACTIVO');
      expect(http.expectOne((r) => r.url === DOCENTES).request.params.get('estaActivo')).toBe('false');
      expect(f.componentInstance.filtrosActivos()).toBe(2);

      f.componentInstance.busqueda.set('maria');
      f.componentInstance.buscar();
      expect(http.expectOne((r) => r.url === DOCENTES).request.params.get('busqueda')).toBe('maria');
    });

    it('marca al docente sin vínculo activo', () => {
      const f = crear('docentes');
      cargarDocentes(f, [{ ...docente, tieneVinculoActivo: false }]);
      expect(el(f).querySelector('[data-testid="sin-vinculo"]')).not.toBeNull();
    });

    it('si la estructura falla, el filtro de programa queda vacío y la lista sigue', () => {
      const f = crear('docentes');
      http.expectOne((r) => r.url === DOCENTES).flush({ exitoso: true, datos: [docente], total: 1 });
      http.expectOne(ESTRUCTURA).flush({ exitoso: false }, { status: 500, statusText: 'Server Error' });
      f.detectChanges();
      expect(f.componentInstance.programas()).toEqual([]);
      expect(texto(f)).toContain('María Rostagno');
    });

    it('no vuelve a pedir la estructura al volver a docentes', () => {
      const f = crear('docentes');
      cargarDocentes(f);
      f.componentRef.setInput('entidad', 'grupos');
      f.detectChanges();
      http.expectOne((r) => r.url === GRUPOS).flush(paginaApi([]));
      f.componentRef.setInput('entidad', 'docentes');
      f.detectChanges();
      http.expectOne((r) => r.url === DOCENTES).flush({ exitoso: true, datos: [], total: 0 });
      http.expectNone(ESTRUCTURA);
    });

    it('un error muestra el mensaje del servidor y limpia la lista', () => {
      const f = crear('docentes');
      http.expectOne((r) => r.url === DOCENTES).flush({ exitoso: false }, { status: 403, statusText: 'Forbidden' });
      http.expectOne(ESTRUCTURA).flush({ exitoso: true, datos: [] });
      expect(f.componentInstance.listado.filas()).toEqual([]);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('estudiantes (HU104/HU105/HU157)', () => {
    function abrir(): ComponentFixture<DeanDirectorioComponent> {
      const f = crear('estudiantes');
      const req = http.expectOne((r) => r.url === ESTUDIANTES);
      expect(req.request.params.get('pagina')).toBe('1');
      expect(req.request.params.has('busqueda')).toBeFalse();
      expect(req.request.params.has('estaActivo')).toBeFalse();
      req.flush({ exitoso: true, datos: [estudiante], total: 1 });
      f.detectChanges();
      return f;
    }
    const fichaApi = (matriculas: unknown[] = []) => ({
      exitoso: true,
      datos: { idEstudiante: 'est-1', numeroIdentificacion: '1017000111', nombreCompleto: 'Ana Ruiz', activo: true, matriculas },
    });

    it('lista el directorio con programas, grupos y estado, sin pedir programas de la facultad', () => {
      const f = abrir();
      http.expectNone(ESTRUCTURA);
      expect(texto(f)).toContain('Ana Ruiz');
      expect(texto(f)).toContain('Ingeniería de Sistemas');
      expect(texto(f)).toContain('Activo');
      expect(el(f).querySelector('select[aria-label="Programa"]')).toBeNull();
    });

    it('busca por texto y filtra por estado reiniciando la página', () => {
      const f = abrir();
      f.componentInstance.listado.pagina.set(3);
      f.componentInstance.busqueda.set(' 1017 ');
      f.componentInstance.buscar();
      const req = http.expectOne((r) => r.url === ESTUDIANTES);
      expect(req.request.params.get('busqueda')).toBe('1017');
      expect(req.request.params.get('pagina')).toBe('1');
      req.flush({ exitoso: true, datos: [], total: 0 });
      f.detectChanges();
      expect(texto(f)).toContain('No hay estudiantes que coincidan con la búsqueda.');

      f.componentInstance.onEstado('INACTIVO');
      expect(http.expectOne((r) => r.url === ESTUDIANTES).request.params.get('estaActivo')).toBe('false');
      f.componentInstance.onEstado('ACTIVO');
      expect(http.expectOne((r) => r.url === ESTUDIANTES).request.params.get('estaActivo')).toBe('true');
    });

    it('paginación y tamaño recargan la consulta', () => {
      const f = abrir();
      f.componentInstance.listado.irAPagina(2);
      expect(http.expectOne((r) => r.url === ESTUDIANTES).request.params.get('pagina')).toBe('2');
      f.componentInstance.listado.cambiarTamano(20);
      const req = http.expectOne((r) => r.url === ESTUDIANTES);
      expect(req.request.params.get('tamano')).toBe('20');
      expect(req.request.params.get('pagina')).toBe('1');
    });

    it('un error del backend limpia la lista y muestra el mensaje', () => {
      const f = abrir();
      f.componentInstance.buscar();
      http.expectOne((r) => r.url === ESTUDIANTES).flush({ exitoso: false }, { status: 403, statusText: 'Forbidden' });
      expect(f.componentInstance.listado.filas()).toEqual([]);
      expect(toast.error).toHaveBeenCalled();
    });

    it('abre y cierra la ficha con las matrículas y el historial completo del estudiante', () => {
      const f = abrir();
      (el(f).querySelector('[data-testid="fila-est-1"] button') as HTMLButtonElement).click();
      http.expectOne(`${ESTUDIANTES}/est-1`).flush(
        fichaApi([{ idPrograma: 'p-1', nombrePrograma: 'Ingeniería de Sistemas', inpPlanEstudio: 20241, idAsignatura: 'a-1', nombreAsignatura: 'Cálculo', idGrupo: 'g-1', nombreGrupo: 'Grupo 1' }])
      );
      http.expectOne(`${ESTUDIANTES}/est-1/historial`).flush({ exitoso: true, datos: HISTORIAL });
      f.detectChanges();
      expect(texto(f)).toContain('1 matrículas');
      expect(texto(f)).toContain('Historial completo');
      expect(texto(f)).toContain('Primer semestre 2026');
      expect(texto(f)).toContain('RIESGO');

      f.componentInstance.cerrarFicha();
      expect(f.componentInstance.ficha()).toBeNull();
      expect(f.componentInstance.historial()).toBeNull();
    });

    it('si el historial falla, la ficha sigue visible y se informa el error', () => {
      const f = abrir();
      f.componentInstance.verFicha('est-1');
      http.expectOne(`${ESTUDIANTES}/est-1`).flush(fichaApi());
      http.expectOne(`${ESTUDIANTES}/est-1/historial`).flush({ exitoso: false }, { status: 404, statusText: 'Not Found' });
      expect(f.componentInstance.ficha()).not.toBeNull();
      expect(f.componentInstance.historial()).toBeNull();
      expect(toast.error).toHaveBeenCalled();
    });

    it('un error al abrir la ficha muestra el mensaje', () => {
      const f = abrir();
      f.componentInstance.verFicha('est-1');
      http.expectOne(`${ESTUDIANTES}/est-1`).flush({ exitoso: false }, { status: 404, statusText: 'Not Found' });
      expect(f.componentInstance.ficha()).toBeNull();
      expect(toast.error).toHaveBeenCalled();
    });

    it('al abrir la ficha se desplaza hasta ella y le da foco (UX-11)', async () => {
      const f = abrir();
      f.componentInstance.verFicha('est-1');
      http.expectOne(`${ESTUDIANTES}/est-1`).flush(fichaApi());
      http.expectOne(`${ESTUDIANTES}/est-1/historial`).flush({ exitoso: true, datos: { ...HISTORIAL, matriculas: [] } });
      f.detectChanges();
      const panel = el(f).querySelector('[aria-label="Ficha del estudiante"]') as HTMLElement;
      expect(panel).not.toBeNull();
      const scroll = spyOn(panel, 'scrollIntoView');
      const focus = spyOn(panel, 'focus');
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(scroll).toHaveBeenCalled();
      expect(focus).toHaveBeenCalled();
    });
  });

  describe('asignaturas (HU143)', () => {
    it('lista las asignaturas con créditos, planes, área y estado, y filtra por estado', () => {
      const f = crear('asignaturas');
      const req = http.expectOne((r) => r.url === ASIGNATURAS);
      expect(req.request.params.has('idFacultad')).toBeFalse();
      req.flush({ exitoso: true, datos: [asignatura, { ...asignatura, idAsignatura: 'a-2', codigo: 'X', nombre: 'Sin plan', planes: null, totalPlanes: 2, creditos: null, activa: false }], total: 2 });
      f.detectChanges();
      expect(texto(f)).toContain('MAT-301');
      expect(texto(f)).toContain('Matemáticas · Básico');
      expect(texto(f)).toContain('Sin plan');
      expect(texto(f)).toContain('2 planes');
      expect(texto(f)).toContain('1 plan');
      expect(texto(f)).toContain('Inactiva');

      f.componentInstance.onEstado('ACTIVO');
      expect(http.expectOne((r) => r.url === ASIGNATURAS).request.params.get('estaActiva')).toBe('true');
    });
  });

  describe('grupos (F-DEC-005, F-DEC-006)', () => {
    const grupo = (id: string, cupo: number | null, extra: Record<string, unknown> = {}) =>
      grupoFacultadApi({ idGrupo: id, codigo: `COD-${id}`, nombre: 'A', nombreAsignatura: `Materia ${id}`, capacidadMaximaPermitida: cupo, estudiantesActivos: 4, cuposDisponibles: null, ...extra });

    it('lista los grupos con sus programas y el aforo, sin filtro de estado', () => {
      const f = crear('grupos');
      http.expectOne(porUrl(GRUPOS)).flush(paginaApi([grupo('1', 20, { programas: ['Ingeniería de Sistemas', 'Ingeniería de Software'] })]));
      f.detectChanges();
      expect(texto(f)).toContain('Materia 1');
      expect(texto(f)).toContain('Ingeniería de Sistemas, Ingeniería de Software');
      expect(texto(f)).toContain('4 / 20');
      expect(el(f).querySelector('select[aria-label="Estado"]')).toBeNull();
    });

    it('un grupo sin cupo definido no inventa un cupo de 30', () => {
      const f = crear('grupos');
      http.expectOne(porUrl(GRUPOS)).flush(paginaApi([grupo('1', null), grupo('2', 0)]));
      f.detectChanges();
      expect(texto(f)).toContain('Sin cupo definido');
      expect(texto(f)).not.toContain('/ 30');
    });

    it('filtra por texto en el cliente y pagina sin volver a pedir los grupos', () => {
      const f = crear('grupos');
      http.expectOne(porUrl(GRUPOS)).flush(
        paginaApi(Array.from({ length: 12 }, (_, i) => grupo(String(i + 1), 20, { nombreAsignatura: i === 11 ? 'Álgebra' : `Materia ${i + 1}` })))
      );
      f.detectChanges();
      expect(f.componentInstance.listado.total()).toBe(12);
      expect(f.componentInstance.listado.filas().length).toBe(10);

      f.componentInstance.listado.irAPagina(2);
      http.expectNone(porUrl(GRUPOS));
      expect(f.componentInstance.listado.filas().length).toBe(2);

      f.componentInstance.busqueda.set('álgebra');
      f.componentInstance.buscar();
      http.expectNone(porUrl(GRUPOS));
      expect(f.componentInstance.listado.total()).toBe(1);
      expect(f.componentInstance.listado.filas()[0].id).toBe('12');
    });

    it('«Ver sesiones» navega al detalle del grupo', () => {
      const f = crear('grupos');
      http.expectOne(porUrl(GRUPOS)).flush(paginaApi([grupo('1', 20)]));
      f.detectChanges();
      const navegar = spyOn(router, 'navigate').and.resolveTo(true);
      (el(f).querySelector('[data-testid="fila-1"] button') as HTMLButtonElement).click();
      expect(navegar).toHaveBeenCalledWith(['/app/decano/grupos', '1']);
    });

    it('mientras responde no muestra «No se encontraron»; un grupo sin respuesta no queda en caché tras un error', () => {
      const f = crear('grupos');
      expect(texto(f)).not.toContain('No se encontraron grupos');
      http.expectOne(porUrl(GRUPOS)).flush({}, { status: 500, statusText: 'Error' });
      f.detectChanges();
      expect(el(f).querySelector('[role="alert"]')).not.toBeNull();
      f.componentInstance.listado.reintentar();
      http.expectOne(porUrl(GRUPOS)).flush(paginaApi([grupo('1', 20)]));
      f.detectChanges();
      expect(el(f).querySelector('[role="alert"]')).toBeNull();
      expect(texto(f)).toContain('Materia 1');
    });
  });

  describe('accesibilidad y estructura', () => {
    it('las cabeceras tienen scope=col y la búsqueda tiene nombre accesible', () => {
      const f = crear('docentes');
      cargarDocentes(f);
      el(f).querySelectorAll('th').forEach((th) => expect(th.getAttribute('scope')).toBe('col'));
      expect(el(f).querySelector('input[aria-label="Buscar docente"]')).not.toBeNull();
    });

    it('los filtros están plegados y el panel se enlaza con la pestaña activa', () => {
      const f = crear('docentes');
      cargarDocentes(f);
      expect(el(f).querySelector('[data-testid="filtros-panel"]')).toBeNull();
      expect(el(f).querySelector('#panel-directorio')?.getAttribute('aria-labelledby')).toBe('tab-docentes');
    });

    it('la tabla hace scroll horizontal dentro de su contenedor (no ensancha la página)', () => {
      const f = crear('docentes');
      cargarDocentes(f);
      expect(el(f).querySelector('table')?.parentElement?.className).toContain('overflow-x-auto');
    });
  });
});

describe('DeanDirectorioComponent estados de error de carga (docentes)', () => {
  function escenario(): EscenarioListado {
    TestBed.configureTestingModule({
      imports: [DeanDirectorioComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']) },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DeanDirectorioComponent);
    fixture.componentRef.setInput('entidad', 'docentes');
    fixture.detectChanges();
    http.expectOne((r) => r.url === DOCENTES).flush({ exitoso: true, datos: [], total: 0 });
    http.expectOne(ESTRUCTURA).flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    return {
      fixture, http,
      textoVacio: 'No hay docentes que coincidan con los filtros.',
      recargar: () => fixture.componentInstance.listado.irAPagina(2),
      coincide: (r) => r.url === DOCENTES,
      responderExito: (req) => req.flush({ exitoso: true, datos: [], total: 0 }),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('un fallo recuperable muestra alerta con Reintentar y no el vacío', () => afirmarFalloRecuperableConReintento(escenario()));
  it('403 se anuncia como sin autorización, sin Reintentar', () => afirmarAutorizacionDenegadaSinReintento(escenario()));
  it('501 se anuncia como no disponible, sin Reintentar', () => afirmarNoImplementadoSinReintento(escenario()));
});

describe('DeanDirectorioComponent enlazado a la URL (CULM-001)', () => {
  it('el parámetro :entidad de la ruta elige la entidad y cambiar la URL cambia la fuente', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'directorio/:entidad', component: DeanDirectorioComponent }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']) },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/directorio/estudiantes', DeanDirectorioComponent);
    http.expectOne((r) => r.url === ESTUDIANTES).flush({ exitoso: true, datos: [], total: 0 });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="tab"][aria-selected="true"]')?.id).toBe('tab-estudiantes');

    await harness.navigateByUrl('/directorio/asignaturas', DeanDirectorioComponent);
    http.expectOne((r) => r.url === ASIGNATURAS).flush({ exitoso: true, datos: [], total: 0 });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="tab"][aria-selected="true"]')?.id).toBe('tab-asignaturas');
    http.verify();
  });
});
