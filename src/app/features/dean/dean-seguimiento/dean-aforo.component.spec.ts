import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanAforoComponent } from './dean-aforo.component';
import { environment } from '../../../../environments/environment';
import { AforoGrupo } from '../../../core/models/dean-indicators.model';

describe('DeanAforoComponent', () => {
  let fixture: ComponentFixture<DeanAforoComponent>;
  let component: DeanAforoComponent;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/decano`;
  const grupo: AforoGrupo = {
    idGrupo: 'g-1', codigoGrupo: 931001, idAsignatura: 'a-1', nombreAsignatura: 'Estructuras de Datos', programas: ['Sistemas'],
    cupoMaximo: 10, matriculadosActivos: 5, cuposDisponibles: 5, tasaAforo: 50, grupoEstaHabilitado: true,
  };
  const el = () => fixture.nativeElement as HTMLElement;
  const aforoReq = () => http.expectOne((r) => r.url === `${base}/aforo-grupos`);

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DeanAforoComponent], providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanAforoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${base}/comparativa-programas`).flush({ exitoso: true, datos: [{ idPrograma: 'p-1', nombrePrograma: 'Sistemas' }] });
  });

  afterEach(() => http.verify());

  it('muestra carga y luego los grupos con cupo, matriculados y disponibles', () => {
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="aforo-cargando"]')).not.toBeNull();
    aforoReq().flush({ exitoso: true, datos: [grupo, { ...grupo, idGrupo: 'g-2', grupoEstaHabilitado: false, tasaAforo: null }], total: 2 });
    fixture.detectChanges();
    expect(el().querySelectorAll('[data-testid="aforo-fila"]').length).toBe(2);
    expect(el().querySelectorAll('[data-testid="aforo-tarjeta"]').length).toBe(2);
    expect(el().textContent).toContain('Estructuras de Datos');
    expect(el().textContent).toContain('50%');
    expect(el().textContent).toContain('Sin datos');
    expect(el().textContent).toContain('No habilitado');
    expect(el().querySelector('[data-testid="aforo-tarjetas"]')?.className).toContain('md:hidden');
  });

  it('muestra el estado vacío', () => {
    aforoReq().flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="aforo-vacio"]')).not.toBeNull();
  });

  it('muestra el error con reintento', () => {
    aforoReq().flush({ message: 'Fallo' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="error-carga"]')).not.toBeNull();
    component.cargarAforo();
    aforoReq().flush({ exitoso: true, datos: [grupo], total: 1 });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="error-carga"]')).toBeNull();
  });

  it('filtrar por programa y por habilitados reinicia la página y se envía al backend', () => {
    aforoReq().flush({ exitoso: true, datos: [grupo], total: 30 });
    component.onPageChange(2);
    expect(aforoReq().request.params.get('pagina')).toBe('2');
    component.filtroPrograma.set('p-1');
    component.incluirNoHabilitados.set(true);
    component.aplicarFiltros();
    const req = aforoReq();
    expect(component.pagina()).toBe(1);
    expect(req.request.params.get('idPrograma')).toBe('p-1');
    expect(req.request.params.get('soloHabilitados')).toBe('false');
    req.flush({ exitoso: true, datos: [grupo], total: 1 });
  });
});
