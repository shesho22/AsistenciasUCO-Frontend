import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminAuditoriaComponent, DIAS_AUDITORIA_MAXIMO, fechaLocal, rangoUtc } from './admin-auditoria.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import {
  EscenarioListado,
  afirmarAutorizacionDenegadaSinReintento,
  afirmarFalloRecuperableConReintento,
  afirmarNoImplementadoSinReintento,
} from '../../../shared/testing/listado-error.helper';

describe('AdminAuditoriaComponent (HU172)', () => {
  let fixture: ComponentFixture<AdminAuditoriaComponent>;
  let component: AdminAuditoriaComponent;
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;
  const url = `${environment.apiUrl}/admin/auditoria`;

  beforeEach(() => {
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [AdminAuditoriaComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminAuditoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('por defecto consulta los últimos 7 días, todas las acciones (F-ADM-013: incluye las del administrador)', () => {
    const req = http.expectOne((r) => r.url === url);
    const desde = new Date(req.request.params.get('desde')!);
    const hasta = new Date(req.request.params.get('hasta')!);
    expect(Math.round((hasta.getTime() - desde.getTime()) / 86_400_000)).toBe(7);
    expect(req.request.params.get('soloAsistencia')).toBe('false');
    expect(req.request.params.has('accion')).toBeFalse();
    req.flush({
      exitoso: true,
      total: 1,
      datos: [{
        id: 'AUD-1', ocurridoEn: '2026-11-04T14:05:00Z', idActor: 'U-1', tipoActor: 'USER', nombreActor: 'Carlos Pérez',
        accion: 'CREAR_SESION', tipoRecurso: 'SESION', idRecurso: 'S-1', resultado: 'FAILURE', idTraza: 'C-1',
        metodoHttp: 'POST', ruta: '/api/v1/sesiones', estadoHttp: 409, ipCliente: null, codigoError: 'CONFLICT',
        metadatos: null, accionAsistencia: true,
      }],
    });
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Carlos Pérez');
    expect(texto).toContain('Fallido');
    expect(texto).toContain('CONFLICT');
    // F-ADM-013: cada evento muestra su id de correlación (idTraza).
    expect(texto).toContain('ID de correlación');
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="correlacion-AUD-1"]')?.textContent).toContain('C-1');
  });

  it('F-ADM-013: mientras carga muestra un indicador y no el vacio', () => {
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cargando eventos');
    expect(texto).not.toContain('No hay eventos');
    http.expectOne((r) => r.url === url).flush({ exitoso: true, total: 0, datos: [] });
  });

  it('consultar envía acción en mayúsculas, resultado y todas las acciones', () => {
    http.expectOne((r) => r.url === url).flush({ exitoso: true, datos: [], total: 0 });
    component.accion.set(' crear_sesion ');
    component.resultado.set('SUCCESS');
    component.soloAsistencia.set(false);

    component.buscar();

    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('accion')).toBe('CREAR_SESION');
    expect(req.request.params.get('resultado')).toBe('SUCCESS');
    expect(req.request.params.get('soloAsistencia')).toBe('false');
    req.flush({ exitoso: true, datos: [], total: 0 });
  });

  it('no consulta si el rango es inválido o supera el máximo', () => {
    http.expectOne((r) => r.url === url).flush({ exitoso: true, datos: [], total: 0 });
    component.desde.set('2026-11-05');
    component.hasta.set('2026-11-01');
    component.buscar();
    expect(component.errorRango()).toContain(`${DIAS_AUDITORIA_MAXIMO} días`);
    http.expectNone((r) => r.url === url);
  });

  it('HU172: permite filtrar por idCorrelacion y enviar soloAdministracion excluyente con soloAsistencia', () => {
    http.expectOne((r) => r.url === url).flush({ exitoso: true, elementos: [], totalElementos: 0, totalPaginas: 0, numeroPagina: 1, tamanoPagina: 10 });

    component.idCorrelacion.set('corr-abc-789');
    component.activarFiltroAdministracion(); // activa soloAdministracion y desactiva soloAsistencia
    expect(component.soloAdministracion()).toBeTrue();
    expect(component.soloAsistencia()).toBeFalse();

    component.buscar();

    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('idCorrelacion')).toBe('corr-abc-789');
    expect(req.request.params.get('soloAdministracion')).toBe('true');
    expect(req.request.params.get('soloAsistencia')).toBe('false');

    req.flush({
      exitoso: true,
      elementos: [
        {
          id: 'AUD-ADMIN-1',
          ocurridoEn: '2026-11-07T14:05:00Z',
          idActor: 'U-ADM',
          tipoActor: 'ADMINISTRADOR',
          nombreActor: 'Administrador TI',
          accion: 'ACTUALIZAR_PARAMETRO',
          tipoRecurso: 'PARAMETRO',
          idRecurso: 'P-1',
          resultado: 'SUCCESS',
          idTraza: 'T-1',
          idCorrelacion: 'corr-abc-789',
          metodoHttp: 'PUT',
          ruta: '/api/v1/admin/parametros/P-1',
          estadoHttp: 200,
          ipCliente: '127.0.0.1',
          codigoError: null,
          metadata: '{"clave":"asistencias.limite","valorNuevo":"25"}',
          accionAsistencia: false,
        },
      ],
      totalElementos: 1,
      totalPaginas: 1,
      numeroPagina: 1,
      tamanoPagina: 10,
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('corr-abc-789');
    expect(el.textContent).toContain('ACTUALIZAR_PARAMETRO');
    // Botón de copiar correlación presente
    const btnCopiar = el.querySelector('[data-testid="btn-copiar-correlacion"]') as HTMLButtonElement;
    expect(btnCopiar).toBeTruthy();
  });

  it('HU172: permite alternar a solo acciones de asistencia desactivando administración', () => {
    http.expectOne((r) => r.url === url).flush({ exitoso: true, elementos: [], totalElementos: 0, totalPaginas: 0, numeroPagina: 1, tamanoPagina: 10 });

    component.activarFiltroAsistencia();
    expect(component.soloAsistencia()).toBeTrue();
    expect(component.soloAdministracion()).toBeFalse();

    component.buscar();
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('soloAsistencia')).toBe('true');
    expect(req.request.params.get('soloAdministracion')).toBe('false');
    req.flush({ exitoso: true, elementos: [], totalElementos: 0, totalPaginas: 0, numeroPagina: 1, tamanoPagina: 10 });
  });

  it('HU172: permite visualizar metadatos del evento', () => {
    http.expectOne((r) => r.url === url).flush({ exitoso: true, elementos: [], totalElementos: 0, totalPaginas: 0, numeroPagina: 1, tamanoPagina: 10 });

    component.listado.filas.set([
      {
        id: 'AUD-META-1',
        ocurridoEn: '2026-11-07T14:05:00Z',
        idActor: 'U-ADM',
        tipoActor: 'ADMINISTRADOR',
        nombreActor: 'Administrador TI',
        accion: 'ACTUALIZAR_PARAMETRO',
        tipoRecurso: 'PARAMETRO',
        idRecurso: 'P-1',
        resultado: 'SUCCESS',
        idTraza: 'T-1',
        idCorrelacion: 'corr-meta-99',
        metodoHttp: 'PUT',
        ruta: '/api/v1/admin/parametros/P-1',
        estadoHttp: 200,
        ipCliente: '127.0.0.1',
        codigoError: null,
        metadata: '{"clave":"asistencias.limite","valorNuevo":"25"}',
        accionAsistencia: false,
      },
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const btnVerMeta = el.querySelector('[data-testid="btn-ver-metadata"]') as HTMLButtonElement;
    expect(btnVerMeta).toBeTruthy();
    btnVerMeta.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('asistencias.limite');
  });

  it('HU172: copia el idCorrelacion al portapapeles', async () => {
    http.expectOne((r) => r.url === url).flush({ exitoso: true, elementos: [], totalElementos: 0, totalPaginas: 0, numeroPagina: 1, tamanoPagina: 10 });
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

    await component.copiarCorrelacion('corr-test-xyz');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('corr-test-xyz');
    expect(toast.success).toHaveBeenCalledWith('ID de correlación copiado al portapapeles.');
  });
});

describe('AdminAuditoriaComponent estados de error de carga', () => {
  const url = `${environment.apiUrl}/admin/auditoria`;

  function escenario(): EscenarioListado {
    TestBed.configureTestingModule({
      imports: [AdminAuditoriaComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AdminAuditoriaComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url === url).flush({ exitoso: true, total: 0, datos: [] });
    fixture.detectChanges();
    return {
      fixture, http,
      textoVacio: 'No hay eventos de auditoría',
      recargar: () => fixture.componentInstance.listado.irAPagina(2),
      coincide: (r) => r.url === url,
      responderExito: (req) => req.flush({ exitoso: true, total: 0, datos: [] }),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('un fallo recuperable muestra alerta con Reintentar y no el vacío', () => afirmarFalloRecuperableConReintento(escenario()));
  it('403 se anuncia como sin autorización, sin Reintentar', () => afirmarAutorizacionDenegadaSinReintento(escenario()));
  it('501 se anuncia como no disponible, sin Reintentar', () => afirmarNoImplementadoSinReintento(escenario()));
});
