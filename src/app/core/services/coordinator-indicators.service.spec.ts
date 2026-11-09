import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoordinatorIndicatorsService } from './coordinator-indicators.service';
import { environment } from '../../../environments/environment';
import { CoordinatorProgramService } from './coordinator-program.service';
import { AlertaTemprana, BitacoraSesion, FichaEstudiante, KpisCoordinador } from '../models/coordinator-indicators.model';

describe('CoordinatorIndicatorsService', () => {
  let service: CoordinatorIndicatorsService;
  let http: HttpTestingController;
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

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CoordinatorIndicatorsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consultarKpis publica las cifras recibidas sin transformarlas y envía el período solo si se indica', () => {
    service.consultarKpis('per-1').subscribe();
    expect(service.cargando()).toBeTrue();
    const req = http.expectOne((r) => r.url === `${base}/indicadores`);
    expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
    req.flush({ exitoso: true, datos: kpis });

    expect(service.kpis()).toEqual(kpis);
    expect(service.cargando()).toBeFalse();

    service.consultarKpis().subscribe();
    const sinPeriodo = http.expectOne((r) => r.url === `${base}/indicadores`);
    expect(sinPeriodo.request.params.keys()).toEqual([]);
    sinPeriodo.flush({ exitoso: true, datos: { ...kpis, porcentajeCumplimiento: null } });
    expect(service.kpis()?.porcentajeCumplimiento).toBeNull();
  });

  it('consultarKpis propaga el error sin tocar el estado y apaga cargando', () => {
    let fallo: { status?: number } | undefined;
    service.consultarKpis().subscribe({ error: (e) => (fallo = e) });
    http.expectOne((r) => r.url === `${base}/indicadores`).flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });

    expect(fallo?.status).toBe(403);
    expect(service.kpis()).toBeNull();
    expect(service.cargando()).toBeFalse();
  });

  it('consultarAlertas envía solo los filtros presentes y publica filas y total', () => {
    service.consultarAlertas({ pagina: 2, tamano: 5, semaforo: 'ROJO', nombre: 'Ana', idPeriodoAcademico: 'per-1' }).subscribe();
    const req = http.expectOne((r) => r.url === `${base}/alertas-tempranas`);
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamano')).toBe('5');
    expect(req.request.params.get('semaforo')).toBe('ROJO');
    expect(req.request.params.get('nombre')).toBe('Ana');
    expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
    req.flush({ exitoso: true, datos: [alerta], total: 12 });

    expect(service.alertas()).toEqual([alerta]);
    expect(service.totalAlertas()).toBe(12);

    service.consultarAlertas({ pagina: 1, tamano: 10 }).subscribe();
    const limpia = http.expectOne((r) => r.url === `${base}/alertas-tempranas`);
    expect(limpia.request.params.keys().sort()).toEqual(['pagina', 'tamano']);
    limpia.flush({ exitoso: true, datos: [], total: 0 });
    expect(service.alertas()).toEqual([]);
    expect(service.totalAlertas()).toBe(0);
  });

  it('consultarAlertas propaga el error sin modificar la lista', () => {
    let fallo: { status?: number } | undefined;
    service.consultarAlertas({ pagina: 1, tamano: 10 }).subscribe({ error: (e) => (fallo = e) });
    http.expectOne((r) => r.url === `${base}/alertas-tempranas`).flush({ message: 'x' }, { status: 400, statusText: 'Bad Request' });

    expect(fallo?.status).toBe(400);
    expect(service.alertas()).toEqual([]);
  });

  it('consultarBitacora pide la página indicada y devuelve las sesiones tal cual (asistio nulo incluido)', () => {
    const sesion: BitacoraSesion = {
      idSesion: 's-1', numeroSesion: 7, nombreSesion: 'Sesión 7', fechaHoraInicio: '2026-10-23T14:00:00Z', fechaHoraFin: '2026-10-23T16:00:00Z',
      idGrupo: 'g-1', codigoGrupo: 931001, idAsignatura: 'a-1', nombreAsignatura: 'Estructuras', asistio: null, codigoRazonCausa: null, nombreRazonCausa: null,
    };
    let resultado: { datos: BitacoraSesion[]; total?: number } | undefined;
    service.consultarBitacora('e-1', 3, 10, 'per-1').subscribe((r) => (resultado = r));
    const req = http.expectOne((r) => r.url === `${base}/estudiantes/e-1/bitacora`);
    expect(req.request.params.get('pagina')).toBe('3');
    expect(req.request.params.get('tamano')).toBe('10');
    expect(req.request.params.get('idPeriodoAcademico')).toBe('per-1');
    req.flush({ exitoso: true, datos: [sesion], total: 25 });

    expect(resultado?.datos[0].asistio).toBeNull();
    expect(resultado?.total).toBe(25);
  });

  it('consultarFicha lee la ficha y propaga un 404 sin convertirlo en éxito', () => {
    const ficha: FichaEstudiante = {
      idEstudiante: 'e-1', tipoIdentificacion: 'CC', numeroIdentificacion: 1017000001, primerNombre: 'Ana', segundoNombre: 'Maria', primerApellido: 'Pérez',
      segundoApellido: 'Gómez', nombreCompleto: 'Ana Maria Pérez Gómez', correo: 'ana@uco.edu.co', estaActivoUsuario: true, idPrograma: 'p-1',
      nombrePrograma: 'Sistemas', resumenPorAsignatura: [],
    };
    let obtenida: FichaEstudiante | undefined;
    service.consultarFicha('e-1').subscribe((r) => (obtenida = r.datos));
    http.expectOne(`${base}/estudiantes/e-1/ficha`).flush({ exitoso: true, datos: ficha });
    expect(obtenida).toEqual(ficha);

    let fallo: { status?: number } | undefined;
    service.consultarFicha('e-9').subscribe({ next: () => fail('no debe emitir éxito'), error: (e) => (fallo = e) });
    http.expectOne(`${base}/estudiantes/e-9/ficha`).flush({ message: 'no existe' }, { status: 404, statusText: 'Not Found' });
    expect(fallo?.status).toBe(404);
  });

  // CULM-001 B2NM (S4): con varios programas el backend exige programaId (COO_002); se envía siempre que se conozca.
  it('S4 envía programaId en KPIs, alertas, bitácora y ficha; sin programa seleccionado no lo envía', () => {
    service.consultarKpis().subscribe();
    const sinPrograma = http.expectOne((r) => r.url === `${base}/indicadores`);
    expect(sinPrograma.request.params.has('programaId')).toBeFalse();
    sinPrograma.flush({ exitoso: true, datos: kpis });

    TestBed.inject(CoordinatorProgramService).programaId.set('p-2');

    service.consultarKpis().subscribe();
    const kpisReq = http.expectOne((r) => r.url === `${base}/indicadores`);
    expect(kpisReq.request.params.get('programaId')).toBe('p-2');
    kpisReq.flush({ exitoso: true, datos: kpis });

    service.consultarAlertas({ pagina: 1, tamano: 10 }).subscribe();
    const alertasReq = http.expectOne((r) => r.url === `${base}/alertas-tempranas`);
    expect(alertasReq.request.params.get('programaId')).toBe('p-2');
    alertasReq.flush({ exitoso: true, datos: [alerta], total: 1 });

    service.consultarBitacora('e-1', 1, 10).subscribe();
    const bitacoraReq = http.expectOne((r) => r.url === `${base}/estudiantes/e-1/bitacora`);
    expect(bitacoraReq.request.params.get('programaId')).toBe('p-2');
    bitacoraReq.flush({ exitoso: true, datos: [], total: 0 });

    service.consultarFicha('e-1').subscribe();
    const fichaReq = http.expectOne((r) => r.url === `${base}/estudiantes/e-1/ficha`);
    expect(fichaReq.request.params.get('programaId')).toBe('p-2');
    fichaReq.flush({ exitoso: true, datos: null });
  });
});
