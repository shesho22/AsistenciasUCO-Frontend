import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AdminAreasComponent } from './admin-areas.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AreaConocimientoItem } from '../../../core/models/role-management.model';

describe('AdminAreasComponent - áreas de conocimiento (HU150, solo consulta)', () => {
  let fixture: ComponentFixture<AdminAreasComponent>;
  let service: jasmine.SpyObj<AdminManagementService>;
  let toast: jasmine.SpyObj<ToastService>;

  const isw: AreaConocimientoItem = { id: 'a-1', codigo: 'ISW', nombre: 'Ingeniería de Software', activa: true };
  const old: AreaConocimientoItem = { id: 'a-2', codigo: 'OLD', nombre: 'Área antigua', activa: false };

  beforeEach(async () => {
    service = Object.assign(jasmine.createSpyObj('AdminManagementService', ['cargarAreas']), {
      areas: signal<AreaConocimientoItem[]>([isw, old]).asReadonly(),
    });
    service.cargarAreas.and.returnValue(of({ exitoso: true, datos: [isw, old] }));
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [AdminAreasComponent],
      providers: [
        { provide: AdminManagementService, useValue: service },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAreasComponent);
    fixture.detectChanges();
  });

  it('carga y muestra las áreas con código, nombre y estado, sin acciones de escritura', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(service.cargarAreas).toHaveBeenCalled();
    expect(host.textContent).toContain('ISW');
    expect(host.textContent).toContain('Ingeniería de Software');
    expect(host.textContent).toContain('Inactivo');
    expect(host.textContent).toContain('solo consulta');
    expect(host.querySelectorAll('button').length).toBe(0);
    expect(host.querySelectorAll('form').length).toBe(0);
  });

  it('muestra el error del backend si la carga falla', () => {
    service.cargarAreas.and.returnValue(throwError(() => ({ error: { message: 'Sin permisos' } })));

    fixture.componentInstance.ngOnInit();

    expect(toast.error).toHaveBeenCalled();
  });
});
