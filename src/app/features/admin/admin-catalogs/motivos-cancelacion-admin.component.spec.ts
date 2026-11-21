import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { MotivosCancelacionAdminComponent } from './motivos-cancelacion-admin.component';
import { AdminCatalogosService } from '../../../core/services/admin-catalogos.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { MotivoCancelacionSesionAdmin } from '../../../core/models/catalogo-admin.model';

function errorApi(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: { timestamp: 't', status, error: 'E', code: 'CTG', message, path: '/x', correlationId: null },
  });
}

describe('MotivosCancelacionAdminComponent', () => {
  let fixture: ComponentFixture<MotivosCancelacionAdminComponent>;
  let comp: MotivosCancelacionAdminComponent;
  let servicio: jasmine.SpyObj<AdminCatalogosService>;
  let toast: jasmine.SpyObj<ToastService>;

  const a: MotivoCancelacionSesionAdmin = { id: 'm-1', codigo: 'DOC_INC', nombre: 'Incapacidad', orden: 1, estaActivo: true };
  const b: MotivoCancelacionSesionAdmin = { id: 'm-2', codigo: 'FUERZA', nombre: 'Fuerza mayor', orden: 2, estaActivo: false };
  const host = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    servicio = jasmine.createSpyObj('AdminCatalogosService', [
      'listarMotivos', 'crearMotivo', 'editarMotivo', 'cambiarEstadoMotivo',
    ]);
    servicio.listarMotivos.and.returnValue(of({ exitoso: true, datos: [a, b], total: 2 }));
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    await TestBed.configureTestingModule({
      imports: [MotivosCancelacionAdminComponent],
      providers: [
        { provide: AdminCatalogosService, useValue: servicio },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MotivosCancelacionAdminComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra código, nombre, orden y estado de cada motivo', () => {
    const fila = host().querySelector('[data-testid="motivo-fila-m-1"]')!.textContent!;
    expect(fila).toContain('DOC_INC');
    expect(fila).toContain('Incapacidad');
    expect(fila).toContain('1');
    expect(fila).toContain('Activo');
    expect(host().querySelector('[data-testid="motivo-fila-m-2"]')!.textContent).toContain('Inactivo');
  });

  it('muestra el estado vacío cuando no hay motivos', () => {
    servicio.listarMotivos.and.returnValue(of({ exitoso: true, datos: [], total: 0 }));
    comp.cargar();
    fixture.detectChanges();
    expect(host().textContent).toContain('No hay motivos de cancelación registrados.');
  });

  it('ante un fallo de carga muestra el error y reintenta', () => {
    servicio.listarMotivos.and.returnValue(throwError(() => errorApi(500, 'Falla')));
    comp.cargar();
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="error-carga"]')).not.toBeNull();
    servicio.listarMotivos.and.returnValue(of({ exitoso: true, datos: [a], total: 1 }));
    comp.cargar();
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="error-carga"]')).toBeNull();
  });

  it('crear con orden: envía código, nombre y orden numérico y muestra el mensaje del backend', () => {
    servicio.crearMotivo.and.returnValue(of({ exitoso: true, datos: { id: 'n' }, mensajeUsuario: 'Motivo creado.' }));
    comp.abrirCrear();
    comp.codigo.set('NUEVO_1');
    comp.nombre.set(' Nuevo ');
    comp.orden.set('5');
    comp.guardar();
    expect(servicio.crearMotivo).toHaveBeenCalledWith({ codigo: 'NUEVO_1', nombre: 'Nuevo', orden: 5 });
    expect(toast.success).toHaveBeenCalledWith('Motivo creado.');
    expect(servicio.listarMotivos).toHaveBeenCalledTimes(2);
  });

  it('crear sin orden no lo envía', () => {
    servicio.crearMotivo.and.returnValue(of({ exitoso: true, datos: { id: 'n' } }));
    comp.abrirCrear();
    comp.codigo.set('NUEVO');
    comp.nombre.set('Nuevo');
    comp.guardar();
    expect(servicio.crearMotivo).toHaveBeenCalledWith({ codigo: 'NUEVO', nombre: 'Nuevo' });
    expect(toast.success).toHaveBeenCalledWith('Registro guardado.');
  });

  it('crear duplicado (409 CTG_006) muestra el message del backend en el formulario', () => {
    servicio.crearMotivo.and.returnValue(throwError(() => errorApi(409, 'Ya existe un motivo con ese código o nombre.')));
    comp.abrirCrear();
    comp.codigo.set('DOC_INC');
    comp.nombre.set('X');
    comp.guardar();
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="motivo-error"]')!.textContent).toContain('Ya existe un motivo con ese código o nombre.');
  });

  it('valida formato en el cliente: código, nombre y orden', () => {
    comp.abrirCrear();
    comp.codigo.set('mal codigo');
    expect(comp.errorCodigo()).not.toBe('');
    comp.codigo.set('OK_1');
    comp.nombre.set('n'.repeat(201));
    expect(comp.errorNombre()).toContain('200');
    comp.nombre.set('N');
    comp.orden.set('0');
    expect(comp.errorOrden()).not.toBe('');
    expect(comp.formValido()).toBeFalse();
    comp.orden.set('abc');
    expect(comp.errorOrden()).not.toBe('');
    comp.orden.set('3');
    expect(comp.errorOrden()).toBe('');
    expect(comp.formValido()).toBeTrue();
    comp.nombre.set('');
    comp.guardar();
    expect(servicio.crearMotivo).not.toHaveBeenCalled();
  });

  it('editar exige orden, no envía el código y muestra el mensaje del backend', () => {
    servicio.editarMotivo.and.returnValue(of({ exitoso: true, datos: { id: 'm-1' }, mensajeUsuario: 'Motivo actualizado.' }));
    comp.abrirEditar(a);
    expect(comp.orden()).toBe('1');
    comp.orden.set('');
    expect(comp.formValido()).toBeFalse();
    comp.orden.set('4');
    comp.nombre.set('Incapacidad 2');
    comp.guardar();
    expect(servicio.editarMotivo).toHaveBeenCalledWith('m-1', { nombre: 'Incapacidad 2', orden: 4 });
    expect(toast.success).toHaveBeenCalledWith('Motivo actualizado.');
  });

  it('desactivar pide confirmación y luego llama al servicio', () => {
    servicio.cambiarEstadoMotivo.and.returnValue(of({ exitoso: true, datos: { id: 'm-1', estaActivo: false }, mensajeUsuario: 'Motivo desactivado.' }));
    comp.pedirCambioEstado(a);
    expect(servicio.cambiarEstadoMotivo).not.toHaveBeenCalled();
    comp.confirmarCambioEstado();
    expect(servicio.cambiarEstadoMotivo).toHaveBeenCalledWith('m-1', false);
    expect(toast.success).toHaveBeenCalledWith('Motivo desactivado.');
  });

  it('activar uno inactivo usa el aviso por defecto si el backend no manda mensaje', () => {
    servicio.cambiarEstadoMotivo.and.returnValue(of({ exitoso: true, datos: { id: 'm-2', estaActivo: true } }));
    comp.pedirCambioEstado(b);
    expect(comp.mensajeConfirmacion()).toContain('Activar');
    comp.confirmarCambioEstado();
    expect(servicio.cambiarEstadoMotivo).toHaveBeenCalledWith('m-2', true);
    expect(toast.success).toHaveBeenCalledWith('Estado actualizado.');
  });

  it('desactivar el último activo (409 CTG_003) muestra el message del backend', () => {
    servicio.cambiarEstadoMotivo.and.returnValue(throwError(() => errorApi(409, 'No se puede desactivar el último registro activo.')));
    comp.pedirCambioEstado(a);
    comp.confirmarCambioEstado();
    expect(toast.error).toHaveBeenCalledWith('No se puede desactivar el último registro activo.');
  });

  it('confirmar sin elemento pendiente no hace nada y cerrarForm respeta el guardado', () => {
    comp.confirmarCambioEstado();
    expect(servicio.cambiarEstadoMotivo).not.toHaveBeenCalled();
    comp.abrirCrear();
    comp.guardando.set(true);
    comp.cerrarForm();
    expect(comp.formAbierto()).toBeTrue();
    comp.guardando.set(false);
    comp.cerrarForm();
    expect(comp.formAbierto()).toBeFalse();
  });
});
