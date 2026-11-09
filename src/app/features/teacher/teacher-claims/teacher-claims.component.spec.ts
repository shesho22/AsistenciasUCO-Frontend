import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject, of, throwError } from 'rxjs';
import { TeacherClaimsComponent } from './teacher-claims.component';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { DetalleReclamoDocenteItem, SolicitudRevisionItem } from '../../../core/models/role-management.model';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { environment } from '../../../../environments/environment';

describe('TeacherClaimsComponent — descarga de soporte (LB-004D FE-06)', () => {
  let component: TeacherClaimsComponent;
  let claims: jasmine.SpyObj<AttendanceClaimService>;
  let toast: jasmine.SpyObj<ToastService>;
  const adjunto = { fileId: 'f-1', nombre: 'evi/dencia?.pdf', tipo: 'application/pdf', tamanioKb: 2, fechaSubida: '2026-10-19' };

  beforeEach(() => {
    claims = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', ['getReclamosDocente', 'descargarSoporte', 'resolverReclamo']);
    claims.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [] }) as never);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    TestBed.configureTestingModule({
      imports: [TeacherClaimsComponent],
      providers: [
        { provide: AttendanceClaimService, useValue: claims },
        { provide: ToastService, useValue: toast },
      ],
    });
    component = TestBed.createComponent(TeacherClaimsComponent).componentInstance;
  });

  it('descarga por HttpClient (Blob), sanea el nombre y nunca abre una URL', () => {
    claims.descargarSoporte.and.returnValue(of(new Blob(['x'], { type: 'application/pdf' })));
    const createUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    const revoke = spyOn(URL, 'revokeObjectURL');
    const abrir = spyOn(window, 'open');
    const anchor = document.createElement('a');
    const click = spyOn(anchor, 'click');
    spyOn(document, 'createElement').and.returnValue(anchor);

    component.descargarSoporte(adjunto);

    expect(claims.descargarSoporte).toHaveBeenCalledOnceWith('f-1');
    expect(createUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(anchor.download).toBe('evi_dencia_.pdf');
    expect(revoke).toHaveBeenCalledWith('blob:x');
    expect(abrir).not.toHaveBeenCalled();
    expect(anchor.href).not.toContain('token');
    expect(component.descargandoSoporte()).toBeFalse();
  });

  it('sin fileId advierte y no consulta el backend', () => {
    component.descargarSoporte({ ...adjunto, fileId: undefined });
    expect(claims.descargarSoporte).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalled();
  });

  it('ignora un segundo clic mientras la descarga está en curso', () => {
    const pendiente = new Subject<Blob>();
    claims.descargarSoporte.and.returnValue(pendiente.asObservable());
    component.descargarSoporte(adjunto);
    component.descargarSoporte(adjunto);
    expect(claims.descargarSoporte).toHaveBeenCalledTimes(1);
    expect(component.descargandoSoporte()).toBeTrue();
  });

  it('pérdida de autorización (404) y sesión vencida (401) tienen mensajes claros y distintos', () => {
    const mensajes: string[] = [];
    for (const status of [404, 401]) {
      claims.descargarSoporte.and.returnValue(throwError(() => new HttpErrorResponse({ status })));
      component.descargarSoporte(adjunto);
      mensajes.push(toast.error.calls.mostRecent().args[0] as string);
    }
    expect(mensajes[0]).toContain('ya no tienes autorización');
    expect(mensajes[1]).toContain('sesión expiró');
    expect(mensajes[0]).not.toBe(mensajes[1]);
    expect(component.descargandoSoporte()).toBeFalse();
  });
});

