import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StudentClaimsComponent } from './student-claims.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { AuthService } from '../../../core/services/auth.service';

const ENDPOINT = `${environment.apiUrl}/estudiante/reclamos`;

/** Forma real de `datos` de GET /estudiante/reclamos (mismos campos que el docente, sin datos del estudiante). */
const reclamoApi = {
  id: 'sol-1',
  nombre: 'RAD-1',
  fechaSolicitud: '2026-10-20',
  estadoSolicitud: 'PENDIENTE',
  justificacionSolicitud: 'Cita médica',
  justificacionRespuesta: '',
  sesionId: 'ses-1',
  sesionNumero: 3,
  fechaSesionUtc: '2026-10-19T15:30:45Z',
  procedenciaTemporalSesion: 'UTC_V2',
  grupoId: 'grp-1',
  grupoCodigo: 1,
  grupoNombre: 'Grupo 1',
  materiaId: 'mat-1',
  materiaCodigo: 'MAT-1',
  materiaNombre: 'Cálculo',
  soporteAdjunto: {
    fileId: 'file-1',
    nombre: 'incapacidad.pdf',
    tipo: 'application/pdf',
    tamanioBytes: 2048,
    fechaSubidaUtc: '2026-10-20T10:00:00Z',
    url: '/api/v1/archivos/file-1',
  },
};

