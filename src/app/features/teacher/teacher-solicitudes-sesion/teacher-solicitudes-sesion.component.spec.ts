import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TeacherSolicitudesSesionComponent } from './teacher-solicitudes-sesion.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { SolicitudSesionItem } from '../../../core/models/coordinador-solicitud-sesion.model';
import { environment } from '../../../../environments/environment';
import { paginaApi } from '../../../core/testing/pagina-api';

describe('TeacherSolicitudesSesionComponent (ATA D6)', () => {
  const url = `${environment.apiUrl}/docente/sesiones/solicitudes`;
  let fixture: ComponentFixture<TeacherSolicitudesSesionComponent>;
  let component: TeacherSolicitudesSesionComponent;
  let http: HttpTestingController;
  let toast: ToastService;
  const el = () => fixture.nativeElement as HTMLElement;

  const solicitud = (over: Partial<SolicitudSesionItem> = {}): SolicitudSesionItem => ({
    idSesion: 'ses-1', nombreSesion: 'Taller de refuerzo', codigoSesion: 'SES-01', idGrupo: 'g-1', nombreGrupo: 'Grupo 01',
    nombreAsignatura: 'Cálculo', idPrograma: 'p-1', nombrePrograma: 'Sistemas', idDocente: 'd-1', nombreDocente: 'Ana Pérez',
    fechaHoraInicio: '2026-11-20T13:00:00Z', fechaHoraFin: '2026-11-20T15:00:00Z', estadoSolicitud: 'PENDIENTE',
    nombreEstadoSolicitud: 'Pendiente', fechaSolicitudUtc: '2026-11-18T10:00:00Z', fechaResolucionUtc: null, observacion: null, ...over,
  });
  const listado = () => http.expectOne((r) => r.method === 'GET' && r.url === url);

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TeacherSolicitudesSesionComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(TeacherSolicitudesSesionComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  it('carga las pendientes por defecto y muestra grupo, sesión y estado sin acciones', () => {
    fixture.detectChanges();
    const req = listado();
    expect(req.request.params.get('soloPendientes')).toBe('true');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(paginaApi([solicitud()], 1, 20, 1));
    fixture.detectChanges();
    const fila = el().querySelector('[data-testid="solicitud-ses-1"]') as HTMLElement;
    expect(fila.textContent).toContain('Grupo 01 · Cálculo');
    expect(fila.textContent).toContain('Taller de refuerzo');
    expect(fila.textContent).toContain('Pendiente');
    expect(fila.querySelector('button')).toBeNull();
  });

  it('muestra el estado y la observación de las resueltas, no la de las pendientes', () => {
    fixture.detectChanges();
    listado().flush(paginaApi([
      solicitud({ idSesion: 'a', estadoSolicitud: 'APROBADA', nombreEstadoSolicitud: 'Aprobada', observacion: 'Va' }),
      solicitud({ idSesion: 'b', estadoSolicitud: 'RECHAZADA', nombreEstadoSolicitud: 'Rechazada', observacion: 'Duplicada' }),
      solicitud({ idSesion: 'c', estadoSolicitud: 'PENDIENTE', observacion: 'no se muestra' }),
    ]));
    fixture.detectChanges();
    const observaciones = Array.from(el().querySelectorAll('[data-testid="solicitud-observacion"]')).map((n) => n.textContent?.trim());
    expect(observaciones).toEqual(['Va', 'Duplicada']);
    expect(component.variante('APROBADA')).toBe('success');
    expect(component.variante('RECHAZADA')).toBe('danger');
    expect(component.variante('PENDIENTE')).toBe('warning');
  });

  it('sin pendientes ofrece ver todas y al hacerlo consulta soloPendientes=false', () => {
    fixture.detectChanges();
    listado().flush(paginaApi([]));
    fixture.detectChanges();
    expect(el().textContent).toContain('No tienes solicitudes pendientes');
    component.alternarSoloPendientes(false);
    const req = listado();
    expect(req.request.params.get('soloPendientes')).toBe('false');
    req.flush(paginaApi([]));
    fixture.detectChanges();
    expect(el().textContent).toContain('Aún no has solicitado sesiones');
  });

  it('el checkbox alterna el filtro y vuelve a la primera página', () => {
    fixture.detectChanges();
    listado().flush(paginaApi([solicitud()], 1, 20, 50));
    component.onPagina(3);
    listado().flush(paginaApi([solicitud()], 3, 20, 50));
    fixture.detectChanges();
    const caja = el().querySelector('[data-testid="solo-pendientes"]') as HTMLInputElement;
    caja.checked = false;
    caja.dispatchEvent(new Event('change'));
    const req = listado();
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('soloPendientes')).toBe('false');
    req.flush(paginaApi([]));
  });

  it('pagina y cambia el tamaño de página', () => {
    fixture.detectChanges();
    listado().flush(paginaApi([solicitud()], 1, 20, 50));
    component.onPagina(2);
    const p2 = listado();
    expect(p2.request.params.get('pagina')).toBe('2');
    p2.flush(paginaApi([solicitud()], 2, 20, 50));
    component.onTamano(50);
    const t = listado();
    expect(t.request.params.get('tamano')).toBe('50');
    expect(t.request.params.get('pagina')).toBe('1');
    t.flush(paginaApi([]));
  });

  it('con un error del backend avisa con su mensaje y permite reintentar', () => {
    const error = spyOn(toast, 'error');
    fixture.detectChanges();
    listado().flush({ message: 'No se pudo consultar.' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(error).toHaveBeenCalledWith('No se pudo consultar.');
    expect(component.error()).not.toBeNull();
    component.cargar();
    listado().flush(paginaApi([solicitud()]));
    fixture.detectChanges();
    expect(component.error()).toBeNull();
    expect(component.solicitudes()).toHaveSize(1);
  });

  it('una respuesta sin elementos ni total queda vacía', () => {
    fixture.detectChanges();
    listado().flush({ exitoso: true });
    expect(component.solicitudes()).toEqual([]);
    expect(component.total()).toBe(0);
  });

  it('presenta las horas en la zona efectiva', () => {
    expect(component.zona()).toBeTruthy();
  });
});
