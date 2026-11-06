import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminEstadosComponent, filasDe } from './admin-estados.component';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { EstadoSistemaItem } from '../../../core/models/consultas-transversales.model';

describe('AdminEstadosComponent (HU155, solo consulta)', () => {
  let fixture: ComponentFixture<AdminEstadosComponent>;
  let service: jasmine.SpyObj<ConsultasTransversalesService>;
  let toast: jasmine.SpyObj<ToastService>;

  const estados: EstadoSistemaItem[] = [
    { catalogo: 'SOLICITUD', id: 'e-1', codigo: 'P', nombre: 'pendiente' },
    { catalogo: 'ESTUDIANTE_GRUPO', id: 'g-1', codigo: 'CI', nombre: 'cancelado por inasistencia' },
  ];

  beforeEach(async () => {
    service = jasmine.createSpyObj('ConsultasTransversalesService', ['getEstadosSistema']);
    service.getEstadosSistema.and.returnValue(of({ exitoso: true, datos: estados }));
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [AdminEstadosComponent],
      providers: [
        { provide: ConsultasTransversalesService, useValue: service },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEstadosComponent);
    fixture.detectChanges();
  });

  it('muestra los dos catálogos de estados sin columna de estado ni acciones', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Estados de solicitudes');
    expect(host.textContent).toContain('pendiente');
    expect(host.textContent).toContain('cancelado por inasistencia');
    expect(host.textContent).not.toContain('Inactivo');
    expect(host.querySelectorAll('button').length).toBe(0);
  });

  it('separa las filas por catálogo', () => {
    expect(filasDe(estados, 'SOLICITUD')).toEqual([{ id: 'e-1', codigo: 'P', nombre: 'pendiente' }]);
    expect(filasDe(estados, 'ESTUDIANTE_GRUPO').length).toBe(1);
  });

  it('muestra el error del backend', () => {
    service.getEstadosSistema.and.returnValue(throwError(() => ({ error: { message: 'Sin permisos' } })));
    fixture.componentInstance.ngOnInit();
    expect(toast.error).toHaveBeenCalled();
  });
});
