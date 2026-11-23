import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanIndicatorsComponent } from './dean-indicators.component';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { KpisDecano } from '../../../core/models/dean-indicators.model';

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
    totalCoordinadores: 2, totalDocentes: 5,
  };
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DeanIndicatorsComponent], providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(DeanIndicatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('CULM-001 embebido en una pestaña oculta el título y conserva el subtítulo de la facultad', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')).not.toBeNull();
    fixture.componentRef.setInput('embebido', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')).toBeNull();
    expect(texto()).toContain('Ingenieria');
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

  it('T-FE-06 un error al cargar muestra el mensaje del backend', () => {
    spyOn(toast, 'error');
    component.cargar();
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ message: 'No tiene una facultad a su cargo.' }, { status: 403, statusText: 'Forbidden' });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('HU178: KPI_003 (decano sin facultad) muestra el aviso informativo y no un toast de error', () => {
    spyOn(toast, 'error');
    component.cargar();
    const sinFacultad = { timestamp: '2026-11-16T07:00:00Z', status: 403, error: 'Forbidden', code: 'KPI_003', message: 'texto que no se analiza', path: '/api/v1/x', correlationId: null };
    http.expectOne((r) => r.url === `${base}/indicadores`).flush(sinFacultad, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(toast.error).not.toHaveBeenCalled();
    expect(component.sinAmbito()).toBe('DECANO');
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="decano-sin-facultad"]')).not.toBeNull();
  });

  it('P3 C5b: no repite la comparativa ni el aforo (tienen pestañas propias) y no los consulta', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(texto()).not.toContain('Ausentismo por programa');
    expect(el.querySelector('[data-testid="aforo-tabla"]')).toBeNull();
    expect(el.querySelector('app-tabla-datos')).toBeNull();
  });
});