describe('TeacherClaimsComponent', () => {
  let fixture: ComponentFixture<TeacherClaimsComponent>;
  let component: TeacherClaimsComponent;
  let claimServiceSpy: jasmine.SpyObj<AttendanceClaimService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockReclamos: SolicitudRevisionItem[] = [{
    id: 'rec-1', estudianteId: 'est-1', estudianteNombre: 'Carlos Gómez', estudianteCorreo: 'carlos@uco.edu.co',
    materiaId: 'mat-1', materiaCodigo: 'IS-101', materiaNombre: 'Arquitectura', grupo: 'G1', sesionId: 'ses-1',
    sesionNumero: 1, fechaSesion: '2026-09-10', estadoOriginal: 'AUSENTE', fechaSolicitud: '2026-09-11',
    estadoSolicitud: 'PENDIENTE', justificacionSolicitud: 'Cita médica urgente',
    soporteAdjunto: { fileId: 'file-123', nombre: 'cita.pdf', tipo: 'application/pdf', tamanioKb: 200, fechaSubida: '2026-09-11' },
  }];

  const mockDetalle: DetalleReclamoDocenteItem = {
    ...mockReclamos[0],
    nombreEstado: 'pendiente',
    causalInasistencia: { codigo: 'SJC', nombre: 'sin justa causa', asistio: false },
  };

  beforeEach(async () => {
    claimServiceSpy = jasmine.createSpyObj('AttendanceClaimService', ['getReclamosDocente', 'getDetalleReclamoDocente', 'resolverReclamo', 'descargarSoporte']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info']);
    claimServiceSpy.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: mockReclamos, total: 1 }));
    claimServiceSpy.getDetalleReclamoDocente.and.returnValue(of({ exitoso: true, datos: mockDetalle }));
    await TestBed.configureTestingModule({
      imports: [TeacherClaimsComponent],
      providers: [
        { provide: AttendanceClaimService, useValue: claimServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TeacherClaimsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar reclamos exitosamente', () => {
    expect(component).toBeTruthy();
    expect(component.reclamos().length).toBe(1);
    expect(component.totalPendientes()).toBe(1);
    expect(component.listState()).toBe('LOADED');
  });

  it('maneja error 501 marcando listUnavailable', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(throwError(() => ({ status: 501 })));
    component.cargarReclamos();
    expect(component.listUnavailable()).toBeTrue();
    expect(component.listState()).toBe('UNAVAILABLE');
    expect(component.listStateMessage()).toContain('501');
  });

  it('maneja error 403 y otros estados en listStateMessage', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(throwError(() => ({ status: 403, error: { mensajeUsuario: 'Sin acceso' } })));
    component.cargarReclamos();
    expect(component.listState()).toBe('FORBIDDEN');
    expect(component.listStateMessage()).toContain('403');
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('permite abrir vista de resolución y volver a bandeja', () => {
    component.abrirVistaResolucion(mockReclamos[0]);
    expect(component.vistaActual()).toBe('RESOLUCION');
    expect(component.selectedReclamo()?.id).toBe('rec-1');
    component.volverABandeja();
    expect(component.vistaActual()).toBe('BANDEJA');
    expect(component.selectedReclamo()).toBeNull();
  });

  it('confirmarResolucion aprueba el reclamo con comentario', () => {
    claimServiceSpy.resolverReclamo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Reclamo aprobado.' }));
    component.abrirVistaResolucion(mockReclamos[0]);
    component.comentarioDocente = 'Soporte verificado.';
    component.confirmarResolucion('APROBADA');
    expect(claimServiceSpy.resolverReclamo).toHaveBeenCalledWith('rec-1', 'APROBADA', 'Soporte verificado.');
    expect(toastSpy.success).toHaveBeenCalledWith('Reclamo aprobado.');
    expect(component.vistaActual()).toBe('BANDEJA');
  });

  it('confirmarResolucion rechaza el reclamo con feedback por defecto', () => {
    claimServiceSpy.resolverReclamo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Reclamo rechazado.' }));
    component.abrirVistaResolucion(mockReclamos[0]);
    component.comentarioDocente = '';
    component.confirmarResolucion('RECHAZADA');
    expect(claimServiceSpy.resolverReclamo).toHaveBeenCalledWith('rec-1', 'RECHAZADA', 'No cumple con los soportes requeridos.');
  });

  // SES-04: la decisión espera la respuesta real, no se envía dos veces y un conflicto no se muestra como éxito.
  it('SES-04: un segundo clic mientras se resuelve no envía otra decisión', () => {
    const respuesta = new Subject<{ exitoso: boolean; mensajeUsuario: string }>();
    claimServiceSpy.resolverReclamo.and.returnValue(respuesta.asObservable() as any);
    component.abrirVistaResolucion(mockReclamos[0]);

    component.confirmarResolucion('APROBADA');
    component.confirmarResolucion('APROBADA');
    component.confirmarResolucion('RECHAZADA');

    expect(claimServiceSpy.resolverReclamo).toHaveBeenCalledTimes(1);
    expect(component.resolviendo()).toBeTrue();
    expect(component.vistaActual()).toBe('RESOLUCION');
    expect(toastSpy.success).not.toHaveBeenCalled();

    respuesta.next({ exitoso: true, mensajeUsuario: 'Reclamo aprobado.' });
    respuesta.complete();

    expect(component.resolviendo()).toBeFalse();
    expect(toastSpy.success).toHaveBeenCalledOnceWith('Reclamo aprobado.');
    expect(component.vistaActual()).toBe('BANDEJA');
  });

  it('SES-04: un 409 de reclamo ya resuelto muestra el error, recarga la bandeja y no reporta éxito', () => {
    claimServiceSpy.resolverReclamo.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: {
        timestamp: '2026-11-03T20:00:00Z', status: 409, error: 'Conflict', code: 'ERR_RECLAMO_YA_RESUELTO',
        message: 'El reclamo ya fue resuelto con una decision distinta.', path: '/api/v1/docente/reclamos/rec-1',
        correlationId: '43ecb554-7527-45f5-8107-8ef896f63455',
      },
    })));
    component.abrirVistaResolucion(mockReclamos[0]);
    const cargasAntes = claimServiceSpy.getReclamosDocente.calls.count();

    component.confirmarResolucion('RECHAZADA');

    expect(toastSpy.success).not.toHaveBeenCalled();
    expect(toastSpy.error).toHaveBeenCalledWith('El reclamo ya fue resuelto con una decision distinta.');
    expect(claimServiceSpy.getReclamosDocente.calls.count()).toBeGreaterThan(cargasAntes);
    expect(component.resolviendo()).toBeFalse();
  });

  it('descargarSoporte descarga archivo cuando contiene fileId', () => {
    claimServiceSpy.descargarSoporte.and.returnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    component.descargarSoporte(mockReclamos[0].soporteAdjunto!);
    expect(claimServiceSpy.descargarSoporte).toHaveBeenCalledWith('file-123');
    expect(toastSpy.success).toHaveBeenCalled();
  });

  it('descargarSoporte emite warning si falta fileId', () => {
    component.descargarSoporte({ nombre: 'sin-id.pdf', tipo: 'application/pdf', tamanioKb: 10, fechaSubida: '2026-09-10' });
    expect(claimServiceSpy.descargarSoporte).not.toHaveBeenCalled();
    expect(toastSpy.warning).toHaveBeenCalled();
  });

  it('asigna variantes de badge adecuadas según estado', () => {
    expect(component.getReclamoBadgeVariant('APROBADA')).toBe('success');
    expect(component.getReclamoBadgeVariant('RECHAZADA')).toBe('danger');
    expect(component.getReclamoBadgeVariant('PENDIENTE')).toBe('warning');
    expect(component.getReclamoBadgeVariant('OTRO' as any)).toBe('neutral');
  });
});

