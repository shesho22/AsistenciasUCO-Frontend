import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { ConsolidadoAsistenciaComponent } from './consolidado-asistencia.component';
import { ConsolidadoGrupoItem } from '../../../core/models/consultas-transversales.model';
import { BehaviorSubject, Subject } from 'rxjs';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RealtimeEvent } from '../../../core/realtime/model/realtime-event.model';
import { RealtimeConnectionState } from '../../../core/realtime/model/realtime-connection-state.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

describe('ConsolidadoAsistenciaComponent (HU061)', () => {
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;
  const api = environment.apiUrl;

  const grupo = (idAsignatura: string, nombreAsignatura: string, idDocente: string | null, codigoPermanencia: string | null = 'REGULAR'): ConsolidadoGrupoItem => ({
    idGrupo: `G-${idAsignatura}`, codigoGrupo: 1, nombreGrupo: 'Grupo 01', idPeriodoAcademico: 'PER-1',
    nombrePeriodoAcademico: '2026-2', idPrograma: 'PRG-1', nombrePrograma: 'Sistemas', idAsignatura, nombreAsignatura,
    idDocente, nombreDocente: idDocente ? 'Ana' : null, estudiantesActivos: 20, sesionesEjecutadas: 8, asistencias: 150,
    faltasSinJustaCausa: 10, excusas: 0, porcentajeAsistencia: 93.75, porcentajeInasistencia: 6.25,
    estudiantesRiesgo: 2, estudiantesPerdida: 1, horasDictadas: 16, porcentajeExcusa: 0, porcentajeSinRegistro: 0,
    codigoPermanencia,
  });

  /** Opciones COMPLETAS del ámbito (CIERRE-W2A): incluyen materias y docentes que no están en las filas de la página. */
  const OPCIONES = {
    asignaturas: [{ id: 'ASG-1', nombre: 'Cálculo' }, { id: 'ASG-9', nombre: 'Física' }],
    docentes: [{ id: 'DOC-1', nombre: 'Ana' }, { id: 'DOC-7', nombre: 'Luis' }],
  };

  function realtimeFalso(): jasmine.SpyObj<RealtimeService> {
    const rt = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['startForGroup', 'stop', 'events'], {
      connectionState$: new BehaviorSubject<RealtimeConnectionState>('DISCONNECTED').asObservable(),
    });
    rt.events.and.returnValue(new Subject<RealtimeEvent>().asObservable());
    return rt;
  }

  function crear(comoDecano: boolean): ComponentFixture<ConsolidadoAsistenciaComponent> {
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [ConsolidadoAsistenciaComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toast },
        { provide: RealtimeService, useValue: realtimeFalso() },
        { provide: ActivatedRoute, useValue: { snapshot: { data: comoDecano ? { comoDecano: true } : {} } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ConsolidadoAsistenciaComponent);
    fixture.detectChanges();
    http.expectOne(`${api}/coordinador/periodos-academicos`).flush({
      exitoso: true,
      datos: [{ id: 'PER-1', codigo: '2026-2', nombre: '2026-2', fechaInicio: '2026-07-01', fechaFin: '2026-12-01', estado: 'ACTIVO' }],
    });
    http.expectOne((r) => r.url === `${api}/${comoDecano ? 'decano' : 'coordinador'}/consolidado-asistencia/opciones`)
      .flush({ exitoso: true, datos: OPCIONES });
    return fixture;
  }

  afterEach(() => http?.verify());

  it('CIERRE-W3I el nivel del semaforo y el resalte los define el servidor (codigoPermanencia), sin umbrales en el cliente', () => {
    const fixture = crear(false);
    http
      .expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`)
      .flush({
        exitoso: true,
        datos: [grupo('ASG-1', 'Cálculo', 'DOC-1', 'RIESGO'), grupo('ASG-2', 'Física', 'DOC-1', 'REGULAR'), grupo('ASG-3', 'Química', 'DOC-1', 'PERDIDA')],
        total: 3,
      });
    fixture.detectChanges();

    const celdas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="inasistencia"]'));
    expect(celdas.map((c) => c.className.includes('text-danger-700'))).toEqual([true, false, true]);
    expect(celdas.map((c) => c.querySelector('[data-testid="semaforo-nivel"]')?.getAttribute('data-nivel'))).toEqual(['ambar', 'verde', 'rojo']);
  });

  it('CIERRE-W3I sin codigoPermanencia del servidor no se inventa un nivel ni se resalta', () => {
    const fixture = crear(true);
    http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia`)
      .flush({ exitoso: true, datos: [grupo('ASG-1', 'Cálculo', 'DOC-1', null)], total: 1 });
    fixture.detectChanges();

    const celda = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="inasistencia"]');
    expect(celda?.className).not.toContain('text-danger-700');
    expect(celda?.querySelector('[data-testid="semaforo-nivel"]')).toBeNull();
  });

  it('el coordinador consulta su ruta y ve las métricas por grupo', () => {
    const fixture = crear(false);
    http
      .expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`)
      .flush({ exitoso: true, datos: [grupo('ASG-1', 'Cálculo', 'DOC-1')], total: 1 });
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Coordinación');
    expect(texto).toContain('Cálculo');
    expect(texto).toContain('93.75%');
    // Certificación F3: la columna cuenta sesiones ejecutadas, no las programadas del cronograma.
    expect(texto).toContain('Sesiones ejecutadas');
    expect(fixture.componentInstance.periodos()).toHaveSize(1);
    // Las opciones salen del servidor y NO de las filas de la página (ASG-9 y DOC-7 no tienen fila)
    expect(fixture.componentInstance.asignaturas()).toEqual(OPCIONES.asignaturas);
    expect(fixture.componentInstance.docentes()).toEqual(OPCIONES.docentes);
  });

  it('D.8 muestra Excusa y Sin registro con la barra apilada de cuatro segmentos y la nota de horas', () => {
    const fixture = crear(false);
    http
      .expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`)
      .flush({
        exitoso: true,
        datos: [{ ...grupo('ASG-1', 'Cálculo', 'DOC-1'), porcentajeAsistencia: 60, porcentajeInasistencia: 10, porcentajeExcusa: 5.5, porcentajeSinRegistro: 24.5, horasDictadas: 16 }],
        total: 1,
      });
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    const texto = raiz.textContent ?? '';
    expect(texto).toContain('Calculado por horas');
    expect(texto).toContain('Excusa');
    expect(texto).toContain('Sin registro');
    expect(texto).toContain('5.5%');
    expect(texto).toContain('24.5%');
    const ancho = (id: string) => (raiz.querySelector(`[data-testid="${id}"]`) as HTMLElement).style.width;
    expect(ancho('segmento-asistencia')).toBe('60%');
    expect(ancho('segmento-inasistencia')).toBe('10%');
    expect(ancho('segmento-excusa')).toBe('5.5%');
    expect(ancho('segmento-sin-registro')).toBe('24.5%');
    expect(raiz.querySelectorAll('[data-testid="barra-distribucion"] > span')).toHaveSize(4);
    expect(raiz.querySelector('[data-testid="barra-distribucion"]')?.getAttribute('aria-label'))
      .toBe('Asistencia 60%, inasistencia 10%, excusa 5.5%, sin registro 24.5%');
  });

  it('el decano usa su ruta y filtrar por cohorte vuelve a consultar desde la página 1', () => {
    const fixture = crear(true);
    http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });
    const component = fixture.componentInstance;

    component.cambiarPeriodo('PER-1');

    http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia/opciones`).flush({ exitoso: true, datos: OPCIONES });
    const req = http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia`);
    expect(req.request.params.get('idPeriodoAcademico')).toBe('PER-1');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay grupos');
  });

  it('muestra el error del backend', () => {
    crear(false);
    http
      .expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`)
      .flush({ message: 'Sin permisos' }, { status: 403, statusText: 'Forbidden' });
    expect(toast.error).toHaveBeenCalled();
  });

  // Un fallo de carga no puede verse como "No hay grupos con asistencia": alerta accesible y Reintentar.
  it('un 500 muestra una alerta con Reintentar y no el estado vacio; Reintentar recupera la lista', () => {
    const fixture = crear(false);
    http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`).flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay grupos con asistencia');

    (Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? '')) as HTMLButtonElement).click();
    http
      .expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`)
      .flush({ exitoso: true, datos: [grupo('ASG-1', 'Cálculo', 'DOC-1')], total: 1 });
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.textContent).toContain('Cálculo');
  });

  describe('CULM-001 cifra única de inasistencia, filas expandibles y modo embebido', () => {
    const listar = (fixture: ComponentFixture<ConsolidadoAsistenciaComponent>, ruta: string, datos: ConsolidadoGrupoItem[]) => {
      http.expectOne((r) => r.url === `${api}/${ruta}/consolidado-asistencia`).flush({ exitoso: true, datos, total: datos.length });
      fixture.detectChanges();
    };
    const el = (f: ComponentFixture<ConsolidadoAsistenciaComponent>) => f.nativeElement as HTMLElement;
    const paginaVacia = { elementos: [], numeroPagina: 1, tamanoPagina: 50, totalElementos: 0, totalPaginas: 0 };

    it('muestra una sola cifra de inasistencia con su base: «3,46 % · 2 h 15 min de 65 h»', () => {
      const fixture = crear(false);
      listar(fixture, 'coordinador', [{ ...grupo('ASG-1', 'Cálculo', 'DOC-1'), porcentajeInasistencia: 3.46, horasDictadas: 65 }]);
      expect(el(fixture).querySelector('[data-testid="inasistencia"]')?.textContent?.trim()).toBe('3,46 % · 2 h 15 min de 65 h');
    });

    it('sin horas dictadas la base es 0 min y no se inventa otra cifra', () => {
      const fixture = crear(false);
      listar(fixture, 'coordinador', [{ ...grupo('ASG-1', 'Cálculo', null), porcentajeInasistencia: 0, horasDictadas: 0 }]);
      expect(el(fixture).querySelector('[data-testid="inasistencia"]')?.textContent?.trim()).toBe('0 % · 0 min de 0 min');
    });

    it('el decano expande una fila y ve las sesiones del grupo desde GET /decano/sesiones?idGrupo=', () => {
      const fixture = crear(true);
      listar(fixture, 'decano', [grupo('ASG-1', 'Cálculo', 'DOC-1')]);
      const boton = el(fixture).querySelector('[data-testid="expandir-G-ASG-1"]') as HTMLButtonElement;
      expect(boton.getAttribute('aria-expanded')).toBe('false');
      expect(el(fixture).querySelector('[data-testid="sesiones-G-ASG-1"]')).toBeNull();

      boton.click();
      fixture.detectChanges();
      const req = http.expectOne((r) => r.url === `${api}/decano/sesiones`);
      expect(req.request.params.get('idGrupo')).toBe('G-ASG-1');
      req.flush({
        elementos: [{ id: 'S1', nombre: 'Sesión 1', codigo: 'S-01', numeroSemana: 1, fechaHoraInicio: '2026-08-03T07:00:00', fechaHoraFin: '2026-08-03T09:00:00', idGrupo: 'G-ASG-1', codigoGrupo: 1, nombreGrupo: 'Grupo 01', idAsignatura: 'ASG-1', nombreAsignatura: 'Cálculo' }],
        numeroPagina: 1, tamanoPagina: 50, totalElementos: 1, totalPaginas: 1,
      });
      fixture.detectChanges();
      expect(boton.getAttribute('aria-expanded')).toBe('true');
      expect(el(fixture).querySelector('[data-testid="sesiones-G-ASG-1"]')?.textContent).toContain('S-01');

      boton.click();
      fixture.detectChanges();
      expect(el(fixture).querySelector('[data-testid="sesiones-G-ASG-1"]')).toBeNull();
      expect(boton.getAttribute('aria-expanded')).toBe('false');
    });

    it('el coordinador expande una fila y ve las sesiones de su grupo con la opción de cancelar', () => {
      const fixture = crear(false);
      listar(fixture, 'coordinador', [grupo('ASG-1', 'Cálculo', 'DOC-1')]);
      (el(fixture).querySelector('[data-testid="expandir-G-ASG-1"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      http.expectOne((r) => r.url === `${api}/coordinador/grupos/G-ASG-1/sesiones`).flush({
        exitoso: true, total: 1,
        datos: [{ id: 'S1', idGrupo: 'G-ASG-1', codigoGrupo: 1, nombreGrupo: 'Grupo 01', nombre: 'Sesión 1', numero: 1, codigo: 'S-01', numeroSemana: 1, fechaHoraInicio: '2026-08-03T07:00:00', fechaHoraFin: '2026-08-03T09:00:00', estado: 'PROGRAMADA', cancelacion: null }],
      });
      fixture.detectChanges();
      const detalle = el(fixture).querySelector('[data-testid="sesiones-G-ASG-1"]');
      expect(detalle?.textContent).toContain('S-01');
      expect(detalle?.querySelector('[data-testid="cancelar-sesion"]')).not.toBeNull();
    });

    it('solo una fila queda expandida: abrir otra cierra la anterior', () => {
      const fixture = crear(true);
      listar(fixture, 'decano', [grupo('ASG-1', 'Cálculo', 'DOC-1'), grupo('ASG-2', 'Álgebra', 'DOC-1')]);
      (el(fixture).querySelector('[data-testid="expandir-G-ASG-1"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      http.expectOne((r) => r.url === `${api}/decano/sesiones`).flush(paginaVacia);
      (el(fixture).querySelector('[data-testid="expandir-G-ASG-2"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      http.expectOne((r) => r.url === `${api}/decano/sesiones`).flush(paginaVacia);
      fixture.detectChanges();
      expect(el(fixture).querySelector('[data-testid="sesiones-G-ASG-1"]')).toBeNull();
      expect(el(fixture).querySelector('[data-testid="sesiones-G-ASG-2"]')).not.toBeNull();
    });

    it('filtrar contrae la fila expandida', () => {
      const fixture = crear(true);
      listar(fixture, 'decano', [grupo('ASG-1', 'Cálculo', 'DOC-1')]);
      (el(fixture).querySelector('[data-testid="expandir-G-ASG-1"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      http.expectOne((r) => r.url === `${api}/decano/sesiones`).flush(paginaVacia);
      const component = fixture.componentInstance;
      component.cambiarPeriodo('PER-1');
      http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia/opciones`).flush({ exitoso: true, datos: OPCIONES });
      http.expectOne((r) => r.url === `${api}/decano/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });
      expect(component.expandido()).toBeNull();
    });

    it('embebido oculta el título de la pantalla y conserva el contador y la tabla', () => {
      const fixture = crear(true);
      listar(fixture, 'decano', [grupo('ASG-1', 'Cálculo', 'DOC-1')]);
      expect(el(fixture).querySelector('h1')).not.toBeNull();
      fixture.componentRef.setInput('embebido', true);
      fixture.detectChanges();
      expect(el(fixture).querySelector('h1')).toBeNull();
      expect(el(fixture).textContent).toContain('1 Grupos');
      expect(el(fixture).textContent).toContain('Cálculo');
    });
  });

  describe('CIERRE-W2A opciones de materia y docente desde el servidor', () => {
    it('pide las opciones del ámbito sin período al abrir y las del período elegido al cambiarlo', () => {
      const fixture = crear(false);
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });
      const component = fixture.componentInstance;

      component.cambiarPeriodo('PER-1');
      const opciones = http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia/opciones`);
      expect(opciones.request.params.get('idPeriodoAcademico')).toBe('PER-1');
      opciones.flush({ exitoso: true, datos: { asignaturas: [{ id: 'ASG-5', nombre: 'Redes' }], docentes: [] } });
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });

      expect(component.asignaturas()).toEqual([{ id: 'ASG-5', nombre: 'Redes' }]);
      expect(component.docentes()).toEqual([]);
    });

    it('cambiar el período limpia la materia y el docente elegidos (sus opciones dependen del período)', () => {
      const fixture = crear(false);
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });
      const component = fixture.componentInstance;
      component.idAsignatura.set('ASG-9');
      component.idDocente.set('DOC-7');

      component.cambiarPeriodo('PER-1');
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia/opciones`).flush({ exitoso: true, datos: OPCIONES });
      const consulta = http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`);
      expect(consulta.request.params.has('idAsignatura')).toBeFalse();
      expect(consulta.request.params.has('idDocente')).toBeFalse();
      consulta.flush({ exitoso: true, datos: [], total: 0 });
      expect(component.idPeriodo()).toBe('PER-1');
      expect(component.idAsignatura()).toBe('');
      expect(component.idDocente()).toBe('');
    });

    it('elegir una materia consulta el consolidado sin recargar las opciones', () => {
      const fixture = crear(false);
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });
      const component = fixture.componentInstance;

      component.filtrar(component.idAsignatura, 'ASG-9');

      http.expectNone((r) => r.url.endsWith('/opciones'));
      const consulta = http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`);
      expect(consulta.request.params.get('idAsignatura')).toBe('ASG-9');
      consulta.flush({ exitoso: true, datos: [], total: 0 });
    });

    it('si fallan las opciones deja los selectores vacíos y anuncia el error del backend', () => {
      const fixture = crear(false);
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });
      const component = fixture.componentInstance;

      component.cambiarPeriodo('PER-1');
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia/opciones`)
        .flush({ message: 'Sin permisos' }, { status: 403, statusText: 'Forbidden' });
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });

      expect(component.asignaturas()).toEqual([]);
      expect(component.docentes()).toEqual([]);
      expect(toast.error).toHaveBeenCalled();
    });

    it('una respuesta sin datos deja las listas vacías', () => {
      const fixture = crear(false);
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });
      const component = fixture.componentInstance;

      component.cambiarPeriodo('');
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia/opciones`).flush({ exitoso: true });
      http.expectOne((r) => r.url === `${api}/coordinador/consolidado-asistencia`).flush({ exitoso: true, datos: [], total: 0 });

      expect(component.asignaturas()).toEqual([]);
      expect(component.docentes()).toEqual([]);
    });
  });
});
