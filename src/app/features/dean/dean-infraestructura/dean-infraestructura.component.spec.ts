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
        {
          id: 'area-1',
          codigo: 'AREA-SOFT',
          nombre: 'Ingeniería de Software',
          facultadId: 'fac-1',
          facultadNombre: 'Facultad de Ingeniería',
          estado: 'ACTIVO',
        },
      ],
    });
    http.expectOne(`${environment.apiUrl}/admin/sedes`).flush({
      exitoso: true,
      datos: [
        {
          id: 'sede-1',
          codigo: 'RION',
          nombre: 'Campus Rionegro',
          municipio: 'Rionegro',
          direccion: 'Sector 3',
          telefono: '5698000',
          estado: 'ACTIVO',
        },
      ],
    });
    http.expectOne(`${environment.apiUrl}/admin/espacios-fisicos`).flush({
      exitoso: true,
      datos: [],
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('carga áreas, sedes y espacios de la facultad y permite filtrar', () => {
    expect(component.areas().length).toBe(1);
    expect(component.sedes().length).toBe(1);

    component.filtroTexto.set('Software');
    expect(component.areasFiltradas().length).toBe(1);
    expect(component.sedesFiltradas().length).toBe(0);
  });
});
