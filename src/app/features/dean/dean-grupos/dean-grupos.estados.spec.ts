import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { DeanGruposComponent } from './dean-grupos.component';
import { environment } from '../../../../environments/environment';

function grupo(id: string, capacidad: number | null) {
  return {
    id,
    codigo: `COD-${id}`,
    nombre: 'A',
    idAsignatura: 'asig',
    nombreAsignatura: `Materia ${id}`,
    idDocente: 'doc',
    capacidadMaximaPermitida: capacidad,
    estudiantesActivos: 4,
    cuposDisponibles: null,
    grupoHabilitado: true,
    fechaInicioPeriodoAcademico: '2026-01-15',
    fechaFinPeriodoAcademico: '2026-06-15',
  };
}

describe('DeanGruposComponent estados (F-DEC-005, F-DEC-006)', () => {
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/decano/grupos`;

  function crear() {
    const fixture = TestBed.createComponent(DeanGruposComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeanGruposComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('muestra "Cargando grupos" y no "No se encontraron" mientras responde el backend', () => {
    const fixture = crear();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cargando grupos');
    expect(texto).not.toContain('No se encontraron grupos');
    http.expectOne(url).flush({ exitoso: true, datos: [] });
  });

  it('un 500 muestra el mensaje del backend con role=alert y permite reintentar', () => {
    const fixture = crear();
    http.expectOne(url).flush(
      { code: 'ERR_INTERNAL', message: 'Servicio no disponible por mantenimiento.', correlationId: 'c1' },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Servicio no disponible por mantenimiento.');
    expect(el.textContent).not.toContain('No se encontraron grupos');
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar')) as HTMLElement).click();
    http.expectOne(url).flush({ exitoso: true, datos: [grupo('1', 20)] });
    fixture.detectChanges();
    expect(fixture.componentInstance.errorCarga()).toBeNull();
    expect(fixture.componentInstance.courses().length).toBe(1);
  });

  it('un grupo sin cupo definido no inventa un cupo de 30 ni una barra de aforo', () => {
    const fixture = crear();
    http.expectOne(url).flush({ exitoso: true, datos: [grupo('1', null), grupo('2', 0)] });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Sin cupo definido');
    expect(el.textContent).not.toContain('/ 30');
    expect(el.querySelector('tbody .bg-primary-700')).toBeNull();
    expect(fixture.componentInstance.totalCupos()).toBe(0);
  });

  it('el campo de filtro tiene nombre accesible y las cabeceras scope=col', () => {
    const fixture = crear();
    http.expectOne(url).flush({ exitoso: true, datos: [grupo('1', 20)] });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input')?.getAttribute('aria-label')).toBeTruthy();
    el.querySelectorAll('th').forEach((th) => expect(th.getAttribute('scope')).toBe('col'));
  });
});
