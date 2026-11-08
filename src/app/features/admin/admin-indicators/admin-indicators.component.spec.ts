import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminIndicatorsComponent } from './admin-indicators.component';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ComparativaFacultad, KpisInstitucion, PuntoTendencia } from '../../../core/models/admin-indicators.model';

describe('AdminIndicatorsComponent', () => {
  let fixture: ComponentFixture<AdminIndicatorsComponent>;
  let component: AdminIndicatorsComponent;
  let http: HttpTestingController;
  let toast: ToastService;
  const base = `${environment.apiUrl}/admin`;

  const kpis: KpisInstitucion = {
    idInstitucion: 'i-1', nombreInstitucion: 'Universidad', idPeriodoAcademico: 'per-1', nombrePeriodoAcademico: '2026-2',
    totalFacultades: 3, totalProgramas: 4, totalEstudiantes: 6, estudiantesRegulares: 2, estudiantesRiesgo: 1, estudiantesPerdida: 3, tasaRetencion: 50,
    sesionesEjecutadas: 35, faltasSinJustaCausa: 6, porcentajeAusentismo: 17.14, porcentajeAsistencia: 82.86,
    sesionesVencidas: 12, sesionesConRegistro: 11, porcentajeCumplimiento: 91.67,
    estudiantesConMatriculaActiva: 6, estudiantesRegistrados: 7, docentesConGrupoActivo: 1, docentesRegistrados: 2, umbralAdvertencia: 15, umbralPerdida: 20,
  };
  const f1: ComparativaFacultad = {
    idFacultad: 'f-1', nombreFacultad: 'Ingenieria', estaActivaFacultad: true, totalProgramas: 3, totalEstudiantes: 6, estudiantesRiesgo: 1, estudiantesPerdida: 3,
    tasaRetencion: 50, sesionesEjecutadas: 35, faltasSinJustaCausa: 6, porcentajeAusentismo: 17.14,
    horasDictadas: 120, horasFalta: 18,
  };
  const f3: ComparativaFacultad = {
    idFacultad: 'f-3', nombreFacultad: 'Facultad Cerrada', estaActivaFacultad: false, totalProgramas: 0, totalEstudiantes: 0, estudiantesRiesgo: 0, estudiantesPerdida: 0,
    tasaRetencion: null, sesionesEjecutadas: 0, faltasSinJustaCausa: 0, porcentajeAusentismo: null,
    horasDictadas: 0, horasFalta: 0,
  };
  const puntos: PuntoTendencia[] = [
    { inicioIntervalo: '2026-03-02', finIntervalo: '2026-03-08', sesionesEjecutadas: 20, faltasSinJustaCausa: 3, porcentajeAusentismo: 15, horasDictadasEstudiante: 100, horasFalta: 15 },
    { inicioIntervalo: '2026-03-09', finIntervalo: '2026-03-15', sesionesEjecutadas: 0, faltasSinJustaCausa: 0, porcentajeAusentismo: null, horasDictadasEstudiante: 0, horasFalta: 0 },
    { inicioIntervalo: '2026-03-16', finIntervalo: '2026-03-22', sesionesEjecutadas: 4, faltasSinJustaCausa: 2, porcentajeAusentismo: 50, horasDictadasEstudiante: 8, horasFalta: 4 },
  ];

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const tendenciaReq = () => http.expectOne((r) => r.url === `${base}/tendencia-ausentismo`);

  function cargarTodo(): void {
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    http.expectOne((r) => r.url === `${base}/comparativa-facultades`).flush({ exitoso: true, datos: [f1, f3] });
    tendenciaReq().flush({ exitoso: true, datos: puntos });
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AdminIndicatorsComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(AdminIndicatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    cargarTodo();
  });

  afterEach(() => http.verify());

  it('D.8 rotula el ausentismo como calculado por horas y muestra las horas que entrega el backend', () => {
    const t = texto();
    expect(t).toContain('Calculado por horas');
    expect(t).toContain('18 h de falta sobre 120 h dictadas');
    expect(fixture.nativeElement.querySelectorAll('[data-testid="nota-horas"]').length).toBe(2);
  });

  it('T-FE-02 muestra exactamente las cifras recibidas (sin calcular nada en el cliente)', () => {
    const t = texto();
    expect(t).toContain('82.86%');   // asistencia global
    expect(t).toContain('17.14%');   // ausentismo
    expect(t).toContain('91.67%');   // cumplimiento
    expect(t).toContain('50%');      // retención
    expect(component.service.kpis()).toEqual(kpis);
  });

  it('T-FE-02 el censo destaca "con matrícula/grupo activo" y muestra "registrados" como dato secundario', () => {
    const t = texto();
    expect(t).toContain('Estudiantes con matrícula activa');
    expect(t).toContain('Docentes con grupo activo');
    expect(t).toContain('7 registrados');
    expect(t).toContain('2 registrados');
  });

  it('T-FE-02 un porcentaje nulo se muestra como "Sin datos", nunca como 0', () => {
    component.service.kpis.set({ ...kpis, tasaRetencion: null, porcentajeAusentismo: null, porcentajeAsistencia: null, porcentajeCumplimiento: null });
    fixture.detectChanges();
    expect(texto()).toContain('Sin datos');
    expect(component.formatoPorcentaje(null)).toBe('Sin datos');
    expect(component.formatoPorcentaje(33.33)).toBe('33.33%');
  });

  it('T-FE-03 la comparativa muestra una tarjeta por facultad con la cifra recibida y señala la inactiva', () => {
    const tarjetas = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="tarjeta-facultad"]');
    expect(tarjetas.length).toBe(2);
    expect(texto()).toContain('Ingenieria');
    expect(texto()).toContain('Facultad Cerrada');
    expect(texto()).toContain('Inactiva');
  });

  it('T-FE-04 la gráfica dibuja un punto por intervalo con dato, proporcional al valor recibido, y deja hueco donde es nulo', () => {
    const circulos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="punto-tendencia"]')) as SVGElement[];
    expect(circulos.length).toBe(2);
    expect(Number(circulos[0].getAttribute('cy'))).toBe(component.yPunto(15));
    expect(Number(circulos[1].getAttribute('cy'))).toBe(component.yPunto(50));
    expect(component.yPunto(50)).toBeLessThan(component.yPunto(15));
    expect(component.yPunto(0)).toBeGreaterThan(component.yPunto(100));
  });

  it('T-FE-04 sin puntos se muestra el estado vacío', () => {
    component.service.tendencia.set([]);
    fixture.detectChanges();
    expect(texto()).toContain('No hay sesiones ejecutadas');
  });

  it('T-FE-06 cambiar la granularidad reconsulta con exactamente SEMANA o MES', () => {
    component.cambiarGranularidad('MES');
    const mes = tendenciaReq();
    expect(mes.request.params.get('granularidad')).toBe('MES');
    mes.flush({ exitoso: true, datos: puntos });

    component.cambiarGranularidad('SEMANA');
    const semana = tendenciaReq();
    expect(semana.request.params.get('granularidad')).toBe('SEMANA');
    semana.flush({ exitoso: true, datos: puntos });
    expect(component.granularidad()).toBe('SEMANA');
  });

  it('T-FE-05 "Actualizar" vuelve a consultar los tres recursos y no hay sondeo automático', () => {
    const intervalo = spyOn(window, 'setInterval').and.callThrough();
    component.actualizar();
    cargarTodo();
    expect(intervalo).not.toHaveBeenCalled();
  });

  it('T-FE-07 un error al cargar muestra el mensaje del backend', () => {
    spyOn(toast, 'error');
    component.cargar();
    const mensaje = { message: 'No tiene una institución a su cargo.' };
    http.expectOne((r) => r.url === `${base}/indicadores`).flush(mensaje, { status: 403, statusText: 'Forbidden' });
    http.expectOne((r) => r.url === `${base}/comparativa-facultades`).flush(mensaje, { status: 403, statusText: 'Forbidden' });
    tendenciaReq().flush(mensaje, { status: 403, statusText: 'Forbidden' });
    expect(toast.error).toHaveBeenCalledTimes(3);
  });

  it('sin facultades se muestra el estado vacío', () => {
    component.service.comparativa.set([]);
    fixture.detectChanges();
    expect(texto()).toContain('No hay facultades');
  });

  it('F-ADM-015: la grafica tiene ejes, valores por punto y el titulo usa la tipografia del sistema', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(Array.from(el.querySelectorAll('[data-testid="marca-eje-y"]')).map((t) => t.textContent?.trim())).toEqual(['0%', '50%', '100%']);
    expect(Array.from(el.querySelectorAll('[data-testid="valor-punto"]')).map((t) => t.textContent?.trim())).toEqual(['15%', '50%']);
    expect(Array.from(el.querySelectorAll('[data-testid="marca-eje-x"]')).map((t) => t.textContent?.trim())).toEqual(['2026-03-02', '2026-03-16']);
    expect(el.querySelector('h1')?.className).toContain('font-serif');
    expect(el.innerHTML).not.toContain('gray-');
  });

  it('F-ADM-015: muestra un indicador de carga hasta que responden las consultas', () => {
    component.actualizar();
    fixture.detectChanges();
    expect(component.cargando()).toBeTrue();
    expect(texto()).toContain('Cargando indicadores');
    cargarTodo();
    expect(component.cargando()).toBeFalse();
    expect(texto()).not.toContain('Cargando indicadores');
  });
});
