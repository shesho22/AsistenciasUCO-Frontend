import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { apiHttpError } from '../../../core/testing/api-error.fixture';
import { AdminEstadosComponent } from './admin-estados.component';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ApiResponse } from '../../../core/models/api-response.model';
import { EstadoSistemaItem } from '../../../core/models/consultas-transversales.model';

describe('AdminEstadosComponent con red lenta (F-ADM-019)', () => {
  it('muestra "Cargando…" y no "No hay estados" hasta recibir la respuesta', () => {
    const respuesta = new Subject<ApiResponse<EstadoSistemaItem[]>>();
    const service = jasmine.createSpyObj('ConsultasTransversalesService', ['getEstadosSistema']);
    service.getEstadosSistema.and.returnValue(respuesta);
    TestBed.configureTestingModule({
      imports: [AdminEstadosComponent],
      providers: [
        { provide: ConsultasTransversalesService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    const fixture = TestBed.createComponent(AdminEstadosComponent);
    fixture.detectChanges();
    let texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cargando…');
    expect(texto).not.toContain('No hay estados');
    respuesta.next({ exitoso: true, datos: [] });
    fixture.detectChanges();
    texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No hay estados de solicitud registrados.');
    expect(texto).not.toContain('Cargando…');
  });
});

describe('AdminEstadosComponent ante un fallo de carga', () => {
  function montar() {
    const service = jasmine.createSpyObj('ConsultasTransversalesService', ['getEstadosSistema']);
    service.getEstadosSistema.and.returnValue(throwError(() => apiHttpError(0, 'Sin red')));
    TestBed.configureTestingModule({
      imports: [AdminEstadosComponent],
      providers: [
        { provide: ConsultasTransversalesService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['error']) },
      ],
    });
    const fixture = TestBed.createComponent(AdminEstadosComponent);
    fixture.detectChanges();
    return { fixture, service };
  }

  it('muestra el error (no "No hay estados") y reintenta', () => {
    const { fixture, service } = montar();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay estados');
    service.getEstadosSistema.and.returnValue(of({ exitoso: true, datos: [] }));
    (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.getEstadosSistema).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="error-carga"]')).toBeNull();
    expect(el.textContent).toContain('No hay estados de solicitud registrados.');
  });
});
