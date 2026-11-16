import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanProgramasCreditosComponent } from './dean-programas-creditos.component';
import { ProgramaCreditosItem } from '../../../../core/models/consultas-transversales.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { environment } from '../../../../../environments/environment';
import { paginaApi, porUrl } from '../../../../core/testing/pagina-api';

const URL = `${environment.apiUrl}/decano/programas-creditos`;

function fila(cambios: Partial<ProgramaCreditosItem>): ProgramaCreditosItem {
  return {
    idPrograma: 'p-1', nombrePrograma: 'Ingeniería de Sistemas', nombreTipoPrograma: 'Pregrado', nombreModalidad: 'Presencial',
    nombreJornada: 'Diurna', programaActivo: true, idPlanEstudio: 'pl-1', inpPlanEstudio: 20241, planActivo: true,
    totalSemestres: 10, totalAsignaturas: 50, totalCreditos: 160,
    ...cambios,
  };
}

describe('DeanProgramasCreditosComponent (HU112)', () => {
  let fixture: ComponentFixture<DeanProgramasCreditosComponent>;
  let component: DeanProgramasCreditosComponent;
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [DeanProgramasCreditosComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanProgramasCreditosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('consulta la primera página al servidor y muestra cada programa y plan con sus totales y el programa sin plan', () => {
    const req = http.expectOne(porUrl(URL));
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('10');
    expect(req.request.params.has('busqueda')).toBeFalse();
    req.flush(
      paginaApi(
        [
          fila({}),
          fila({ idPrograma: 'p-2', nombrePrograma: 'Industrial', nombreTipoPrograma: 'Posgrado', idPlanEstudio: null, inpPlanEstudio: null, planActivo: false, totalSemestres: 0, totalAsignaturas: 0, totalCreditos: 0 }),
        ],
        1,
        10,
        2
      )
    );
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('2 planes');
    expect(texto).toContain('INP-20241');
    expect(texto).toContain('Sin plan');
    expect(texto).toContain('Vigente');
    expect(texto).toContain('Inactivo');
  });

  it('el total que se muestra es el del servidor, no el de la página', () => {
    http.expectOne(porUrl(URL)).flush(paginaApi([fila({})], 1, 10, 37));
    fixture.detectChanges();
    expect(component.listado.total()).toBe(37);
    expect(fixture.nativeElement.textContent).toContain('37 planes');
  });

  it('la búsqueda viaja al servidor con retardo, desde la primera página', fakeAsync(() => {
    http.expectOne(porUrl(URL)).flush(paginaApi([fila({})], 1, 10, 30));
    component.listado.irAPagina(2);
    http.expectOne(porUrl(URL)).flush(paginaApi([fila({})], 2, 10, 30));

    component.onFiltro('pos');
    component.onFiltro(' posgrado ');
    http.expectNone(porUrl(URL));
    tick(300);
    const req = http.expectOne(porUrl(URL));
    expect(req.request.params.get('busqueda')).toBe('posgrado');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush(paginaApi([fila({ nombrePrograma: 'Industrial' })], 1, 10, 1));
  }));

  it('cambiar de página y de tamaño vuelve a consultar al servidor', () => {
    http.expectOne(porUrl(URL)).flush(paginaApi([fila({})], 1, 10, 30));
    component.listado.irAPagina(3);
    const pagina3 = http.expectOne(porUrl(URL));
    expect(pagina3.request.params.get('pagina')).toBe('3');
    pagina3.flush(paginaApi([fila({})], 3, 10, 30));

    component.listado.cambiarTamano(20);
    const tamano = http.expectOne(porUrl(URL));
    expect(tamano.request.params.get('tamano')).toBe('20');
    expect(tamano.request.params.get('pagina')).toBe('1');
    tamano.flush(paginaApi([fila({})], 1, 20, 30));
  });

  it('sin resultados muestra el mensaje de vacío', () => {
    http.expectOne(porUrl(URL)).flush(paginaApi([], 1, 10, 0));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay programas que coincidan.');
  });

  it('un error de carga se muestra con reintento y no como lista vacía', () => {
    http.expectOne(porUrl(URL)).flush({ message: 'Fallo' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No hay programas que coincidan.');
    expect(toast.error).toHaveBeenCalled();

    component.listado.reintentar();
    http.expectOne(porUrl(URL)).flush(paginaApi([fila({})], 1, 10, 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="error-carga"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ingeniería de Sistemas');
  });
});
