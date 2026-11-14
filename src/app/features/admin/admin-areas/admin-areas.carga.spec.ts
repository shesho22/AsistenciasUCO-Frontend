import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { apiHttpError } from '../../../core/testing/api-error.fixture';
import { AdminAreasComponent } from './admin-areas.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { signal } from '@angular/core';

describe('AdminAreasComponent con red lenta (F-ADM-019)', () => {
  it('muestra "Cargando…" y no "No hay áreas" hasta recibir la respuesta', () => {
    const respuesta = new Subject<unknown>();
    const service = jasmine.createSpyObj('AdminManagementService', ['cargarAreas'], { areas: signal([]).asReadonly() });
    service.cargarAreas.and.returnValue(respuesta);
    TestBed.configureTestingModule({
      imports: [AdminAreasComponent],
      providers: [
        { provide: AdminManagementService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    const fixture = TestBed.createComponent(AdminAreasComponent);
    fixture.detectChanges();
    let texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cargando…');
    expect(texto).not.toContain('No hay áreas');
    respuesta.next({ exitoso: true, datos: [] });
    fixture.detectChanges();
    texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No hay áreas de conocimiento registradas.');
  });
});

describe('AdminAreasComponent ante un fallo de carga', () => {
  function montar() {
    const service = jasmine.createSpyObj('AdminManagementService', ['cargarAreas'], { areas: signal([]).asReadonly() });
    service.cargarAreas.and.returnValue(throwError(() => apiHttpError(500, 'Fallo interno')));
    TestBed.configureTestingModule({
      imports: [AdminAreasComponent],
      providers: [
        { provide: AdminManagementService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    const fixture = TestBed.createComponent(AdminAreasComponent);
    fixture.detectChanges();
    return { fixture, service };
  }

  it('muestra el error y no afirma que no hay áreas', () => {
    const { fixture } = montar();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay áreas de conocimiento registradas.');
  });

  it('Reintentar vuelve a consultar y, si responde, muestra la tabla', () => {
    const { fixture, service } = montar();
    service.cargarAreas.and.returnValue(of({ exitoso: true, datos: [] }));
    (fixture.nativeElement.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.cargarAreas).toHaveBeenCalledTimes(2);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="error-carga"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No hay áreas de conocimiento registradas.');
  });
});
