import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AdminSystemComponent } from './admin-system.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ParametroInstitucionalItem, RegistroAuditoriaItem } from '../../../core/models/role-management.model';

describe('AdminSystemComponent', () => {
  let fixture: ComponentFixture<AdminSystemComponent>;
  let component: AdminSystemComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminManagementService>;
  let coordServiceSpy: jasmine.SpyObj<CoordinatorManagementService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let auditoriaSignal = signal<RegistroAuditoriaItem[]>([]);

  const mockParametros: ParametroInstitucionalItem[] = [
    {
      id: 'param-1',
      clave: 'asistencias.limite.inasistencia',
      nombre: 'Límite de Inasistencia',
      valor: '20',
      descripcion: 'Porcentaje máximo permitido',
      categoria: 'ASISTENCIA',
      tipo: 'PORCENTAJE',
      ultimaModificacion: '2026-01-01',
    },
  ];

  const mockAuditoria: RegistroAuditoriaItem[] = [
    {
      id: 'aud-1',
      timestamp: '2026-02-01T10:00:00Z',
      usuarioId: 'usr-1',
      usuarioNombre: 'Carlos Admin',
      rol: 'ADMINISTRADOR',
      accion: 'ACTUALIZAR',
      modulo: 'SISTEMA',
      descripcion: 'Cambio de parámetro institucional',
      direccionIp: '127.0.0.1',
      nivel: 'INFO',
    },
  ];

  beforeEach(async () => {
    auditoriaSignal = signal<RegistroAuditoriaItem[]>(mockAuditoria);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    adminServiceSpy = jasmine.createSpyObj(
      'AdminManagementService',
      ['cargarParametros', 'cargarAuditoria', 'actualizarParametro', 'ejecutarCierreMasivo'],
      {
        parametros: signal(mockParametros).asReadonly(),
        auditoria: auditoriaSignal.asReadonly(),
        reportesCierre: signal([]).asReadonly(),
      }
    );
    adminServiceSpy.cargarParametros.and.returnValue(of({ exitoso: true, datos: mockParametros }));
    adminServiceSpy.cargarAuditoria.and.returnValue(of({ exitoso: true, datos: mockAuditoria }));

    coordServiceSpy = jasmine.createSpyObj('CoordinatorManagementService', [], {
      periodos: signal([
        {
          id: 'per-1',
          codigo: '2026-2',
          nombre: 'Segundo Semestre 2026',
          fechaInicio: '2026-08-01',
          fechaFin: '2026-12-15',
          estado: 'ACTIVO' as const,
        },
      ]).asReadonly(),
    });

    await TestBed.configureTestingModule({
      imports: [AdminSystemComponent],
      providers: [
        { provide: AdminManagementService, useValue: adminServiceSpy },
        { provide: CoordinatorManagementService, useValue: coordServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar parámetros y auditoría', () => {
    expect(component).toBeTruthy();
    expect(adminServiceSpy.cargarParametros).toHaveBeenCalled();
    expect(adminServiceSpy.cargarAuditoria).toHaveBeenCalled();
    expect(component.parametros().length).toBe(1);
    expect(component.auditoria().length).toBe(1);
  });

  it('tabActiva alterna correctamente entre pestañas', () => {
    expect(component.tabActiva()).toBe('PARAMETROS');
    component.tabActiva.set('AUDITORIA');
    expect(component.tabActiva()).toBe('AUDITORIA');
    component.tabActiva.set('CIERRE_MASIVO');
    expect(component.tabActiva()).toBe('CIERRE_MASIVO');
  });

  it('auditoriaFiltrada filtra por módulo y texto', () => {
    component.filtroAuditoria = 'carlos';
    auditoriaSignal.set([...mockAuditoria]);
    expect(component.auditoriaFiltrada().length).toBe(1);

    component.moduloAuditoriaFiltro = 'ASISTENCIA';
    auditoriaSignal.set([...mockAuditoria]);
    expect(component.auditoriaFiltrada().length).toBe(0);

    component.moduloAuditoriaFiltro = 'SISTEMA';
    auditoriaSignal.set([...mockAuditoria]);
    expect(component.auditoriaFiltrada().length).toBe(1);
  });

  it('actualizarValorParam llama al servicio y notifica éxito', () => {
    component.actualizarValorParam(mockParametros[0], '25');
    expect(adminServiceSpy.actualizarParametro).toHaveBeenCalledWith('param-1', '25');
    expect(toastServiceSpy.success).toHaveBeenCalled();
  });
});
