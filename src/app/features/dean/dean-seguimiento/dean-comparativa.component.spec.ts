import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanComparativaComponent } from './dean-comparativa.component';
import { environment } from '../../../../environments/environment';
import { ComparativaPrograma } from '../../../core/models/dean-indicators.model';

describe('DeanComparativaComponent', () => {
  let fixture: ComponentFixture<DeanComparativaComponent>;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/decano/comparativa-programas`;
  const programa = (id: string, nombre: string, extra: Partial<ComparativaPrograma> = {}): ComparativaPrograma => ({
    idPrograma: id, nombrePrograma: nombre, estaActivoPrograma: true, totalEstudiantes: 5, estudiantesRiesgo: 1, estudiantesPerdida: 2,
    tasaRetencion: 60, sesionesEjecutadas: 33, faltasSinJustaCausa: 5, porcentajeAusentismo: 15.15, horasDictadas: 120, horasFalta: 18, ...extra,
  });
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DeanComparativaComponent], providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanComparativaComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra el estado de carga hasta que responde el backend', () => {
    expect(el().querySelector('[data-testid="comparativa-cargando"]')).not.toBeNull();
    http.expectOne(url).flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="comparativa-cargando"]')).toBeNull();
  });

  it('muestra los programas lado a lado en la tabla y como tarjetas en pantallas angostas', () => {
    http.expectOne(url).flush({ exitoso: true, datos: [programa('p-1', 'Sistemas'), programa('p-2', 'Industrial', { estaActivoPrograma: false, porcentajeAusentismo: null })] });
    fixture.detectChanges();
    expect(el().querySelectorAll('[data-testid="comparativa-fila"]').length).toBe(2);
    expect(el().querySelectorAll('[data-testid="comparativa-tarjeta"]').length).toBe(2);
    expect(el().textContent).toContain('Sistemas');
    expect(el().textContent).toContain('15.15%');
    expect(el().textContent).toContain('Sin datos');
    expect(el().textContent).toContain('Inactivo');
    expect(el().querySelector('[data-testid="comparativa-tarjetas"]')?.className).toContain('md:hidden');
  });

  it('muestra el estado vacío cuando no hay programas', () => {
    http.expectOne(url).flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="comparativa-vacia"]')).not.toBeNull();
  });

  it('muestra el error con reintento y vuelve a consultar', () => {
    http.expectOne(url).flush({ message: 'Fallo' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="error-carga"]')).not.toBeNull();
    fixture.componentInstance.cargar();
    http.expectOne(url).flush({ exitoso: true, datos: [programa('p-1', 'Sistemas')] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="error-carga"]')).toBeNull();
  });

  it('pagina en el cliente y reinicia la página al cambiar el tamaño', () => {
    const muchos = Array.from({ length: 20 }, (_, i) => programa(`p-${i}`, `Programa ${i}`));
    http.expectOne(url).flush({ exitoso: true, datos: muchos });
    fixture.detectChanges();
    expect(fixture.componentInstance.filas().length).toBe(15);
    fixture.componentInstance.pagina.set(2);
    expect(fixture.componentInstance.filas().length).toBe(5);
    fixture.componentInstance.cambiarTamano(30);
    expect(fixture.componentInstance.pagina()).toBe(1);
    expect(fixture.componentInstance.filas().length).toBe(20);
  });
});
