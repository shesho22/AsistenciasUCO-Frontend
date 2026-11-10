import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoordinatorIndicatorsComponent } from './coordinator-indicators.component';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AlertaTemprana, KpisCoordinador } from '../../../core/models/coordinator-indicators.model';
import { paginaApi, porUrl } from '../../../core/testing/pagina-api';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';

const planDe = (idPrograma: string, nombrePrograma: string) => ({ id: `plan-${idPrograma}`, idPrograma, nombrePrograma, inp: '2024' });

describe('CoordinatorIndicatorsComponent', () => {
  let fixture: ComponentFixture<CoordinatorIndicatorsComponent>;
  let component: CoordinatorIndicatorsComponent;
  let http: HttpTestingController;
  let toast: ToastService;
  const base = `${environment.apiUrl}/coordinador`;

  const kpis: KpisCoordinador = {
    idPrograma: 'p-1', nombrePrograma: 'Sistemas', idPeriodoAcademico: 'per-1', nombrePeriodoAcademico: '2026-2',
    totalEstudiantes: 5, estudiantesRegulares: 2, estudiantesRiesgo: 1, estudiantesPerdida: 2, tasaPermanencia: 60,
    sesionesProgramadas: 15, sesionesVencidas: 10, sesionesEjecutadas: 9, sesionesVencidasSinRegistro: 1, sesionesSinProcedenciaTemporal: 1,
    porcentajeCumplimiento: 90, porcentajeProgresoCalendario: 66.67, umbralAdvertencia: 15, umbralPerdida: 20,
  };
  const alerta: AlertaTemprana = {
    idEstudiante: 'e-1', nombreCompleto: 'Ana Pérez', numeroIdentificacion: 1017000001, correo: 'ana@uco.edu.co',
    totalMatriculasActivas: 2, porcentajeInasistencia: 66.67, faltasSinJustaCausa: 2, codigoPermanencia: 'PERDIDA', semaforo: 'ROJO',
  };

  const alertasReq = () => http.match((r) => r.url === `${base}/alertas-tempranas`);
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  /** S4: antes de pedir cifras se cargan los programas del coordinador (derivados de sus planes). */
  function crear(planes: unknown[]): void {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento de sesión */ }
    TestBed.configureTestingModule({ imports: [CoordinatorIndicatorsComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(CoordinatorIndicatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(porUrl(`${base}/planes-estudio`)).flush(paginaApi(planes));
  }

  beforeEach(() => {
    crear([planDe('p-1', 'Sistemas')]);
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    alertasReq().forEach((r) => r.flush({ exitoso: true, datos: [alerta], total: 12 }));
    fixture.detectChanges();
  });

  afterEach(() => {
    // La selección de programa vive en sessionStorage: no debe filtrarse a los demás specs.
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento de sesión */ }
    http.verify();
  });

  it('S4 con un solo programa envía programaId en KPIs y alertas y no muestra el selector', () => {
    expect(TestBed.inject(CoordinatorProgramService).programaId()).toBe('p-1');
    component.onPageChange(2);
    const req = http.expectOne((r) => r.url === `${base}/alertas-tempranas`);
    expect(req.request.params.get('programaId')).toBe('p-1');
    req.flush({ exitoso: true, datos: [], total: 12 });
    expect(fixture.nativeElement.querySelector('#coordinador-programa')).toBeNull();
  });

  it('T-FE-02 muestra exactamente las cifras recibidas (sin calcular nada en el cliente)', () => {
    const t = texto();
    expect(t).toContain('90%');       // cumplimiento
    expect(t).toContain('60%');       // permanencia
    expect(t).toContain('66.67%');    // progreso del calendario
    expect(t).toContain('9');         // ejecutadas
    expect(component.service.kpis()).toEqual(kpis);
  });

  it('T-FE-02 un porcentaje nulo se muestra como "Sin datos", nunca como 0', () => {
    component.service.kpis.set({ ...kpis, porcentajeCumplimiento: null, tasaPermanencia: null, porcentajeProgresoCalendario: null });
    fixture.detectChanges();
    expect(texto()).toContain('Sin datos');
    expect(component.formatoPorcentaje(null)).toBe('Sin datos');
    expect(component.formatoPorcentaje(33.33)).toBe('33.33%');
  });

  it('T-FE-03 la tabla muestra la alerta con su semáforo y el total llega al paginador', () => {
    expect(texto()).toContain('Ana Pérez');
    expect(texto()).toContain('66.67%');
    expect(component.service.totalAlertas()).toBe(12);
  });

  it('T-FE-03 cambiar de página vuelve a consultar el backend con esa página', () => {
    component.onPageChange(2);
    const req = http.expectOne((r) => r.url === `${base}/alertas-tempranas`);
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush({ exitoso: true, datos: [], total: 12 });
  });

  it('T-FE-03 los filtros reinician la página y se envían al backend', () => {
    component.filtroSemaforo.set('ROJO');
    component.filtroNombre.set('Ana');
    component.aplicarFiltros();
    const req = http.expectOne((r) => r.url === `${base}/alertas-tempranas`);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('semaforo')).toBe('ROJO');
    expect(req.request.params.get('nombre')).toBe('Ana');
    req.flush({ exitoso: true, datos: [alerta], total: 1 });
  });

  it('T-FE-03 las opciones del filtro de semáforo usan los códigos del contrato (VERDE/AMBAR/ROJO)', () => {
    const valores = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select[aria-label="Semáforo"] option')).map((o) => (o as HTMLOptionElement).value);
    expect(valores).toEqual(['', 'ROJO', 'AMBAR']);
  });

  it('T-FE-03 un error al cargar muestra el mensaje del backend', () => {
    spyOn(toast, 'error');
    component.cargar();
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ message: 'No tiene un programa a su cargo.' }, { status: 403, statusText: 'Forbidden' });
    alertasReq().forEach((r) => r.flush({ message: 'No tiene un programa a su cargo.' }, { status: 403, statusText: 'Forbidden' }));
    expect(toast.error).toHaveBeenCalled();
  });

  it('T-FE-04 abrir la ficha desde una alerta selecciona al estudiante y cerrarla lo limpia', () => {
    component.abrirFicha(alerta);
    expect(component.estudianteFicha()).toEqual(alerta);
    fixture.detectChanges();
    http.match((r) => r.url.includes('/estudiantes/e-1/')).forEach((r) => r.flush({ exitoso: true, datos: [], total: 0 }));
    component.cerrarFicha();
    expect(component.estudianteFicha()).toBeNull();
  });

  it('el estado vacío se muestra cuando no hay alertas', () => {
    component.service.alertas.set([]);
    fixture.detectChanges();
    expect(texto()).toContain('No hay estudiantes');
  });
});

