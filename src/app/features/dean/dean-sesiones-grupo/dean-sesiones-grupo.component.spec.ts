import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanSesionesGrupoComponent } from './dean-sesiones-grupo.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

describe('DeanSesionesGrupoComponent (CULM-001)', () => {
  let fixture: ComponentFixture<DeanSesionesGrupoComponent>;
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;
  const url = (r: { url: string }) => r.url === `${environment.apiUrl}/decano/sesiones`;
  const el = () => fixture.nativeElement as HTMLElement;

  const sesion = (id: string, extra: object = {}) => ({
    id, nombre: `Sesión ${id}`, codigo: `S-${id}`, numeroSemana: 2, fechaHoraInicio: '2026-02-03T07:00:00',
    fechaHoraFin: '2026-02-03T09:00:00', idGrupo: 'G-1', codigoGrupo: 1, nombreGrupo: 'Grupo 1', idAsignatura: 'A-1',
    nombreAsignatura: 'Cálculo', ...extra,
  });
  const pagina = (elementos: object[]) => ({ elementos, numeroPagina: 1, tamanoPagina: 50, totalElementos: elementos.length, totalPaginas: 1 });

  beforeEach(() => {
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [DeanSesionesGrupoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanSesionesGrupoComponent);
    fixture.componentRef.setInput('idGrupo', 'G-1');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('consulta las sesiones del grupo en el cronograma de la facultad (idGrupo, 50 por página)', () => {
    const req = http.expectOne(url);
    expect(req.request.params.get('idGrupo')).toBe('G-1');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('50');
    req.flush(pagina([]));
  });

  it('muestra las sesiones con su semana, horario y la cancelación', () => {
    http.expectOne(url).flush(
      pagina([
        sesion('a'),
        sesion('b', { estado: 'CANCELADA', cancelacion: { tipo: 'DOCENTE', motivo: 'Paro de transporte', nombreFestivo: null, fechaCancelacionUtc: null } }),
      ])
    );
    fixture.detectChanges();
    const filas = el().querySelectorAll('[data-testid^="sesion-fila-"]');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('S-a');
    expect(filas[1].textContent).toContain('Cancelada');
    expect(filas[1].textContent).toContain('Paro de transporte');
    expect(el().textContent).toContain('sin zona horaria');
  });

  it('un 200 sin sesiones es un vacío legítimo, no un error', () => {
    http.expectOne(url).flush(pagina([]));
    fixture.detectChanges();
    expect(el().textContent).toContain('El grupo no tiene sesiones programadas.');
    expect(el().querySelector('[role="alert"]')).toBeNull();
  });

  it('mientras carga informa el estado de carga', () => {
    expect(el().querySelector('[role="status"]')?.textContent).toContain('Cargando sesiones');
    http.expectOne(url).flush(pagina([]));
  });

  it('un 500 muestra alerta con Reintentar, avisa el mensaje del backend y Reintentar recupera', () => {
    http.expectOne(url).flush({ mensajeUsuario: 'Falla del servicio' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')).not.toBeNull();
    expect(el().textContent).not.toContain('El grupo no tiene sesiones programadas.');
    expect(toast.error).toHaveBeenCalled();

    (Array.from(el().querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? '')) as HTMLButtonElement).click();
    http.expectOne(url).flush(pagina([sesion('a')]));
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')).toBeNull();
    expect(el().textContent).toContain('S-a');
  });
});
