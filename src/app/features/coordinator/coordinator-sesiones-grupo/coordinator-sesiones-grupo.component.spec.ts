import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoordinatorSesionesGrupoComponent } from './coordinator-sesiones-grupo.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import {
  AsistenciaSesionItem,
  GrupoProgramaItem,
  SesionGrupoItem,
} from '../../../core/models/asistencia-programa.model';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';

const API = environment.apiUrl;

const grupo: GrupoProgramaItem = {
  id: 'grp-1',
  codigo: 1,
  nombre: 'Grupo 1',
  idAsignatura: 'asg-1',
  nombreAsignatura: 'Cálculo',
  idDocente: 'doc-1',
  capacidadMaxima: 30,
  estudiantesActivos: 20,
  cuposDisponibles: 10,
  habilitado: true,
  inicioPeriodo: '2026-01-20',
  finPeriodo: '2026-06-05',
};

const sesion: SesionGrupoItem = {
  id: 'ses-1',
  idGrupo: 'grp-1',
  codigoGrupo: 1,
  nombreGrupo: 'Grupo 1',
  nombre: 'Sesión 1',
  numero: 1,
  codigo: 'S-01',
  numeroSemana: 2,
  fechaHoraInicio: '2026-02-03T07:00:00',
  fechaHoraFin: '2026-02-03T09:00:00',
};

const asistencias: AsistenciaSesionItem[] = [
  {
    idDetalleAsistencia: 'det-1',
    idSesion: 'ses-1',
    nombreSesion: 'Sesión 1',
    idEstudiante: 'est-1',
    numeroIdentificacion: '1017000111',
    nombreCompleto: 'Ana Ruiz',
    asistio: true,
    codigoRazonCausa: null,
    nombreRazonCausa: null,
    fechaHoraInicio: null,
    fechaHoraFin: null,
  },
  {
    idDetalleAsistencia: 'det-2',
    idSesion: 'ses-1',
    nombreSesion: 'Sesión 1',
    idEstudiante: 'est-2',
    numeroIdentificacion: null,
    nombreCompleto: 'Luis Gómez',
    asistio: false,
    codigoRazonCausa: 'INJ',
    nombreRazonCausa: 'Inasistencia injustificada',
    fechaHoraInicio: null,
    fechaHoraFin: null,
  },
];