describe('CoordinatorIndicatorsComponent (S4: coordinador de varios programas)', () => {
  const base = `${environment.apiUrl}/coordinador`;
  let fixture: ComponentFixture<CoordinatorIndicatorsComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento de sesión */ }
    TestBed.configureTestingModule({ imports: [CoordinatorIndicatorsComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorIndicatorsComponent);
    fixture.detectChanges();
    http
      .expectOne(porUrl(`${base}/planes-estudio`))
      .flush(paginaApi([planDe('p-1', 'Sistemas'), planDe('p-2', 'Software'), planDe('p-1', 'Sistemas')]));
  });

  afterEach(() => {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento de sesión */ }
    http.verify();
  });

  it('muestra el selector con los programas distintos y consulta con el primero por defecto (sin COO_002)', () => {
    const kpisReq = http.expectOne((r) => r.url === `${base}/indicadores`);
    expect(kpisReq.request.params.get('programaId')).toBe('p-1');
    kpisReq.flush({ exitoso: true, datos: null });
    http.match((r) => r.url === `${base}/alertas-tempranas`).forEach((r) => r.flush({ exitoso: true, datos: [], total: 0 }));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#coordinador-programa') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual(['Sistemas', 'Software']);
    expect(select.value).toBe('p-1');
  });

  it('al cambiar de programa se guarda en la sesión y se vuelve a consultar con el nuevo programaId', () => {
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: null });
    http.match((r) => r.url === `${base}/alertas-tempranas`).forEach((r) => r.flush({ exitoso: true, datos: [], total: 0 }));
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#coordinador-programa') as HTMLSelectElement;
    select.value = 'p-2';
    select.dispatchEvent(new Event('change'));

    const kpisReq = http.expectOne((r) => r.url === `${base}/indicadores`);
    expect(kpisReq.request.params.get('programaId')).toBe('p-2');
    kpisReq.flush({ exitoso: true, datos: null });
    const alertas = http.expectOne((r) => r.url === `${base}/alertas-tempranas`);
    expect(alertas.request.params.get('programaId')).toBe('p-2');
    expect(alertas.request.params.get('pagina')).toBe('1');
    alertas.flush({ exitoso: true, datos: [], total: 0 });
    expect(sessionStorage.getItem('coordinador.programaId')).toBe('p-2');
  });

  it('solo permite seleccionar programas de su ámbito', () => {
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: null });
    http.match((r) => r.url === `${base}/alertas-tempranas`).forEach((r) => r.flush({ exitoso: true, datos: [], total: 0 }));
    TestBed.inject(CoordinatorProgramService).seleccionar('p-2');
    expect(TestBed.inject(CoordinatorProgramService).programaId()).toBe('p-2');
    // Un programa ajeno no se puede seleccionar.
    TestBed.inject(CoordinatorProgramService).seleccionar('p-99');
    expect(TestBed.inject(CoordinatorProgramService).programaId()).toBe('p-2');
  });
});

