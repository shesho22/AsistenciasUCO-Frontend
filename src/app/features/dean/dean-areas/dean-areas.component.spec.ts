import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { DeanAreasComponent } from './dean-areas.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { environment } from '../../../../environments/environment';

describe('DeanAreasComponent', () => {
  let fixture: ComponentFixture<DeanAreasComponent>;
  let component: DeanAreasComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [DeanAreasComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/areas`).flush({
      exitoso: true,
      datos: [
        { id: 'area-1', codigo: 'AREA-SOFT', nombre: 'Ingeniería de Software', activa: true },
        { id: 'area-2', codigo: 'AREA-MAT', nombre: 'Matemáticas', activa: true },
      ],
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('carga las áreas de la facultad y permite filtrar', () => {
    expect(component.areas()).toHaveSize(2);
    expect(component.areasTotal()).toBe('2');

    component.filtroTexto.set('Software');
    expect(component.areasFiltradas()).toHaveSize(1);
  });

  it('bloque E: lista las áreas en una tabla con una fila por área, código, nombre y estado', () => {
    const el = fixture.nativeElement as HTMLElement;
    const filas = el.querySelectorAll('app-tabla-datos tbody tr[data-testid="area-fila"]');
    expect(filas).toHaveSize(2);
    expect(filas[0].textContent).toContain('AREA-SOFT');
    expect(filas[0].textContent).toContain('Ingeniería de Software');
    expect(filas[0].querySelector('app-badge')?.textContent).toContain('ACTIVO');
  });

  it('bloque E: pagina de 15 en 15 y vuelve a la página 1 al filtrar', () => {
    TestBed.inject(AdminManagementService).cargarAreas().subscribe();
    http.expectOne(`${environment.apiUrl}/admin/areas`).flush({
      exitoso: true,
      datos: Array.from({ length: 17 }, (_, i) => ({ id: `a-${i}`, codigo: `A-${i}`, nombre: `Área ${i}`, activa: true })),
    });
    fixture.detectChanges();
    const filas = () => (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="area-fila"]');
    expect(filas()).toHaveSize(15);
    component.pagina.set(2);
    fixture.detectChanges();
    expect(filas()).toHaveSize(2);
    component.cambiarTamano(30);
    fixture.detectChanges();
    expect(filas()).toHaveSize(17);
  });

  it('bloque E: sin coincidencias la tabla muestra el mensaje vacío', () => {
    component.filtroTexto.set('zzz');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="tabla-datos-vacia"]')?.textContent).toContain(
      'No se encontraron áreas de conocimiento.'
    );
  });

  // HU020/HU140 descartadas (2026-11-06): sedes y espacios físicos no se piden; la pantalla no los consulta ni los muestra.
  it('no consulta sedes ni espacios físicos', () => {
    http.expectNone(`${environment.apiUrl}/admin/sedes`);
    http.expectNone(`${environment.apiUrl}/admin/espacios-fisicos`);
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Sedes');
    expect(text).not.toContain('Espacios Físicos');
  });

  it('CULM-001: ya no ofrece volver al resumen (las pestañas de Mi facultad lo reemplazan)', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Resumen de Facultad');
  });

  it('CULM-001: embebido en una pestaña oculta el título y conserva el contador y la lista', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')).not.toBeNull();
    fixture.componentRef.setInput('embebido', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')).toBeNull();
    expect(el.textContent).toContain('2 Áreas');
  });
});

// UX-09 / AUTH-04: un 403/500 de áreas no es «0».
describe('DeanAreasComponent con errores HTTP', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeanAreasComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('áreas no disponibles se informan y el total muestra «—»', () => {
    const fixture = TestBed.createComponent(DeanAreasComponent);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/admin/areas`).flush(
      { exitoso: false, codigo: 'FORBIDDEN', mensajeUsuario: 'No autorizado.' },
      { status: 403, statusText: 'Forbidden' }
    );
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(fixture.componentInstance.areasTotal()).toBe('—');
    expect(text).toContain('No fue posible cargar las áreas.');
    expect(text).not.toContain('No se encontraron áreas de conocimiento.');
  });
});
