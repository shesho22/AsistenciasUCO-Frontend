import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CoordinatorAsistenciaComponent } from './coordinator-asistencia.component';
import { environment } from '../../../../environments/environment';
import { paginaApi, porUrl } from '../../../core/testing/pagina-api';

describe('CoordinatorAsistenciaComponent (CULM-001: asistencia unificada)', () => {
  let fixture: ComponentFixture<CoordinatorAsistenciaComponent>;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/coordinador`;
  const el = () => fixture.nativeElement as HTMLElement;

  const kpis = {
    idPrograma: 'p-1', nombrePrograma: 'Sistemas', idPeriodoAcademico: 'per-1', nombrePeriodoAcademico: '2026-2',
    totalEstudiantes: 5, estudiantesRegulares: 2, estudiantesRiesgo: 1, estudiantesPerdida: 2, tasaPermanencia: 60,
    sesionesProgramadas: 15, sesionesVencidas: 10, sesionesEjecutadas: 9, sesionesVencidasSinRegistro: 1,
    sesionesSinProcedenciaTemporal: 1, porcentajeCumplimiento: 90, porcentajeProgresoCalendario: 66.67,
    umbralAdvertencia: 15, umbralPerdida: 20,
  };
  const grupo = {
    idGrupo: 'G-1', codigoGrupo: 1, nombreGrupo: 'Grupo 01', idPeriodoAcademico: 'PER-1', nombrePeriodoAcademico: '2026-2',
    idPrograma: 'PRG-1', nombrePrograma: 'Sistemas', idAsignatura: 'A-1', nombreAsignatura: 'Cálculo', idDocente: 'D-1',
    nombreDocente: 'Ana', estudiantesActivos: 20, sesionesEjecutadas: 8, asistencias: 150, faltasSinJustaCausa: 10, excusas: 0,
    porcentajeAsistencia: 96.54, porcentajeInasistencia: 3.46, estudiantesRiesgo: 2, estudiantesPerdida: 1, horasDictadas: 65,
    porcentajeExcusa: 0, porcentajeSinRegistro: 0,
  };

  beforeEach(() => {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento de sesión */ }
    TestBed.configureTestingModule({
      imports: [CoordinatorAsistenciaComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorAsistenciaComponent);
    fixture.detectChanges();
    http.expectOne(porUrl(`${base}/planes-estudio`)).flush(paginaApi([{ id: 'pl-1', idPrograma: 'p-1', nombrePrograma: 'Sistemas', inp: '2024' }]));
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ exitoso: true, datos: kpis });
    http.expectOne(`${base}/periodos-academicos`).flush({ exitoso: true, datos: [] });
    http.expectOne((r) => r.url === `${base}/consolidado-asistencia`).flush({ exitoso: true, datos: [grupo], total: 1 });
    http.expectOne((r) => r.url === `${base}/revisiones-cancelacion`).flush(paginaApi([], 1, 1, 3));
    // DEC-065 (2): bandeja de solicitudes (lista) y conteo de pendientes (una fila).
    const solicitudes = http.match((r) => r.url === `${base}/sesiones/solicitudes`);
    expect(solicitudes.length).toBe(2);
    for (const req of solicitudes) {
      const cuenta = req.request.params.get('tamano') === '1';
      req.flush(paginaApi([], 1, cuenta ? 1 : 20, 3));
    }
    fixture.detectChanges();
  });

  afterEach(() => {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento de sesión */ }
    http.verify();
  });

  it('un solo título de pantalla, con las tarjetas KPI arriba y el consolidado como vista principal', () => {
    expect(el().querySelectorAll('h1').length).toBe(1);
    expect(el().querySelector('h1')?.textContent).toContain('Asistencia del programa');
    const texto = el().textContent ?? '';
    expect(texto.indexOf('Sesiones ejecutadas')).toBeGreaterThan(-1);
    expect(texto.indexOf('Estudiantes en riesgo')).toBeLessThan(texto.indexOf('Cálculo'));
  });

  it('DEC-065: muestra el KPI "Revisiones por resolver" con el conteo y el enlace a las revisiones', () => {
    const kpi = el().querySelector('[data-testid="revisiones-pendientes-kpi"]');
    expect(kpi?.textContent).toContain('Revisiones por resolver');
    expect(kpi?.querySelector('[data-testid="kpi-valor"]')?.textContent).toContain('3');
    expect(kpi?.querySelector('a')?.getAttribute('href')).toBe('/app/coordinador/revisiones-cancelacion');
  });

  it('los KPIs por persona se rotulan «estudiantes en riesgo», no como porcentaje del grupo', () => {
    const texto = el().textContent ?? '';
    expect(texto).toContain('Estudiantes en riesgo');
    expect(texto).not.toMatch(/\bEn riesgo\b\s*1/);
  });

  it('una sola cifra de inasistencia por grupo, con su base entre paréntesis de horas', () => {
    expect(el().querySelector('[data-testid="inasistencia"]')?.textContent?.trim()).toBe('3,46 % · 2,25 h de 65 h');
    expect(el().textContent).not.toContain('% Inasistencia 3.46');
  });

  it('las alertas tempranas están plegadas y no consultan hasta desplegarlas', () => {
    http.expectNone((r) => r.url === `${base}/alertas-tempranas`);
    expect(el().querySelector('[data-testid="alertas-plegables"]')).not.toBeNull();
    expect(el().textContent).not.toContain('Buscar por nombre');

    fixture.componentInstance.alternarAlertas(true);
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/alertas-tempranas`).flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(el().textContent).toContain('No hay estudiantes con alerta');
  });

  it('con las alertas desplegadas, cambiar de programa las recarga', () => {
    fixture.componentInstance.alternarAlertas(true);
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${base}/alertas-tempranas`).flush({ exitoso: true, datos: [], total: 0 });

    fixture.componentInstance.alRecambiarPrograma();
    http.expectOne((r) => r.url === `${base}/sesiones/solicitudes`).flush(paginaApi([], 1, 1, 3));
    http.expectOne((r) => r.url === `${base}/alertas-tempranas`).flush({ exitoso: true, datos: [], total: 0 });
  });

  it('cambiar de programa sin alertas desplegadas no consulta alertas', () => {
    fixture.componentInstance.alRecambiarPrograma();
    http.expectOne((r) => r.url === `${base}/sesiones/solicitudes`).flush(paginaApi([], 1, 1, 3));
    http.expectNone((r) => r.url === `${base}/alertas-tempranas`);
  });

  it('DEC-065 (2): muestra la tarjeta de solicitudes pendientes y la bandeja de solicitudes', () => {
    const tarjetas = Array.from(el().querySelectorAll('[data-testid="kpi-card"]'));
    const solicitudes = tarjetas.find((t) => t.textContent?.includes('Solicitudes de sesión pendientes'));
    expect(solicitudes?.querySelector('[data-testid="kpi-valor"]')?.textContent?.trim()).toBe('3');
    expect(el().querySelector('[data-testid="solicitudes-sesion"]')).not.toBeNull();
    expect(el().textContent).toContain('Solicitudes de sesión');
  });

  it('DEC-065 (2): al resolver una solicitud se vuelve a contar las pendientes', () => {
    fixture.componentInstance.contarPendientes();
    const req = http.expectOne((r) => r.url === `${base}/sesiones/solicitudes`);
    expect(req.request.params.get('tamano')).toBe('1');
    req.flush(paginaApi([], 1, 1, 2));
    expect(fixture.componentInstance.solicitudesPendientes()).toBe(2);
  });

  it('DEC-065 (2): si el conteo falla la tarjeta queda sin dato, no en cero', () => {
    fixture.componentInstance.contarPendientes();
    http.expectOne((r) => r.url === `${base}/sesiones/solicitudes`).flush({ message: 'x' }, { status: 500, statusText: 'Error' });
    expect(fixture.componentInstance.solicitudesPendientes()).toBeNull();
    fixture.detectChanges();
    const tarjeta = Array.from(el().querySelectorAll('[data-testid="kpi-card"]')).find((t) => t.textContent?.includes('Solicitudes de sesión pendientes'));
    expect(tarjeta?.querySelector('[data-testid="kpi-valor"]')?.textContent?.trim()).toBe('Sin datos');
  });

  it('DEC-065 (2): cambiar de programa también recuenta las pendientes', () => {
    fixture.componentInstance.alRecambiarPrograma();
    http.expectOne((r) => r.url === `${base}/sesiones/solicitudes`).flush(paginaApi([], 1, 1, 1));
  });
});
