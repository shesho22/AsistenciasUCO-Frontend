import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { DeanAsignaturasComponent } from './dean-asignaturas.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

const ASIGNATURA = {
  idAsignatura: 'a-1', codigo: 'SIS-101', nombre: 'Cálculo Diferencial', creditos: 4, nombreArea: 'Ciencias',
  nombreComponente: 'Obligatorio', codigoSemestre: 'S1', idPlanEstudio: 'pl-1', inpPlanEstudio: 20241,
  idPrograma: 'p-1', nombrePrograma: 'Sistemas', idFacultad: 'f-1', nombreFacultad: 'Ingeniería', activa: false,
};

function crear(comoAdministrador: boolean) {
  const toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info', 'warning']);
  TestBed.configureTestingModule({
    imports: [DeanAsignaturasComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ToastService, useValue: toast },
      { provide: ActivatedRoute, useValue: { snapshot: { data: comoAdministrador ? { comoAdministrador: true } : {} } } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(DeanAsignaturasComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, http, toast };
}

describe('DeanAsignaturasComponent (HU143, decano)', () => {
  const url = `${environment.apiUrl}/decano/asignaturas`;

  it('busca en la facultad sin selector de facultad', () => {
    const { fixture, component, http } = crear(false);
    http.expectOne((r) => r.url === url).flush({ exitoso: true, datos: [ASIGNATURA], total: 1 });
    http.expectNone(`${environment.apiUrl}/admin/facultades`);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent as string;
    expect(component.comoAdministrador).toBeFalse();
    expect(texto).toContain('SIS-101');
    expect(texto).toContain('Inactiva');
    expect(texto).toContain('Asignaturas de los programas y planes de tu facultad.');
    expect((fixture.nativeElement as HTMLElement).querySelector('[aria-label="Facultad"]')).toBeNull();

    component.busqueda.set('cal');
    component.listado.buscar();
    expect(http.expectOne((r) => r.url === url).request.params.get('busqueda')).toBe('cal');
    component.onEstado('ACTIVO');
    expect(http.expectOne((r) => r.url === url).request.params.get('estaActiva')).toBe('true');
    http.verify();
  });

  it('sin resultados muestra el mensaje y un error se informa', () => {
    const { fixture, component, http, toast } = crear(false);
    http.expectOne((r) => r.url === url).flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay asignaturas que coincidan con la búsqueda.');

    component.listado.irAPagina(2);
    http.expectOne((r) => r.url === url).flush({ exitoso: false }, { status: 500, statusText: 'Server Error' });
    expect(toast.error).toHaveBeenCalled();
    http.verify();
  });
});

describe('DeanAsignaturasComponent (HU143, administrador)', () => {
  const url = `${environment.apiUrl}/admin/asignaturas`;

  it('busca en la institución y filtra por facultad', () => {
    const { fixture, component, http } = crear(true);
    http.expectOne((r) => r.url === url).flush({ exitoso: true, datos: [ASIGNATURA], total: 1 });
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: [{ id: 'f-1', nombreFacultad: 'Ingeniería' }] });
    fixture.detectChanges();

    expect(component.facultades()).toEqual([{ id: 'f-1', nombre: 'Ingeniería' }]);
    expect(fixture.nativeElement.textContent).toContain('Asignaturas de todas las facultades de la institución.');

    component.onFacultad('f-1');
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('idFacultad')).toBe('f-1');
    expect(req.request.params.get('pagina')).toBe('1');
    http.verify();
  });

  it('si las facultades fallan, el selector queda vacío', () => {
    const { component, http } = crear(true);
    http.expectOne((r) => r.url === url).flush({ exitoso: true, datos: [], total: 0 });
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: false }, { status: 500, statusText: 'Server Error' });
    expect(component.facultades()).toEqual([]);
    http.verify();
  });
});