describe('TeacherClaimsComponent — bandeja paginada y detalle (HU035/HU036)', () => {
  const LISTA = `${environment.apiUrl}/docente/reclamos`;
  const ID_1 = '3f0c1d2e-0000-4000-8000-000000000001';
  const ID_2 = '3f0c1d2e-0000-4000-8000-000000000002';

  let fixture: ComponentFixture<TeacherClaimsComponent>;
  let component: TeacherClaimsComponent;
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;

  const fila = (id: string, extra: Record<string, unknown> = {}) => ({
    id, nombre: `REV-${id.slice(-1)}`, fechaSolicitud: '2026-10-15', estadoSolicitud: 'PENDIENTE',
    justificacionSolicitud: 'Cita médica programada', estudianteId: 'e1', estudianteNombre: `Estudiante ${id.slice(-1)}`,
    sesionId: 's1', sesionNumero: 4, fechaSesionUtc: '2026-10-14T13:00:00.0000000Z', procedenciaTemporalSesion: 'UTC_V2',
    grupoId: 'g1', grupoCodigo: 1, grupoNombre: 'Grupo 1', materiaId: 'm1', materiaCodigo: 'MAT101',
    materiaNombre: 'Cálculo I', soporteAdjunto: null, ...extra,
  });
  const detalle = (id: string, extra: Record<string, unknown> = {}) => ({
    ...fila(id), codigoEstado: 'P', nombreEstado: 'pendiente', justificacionRespuesta: '',
    causalInasistencia: { codigo: 'SJC', nombre: 'sin justa causa', asistio: false }, ...extra,
  });
  const listaReq = () => http.expectOne((r) => r.url === LISTA);
  const errorApi = (message: string) => ({
    timestamp: '2026-10-21T10:00:00Z', status: 404, error: 'Not Found', code: 'RESOURCE_NOT_FOUND',
    message, path: `/api/v1/docente/reclamos/${ID_1}`, correlationId: null,
  });

  beforeEach(async () => {
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    await TestBed.configureTestingModule({
      imports: [TeacherClaimsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TeacherClaimsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  /** Carga inicial: lista (sin filtro) y contador de pendientes (estado=P). */
  function cargarInicial(datos: unknown[], total: number, pendientes: number): void {
    fixture.detectChanges();
    const lista = listaReq();
    expect(lista.request.params.get('estado')).toBeNull();
    lista.flush({ exitoso: true, datos, total });
    const cuenta = http.expectOne((r) => r.url === LISTA && r.params.get('estado') === 'P');
    cuenta.flush({ exitoso: true, datos: [], total: pendientes });
    fixture.detectChanges();
  }

  it('A2-F-07 un reclamo RETIRADA se ve como retirado y no cuenta como pendiente', () => {
    cargarInicial([fila(ID_1, { estadoSolicitud: 'RETIRADA' })], 1, 0);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Retirada');
    expect(texto).not.toContain('Pendiente de evaluación');
    expect(texto).not.toContain('Evaluado');
    expect(component.totalPendientes()).toBe(0);
    expect(component.getReclamoBadgeVariant('RETIRADA' as never)).toBe('neutral');
  });

  it('FE-01 pide la primera página al servidor y enlaza el paginador con el total', () => {
    fixture.detectChanges();
    const req = listaReq();
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('10');
    req.flush({ exitoso: true, datos: [fila(ID_1)], total: 25 });
    http.expectOne((r) => r.url === LISTA && r.params.get('estado') === 'P').flush({ exitoso: true, datos: [], total: 7 });
    fixture.detectChanges();

    const paginador = fixture.debugElement.query(By.directive(PaginationComponent)).componentInstance as PaginationComponent;
    expect(paginador.totalItems()).toBe(25);
    expect(paginador.pageSize()).toBe(10);
    expect(paginador.currentPage()).toBe(1);
    expect(component.total()).toBe(25);
  });

  it('cambiar de página o de tamaño recarga desde el servidor', () => {
    cargarInicial([fila(ID_1)], 25, 7);

    component.cambiarPagina(2);
    const pagina2 = listaReq();
    expect(pagina2.request.params.get('pagina')).toBe('2');
    expect(pagina2.request.params.get('tamano')).toBe('10');
    pagina2.flush({ exitoso: true, datos: [fila(ID_2)], total: 25 });
    http.expectOne((r) => r.url === LISTA && r.params.get('estado') === 'P').flush({ exitoso: true, datos: [], total: 7 });

    component.cambiarTamano(20);
    const nuevoTamano = listaReq();
    expect(nuevoTamano.request.params.get('pagina')).toBe('1');
    expect(nuevoTamano.request.params.get('tamano')).toBe('20');
    nuevoTamano.flush({ exitoso: true, datos: [fila(ID_1)], total: 25 });
    http.expectOne((r) => r.url === LISTA && r.params.get('estado') === 'P').flush({ exitoso: true, datos: [], total: 7 });
    expect(component.pagina()).toBe(1);
    expect(component.tamano()).toBe(20);
  });

  it('FE-02 el filtro de estado es reactivo: nueva petición con estado=P, página 1 y lista actualizada', () => {
    cargarInicial([fila(ID_1, { estadoSolicitud: 'APROBADA' })], 12, 3);
    component.cambiarPagina(2);
    listaReq().flush({ exitoso: true, datos: [fila(ID_1, { estadoSolicitud: 'APROBADA' })], total: 12 });
    http.expectOne((r) => r.url === LISTA && r.params.get('estado') === 'P').flush({ exitoso: true, datos: [], total: 3 });

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'P';
    select.dispatchEvent(new Event('change'));

    const req = listaReq();
    expect(req.request.params.get('estado')).toBe('P');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush({ exitoso: true, datos: [fila(ID_2)], total: 3 });
    fixture.detectChanges();

    expect(component.estadoFiltro()).toBe('P');
    expect(fixture.nativeElement.textContent).toContain('Estudiante 2');
    expect(fixture.nativeElement.textContent).not.toContain('Estudiante 1');
  });

  it('FE-03 el contador de pendientes es el total del servidor para estado=P, no el de la página cargada', () => {
    const pendientesEnPagina = [fila(ID_1), fila(ID_2), fila('3f0c1d2e-0000-4000-8000-000000000003')];
    cargarInicial(pendientesEnPagina, 25, 7);

    expect(component.totalPendientes()).toBe(7);
    expect(fixture.nativeElement.textContent).toContain('7 Pendientes por Resolver');
  });

  it('con el filtro Pendientes el contador reutiliza el total de la propia lista', () => {
    cargarInicial([fila(ID_1)], 25, 7);
    component.cambiarEstado('P');
    listaReq().flush({ exitoso: true, datos: [fila(ID_1)], total: 9 });
    http.expectNone((r) => r.url === LISTA);
    expect(component.totalPendientes()).toBe(9);
  });

  it('FE-04 abrir una solicitud consulta el detalle y muestra la causal real', () => {
    cargarInicial([fila(ID_1)], 1, 1);
    const boton = fixture.nativeElement.querySelector('app-card app-button button') as HTMLButtonElement;
    boton.click();

    const req = http.expectOne(`${LISTA}/${ID_1}`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: detalle(ID_1) });
    fixture.detectChanges();

    expect(component.vistaActual()).toBe('RESOLUCION');
    expect(fixture.nativeElement.textContent).toContain('sin justa causa');
    expect(fixture.nativeElement.textContent).not.toContain('No informado');
  });

  it('el detalle sin causal indica que no hay registro de asistencia en lugar de inventar una causal', () => {
    cargarInicial([fila(ID_1)], 1, 1);
    component.abrirVistaResolucion(component.reclamos()[0]);
    http.expectOne(`${LISTA}/${ID_1}`).flush({ exitoso: true, datos: detalle(ID_1, { causalInasistencia: null }) });
    fixture.detectChanges();

    expect(component.selectedReclamo()?.causalInasistencia).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sin registro de asistencia');
  });

  it('FE-05 un 404 del detalle muestra el message del backend y permanece en la bandeja', () => {
    cargarInicial([fila(ID_1)], 1, 1);
    component.abrirVistaResolucion(component.reclamos()[0]);
    http.expectOne(`${LISTA}/${ID_1}`).flush(errorApi('La solicitud de revisión no existe para este docente.'), { status: 404, statusText: 'Not Found' });

    expect(toast.error).toHaveBeenCalledOnceWith('La solicitud de revisión no existe para este docente.');
    expect(component.vistaActual()).toBe('BANDEJA');
    expect(component.selectedReclamo()).toBeNull();
  });

  it('abrir una solicitud con id inválido no emite petición y avisa al usuario', () => {
    cargarInicial([fila('rec-1')], 1, 1);
    component.abrirVistaResolucion(component.reclamos()[0]);
    http.expectNone((r) => r.url.startsWith(`${LISTA}/`));
    expect(toast.error).toHaveBeenCalled();
    expect(component.vistaActual()).toBe('BANDEJA');
  });

  it('FE-06 un 500 de la bandeja muestra el estado de error y no una lista vacía exitosa', () => {
    fixture.detectChanges();
    listaReq().flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.listState()).toBe('SERVER_ERROR');
    expect(fixture.nativeElement.textContent).toContain(component.listStateMessage());
    expect(fixture.nativeElement.textContent).not.toContain('No hay reclamos en esta categoría');
  });

  // F-DOC-005 / error sin salida: un fallo de carga debe anunciarse (role=alert) y ofrecer reintento.
  it('FE-06b un 500 de la bandeja se anuncia con role=alert y ofrece Reintentar, que vuelve a pedir la lista', () => {
    fixture.detectChanges();
    listaReq().flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(component.listStateMessage());
    const reintentar = Array.from(el.querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? ''));
    expect(reintentar).toBeTruthy();

    (reintentar as HTMLButtonElement).click();
    listaReq().flush({ exitoso: true, datos: [fila(ID_1)], total: 1 });
    http.expectOne((r) => r.url === LISTA && r.params.get('estado') === 'P').flush({ exitoso: true, datos: [], total: 1 });
    fixture.detectChanges();
    expect(component.listState()).toBe('LOADED');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('FE-06b un 403 se anuncia pero no ofrece Reintentar (reintentar no cambia la autorizacion)', () => {
    fixture.detectChanges();
    listaReq().flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(Array.from(el.querySelectorAll('button')).some((b) => /Reintentar/.test(b.textContent ?? ''))).toBeFalse();
  });

  // F-DOC detalle: el contrato del detalle no trae fecha de respuesta; no se pinta una etiqueta con fecha vacia.
  it('la resolucion registrada no muestra "el :" cuando el backend no entrega fecha de respuesta', () => {
    cargarInicial([fila(ID_1, { estadoSolicitud: 'APROBADA' })], 1, 0);
    component.abrirVistaResolucion(component.reclamos()[0]);
    http.expectOne(`${LISTA}/${ID_1}`).flush({
      exitoso: true,
      datos: detalle(ID_1, { estadoSolicitud: 'APROBADA', codigoEstado: 'A', nombreEstado: 'aprobada', justificacionRespuesta: 'Aceptada por el docente' }),
    });
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Resolución registrada');
    expect(texto).toContain('Aceptada por el docente');
    expect(texto).not.toMatch(/Resolución registrada el\s*:/);
  });

  it('FE-06 un 501 de la bandeja se refleja como módulo no disponible', () => {
    fixture.detectChanges();
    listaReq().flush({}, { status: 501, statusText: 'Not Implemented' });

    expect(component.listState()).toBe('UNAVAILABLE');
    expect(component.listUnavailable()).toBeTrue();
  });

  it('si la página actual queda vacía (p. ej. tras resolver), retrocede a la última página con datos', () => {
    cargarInicial([fila(ID_1)], 11, 11);
    component.cambiarPagina(2);
    listaReq().flush({ exitoso: true, datos: [fila(ID_2)], total: 11 });
    http.expectOne((r) => r.url === LISTA && r.params.get('estado') === 'P').flush({ exitoso: true, datos: [], total: 11 });

    component.cargarReclamos();
    listaReq().flush({ exitoso: true, datos: [], total: 10 });
    const retroceso = listaReq();
    expect(retroceso.request.params.get('pagina')).toBe('1');
    retroceso.flush({ exitoso: true, datos: [fila(ID_1)], total: 10 });
    http.expectOne((r) => r.url === LISTA && r.params.get('estado') === 'P').flush({ exitoso: true, datos: [], total: 10 });
    expect(component.pagina()).toBe(1);
  });

  it('la búsqueda local es reactiva sobre la página cargada', () => {
    cargarInicial([fila(ID_1), fila(ID_2)], 2, 2);
    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'Estudiante 2';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.filteredReclamos().map((r) => r.id)).toEqual([ID_2]);
    expect(fixture.nativeElement.textContent).not.toContain('Estudiante 1');
  });

  it('FE-08 no emite peticiones por polling: sin interacción no hay más tráfico', fakeAsync(() => {
    cargarInicial([fila(ID_1)], 1, 1);
    tick(10 * 60 * 1000);
    http.expectNone(() => true);
  }));
});
