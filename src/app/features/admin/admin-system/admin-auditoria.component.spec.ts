import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
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

  it('rangoUtc cubre días completos y respeta el máximo de 90 días', () => {
    http.expectOne((r) => r.url === url).flush({ exitoso: true, datos: [], total: 0 });
    const base = new Date(2026, 10, 4);
    const rango = rangoUtc(fechaLocal(base, -6), fechaLocal(base));
    expect(rango).not.toBeNull();
    expect((new Date(rango!.hasta).getTime() - new Date(rango!.desde).getTime()) / 86_400_000).toBe(7);
    expect(rangoUtc(fechaLocal(base, -89), fechaLocal(base))).not.toBeNull();
    expect(rangoUtc(fechaLocal(base, -90), fechaLocal(base))).toBeNull();
    expect(rangoUtc('', fechaLocal(base))).toBeNull();
    expect(fechaLocal(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('AdminAuditoriaComponent estados de error de carga', () => {
  const url = `${environment.apiUrl}/admin/auditoria`;

  function escenario(): EscenarioListado {
    TestBed.configureTestingModule({
      imports: [AdminAuditoriaComponent],
      providers: [
        provideHttpClient(),
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