describe('CoordinatorIndicatorsComponent (CULM-001: rótulos por persona y partes de la pantalla)', () => {
  const base = `${environment.apiUrl}/coordinador`;
  let fixture: ComponentFixture<CoordinatorIndicatorsComponent>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

  const kpis = {
    idPrograma: 'p-1', nombrePrograma: 'Sistemas', idPeriodoAcademico: 'per-1', nombrePeriodoAcademico: '2026-2',
    totalEstudiantes: 5, estudiantesRegulares: 2, estudiantesRiesgo: 1, estudiantesPerdida: 2, tasaPermanencia: 60,
    sesionesProgramadas: 15, sesionesVencidas: 10, sesionesEjecutadas: 9, sesionesVencidasSinRegistro: 1,
    sesionesSinProcedenciaTemporal: 1, porcentajeCumplimiento: 90, porcentajeProgresoCalendario: 66.67,
    umbralAdvertencia: 15, umbralPerdida: 20,
  };

  function crear(entradas: Record<string, unknown>): void {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento de sesión */ }
    TestBed.configureTestingModule({ imports: [CoordinatorIndicatorsComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorIndicatorsComponent);
    for (const [nombre, valor] of Object.entries(entradas)) fixture.componentRef.setInput(nombre, valor);
    fixture.detectChanges();
    http.expectOne(porUrl(`${base}/planes-estudio`)).flush(paginaApi([planDe('p-1', 'Sistemas')]));
  }

  afterEach(() => {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento de sesión */ }
    http.verify();
  });

  it('rotula los conteos por persona como «Estudiantes en riesgo» y «Estudiantes en pérdida», no como % del grupo', () => {
    crear({ parte: 'kpis', embebido: true });
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    fixture.detectChanges();
    const texto = el().textContent ?? '';
    expect(texto).toContain('Estudiantes en riesgo');
    expect(texto).toContain('Estudiantes en pérdida');
    expect(texto).not.toMatch(/\bEn riesgo\b/);
    expect(texto).not.toMatch(/\bEn pérdida\b/);
  });

  it('parte "kpis" muestra solo las tarjetas, sin título embebido y sin consultar alertas', () => {
    crear({ parte: 'kpis', embebido: true });
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    http.expectNone((r) => r.url === `${base}/alertas-tempranas`);
    fixture.detectChanges();
    expect(el().querySelector('h1')).toBeNull();
    expect(el().textContent).toContain('Sistemas · 2026-2');
    expect(el().textContent).not.toContain('Alertas tempranas');
  });

  it('parte "alertas" muestra solo las alertas, sin consultar los KPIs', () => {
    crear({ parte: 'alertas', embebido: true });
    http.expectNone((r) => r.url === `${base}/indicadores`);
    http.expectOne((r) => r.url === `${base}/alertas-tempranas`).flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(el().textContent).toContain('Alertas tempranas');
    expect(el().textContent).not.toContain('Estudiantes en riesgo');
  });

  it('por defecto (todo, sin embeber) conserva el título, las tarjetas y las alertas', () => {
    crear({});
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    http.expectOne((r) => r.url === `${base}/alertas-tempranas`).flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(el().querySelector('h1')?.textContent).toContain('Indicadores del programa');
    expect(el().textContent).toContain('Alertas tempranas');
  });

  it('cambiar de programa avisa a la pantalla que lo aloja', () => {
    crear({ parte: 'kpis' });
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    const emitido = jasmine.createSpy('programaCambiado');
    fixture.componentInstance.programaCambiado.subscribe(emitido);
    fixture.componentInstance.cambiarPrograma();
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    expect(emitido).toHaveBeenCalledTimes(1);
  });
});
