import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AdminSystemComponent } from './admin-system.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { HttpTestingController } from '@angular/common/http/testing';
import { ParametroAdminDto } from '../../../core/models/role-management.model';
import { environment } from '../../../../environments/environment';

describe('AdminSystemComponent', () => {
  let fixture: ComponentFixture<AdminSystemComponent>;
  let component: AdminSystemComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminManagementService>;
  let coordServiceSpy: jasmine.SpyObj<CoordinatorManagementService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockParametros: ParametroAdminDto[] = [
    {
      id: 'param-1',
      grupo: 'ASISTENCIA',
      clave: 'ASISTENCIA/TOLERANCIA_MINUTOS',
      valor: '15',
      tipoDato: 'INT',
      esEditable: true,
      valorMinimo: 0,
      valorMaximo: 60,
      etiqueta: 'Tolerancia de ingreso',
      descripcion: 'Minutos permitidos antes de marcar retardo',
      unidad: 'minutos',
      categoriaVisual: 'Reglas de Asistencia',
      orden: 1,
      fechaModificacion: '2026-11-07T15:04:05.007Z',
      fechaUltimoCambioUtc: '2026-11-07T15:04:05.007Z',
      nombreUltimoActor: 'Admin TI',
    },
    {
      id: 'param-2',
      grupo: 'RED',
      clave: 'RED/CIDRS_CAMPUS',
      valor: '10.0.0.0/8',
      tipoDato: 'STRING',
      esEditable: false,
      etiqueta: 'Segmentos de red campus',
      descripcion: 'Redes institucionales autorizadas',
      categoriaVisual: 'Infraestructura y Red',
      orden: 2,
    },
  ];

  beforeEach(async () => {
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    adminServiceSpy = jasmine.createSpyObj(
      'AdminManagementService',
      ['cargarParametros', 'ejecutarCierreMasivo'],
      {
        parametros: signal(mockParametros).asReadonly(),
        reportesCierre: signal([]).asReadonly(),
      }
    );
    adminServiceSpy.cargarParametros.and.returnValue(
      of({
        exitoso: true,
        elementos: mockParametros,
        numeroPagina: 1,
        tamanoPagina: 20,
        totalElementos: 2,
        totalPaginas: 1,
      } as any)
    );

    const periodosSignal = signal([
      {
        id: 'per-1',
        codigo: '2026-2',
        nombre: 'Segundo Semestre 2026',
        fechaInicio: '2026-08-01',
        fechaFin: '2026-12-15',
        estado: 'ACTIVO' as const,
        esVigente: true,
      },
    ]);

    coordServiceSpy = {
      cargarPeriodosAcademicosBase: jasmine.createSpy('cargarPeriodosAcademicosBase'),
      periodos: periodosSignal.asReadonly(),
      _periodosSignal: periodosSignal,
    } as unknown as jasmine.SpyObj<CoordinatorManagementService>;

    await TestBed.configureTestingModule({
      imports: [AdminSystemComponent],
      providers: [
        provideRouter([]),
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

  it('debe crearse e inicializar los parámetros', () => {
    expect(component).toBeTruthy();
    expect(coordServiceSpy.cargarPeriodosAcademicosBase).toHaveBeenCalled();
    expect(adminServiceSpy.cargarParametros).toHaveBeenCalled();
    expect(component.parametros().length).toBe(2);
  });

  it('en admin/sistema (sin dato de ruta) muestra el encabezado y las pestañas de operaciones', () => {
    expect(component.modo).toBe('completo');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')).not.toBeNull();
    expect(el.querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('tabActiva alterna correctamente entre pestañas', () => {
    expect(component.tabActiva()).toBe('PARAMETROS');
    component.tabActiva.set('AUDITORIA');
    expect(component.tabActiva()).toBe('AUDITORIA');
    component.tabActiva.set('CIERRE_MASIVO');
    expect(component.tabActiva()).toBe('CIERRE_MASIVO');
  });

  it('HU172: la pestaña de auditoría consulta el rastro real paginado del backend', () => {
    const http = TestBed.inject(HttpTestingController);
    component.tabActiva.set('AUDITORIA');
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/admin/auditoria`);
    expect(req.request.params.get('soloAsistencia')).toBe('false');
    expect(req.request.params.get('desde')).toBeTruthy();
    req.flush({ exitoso: true, datos: [], total: 0 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay eventos de auditoría');
  });

  it('HU168: muestra parámetros agrupados por categoría, unidad, rango y último actor', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Reglas de Asistencia');
    expect(host.textContent).toContain('Tolerancia de ingreso');
    expect(host.textContent).toContain('15');
    expect(host.textContent).toContain('minutos');
    expect(host.textContent).toContain('Admin TI');
  });

  it('HU168: muestra botón Editar solo si esEditable === true', () => {
    const host = fixture.nativeElement as HTMLElement;
    const btnEditar = host.querySelector('[data-testid="btn-editar-param-1"]') as HTMLButtonElement;
    expect(btnEditar).toBeTruthy();

    const btnEditarTecnico = host.querySelector('[data-testid="btn-editar-param-2"]');
    expect(btnEditarTecnico).toBeNull();
  });

  it('HU168: al presionar Editar abre el modal con el parámetro seleccionado', () => {
    const host = fixture.nativeElement as HTMLElement;
    const btnEditar = host.querySelector('[data-testid="btn-editar-param-1"]') as HTMLButtonElement;
    btnEditar.click();
    fixture.detectChanges();

    expect(component.parametroSeleccionadoEdicion()?.id).toBe('param-1');
    expect(component.modalEdicionAbierto()).toBeTrue();
  });

  it('HU168: el switch alterna entre solo editables y técnicos', () => {
    adminServiceSpy.cargarParametros.calls.reset();
    component.toggleMostrarTecnicos(true);
    expect(adminServiceSpy.cargarParametros).toHaveBeenCalledWith(
      jasmine.objectContaining({ soloEditables: false })
    );

    component.toggleMostrarTecnicos(false);
    expect(adminServiceSpy.cargarParametros).toHaveBeenCalledWith(
      jasmine.objectContaining({ soloEditables: true })
    );
  });

  describe('cierre masivo y accesibilidad (F-ADM-006, F-ADM-007, F-ADM-014, F-ADM-S14)', () => {
    const el = () => fixture.nativeElement as HTMLElement;

    it('los rotulos no dicen "Simulador" porque el cierre es real e irreversible', () => {
      component.tabActiva.set('CIERRE_MASIVO');
      fixture.detectChanges();
      expect(el().textContent).not.toContain('Simulador');
      expect(el().textContent).toContain('irreversible');
    });

    it('ejecutar pide confirmacion en un alertdialog y no usa window.confirm', () => {
      const nativo = spyOn(window, 'confirm');
      adminServiceSpy.ejecutarCierreMasivo.and.returnValue(of({ exitoso: true, datos: undefined }));
      component.tabActiva.set('CIERRE_MASIVO');
      fixture.detectChanges();
      component.iniciarCierreSemestral();
      fixture.detectChanges();
      expect(el().querySelector('[role="alertdialog"]')).toBeTruthy();
      expect(adminServiceSpy.ejecutarCierreMasivo).not.toHaveBeenCalled();
      expect(nativo).not.toHaveBeenCalled();
      component.confirmarCierre();
      expect(adminServiceSpy.ejecutarCierreMasivo).toHaveBeenCalledWith('per-1', '2026-2');
      expect(component.cierrePendiente()).toBeFalse();
    });

    it('F-ADM-005: selecciona por defecto el período con esVigente === true', () => {
      const periodosConVigente = [
        { id: '3f0c1d2e-0000-4000-8000-000000000001', codigo: '2026-1', nombre: 'P1', fechaInicio: '2026-01-01', fechaFin: '2026-06-01', estado: 'FINALIZADO' as const, esVigente: false },
        { id: '3f0c1d2e-0000-4000-8000-000000000002', codigo: '2026-2', nombre: 'P2', fechaInicio: '2026-08-01', fechaFin: '2026-12-01', estado: 'ACTIVO' as const, esVigente: true },
      ];
      (coordServiceSpy as any)._periodosSignal.set(periodosConVigente);
      fixture = TestBed.createComponent(AdminSystemComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.periodoSeleccionadoCierre).toBe('3f0c1d2e-0000-4000-8000-000000000002');
    });

    it('F-ADM-005: si la lista de períodos está vacía muestra mensaje claro y no deja ejecutar cierre', () => {
      (coordServiceSpy as any)._periodosSignal.set([]);
      fixture = TestBed.createComponent(AdminSystemComponent);
      component = fixture.componentInstance;
      component.tabActiva.set('CIERRE_MASIVO');
      fixture.detectChanges();

      expect(el().textContent).toContain('No hay períodos académicos registrados');
      const boton = el().querySelector('button[type="button"][disabled]') as HTMLButtonElement;
      expect(boton).toBeTruthy();
    });

    it('el porcentaje no produce NaN con total 0 y el historial vacio lo explica con overflow horizontal', () => {
      expect(component.porcentaje(0, 0)).toBe('—');
      expect(component.porcentaje(1, 4)).toBe('25.0%');
      component.tabActiva.set('CIERRE_MASIVO');
      fixture.detectChanges();
      expect(el().textContent).not.toContain('NaN');
      expect(el().querySelector('table')?.parentElement?.className).toContain('overflow-x-auto');
      expect(el().textContent).toContain('historial de cierres');
    });

    it('las pestanas usan tablist/tab/aria-selected y las flechas cambian de pestana', () => {
      const tablist = el().querySelector('[role="tablist"]');
      expect(tablist).toBeTruthy();
      const tabs = Array.from(el().querySelectorAll('[role="tab"]')) as HTMLElement[];
      expect(tabs.length).toBe(3);
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      fixture.detectChanges();
      expect(component.tabActiva()).toBe('AUDITORIA');
      expect(el().querySelector('[role="tabpanel"]')).toBeTruthy();
      expect(el().querySelectorAll('svg:not([aria-hidden="true"])').length).toBe(0);
    });
  });
});
