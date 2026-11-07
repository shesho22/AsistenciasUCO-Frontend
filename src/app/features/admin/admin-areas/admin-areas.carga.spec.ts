import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
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
