import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { DeanInfraestructuraComponent } from './dean-infraestructura.component';
import { environment } from '../../../../environments/environment';

describe('DeanInfraestructuraComponent', () => {
  let fixture: ComponentFixture<DeanInfraestructuraComponent>;
  let component: DeanInfraestructuraComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [DeanInfraestructuraComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanInfraestructuraComponent);
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
    expect(component.areas().length).toBe(2);
    expect(component.areasTotal()).toBe('2');

    component.filtroTexto.set('Software');
    expect(component.areasFiltradas().length).toBe(1);
  });

  // HU020/HU140 descartadas (2026-11-06): sedes y espacios físicos no se piden; la pantalla no los consulta ni los muestra.
  it('no consulta sedes ni espacios físicos', () => {
    http.expectNone(`${environment.apiUrl}/admin/sedes`);
    http.expectNone(`${environment.apiUrl}/admin/espacios-fisicos`);
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Sedes');
    expect(text).not.toContain('Espacios Físicos');
  });

  it('vuelve al resumen de la facultad', () => {
    component.volverAFacultad();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/facultad']);
  });
});

// UX-09 / AUTH-04: un 403/500 de áreas no es «0».
describe('DeanInfraestructuraComponent con errores HTTP', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeanInfraestructuraComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('áreas no disponibles se informan y el total muestra «—»', () => {
    const fixture = TestBed.createComponent(DeanInfraestructuraComponent);
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
