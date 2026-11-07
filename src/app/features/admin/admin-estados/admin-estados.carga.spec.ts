import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
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