describe('StudentClaimsComponent (HU010/HU011: consulta del estudiante)', () => {
  let fixture: ComponentFixture<StudentClaimsComponent>;
  let component: StudentClaimsComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [StudentClaimsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StudentClaimsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === ENDPOINT);
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('10');
    expect(req.request.params.has('estado')).toBeFalse();
    req.flush({
      exitoso: true,
      total: 2,
      datos: [reclamoApi, { ...reclamoApi, id: 'sol-2', estadoSolicitud: 'APROBADA', justificacionRespuesta: 'Aprobada', soporteAdjunto: null }],
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('SC-01 lista mis solicitudes con estado, materia, sesión, respuesta y soporte', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(component.total()).toBe(2);
    expect(component.reclamos().length).toBe(2);
    expect(texto).toContain('Cálculo');
    expect(texto).toContain('Pendiente');
    expect(texto).toContain('Aprobada');
    expect(texto).toContain('Aprobada');
    expect(texto).toContain('incapacidad.pdf');
    expect(component.reclamos()[0].soporteAdjunto?.fileId).toBe('file-1');
  });

  it('A2-F-07 un reclamo RETIRADA muestra la insignia "Retirada" y no ofrece retirarlo', () => {
    component.reclamos.set([{ ...component.reclamos()[0], id: 'sol-3', estadoSolicitud: 'RETIRADA' }]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Retirada');
    expect(el.querySelector('[data-accion="retirar-reclamo"]')).toBeNull();
  });

  it('A2-F-01 solo los reclamos PENDIENTE ofrecen Retirar; al retirar muestra el mensaje del backend y recarga', () => {
    const el = fixture.nativeElement as HTMLElement;
    const botones = el.querySelectorAll<HTMLButtonElement>('[data-accion="retirar-reclamo"]');
    expect(botones.length).toBe(1);

    botones[0].click();
    const del = http.expectOne(`${ENDPOINT}/sol-1`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ exitoso: true, mensaje: 'La solicitud de revisión fue retirada.' });
    expect(toastSpy.success).toHaveBeenCalledWith('La solicitud de revisión fue retirada.');
    http.expectOne((r) => r.url === ENDPOINT && r.method === 'GET').flush({ exitoso: true, total: 0, datos: [] });
  });

  it('A2-F-01 un 409 al retirar muestra el message del backend y no recarga', () => {
    (fixture.nativeElement.querySelector('[data-accion="retirar-reclamo"]') as HTMLButtonElement).click();
    http
      .expectOne(`${ENDPOINT}/sol-1`)
      .flush({ message: 'Solo se puede retirar una solicitud de revisión pendiente.' }, { status: 409, statusText: 'Conflict' });
    expect(toastSpy.error).toHaveBeenCalledWith('Solo se puede retirar una solicitud de revisión pendiente.');
  });

  it('SC-02 filtra por estado y reinicia la página', () => {
    component.pagina.set(3);
    component.onEstadoChange('RECHAZADA');
    const req = http.expectOne((r) => r.url === ENDPOINT);
    expect(req.request.params.get('estado')).toBe('RECHAZADA');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes solicitudes de revisión');

    component.onEstadoChange('TODOS');
    expect(http.expectOne((r) => r.url === ENDPOINT).request.params.has('estado')).toBeFalse();
  });

  it('SC-03 paginación y tamaño', () => {
    component.onPagina(2);
    expect(http.expectOne((r) => r.url === ENDPOINT).request.params.get('pagina')).toBe('2');
    component.onTamano(20);
    const req = http.expectOne((r) => r.url === ENDPOINT);
    expect(req.request.params.get('tamano')).toBe('20');
    expect(req.request.params.get('pagina')).toBe('1');
  });

  it('SC-04 un error del backend (403) limpia la lista y muestra el mensaje', () => {
    component.onEstadoChange('PENDIENTE');
    http.expectOne((r) => r.url === ENDPOINT).flush({ exitoso: false }, { status: 403, statusText: 'Forbidden' });
    expect(component.reclamos()).toEqual([]);
    expect(component.total()).toBe(0);
    expect(toastSpy.error).toHaveBeenCalled();
  });

  // F-EST-S03 (patron de Mis Materias): un fallo de carga no puede mostrarse como lista vacia.
  describe('error de carga distinguible de la lista vacia', () => {
    const textoPantalla = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
    const alerta = () => (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');

    function fallarCarga(status: number): void {
      component.cargar();
      http.expectOne((r) => r.url === ENDPOINT).flush({ message: 'fallo' }, { status, statusText: 'Error' });
      fixture.detectChanges();
    }

    it('un 500 muestra una alerta con Reintentar y NO el texto de lista vacia', () => {
      fallarCarga(500);
      expect(alerta()).not.toBeNull();
      expect(textoPantalla()).toContain('Reintentar');
      expect(textoPantalla()).not.toContain('No tienes solicitudes de revisión');
    });

    it('Reintentar vuelve a pedir los reclamos y, si responde, pinta la lista y retira la alerta', () => {
      fallarCarga(0);
      const reintentar = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
        /Reintentar/.test(b.textContent ?? '')
      ) as HTMLButtonElement;
      reintentar.click();
      http.expectOne((r) => r.url === ENDPOINT).flush({ exitoso: true, total: 1, datos: [reclamoApi] });
      fixture.detectChanges();
      expect(alerta()).toBeNull();
      expect(textoPantalla()).toContain('Cálculo');
    });

    it('una respuesta 200 con cero elementos sigue mostrando el estado vacio, sin alerta', () => {
      component.cargar();
      http.expectOne((r) => r.url === ENDPOINT).flush({ exitoso: true, total: 0, datos: [] });
      fixture.detectChanges();
      expect(alerta()).toBeNull();
      expect(textoPantalla()).toContain('No tienes solicitudes de revisión');
    });
  });

  it('SC-05 descarga el soporte por el backend autenticado (GET /archivos/{fileId})', () => {
    const anchor = document.createElement('a');
    spyOn(anchor, 'click');
    spyOn(document, 'createElement').and.returnValue(anchor);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(URL, 'revokeObjectURL');

    component.descargarSoporte(component.reclamos()[0]);
    const req = http.expectOne(`${environment.apiUrl}/archivos/file-1`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));

    expect(anchor.download).toBe('incapacidad.pdf');
    expect(anchor.click).toHaveBeenCalled();
    expect(toastSpy.success).toHaveBeenCalled();
  });

  it('SC-06 error al descargar muestra un mensaje y no rompe la vista', () => {
    component.descargarSoporte(component.reclamos()[0]);
    http.expectOne(`${environment.apiUrl}/archivos/file-1`).flush(new Blob(), { status: 404, statusText: 'Not Found' });
    expect(toastSpy.error).toHaveBeenCalled();
  });

  it('SC-07 sin soporte no hay descarga', () => {
    component.descargarSoporte(component.reclamos()[1]);
    http.expectNone((r) => r.url.includes('/archivos/'));
    expect(toastSpy.warning).toHaveBeenCalled();
  });
});

describe('AttendanceClaimService.getReclamosEstudiante (modo mock)', () => {
  afterEach(() => {
    TestBed.inject(AuthService).setMockMode(false);
    localStorage.removeItem('USE_MOCKS');
  });

  it('SC-08 el interceptor mock responde la lista del estudiante con la forma del backend', (done) => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([mockBackendInterceptor]))] });
    TestBed.inject(AuthService).setMockMode(true);

    TestBed.inject(AttendanceClaimService)
      .getReclamosEstudiante({ pagina: 1, tamano: 10 })
      .subscribe((res) => {
        expect(res.exitoso).toBeTrue();
        expect(res.total).toBeGreaterThan(0);
        expect(res.datos[0].estadoSolicitud).toBeDefined();
        done();
      });
  });

});
