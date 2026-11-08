import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanIndicatorsComponent } from './dean-indicators.component';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AforoGrupo, ComparativaPrograma, KpisDecano } from '../../../core/models/dean-indicators.model';

describe('DeanIndicatorsComponent', () => {
  let fixture: ComponentFixture<DeanIndicatorsComponent>;
  let component: DeanIndicatorsComponent;
  let http: HttpTestingController;
  let toast: ToastService;
  const base = `${environment.apiUrl}/decano`;

  const kpis: KpisDecano = {
    idFacultad: 'f-1', nombreFacultad: 'Ingenieria', idPeriodoAcademico: 'per-1', nombrePeriodoAcademico: '2026-2',
    totalProgramas: 3, totalEstudiantes: 6, estudiantesRegulares: 2, estudiantesRiesgo: 1, estudiantesPerdida: 3, tasaRetencion: 50,
    sesionesEjecutadas: 35, faltasSinJustaCausa: 6, porcentajeAusentismo: 17.14, porcentajeAsistencia: 82.86,
    gruposActivos: 3, cupoTotal: 55, matriculadosActivos: 7, tasaAforo: 12.73, umbralAdvertencia: 15, umbralPerdida: 20,
  };
  const p1: ComparativaPrograma = {
    idPrograma: 'p-1', nombrePrograma: 'Sistemas', estaActivoPrograma: true, totalEstudiantes: 5, estudiantesRiesgo: 1, estudiantesPerdida: 2,
    tasaRetencion: 60, sesionesEjecutadas: 33, faltasSinJustaCausa: 5, porcentajeAusentismo: 15.15,
    horasDictadas: 120, horasFalta: 18,
  };
  const p4: ComparativaPrograma = {
    idPrograma: 'p-4', nombrePrograma: 'Programa Cerrado', estaActivoPrograma: false, totalEstudiantes: 0, estudiantesRiesgo: 0, estudiantesPerdida: 0,
    tasaRetencion: null, sesionesEjecutadas: 0, faltasSinJustaCausa: 0, porcentajeAusentismo: null,
    horasDictadas: 0, horasFalta: 0,
  };
  const g1: AforoGrupo = {
    idGrupo: 'g-1', codigoGrupo: 931001, idAsignatura: 'a-1', nombreAsignatura: 'Estructuras de Datos', programas: ['Sistemas'],
    cupoMaximo: 10, matriculadosActivos: 5, cuposDisponibles: 5, tasaAforo: 50, grupoEstaHabilitado: true,
  };

  const aforoReqs = () => http.match((r) => r.url === `${base}/aforo-grupos`);
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DeanIndicatorsComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(DeanIndicatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    http.expectOne((r) => r.url === `${base}/comparativa-programas`).flush({ exitoso: true, datos: [p1, p4] });
    aforoReqs().forEach((r) => r.flush({ exitoso: true, datos: [g1], total: 12 }));
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('D.8 rotula el ausentismo por programa como calculado por horas y muestra las horas del backend', () => {
    const t = texto();
    expect(t).toContain('Calculado por horas');
    expect(t).toContain('18 h de falta sobre 120 h dictadas');
  });

  it('T-FE-02 muestra exactamente las cifras recibidas (sin calcular nada en el cliente)', () => {
    const t = texto();
    expect(t).toContain('50%');       // retención
    expect(t).toContain('17.14%');    // ausentismo
    expect(t).toContain('82.86%');    // asistencia
    expect(t).toContain('12.73%');    // aforo
    expect(t).toContain('Retención por asistencia');
    expect(component.service.kpis()).toEqual(kpis);
  });

  it('T-FE-02 un porcentaje nulo se muestra como "Sin datos", nunca como 0', () => {
    component.service.kpis.set({ ...kpis, tasaRetencion: null, porcentajeAusentismo: null, porcentajeAsistencia: null, tasaAforo: null });
    fixture.detectChanges();
    expect(texto()).toContain('Sin datos');
    expect(component.formatoPorcentaje(null)).toBe('Sin datos');
    expect(component.formatoPorcentaje(33.33)).toBe('33.33%');
  });

  it('T-FE-03 la comparativa dibuja una barra por programa con el ancho recibido y señala al programa inactivo', () => {
    const barras = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="barra-ausentismo"]')) as HTMLElement[];
    expect(barras.length).toBe(2);
    expect(barras[0].style.width).toBe('15.15%');
    expect(barras[1].style.width).toBe('0%');
    expect(texto()).toContain('Programa Cerrado');
    expect(texto()).toContain('Inactivo');
    expect(component.anchoBarra(null)).toBe('0%');
    expect(component.anchoBarra(150)).toBe('100%');
    expect(component.anchoBarra(15.15)).toBe('15.15%');
  });

  it('T-FE-03 un programa sin datos muestra "Sin datos" y no un 0 inventado', () => {
    expect(texto()).toContain('Sin datos');
  });

  it('T-FE-04 el aforo muestra la tabla con la tasa recibida y el total llega al paginador', () => {
    expect(texto()).toContain('Estructuras de Datos');
    expect(texto()).toContain('50%');
    expect(component.service.totalAforo()).toBe(12);
  });

  it('T-FE-04 cambiar de página vuelve a consultar el backend con esa página', () => {
    component.onPageChange(2);
    const req = http.expectOne((r) => r.url === `${base}/aforo-grupos`);
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush({ exitoso: true, datos: [], total: 12 });
  });

  it('T-FE-04 el filtro por programa reinicia la página y envía idPrograma', () => {
    component.pagina.set(3);
    component.filtroPrograma.set('p-1');
    component.aplicarFiltros();
    const req = http.expectOne((r) => r.url === `${base}/aforo-grupos`);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('idPrograma')).toBe('p-1');
    expect(req.request.params.has('soloHabilitados')).toBeFalse();
    req.flush({ exitoso: true, datos: [g1], total: 1 });
  });

  it('T-FE-05 incluir grupos no habilitados envía soloHabilitados=false y volver a excluirlos no envía el parámetro', () => {
    component.incluirNoHabilitados.set(true);
    component.aplicarFiltros();
    const incluidos = http.expectOne((r) => r.url === `${base}/aforo-grupos`);
    expect(incluidos.request.params.get('soloHabilitados')).toBe('false');
    incluidos.flush({ exitoso: true, datos: [], total: 0 });

    component.incluirNoHabilitados.set(false);
    component.aplicarFiltros();
    const excluidos = http.expectOne((r) => r.url === `${base}/aforo-grupos`);
    expect(excluidos.request.params.has('soloHabilitados')).toBeFalse();
    excluidos.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('T-FE-05 las opciones del filtro de programa salen de la comparativa recibida (sin ids inventados)', () => {
    const valores = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select[aria-label="Programa"] option')).map((o) => (o as HTMLOptionElement).value);
    expect(valores).toEqual(['', 'p-1', 'p-4']);
  });

  it('T-FE-06 un error al cargar muestra el mensaje del backend', () => {
    spyOn(toast, 'error');
    component.cargar();
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ message: 'No tiene una facultad a su cargo.' }, { status: 403, statusText: 'Forbidden' });
    http.expectOne((r) => r.url === `${base}/comparativa-programas`).flush({ message: 'No tiene una facultad a su cargo.' }, { status: 403, statusText: 'Forbidden' });
    aforoReqs().forEach((r) => r.flush({ message: 'No tiene una facultad a su cargo.' }, { status: 403, statusText: 'Forbidden' }));
    expect(toast.error).toHaveBeenCalledTimes(3);
  });

  it('el estado vacío se muestra cuando no hay grupos', () => {
    component.service.aforo.set([]);
    fixture.detectChanges();
    expect(texto()).toContain('No hay grupos');
  });

  it('sin comparativa se muestra el estado vacío', () => {
    component.service.comparativa.set([]);
    fixture.detectChanges();
    expect(texto()).toContain('No hay programas');
  });
});
