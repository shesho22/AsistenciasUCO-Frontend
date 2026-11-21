import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal, signal } from '@angular/core';
import { CierrePeriodoReporte } from '../../../core/models/role-management.model';
import { AdminCierreMasivoComponent } from './admin-cierre-masivo.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';

describe('AdminCierreMasivoComponent (F-ADM-006, F-ADM-007, F-ADM-014)', () => {
  let fixture: ComponentFixture<AdminCierreMasivoComponent>;
  let component: AdminCierreMasivoComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminManagementService>;
  let coordServiceSpy: jasmine.SpyObj<CoordinatorManagementService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let reportes: WritableSignal<CierrePeriodoReporte[]>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    reportes = signal<CierrePeriodoReporte[]>([]);
    adminServiceSpy = jasmine.createSpyObj('AdminManagementService', ['ejecutarCierreMasivo', 'cargarHistorialCierres'], {
      reportesCierre: reportes.asReadonly(),
    });
    adminServiceSpy.cargarHistorialCierres.and.returnValue(of({ exitoso: true, datos: [] }));
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
      imports: [AdminCierreMasivoComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AdminManagementService, useValue: adminServiceSpy },
        { provide: CoordinatorManagementService, useValue: coordServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCierreMasivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga los períodos al abrirse', () => {
    expect(coordServiceSpy.cargarPeriodosAcademicosBase).toHaveBeenCalled();
  });

  it('los rotulos no dicen "Simulador" porque el cierre es real e irreversible', () => {
    expect(el().textContent).not.toContain('Simulador');
    expect(el().textContent).toContain('irreversible');
  });

  it('ejecutar pide confirmacion en un alertdialog y no usa window.confirm', () => {
    const nativo = spyOn(window, 'confirm');
    adminServiceSpy.ejecutarCierreMasivo.and.returnValue(of({ exitoso: true, datos: undefined }));
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
    (coordServiceSpy as unknown as { _periodosSignal: { set(v: unknown): void } })._periodosSignal.set(periodosConVigente);
    fixture = TestBed.createComponent(AdminCierreMasivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.periodoSeleccionadoCierre).toBe('3f0c1d2e-0000-4000-8000-000000000002');
  });

  it('F-ADM-005: si la lista de períodos está vacía muestra mensaje claro y no deja ejecutar cierre', () => {
    (coordServiceSpy as unknown as { _periodosSignal: { set(v: unknown): void } })._periodosSignal.set([]);
    fixture = TestBed.createComponent(AdminCierreMasivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(el().textContent).toContain('No hay períodos académicos registrados');
    const boton = el().querySelector('button[type="button"][disabled]') as HTMLButtonElement;
    expect(boton).toBeTruthy();
  });

  it('el porcentaje no produce NaN con total 0 y el historial vacio lo explica con overflow horizontal', () => {
    expect(component.porcentaje(0, 0)).toBe('—');
    expect(component.porcentaje(1, 4)).toBe('25.0%');
    expect(el().textContent).not.toContain('NaN');
    expect(el().querySelector('table')?.parentElement?.className).toContain('tabla-scroll');
    expect(el().textContent).toContain('Aún no hay cierres masivos');
  });

  it('no repite accesos que ya existen en otras vistas (correo SMTP, pestañas internas)', () => {
    expect(el().querySelector('a[href*="configuracion/correo"]')).toBeNull();
    expect(el().querySelector('[role="tablist"]')).toBeNull();
  });

  describe('historial de cierres (GET /admin/cierre-masivo/historial)', () => {
    const reporte = (n: number): CierrePeriodoReporte => ({
      id: `rep-${n}`,
      periodoCodigo: `2026-${n}`,
      fechaEjecucion: '2026-11-01T10:00:00Z',
      totalEstudiantesProcesados: 100,
      totalMateriasAfectadas: 8,
      totalAprobadosAsistencia: 90,
      totalReprobadosFallas: 10,
      estado: 'COMPLETADO',
      ejecutadoPor: 'Admin',
    });

    it('consulta el historial al abrirse', () => {
      expect(adminServiceSpy.cargarHistorialCierres).toHaveBeenCalledTimes(1);
    });

    it('muestra las filas del historial con porcentajes y sin el estado vacio', () => {
      reportes.set([reporte(1), reporte(2)]);
      fixture.detectChanges();
      const filas = el().querySelectorAll('tbody tr');
      expect(filas.length).toBe(2);
      expect(filas[0].textContent).toContain('2026-1');
      expect(filas[0].textContent).toContain('90 (90.0%)');
      expect(el().textContent).not.toContain('Aún no hay cierres masivos');
    });

    it('pagina el historial en el cliente', () => {
      reportes.set(Array.from({ length: 12 }, (_, i) => reporte(i + 1)));
      fixture.detectChanges();
      expect(el().querySelectorAll('tbody tr').length).toBe(10);
      expect(el().querySelector('app-pagination')).toBeTruthy();
      component.pagina.set(2);
      fixture.detectChanges();
      expect(el().querySelectorAll('tbody tr').length).toBe(2);
      component.cambiarTamano(20);
      fixture.detectChanges();
      expect(component.pagina()).toBe(1);
      expect(el().querySelectorAll('tbody tr').length).toBe(12);
      expect(el().querySelector('app-pagination')).toBeNull();
    });

    it('un error al consultar el historial se muestra como alerta de carga y permite reintentar', () => {
      adminServiceSpy.cargarHistorialCierres.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 500 }))
      );
      component.cargarHistorial();
      fixture.detectChanges();
      expect(el().querySelector('[data-testid="error-carga"]')).toBeTruthy();
      adminServiceSpy.cargarHistorialCierres.and.returnValue(of({ exitoso: true, datos: [] }));
      component.cargarHistorial();
      fixture.detectChanges();
      expect(el().querySelector('[data-testid="error-carga"]')).toBeNull();
    });

    it('recarga el historial tras un cierre exitoso', () => {
      adminServiceSpy.ejecutarCierreMasivo.and.returnValue(of({ exitoso: true, datos: undefined, mensajeUsuario: 'Listo' }));
      adminServiceSpy.cargarHistorialCierres.calls.reset();
      component.confirmarCierre();
      expect(adminServiceSpy.cargarHistorialCierres).toHaveBeenCalledTimes(1);
      expect(toastServiceSpy.success).toHaveBeenCalledWith('Listo');
    });

    it('no recarga el historial si el cierre falla', () => {
      adminServiceSpy.ejecutarCierreMasivo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      adminServiceSpy.cargarHistorialCierres.calls.reset();
      component.confirmarCierre();
      expect(adminServiceSpy.cargarHistorialCierres).not.toHaveBeenCalled();
      expect(toastServiceSpy.error).toHaveBeenCalled();
    });
  });
});
