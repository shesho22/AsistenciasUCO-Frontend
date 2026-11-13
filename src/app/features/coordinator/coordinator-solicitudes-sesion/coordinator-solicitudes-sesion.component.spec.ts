import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { CoordinatorSolicitudesSesionComponent } from './coordinator-solicitudes-sesion.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { SolicitudSesionItem } from '../../../core/models/coordinador-solicitud-sesion.model';
import { environment } from '../../../../environments/environment';
import { paginaApi, porUrl } from '../../../core/testing/pagina-api';

describe('CoordinatorSolicitudesSesionComponent (DEC-065 (2))', () => {
  const base = `${environment.apiUrl}/coordinador`;
  const solicitudesUrl = `${base}/sesiones/solicitudes`;
  let fixture: ComponentFixture<CoordinatorSolicitudesSesionComponent>;
  let component: CoordinatorSolicitudesSesionComponent;
  let http: HttpTestingController;
  let toast: ToastService;
  const el = () => fixture.nativeElement as HTMLElement;

  const solicitud = (over: Partial<SolicitudSesionItem> = {}): SolicitudSesionItem => ({
    idSesion: 'ses-1', nombreSesion: 'Taller de refuerzo', codigoSesion: 'SES-01', idGrupo: 'g-1', nombreGrupo: 'Grupo 01',
    nombreAsignatura: 'Cálculo', idPrograma: 'p-1', nombrePrograma: 'Sistemas', idDocente: 'd-1', nombreDocente: 'Ana Pérez',
    fechaHoraInicio: '2026-11-20T13:00:00Z', fechaHoraFin: '2026-11-20T15:00:00Z', estadoSolicitud: 'PENDIENTE',
    nombreEstadoSolicitud: 'Pendiente', fechaSolicitudUtc: new Date(Date.now() - 5 * 60000).toISOString(),
    fechaResolucionUtc: null, observacion: null, ...over,
  });

  const pagina = (elementos: SolicitudSesionItem[], total = elementos.length) => paginaApi(elementos, 1, 20, total);
  const listado = (): TestRequest => http.expectOne((r) => r.method === 'GET' && r.url === solicitudesUrl);

  function crear(elementos: SolicitudSesionItem[] = [solicitud()]): void {
    fixture.detectChanges();
    http.expectOne(porUrl(`${base}/planes-estudio`)).flush(paginaApi([{ id: 'pl-1', idPrograma: 'p-1', nombrePrograma: 'Sistemas' }]));
    listado().flush(pagina(elementos));
    fixture.detectChanges();
  }

  beforeEach(() => {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento */ }
    TestBed.configureTestingModule({
      imports: [CoordinatorSolicitudesSesionComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(CoordinatorSolicitudesSesionComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    try { sessionStorage.removeItem('coordinador.programaId'); } catch { /* sin almacenamiento */ }
    http.verify();
  });

  it('carga las pendientes del programa por defecto y las muestra con docente, grupo, horario y «hace»', () => {
    fixture.detectChanges();
    http.expectOne(porUrl(`${base}/planes-estudio`)).flush(paginaApi([{ id: 'pl-1', idPrograma: 'p-1', nombrePrograma: 'Sistemas' }]));
    const req = listado();
    expect(req.request.params.get('soloPendientes')).toBe('true');
    expect(req.request.params.get('programaId')).toBe('p-1');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('20');
    req.flush(pagina([solicitud()]));
    fixture.detectChanges();

    const fila = el().querySelector('[data-testid="solicitud-ses-1"]') as HTMLElement;
    expect(fila.textContent).toContain('Ana Pérez');
    expect(fila.textContent).toContain('Grupo 01 · Cálculo');
    expect(fila.textContent).toContain('Taller de refuerzo');
    expect(fila.querySelector('[data-testid="solicitud-hace"]')?.textContent).toContain('hace 5 min');
    expect(fila.textContent).toContain('Pendiente');
    expect(fila.querySelector('[data-testid="aprobar-solicitud"]')).not.toBeNull();
    expect(fila.querySelector('[data-testid="rechazar-solicitud"]')).not.toBeNull();
    expect((el().querySelector('[data-testid="solo-pendientes"]') as HTMLInputElement).checked).toBeTrue();
  });

  it('una solicitud resuelta no ofrece acciones y muestra su observación y color de estado', () => {
    crear([
      solicitud({ idSesion: 'a', estadoSolicitud: 'APROBADA', nombreEstadoSolicitud: 'Aprobada', observacion: 'Hay aula' }),
      solicitud({ idSesion: 'r', estadoSolicitud: 'RECHAZADA', nombreEstadoSolicitud: 'Rechazada', observacion: 'Sin cupo' }),
    ]);

    const a = el().querySelector('[data-testid="solicitud-a"]') as HTMLElement;
    const r = el().querySelector('[data-testid="solicitud-r"]') as HTMLElement;
    expect(a.querySelector('[data-testid="aprobar-solicitud"]')).toBeNull();
    expect(r.querySelector('[data-testid="rechazar-solicitud"]')).toBeNull();
    expect(a.textContent).toContain('Hay aula');
    expect(r.textContent).toContain('Sin cupo');
    expect(a.innerHTML).toContain('success');
    expect(r.innerHTML).toContain('danger');
    expect(component.variante('PENDIENTE')).toBe('warning');
  });

  it('sin pendientes muestra el estado vacío con causa y la acción para ver todas', () => {
    crear([]);
    expect(el().textContent).toContain('No hay solicitudes pendientes');
    expect(el().textContent).toContain('esperando tu aprobación');

    const accion = Array.from(el().querySelectorAll('button')).find((b) => b.textContent?.includes('Ver todas las solicitudes'));
    expect(accion).toBeTruthy();
    accion!.click();

    const req = listado();
    expect(req.request.params.get('soloPendientes')).toBe('false');
    req.flush(pagina([]));
    fixture.detectChanges();
    expect(el().textContent).toContain('Aún no hay solicitudes de sesión');
    expect(el().textContent).not.toContain('Ver todas las solicitudes');
  });

  it('alternar «Solo pendientes» recarga desde la página 1', () => {
    crear();
    component.pagina.set(3);
    const check = el().querySelector('[data-testid="solo-pendientes"]') as HTMLInputElement;
    check.checked = false;
    check.dispatchEvent(new Event('change'));

    const req = listado();
    expect(req.request.params.get('soloPendientes')).toBe('false');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(pagina([]));
  });

  it('paginar y cambiar el tamaño consultan de nuevo', () => {
    crear();
    component.onPagina(2);
    let req = listado();
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush(pagina([solicitud()], 45));

    component.onTamano(50);
    req = listado();
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('50');
    req.flush(pagina([solicitud()], 45));
    expect(component.total()).toBe(45);
  });

  for (const status of [403, 500]) {
    it(`un ${status} al cargar muestra el error del backend y avisa`, () => {
      const error = spyOn(toast, 'error');
      fixture.detectChanges();
      http.expectOne(porUrl(`${base}/planes-estudio`)).flush(paginaApi([{ id: 'pl-1', idPrograma: 'p-1', nombrePrograma: 'Sistemas' }]));
      listado().flush(
        { code: 'X', message: `Mensaje del backend ${status}` },
        { status, statusText: 'Error' }
      );
      fixture.detectChanges();

      expect(component.error()).not.toBeNull();
      expect(component.solicitudes().length).toBe(0);
      expect(error).toHaveBeenCalledWith(`Mensaje del backend ${status}`);
    });
  }

  it('si no se pueden cargar los programas avisa con el mensaje del backend', () => {
    const error = spyOn(toast, 'error');
    fixture.detectChanges();
    http.expectOne(porUrl(`${base}/planes-estudio`)).flush({ message: 'Sin permiso' }, { status: 403, statusText: 'Forbidden' });
    expect(error).toHaveBeenCalledWith('Sin permiso');
  });

  it('aprobar: abre el diálogo, envía la observación, muestra el mensajeUsuario, recarga y emite resuelta', () => {
    const success = spyOn(toast, 'success');
    let resueltas = 0;
    component.resuelta.subscribe(() => resueltas++);
    crear();

    (el().querySelector('[data-testid="aprobar-solicitud"]') as HTMLButtonElement).click();
    expect(component.aAprobar()?.idSesion).toBe('ses-1');

    component.confirmarAprobacion('Hay aula');
    const post = http.expectOne(`${base}/sesiones/ses-1/aprobacion`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ observacion: 'Hay aula' });
    post.flush({ exitoso: true, datos: null, mensajeUsuario: 'Sesión aprobada y estudiantes notificados.' });

    expect(success).toHaveBeenCalledOnceWith('Sesión aprobada y estudiantes notificados.');
    expect(component.aAprobar()).toBeNull();
    expect(resueltas).toBe(1);
    listado().flush(pagina([]));
  });

  it('aprobar sin mensaje del backend usa el texto de respaldo', () => {
    const success = spyOn(toast, 'success');
    crear();
    component.abrirAprobar(solicitud());
    component.confirmarAprobacion(undefined);
    http.expectOne(`${base}/sesiones/ses-1/aprobacion`).flush({ exitoso: true, datos: null });
    expect(success).toHaveBeenCalledOnceWith('Sesión aprobada.');
    listado().flush(pagina([]));
  });

  it('un 409 al aprobar deja el diálogo abierto con el mensaje del backend', () => {
    const success = spyOn(toast, 'success');
    crear();
    component.abrirAprobar(solicitud());
    component.confirmarAprobacion(undefined);
    http.expectOne(`${base}/sesiones/ses-1/aprobacion`).flush(
      { code: 'SES_030', message: 'La solicitud ya fue resuelta.' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(component.errorResolucion()).toBe('La solicitud ya fue resuelta.');
    expect(component.aAprobar()).not.toBeNull();
    expect(component.enviando()).toBeFalse();
    expect(success).not.toHaveBeenCalled();
  });

  it('confirmar sin solicitud abierta o mientras envía no hace nada', () => {
    crear();
    component.confirmarAprobacion(undefined);
    component.confirmarRechazo({ codigoMotivo: 'X' });
    http.expectNone((r) => r.method === 'POST');

    component.abrirAprobar(solicitud());
    component.enviando.set(true);
    component.confirmarAprobacion(undefined);
    component.abrirRechazar(solicitud());
    component.confirmarRechazo({ codigoMotivo: 'X' });
    http.expectNone((r) => r.method === 'POST');
    http.expectOne(`${base}/sesiones/motivos-cancelacion`).flush({ exitoso: true, datos: [] });
    expect(component.enviando()).toBeTrue();
  });

  it('rechazar: carga los motivos una vez, envía motivo y observación y recarga', () => {
    const success = spyOn(toast, 'success');
    crear();
    (el().querySelector('[data-testid="rechazar-solicitud"]') as HTMLButtonElement).click();
    http.expectOne(`${base}/sesiones/motivos-cancelacion`).flush({ exitoso: true, datos: [{ codigo: 'SIN_AULA', nombre: 'Sin aula' }] });
    fixture.detectChanges();
    expect(component.motivos().length).toBe(1);

    component.confirmarRechazo({ codigoMotivo: 'SIN_AULA', observacion: 'No hay aula' });
    const post = http.expectOne(`${base}/sesiones/ses-1/rechazo`);
    expect(post.request.body).toEqual({ codigoMotivo: 'SIN_AULA', observacion: 'No hay aula' });
    post.flush({ exitoso: true, datos: null, mensajeUsuario: 'Solicitud rechazada; se avisó al docente.' });

    expect(success).toHaveBeenCalledOnceWith('Solicitud rechazada; se avisó al docente.');
    expect(component.aRechazar()).toBeNull();
    listado().flush(pagina([]));

    component.abrirRechazar(solicitud());
    http.expectNone(`${base}/sesiones/motivos-cancelacion`);
    component.cerrarDialogos();
  });

  it('rechazar sin mensaje del backend usa el respaldo y un 500 queda dentro del diálogo', () => {
    const success = spyOn(toast, 'success');
    crear();
    component.abrirRechazar(solicitud());
    http.expectOne(`${base}/sesiones/motivos-cancelacion`).flush({ exitoso: true, datos: [] });

    component.confirmarRechazo({ codigoMotivo: 'SIN_AULA' });
    http.expectOne(`${base}/sesiones/ses-1/rechazo`).flush({ message: 'Fallo interno' }, { status: 500, statusText: 'Error' });
    expect(component.errorResolucion()).toBe('Fallo interno');
    expect(component.aRechazar()).not.toBeNull();

    component.confirmarRechazo({ codigoMotivo: 'SIN_AULA' });
    http.expectOne(`${base}/sesiones/ses-1/rechazo`).flush({ exitoso: true, datos: null });
    expect(success).toHaveBeenCalledOnceWith('Solicitud rechazada.');
    listado().flush(pagina([]));
  });

  it('si el catálogo de motivos falla muestra el mensaje del backend', () => {
    crear();
    component.abrirRechazar(solicitud());
    http.expectOne(`${base}/sesiones/motivos-cancelacion`).flush({ message: 'Catálogo no disponible' }, { status: 500, statusText: 'Error' });
    expect(component.motivos()).toEqual([]);
    expect(component.errorMotivos()).toBe('Catálogo no disponible');
  });

  it('tolera una respuesta sin elementos ni total', () => {
    fixture.detectChanges();
    http.expectOne(porUrl(`${base}/planes-estudio`)).flush(paginaApi([{ id: 'pl-1', idPrograma: 'p-1', nombrePrograma: 'Sistemas' }]));
    listado().flush({});
    expect(component.solicitudes()).toEqual([]);
    expect(component.total()).toBe(0);
  });
});
