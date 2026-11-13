import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ParametroEdicionModalComponent } from './parametro-edicion-modal.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ParametroAdminDto } from '../../../core/models/role-management.model';

describe('ParametroEdicionModalComponent (HU168)', () => {
  let fixture: ComponentFixture<ParametroEdicionModalComponent>;
  let component: ParametroEdicionModalComponent;
  let adminServiceSpy: jasmine.SpyObj<AdminManagementService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const parametroMock: ParametroAdminDto = {
    id: 'p-1',
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
  };

  beforeEach(async () => {
    adminServiceSpy = jasmine.createSpyObj('AdminManagementService', ['actualizarParametro', 'cargarParametros']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    await TestBed.configureTestingModule({
      imports: [ParametroEdicionModalComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AdminManagementService, useValue: adminServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParametroEdicionModalComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('renderiza input type number para INT con min y max respetados', () => {
    fixture.componentRef.setInput('parametro', parametroMock);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.min).toBe('0');
    expect(input.max).toBe('60');
    expect(input.value).toBe('15');
  });

  it('renderiza control select para BOOLEAN', () => {
    const paramBool: ParametroAdminDto = {
      ...parametroMock,
      id: 'p-bool',
      tipoDato: 'BOOLEAN',
      valor: 'true',
      valorMinimo: null,
      valorMaximo: null,
    };
    fixture.componentRef.setInput('parametro', paramBool);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const select = host.querySelector('select[data-testid="input-valor-boolean"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
  });

  it('renderiza control select cuando hay valoresPermitidos', () => {
    const paramPermitidos: ParametroAdminDto = {
      ...parametroMock,
      id: 'p-enum',
      tipoDato: 'STRING',
      valor: 'CALENDARIOS_NACIONALES',
      valoresPermitidos: ['CALENDARIOS_NACIONALES', 'FERIADOS_IO', 'CALCULO_LOCAL'],
    };
    fixture.componentRef.setInput('parametro', paramPermitidos);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const select = host.querySelector('select[data-testid="input-valor-select"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(3);
  });

  it('el motivo es obligatorio de al menos 10 caracteres; el botón guardar se deshabilita si es menor', () => {
    fixture.componentRef.setInput('parametro', parametroMock);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    component.nuevoValor.set('20');
    component.motivo.set('corto');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const btnGuardar = host.querySelector('button[data-testid="btn-guardar-parametro"]') as HTMLButtonElement;
    expect(btnGuardar.disabled).toBeTrue();

    component.motivo.set('Actualización reglamentaria institucional');
    fixture.detectChanges();
    expect(btnGuardar.disabled).toBeFalse();
  });

  it('envía fechaModificacionEsperada exactamente como llegó (.007Z)', () => {
    fixture.componentRef.setInput('parametro', parametroMock);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    component.nuevoValor.set('20');
    component.motivo.set('Actualización reglamentaria institucional');

    adminServiceSpy.actualizarParametro.and.returnValue(
      of({
        exitoso: true,
        datos: {
          id: 'p-1',
          grupo: 'ASISTENCIA',
          clave: 'ASISTENCIA/TOLERANCIA_MINUTOS',
          valorAnterior: '15',
          valorNuevo: '20',
          fechaModificacion: '2026-11-07T16:00:00.000Z',
          sinCambios: false,
        },
      } as any)
    );

    let guardadoEmitido = false;
    component.guardado.subscribe(() => (guardadoEmitido = true));

    component.guardar();

    expect(adminServiceSpy.actualizarParametro).toHaveBeenCalledWith('p-1', {
      valor: '20',
      fechaModificacionEsperada: '2026-11-07T15:04:05.007Z',
      motivo: 'Actualización reglamentaria institucional',
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(guardadoEmitido).toBeTrue();
  });

  it('ante error 409 PRM_008 emite recarga requerida y muestra mensaje', () => {
    fixture.componentRef.setInput('parametro', parametroMock);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    component.nuevoValor.set('20');
    component.motivo.set('Actualización reglamentaria institucional');

    adminServiceSpy.actualizarParametro.and.returnValue(
      throwError(() => ({
        status: 409,
        error: {
          codigo: 'PRM_008',
          mensajeUsuario: 'Otro usuario modificó el parámetro. Recarga y vuelve a intentarlo.',
        },
      }))
    );

    let recargaEmitida = false;
    component.recargarRequerido.subscribe(() => (recargaEmitida = true));

    component.guardar();
    fixture.detectChanges();

    expect(recargaEmitida).toBeTrue();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Otro usuario modificó el parámetro');
  });
});
