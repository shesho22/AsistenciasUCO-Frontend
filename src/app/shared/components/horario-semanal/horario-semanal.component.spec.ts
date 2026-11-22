import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { HorarioSemanalComponent } from './horario-semanal.component';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { SesionCalendario } from '../../../core/models/sesion-calendario.model';
import { environment } from '../../../../environments/environment';

describe('HorarioSemanalComponent (ATA D7)', () => {
  let fixture: ComponentFixture<HorarioSemanalComponent>;
  let component: HorarioSemanalComponent;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;

  // 2026-11-18 es miércoles: la semana va del 16 al 22 de noviembre.
  const sesion = (over: Partial<SesionCalendario> = {}): SesionCalendario => ({
    idSesion: 's-1', idGrupo: 'g-1', codigoGrupo: 1, nombreGrupo: 'Grupo 01', idAsignatura: 'a-1', codigoAsignatura: 'MAT-101',
    nombreAsignatura: 'Cálculo', nombreDocente: 'Ana Pérez', fechaHoraInicioUtc: '2026-11-17T13:00:00Z',
    fechaHoraFinUtc: '2026-11-17T15:00:00Z', esExtraordinaria: false, estaCancelada: false, motivoCancelacion: null,
    esCancelacionAutomatica: false, nombreDiaFestivo: null, ...over,
  });

  function montar(rol: 'ESTUDIANTE' | 'DOCENTE'): void {
    TestBed.configureTestingModule({
      imports: [HorarioSemanalComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const zona = TestBed.inject(SessionTimeZoneService);
    zona.zone.set('America/Bogota');
    spyOn(zona, 'currentDate').and.returnValue('2026-11-18');
    fixture = TestBed.createComponent(HorarioSemanalComponent);
    fixture.componentRef.setInput('rol', rol);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const calendario = (rol: 'estudiante' | 'docente' = 'estudiante'): TestRequest =>
    http.expectOne((r) => r.url === `${environment.apiUrl}/${rol}/sesiones/calendario`);

  afterEach(() => http.verify());

  it('pide la semana lunes a domingo con las fechas del lunes y el domingo', () => {
    montar('ESTUDIANTE');
    const req = calendario();
    expect(req.request.params.get('desde')).toBe('2026-11-16');
    expect(req.request.params.get('hasta')).toBe('2026-11-22');
    req.flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    expect(el().querySelectorAll('section[data-testid^="dia-"]')).toHaveSize(7);
    expect(el().querySelector('[data-testid="horarios-vacio"]')).not.toBeNull();
  });

  it('el docente consulta su propio endpoint', () => {
    montar('DOCENTE');
    calendario('docente').flush({ exitoso: true, datos: [] });
  });

  it('ubica la sesión en su día con hora en la zona institucional y el docente para el estudiante', () => {
    montar('ESTUDIANTE');
    calendario().flush({ exitoso: true, datos: [sesion()] });
    fixture.detectChanges();
    const dia = el().querySelector('[data-testid="dia-2026-11-17"]') as HTMLElement;
    const tarjeta = dia.querySelector('[data-testid="sesion-s-1"]') as HTMLElement;
    expect(tarjeta.textContent).toContain('Cálculo');
    expect(tarjeta.textContent).toContain('Grupo 01');
    expect(tarjeta.textContent).toContain('08:00');
    expect(tarjeta.textContent).toContain('Ana Pérez');
    expect(el().querySelector('[data-testid="horarios-vacio"]')).toBeNull();
  });

  it('al docente no le repite su propio nombre', () => {
    montar('DOCENTE');
    calendario('docente').flush({ exitoso: true, datos: [sesion()] });
    fixture.detectChanges();
    expect((el().querySelector('[data-testid="sesion-s-1"]') as HTMLElement).textContent).not.toContain('Ana Pérez');
  });

  it('marca la extraordinaria con su etiqueta', () => {
    montar('ESTUDIANTE');
    calendario().flush({ exitoso: true, datos: [sesion({ esExtraordinaria: true })] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="etiqueta-extraordinaria"]')?.textContent).toContain('Extraordinaria');
    expect(el().querySelector('[data-testid="etiqueta-cancelada"]')).toBeNull();
  });

  it('tacha la cancelada y muestra el motivo', () => {
    montar('ESTUDIANTE');
    calendario().flush({ exitoso: true, datos: [sesion({ estaCancelada: true, motivoCancelacion: 'Docente en comisión' })] });
    fixture.detectChanges();
    const tarjeta = el().querySelector('[data-testid="sesion-s-1"]') as HTMLElement;
    expect(tarjeta.querySelector('[data-testid="nombre-asignatura"]')?.className).toContain('line-through');
    expect(tarjeta.querySelector('[data-testid="etiqueta-cancelada"]')).not.toBeNull();
    expect(tarjeta.querySelector('[data-testid="motivo-cancelacion"]')?.textContent).toContain('Docente en comisión');
  });

  it('en una cancelación automática muestra el festivo', () => {
    montar('ESTUDIANTE');
    calendario().flush({
      exitoso: true,
      datos: [sesion({ estaCancelada: true, esCancelacionAutomatica: true, nombreDiaFestivo: 'Día de la Independencia' })],
    });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="motivo-cancelacion"]')?.textContent).toContain('Día de la Independencia');
  });

  it('DEC-081: una cancelación automática por receso muestra su motivo, no una etiqueta de festivo', () => {
    montar('ESTUDIANTE');
    calendario().flush({
      exitoso: true,
      datos: [sesion({ estaCancelada: true, esCancelacionAutomatica: true, nombreDiaFestivo: null, motivoCancelacion: 'Receso académico: Semana Santa' })],
    });
    fixture.detectChanges();
    const tarjeta = el().querySelector('[data-testid="sesion-s-1"]') as HTMLElement;
    expect(tarjeta.querySelector('[data-testid="motivo-cancelacion"]')?.textContent).toContain('Receso académico: Semana Santa');
    expect(tarjeta.textContent).not.toContain('festivo');
    expect(component.etiquetaFranja(sesion({ estaCancelada: true, esCancelacionAutomatica: true, motivoCancelacion: 'Receso académico: Semana Santa' }))).toContain(
      'cancelada: Receso académico: Semana Santa',
    );
  });

  it('una cancelada sin motivo ni festivo no pinta el párrafo de motivo', () => {
    montar('ESTUDIANTE');
    calendario().flush({ exitoso: true, datos: [sesion({ estaCancelada: true })] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="motivo-cancelacion"]')).toBeNull();
  });

  it('agrupa varias sesiones del mismo día y descarta las que no tienen instante presentable', () => {
    montar('ESTUDIANTE');
    calendario().flush({
      exitoso: true,
      datos: [sesion({ idSesion: 'a' }), sesion({ idSesion: 'b', fechaHoraInicioUtc: '2026-11-17T20:00:00Z' }), sesion({ idSesion: 'c', fechaHoraInicioUtc: '' })],
    });
    fixture.detectChanges();
    expect(el().querySelectorAll('[data-testid="dia-2026-11-17"] [data-testid^="sesion-"]')).toHaveSize(2);
    expect(component.totalSesiones()).toBe(2);
  });

  it('navega a la semana siguiente, a la anterior y vuelve a hoy', () => {
    montar('ESTUDIANTE');
    calendario().flush({ exitoso: true, datos: [] });

    component.irA(1);
    let req = calendario();
    expect(req.request.params.get('desde')).toBe('2026-11-23');
    expect(req.request.params.get('hasta')).toBe('2026-11-29');
    req.flush({ exitoso: true, datos: [] });

    component.irA(-2);
    req = calendario();
    expect(req.request.params.get('desde')).toBe('2026-11-09');
    req.flush({ exitoso: true, datos: [] });

    component.irAHoy();
    req = calendario();
    expect(req.request.params.get('desde')).toBe('2026-11-16');
    req.flush({ exitoso: true, datos: [] });
  });

  it('los botones de navegación piden la semana correspondiente', () => {
    montar('ESTUDIANTE');
    calendario().flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    (el().querySelector('[data-testid="semana-siguiente"] button') as HTMLButtonElement).click();
    const req = calendario();
    expect(req.request.params.get('desde')).toBe('2026-11-23');
    req.flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="rango-semana"]')?.textContent).toContain('23');
  });

  it('una consulta nueva cancela la anterior que seguía en curso', () => {
    montar('ESTUDIANTE');
    const primera = calendario();
    component.irA(1);
    expect(primera.cancelled).toBeTrue();
    calendario().flush({ exitoso: true, datos: [] });
  });

  it('con error 500 muestra el aviso, vacía la semana y permite reintentar', () => {
    montar('ESTUDIANTE');
    calendario().flush({ message: 'Fallo' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="horarios-error"]')).not.toBeNull();
    expect(component.sesiones()).toEqual([]);
    component.cargar();
    calendario().flush({ exitoso: true, datos: [sesion()] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="horarios-error"]')).toBeNull();
    expect(component.sesiones()).toHaveSize(1);
  });

  it('con 400 CAL_001 o 403 también muestra el estado de error', () => {
    montar('DOCENTE');
    calendario('docente').flush({ code: 'CAL_001', message: 'Rango inválido' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(component.error()).not.toBeNull();
  });

  it('una respuesta sin datos queda como semana vacía', () => {
    montar('ESTUDIANTE');
    calendario().flush({ exitoso: true });
    expect(component.sesiones()).toEqual([]);
  });

  it('resalta el día de hoy y muestra el estado de carga mientras espera', () => {
    montar('ESTUDIANTE');
    expect(el().querySelector('[data-testid="horario-cargando"]')).not.toBeNull();
    calendario().flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="dia-2026-11-18"]')?.className).toContain('ring-2');
    expect(el().querySelector('[data-testid="dia-2026-11-17"]')?.className).not.toContain('ring-2');
  });

  it('asigna un color estable por asignatura', () => {
    montar('ESTUDIANTE');
    calendario().flush({ exitoso: true, datos: [] });
    const a = sesion({ idAsignatura: 'abc' });
    expect(component.color(a)).toBe(component.color(sesion({ idAsignatura: 'abc' })));
    expect(component.color(a)).toContain('border-');
  });

  it('al destruirse cancela la consulta en curso', () => {
    montar('ESTUDIANTE');
    const req = calendario();
    fixture.destroy();
    expect(req.cancelled).toBeTrue();
  });

  describe('MEJORAS-SERGIO 9: la franja del docente abre el grupo', () => {
    let navigate: jasmine.Spy;

    function montarDocenteCon(datos: SesionCalendario[]): void {
      montar('DOCENTE');
      navigate = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      calendario('docente').flush({ exitoso: true, datos });
      fixture.detectChanges();
    }

    it('al pulsar la franja lleva al hub del grupo de esa sesión', () => {
      montarDocenteCon([sesion()]);
      const franja = el().querySelector('[data-testid="sesion-s-1"]') as HTMLElement;
      expect(franja.tagName).toBe('BUTTON');
      franja.click();
      expect(navigate).toHaveBeenCalledWith(['/app/docente/grupos'], { queryParams: { grupo: 'g-1' } });
    });

    it('una sesión sin grupo lleva a la lista de grupos', () => {
      montarDocenteCon([]);
      component.abrirGrupo(sesion({ idGrupo: '' }));
      expect(navigate).toHaveBeenCalledWith(['/app/docente/grupos'], {});
    });

    it('la franja solo contiene contenido de frase (sin div, h4 ni p dentro del botón)', () => {
      montarDocenteCon([sesion({ estaCancelada: true, motivoCancelacion: 'Docente en comisión' })]);
      const franja = el().querySelector('[data-testid="sesion-s-1"]') as HTMLElement;
      expect(franja.querySelectorAll('div, h1, h2, h3, h4, h5, h6, p, article, section').length).toBe(0);
      expect(franja.textContent).toContain('Cálculo');
    });

    it('el nombre accesible incluye grupo, materia, día, horario y el estado de la sesión', () => {
      montarDocenteCon([sesion()]);
      const etiqueta = el().querySelector('[data-testid="sesion-s-1"]')?.getAttribute('aria-label') ?? '';
      expect(etiqueta).toContain('Grupo 01');
      expect(etiqueta).toContain('Cálculo (MAT-101)');
      expect(etiqueta).toContain('martes');
      expect(etiqueta).toContain('de 08:00 a 10:00');
      expect(etiqueta).not.toContain('cancelada');

      const cancelada = component.etiquetaFranja(sesion({ esExtraordinaria: true, estaCancelada: true, motivoCancelacion: 'Docente en comisión' }));
      expect(cancelada).toContain('extraordinaria');
      expect(cancelada).toContain('cancelada: Docente en comisión');
      expect(component.etiquetaFranja(sesion({ estaCancelada: true }))).toMatch(/cancelada$/);
    });

    it('el estudiante sigue viendo tarjetas no interactivas', () => {
      montar('ESTUDIANTE');
      calendario().flush({ exitoso: true, datos: [sesion()] });
      fixture.detectChanges();
      expect(el().querySelector('[data-testid="sesion-s-1"]')?.tagName).toBe('ARTICLE');
    });
  });
});