describe('CoordinatorSesionesGrupoComponent (HU060/HU061)', () => {
  let fixture: ComponentFixture<CoordinatorSesionesGrupoComponent>;
  let component: CoordinatorSesionesGrupoComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [CoordinatorSesionesGrupoComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorSesionesGrupoComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('grupo', grupo);
    fixture.detectChanges();

    // CULM-001: al crearse con su grupo, el componente consulta de inmediato las sesiones de ese grupo.
    const inicial = http.expectOne((r) => r.url === `${API}/coordinador/grupos/grp-1/sesiones`);
    expect(inicial.request.params.has('desde')).toBeFalse();
    inicial.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('CULM-001: no consulta periodos ni la lista de grupos (eso lo da el consolidado)', () => {
    http.expectNone(`${API}/coordinador/periodos-academicos`);
    http.expectNone((r) => r.url === `${API}/coordinador/grupos`);
    expect(component.grupoSeleccionado()?.id).toBe('grp-1');
  });

  it('CULM-001: rotula las sesiones con el nombre del grupo y su asignatura', () => {
    expect(fixture.nativeElement.textContent).toContain('Sesiones de Grupo 1 · Cálculo');
  });

  // Un fallo de carga no puede verse como una lista vacia: alerta accesible y Reintentar en cada nivel.
  describe('errores de carga distinguibles del vacio', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const alerta = () => el().querySelector('[role="alert"]');
    const hayReintentar = () => Array.from(el().querySelectorAll('button')).some((b) => /Reintentar/.test(b.textContent ?? ''));

    it('sesiones: un 500 muestra alerta con Reintentar y no "El grupo no tiene sesiones"; Reintentar recupera', () => {
      component.seleccionarGrupo(grupo);
      http.expectOne((r) => r.url.endsWith('/sesiones')).flush({}, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      expect(el().querySelectorAll('[role="alert"]').length).toBeGreaterThan(0);
      expect(el().textContent).not.toContain('El grupo no tiene sesiones en el rango seleccionado.');

      (Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? '')) as HTMLButtonElement).click();
      http.expectOne((r) => r.url.endsWith('/sesiones')).flush({ exitoso: true, datos: [sesion], total: 1 });
      fixture.detectChanges();
      expect(el().textContent).toContain('S-01');
    });

    it('asistencias: un 500 muestra alerta con Reintentar y no "No hay registros"; Reintentar recupera', () => {
      component.seleccionarGrupo(grupo);
      http.expectOne((r) => r.url.endsWith('/sesiones')).flush({ exitoso: true, datos: [sesion], total: 1 });
      component.seleccionarSesion(sesion);
      http.expectOne((r) => r.url.endsWith('/asistencias')).flush({}, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      expect(el().textContent).not.toContain('No hay registros de asistencia para esta sesión.');
      expect(el().querySelectorAll('[role="alert"]').length).toBeGreaterThan(0);

      (Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? '')) as HTMLButtonElement).click();
      http.expectOne((r) => r.url.endsWith('/asistencias')).flush({ exitoso: true, datos: asistencias, total: 2 });
      fixture.detectChanges();
      expect(el().textContent).toContain('Ana Ruiz');
    });
  });

  it('HU060/HU061: del grupo pasa a sus sesiones y de la sesión al detalle por estudiante', () => {
    component.seleccionarGrupo(grupo);
    const sesiones = http.expectOne((r) => r.url === `${API}/coordinador/grupos/grp-1/sesiones`);
    expect(sesiones.request.params.has('desde')).toBeFalse();
    sesiones.flush({ exitoso: true, datos: [sesion], total: 1 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('S-01');

    component.seleccionarSesion(sesion);
    http
      .expectOne((r) => r.url === `${API}/coordinador/sesiones/ses-1/asistencias`)
      .flush({ exitoso: true, datos: asistencias, total: 2 });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(component.presentesPagina()).toBe(1);
    expect(component.ausentesPagina()).toBe(1);
    expect(texto).toContain('Ana Ruiz');
    expect(texto).toContain('No asistió');
    expect(texto).toContain('Inasistencia injustificada');
  });

  it('HU060: filtra sesiones por rango y rechaza un rango invertido sin consultar', () => {
    component.seleccionarGrupo(grupo);
    http.expectOne((r) => r.url === `${API}/coordinador/grupos/grp-1/sesiones`).flush({ exitoso: true, datos: [], total: 0 });

    component.desde.set('2026-03-01');
    component.hasta.set('2026-02-01');
    component.filtrarSesiones();
    expect(toastSpy.error).toHaveBeenCalledWith('La fecha desde no puede ser posterior a la fecha hasta.');

    component.desde.set('2026-02-01');
    component.hasta.set('2026-02-28');
    component.filtrarSesiones();
    const req = http.expectOne((r) => r.url === `${API}/coordinador/grupos/grp-1/sesiones`);
    expect(req.request.params.get('desde')).toBe('2026-02-01');
    expect(req.request.params.get('hasta')).toBe('2026-02-28');
    req.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El grupo no tiene sesiones en el rango seleccionado.');

    component.onPaginaSesiones(2);
    expect(http.expectOne((r) => r.url.endsWith('/sesiones')).request.params.get('pagina')).toBe('2');
    component.onTamanoSesiones(20);
    expect(http.expectOne((r) => r.url.endsWith('/sesiones')).request.params.get('tamano')).toBe('20');
  });

  it('HU060: error al consultar sesiones limpia la lista', () => {
    component.seleccionarGrupo(grupo);
    http
      .expectOne((r) => r.url.endsWith('/sesiones'))
      .flush({ exitoso: false }, { status: 500, statusText: 'Error' });
    expect(component.sesiones()).toEqual([]);
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('HU061: filtra por asistencia y pagina el detalle', () => {
    component.seleccionarGrupo(grupo);
    http.expectOne((r) => r.url.endsWith('/sesiones')).flush({ exitoso: true, datos: [sesion], total: 1 });
    component.seleccionarSesion(sesion);
    http.expectOne((r) => r.url.endsWith('/asistencias')).flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay registros de asistencia para esta sesión.');

    component.onFiltroAsistio('NO_ASISTIO');
    expect(http.expectOne((r) => r.url.endsWith('/asistencias')).request.params.get('asistio')).toBe('false');
    component.onFiltroAsistio('ASISTIO');
    expect(http.expectOne((r) => r.url.endsWith('/asistencias')).request.params.get('asistio')).toBe('true');
    component.onFiltroAsistio('TODOS');
    expect(http.expectOne((r) => r.url.endsWith('/asistencias')).request.params.has('asistio')).toBeFalse();
    component.onPaginaAsistencias(2);
    expect(http.expectOne((r) => r.url.endsWith('/asistencias')).request.params.get('pagina')).toBe('2');
    component.onTamanoAsistencias(50);
    http
      .expectOne((r) => r.url.endsWith('/asistencias'))
      .flush({ exitoso: false }, { status: 500, statusText: 'Error' });
    expect(component.asistencias()).toEqual([]);
    expect(toastSpy.error).toHaveBeenCalled();
  });

  describe('APP-04: horas de sesión en la zona del navegador', () => {
    const confirmada: SesionGrupoItem = {
      ...sesion,
      id: 'ses-utc',
      fechaHoraInicio: '2026-11-03T15:00:00',
      fechaHoraFin: '2026-11-03T17:00:00',
      fechaHoraInicioUtc: '2026-11-03T15:00:00.1234567Z',
      fechaHoraFinUtc: '2026-11-03T17:00:00Z',
      estadoTemporal: 'CONFIRMADA',
    };

    afterEach(() => localStorage.removeItem('asistenciasuco.session-timezone'));

    function cargarSesiones(datos: SesionGrupoItem[]): string {
      component.seleccionarGrupo(grupo);
      http.expectOne((r) => r.url.endsWith('/sesiones')).flush({ exitoso: true, datos, total: datos.length });
      fixture.detectChanges();
      return fixture.nativeElement.textContent as string;
    }

    it('presenta el instante UTC confirmado en Bogotá y lo recalcula para Berlín (CASO 1/5)', () => {
      const timeZone = TestBed.inject(SessionTimeZoneService);
      timeZone.setManualTimeZone('America/Bogota');

      let texto = cargarSesiones([confirmada]);
      expect(texto).toContain('03/11/2026 10:00 – 12:00');
      expect(texto).toContain('America/Bogota');
      expect(texto).not.toContain('03/11/2026 15:00');

      timeZone.setManualTimeZone('Europe/Berlin');
      fixture.detectChanges();
      texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain('03/11/2026 16:00 – 18:00');
      expect(component.sesiones()[0].fechaHoraInicioUtc).toBe('2026-11-03T15:00:00.1234567Z');
    });

    it('no reinterpreta una hora sin zona y la identifica como tal', () => {
      TestBed.inject(SessionTimeZoneService).setManualTimeZone('Europe/Berlin');

      const texto = cargarSesiones([sesion]);

      expect(texto).toContain('03/02/2026 07:00 – 09:00');
      expect(texto).toContain('sin zona horaria');
    });

    it('una sesión INDETERMINADA no usa un instante aunque llegue', () => {
      TestBed.inject(SessionTimeZoneService).setManualTimeZone('Europe/Berlin');

      const texto = cargarSesiones([{ ...confirmada, estadoTemporal: 'INDETERMINADA' }]);

      expect(texto).toContain('03/11/2026 15:00 – 17:00');
      expect(texto).toContain('sin zona horaria');
    });
  });

  it('sin sesión seleccionada no consulta asistencias', () => {
    component.onPaginaAsistencias(2);
    component.onFiltroAsistio('ASISTIO');
    http.expectNone((r) => r.url.endsWith('/asistencias'));
  });

  it('B1-F-26 HU060: la sesión cancelada se rotula como tal con su motivo', () => {
    component.seleccionarGrupo(grupo);
    http.expectOne((r) => r.url === `${API}/coordinador/grupos/grp-1/sesiones`).flush({
      exitoso: true,
      total: 2,
      datos: [
        sesion,
        {
          ...sesion,
          id: 'ses-2',
          codigo: 'S-02',
          estado: 'CANCELADA',
          cancelacion: { tipo: 'DOCENTE', motivo: 'Paro de transporte', nombreFestivo: null, fechaCancelacionUtc: null },
        },
      ],
    });
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('[data-testid^="sesion-fila-"]') as NodeListOf<HTMLElement>;
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).not.toContain('Cancelada');
    expect(filas[1].textContent).toContain('Cancelada');
    expect(filas[1].textContent).toContain('Paro de transporte');
  });
});

describe('Mock backend de consultas del coordinador (HU064/HU060/HU061)', () => {
  afterEach(() => {
    TestBed.inject(AuthService).setMockMode(false);
    localStorage.removeItem('USE_MOCKS');
  });

  it('responde grupos, sesiones y asistencias filtradas en modo mock', (done) => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr(), withInterceptors([mockBackendInterceptor]))],
    });
    TestBed.inject(AuthService).setMockMode(true);
    const service = TestBed.inject(CoordinatorManagementService);

    service.getGruposPrograma({ pagina: 1, tamano: 10 }).subscribe((grupos) => {
      expect(grupos.datos.length).toBe(1);
      service.getSesionesGrupo(grupos.datos[0].id, { pagina: 1, tamano: 10 }).subscribe((sesiones) => {
        expect(sesiones.datos[0].idGrupo).toBe('GRP-MOCK-1');
        service.getAsistenciasSesion(sesiones.datos[0].id, { asistio: false, pagina: 1, tamano: 10 }).subscribe((res) => {
          expect(res.datos.length).toBe(1);
          expect(res.datos[0].asistio).toBeFalse();
          done();
        });
      });
    });
  });
});
