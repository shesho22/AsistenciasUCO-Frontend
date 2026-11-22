import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { PeriodoRecesosListaComponent } from './periodo-recesos-lista.component';

describe('PeriodoRecesosListaComponent (DEC-081)', () => {
  let fixture: ComponentFixture<PeriodoRecesosListaComponent>;
  let http: HttpTestingController;
  const url = (id: string): string => `${environment.apiUrl}/coordinador/periodos-academicos/${id}/recesos`;
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PeriodoRecesosListaComponent], providers: [provideHttpClient(withXhr()), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PeriodoRecesosListaComponent);
    fixture.componentRef.setInput('idPeriodo', 'p1');
    fixture.componentRef.setInput('nombrePeriodo', '2026-2');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('lista compacta con fecha, motivo y estado de cada día', () => {
    expect(el().textContent).toContain('Cargando');
    http.expectOne(url('p1')).flush({
      exitoso: true,
      datos: [
        { id: 'a', fecha: '2026-12-03', motivo: 'Semana institucional', sesionesCanceladas: 6, estaAplicado: true, puedeRetirarse: false },
        { id: 'b', fecha: '2026-12-10', motivo: 'Cierre', sesionesCanceladas: 0, estaAplicado: false, puedeRetirarse: true },
      ],
    });
    fixture.detectChanges();
    const items = el().querySelectorAll('[data-testid="receso-item"]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('03/12/2026');
    expect(items[0].textContent).toContain('Semana institucional');
    expect(items[0].textContent).toContain('Aplicado: 6 clases canceladas');
    expect(items[1].textContent).toContain('Sin aplicar');
    expect(el().querySelector('button')).toBeNull();
  });

  it('sin días informa que no hay recesos', () => {
    http.expectOne(url('p1')).flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="recesos-vacio"]')).not.toBeNull();
  });

  it('muestra el error del backend y vuelve a consultar al cambiar de período', () => {
    http.expectOne(url('p1')).flush({ message: 'No tienes permiso.' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="recesos-error"]')?.textContent).toContain('No tienes permiso.');

    fixture.componentRef.setInput('idPeriodo', 'p2');
    fixture.detectChanges();
    http.expectOne(url('p2')).flush({ exitoso: true, datos: [] });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="recesos-vacio"]')).not.toBeNull();
    expect(el().querySelector('[data-testid="recesos-error"]')).toBeNull();
  });

  it('respuesta sin datos se trata como lista vacía', () => {
    http.expectOne(url('p1')).flush({ exitoso: true, datos: null });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="recesos-vacio"]')).not.toBeNull();
  });
});
