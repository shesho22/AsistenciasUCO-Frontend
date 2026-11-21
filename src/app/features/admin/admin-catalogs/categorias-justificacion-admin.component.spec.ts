import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CategoriasJustificacionAdminComponent } from './categorias-justificacion-admin.component';
import { AdminCatalogosService } from '../../../core/services/admin-catalogos.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { CategoriaJustificacionAdmin } from '../../../core/models/catalogo-admin.model';

function errorApi(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: { timestamp: 't', status, error: 'E', code: 'CTG', message, path: '/x', correlationId: null },
  });
}

describe('CategoriasJustificacionAdminComponent', () => {
  let fixture: ComponentFixture<CategoriasJustificacionAdminComponent>;
  let comp: CategoriasJustificacionAdminComponent;
  let servicio: jasmine.SpyObj<AdminCatalogosService>;
  let toast: jasmine.SpyObj<ToastService>;

  const a: CategoriaJustificacionAdmin = { id: 'c-1', codigo: 'MED', nombre: 'Médica', descripcion: 'Incapacidad', requiereSoporte: true, estaActivo: true };
  const b: CategoriaJustificacionAdmin = { id: 'c-2', codigo: 'CAL', nombre: 'Calamidad', descripcion: null, requiereSoporte: false, estaActivo: false };
  const host = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    servicio = jasmine.createSpyObj('AdminCatalogosService', [
      'listarCategorias', 'crearCategoria', 'editarCategoria', 'cambiarEstadoCategoria',
    ]);
    servicio.listarCategorias.and.returnValue(of({ exitoso: true, datos: [a, b], total: 2 }));
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    await TestBed.configureTestingModule({
      imports: [CategoriasJustificacionAdminComponent],
      providers: [
        { provide: AdminCatalogosService, useValue: servicio },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CategoriasJustificacionAdminComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra código, nombre, descripción, soporte y estado de cada categoría', () => {
    const fila = host().querySelector('[data-testid="categoria-fila-c-1"]')!.textContent!;
    expect(fila).toContain('MED');
    expect(fila).toContain('Médica');
    expect(fila).toContain('Incapacidad');
    expect(fila).toContain('Sí');
    expect(fila).toContain('Activo');
    const inactiva = host().querySelector('[data-testid="categoria-fila-c-2"]')!.textContent!;
    expect(inactiva).toContain('Inactivo');
    expect(inactiva).toContain('Activar');
  });

  it('muestra el estado vacío cuando no hay categorías', () => {
    servicio.listarCategorias.and.returnValue(of({ exitoso: true, datos: [], total: 0 }));
    comp.cargar();
    fixture.detectChanges();
    expect(host().textContent).toContain('No hay categorías de justificación registradas.');
  });

  it('ante un fallo de carga muestra el error y permite reintentar', () => {
    servicio.listarCategorias.and.returnValue(throwError(() => errorApi(500, 'Falla del servidor')));
    comp.cargar();
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="error-carga"]')).not.toBeNull();
    servicio.listarCategorias.and.returnValue(of({ exitoso: true, datos: [a], total: 1 }));
    comp.cargar();
    fixture.detectChanges();
    expect(host().querySelector('[data-testid="error-carga"]')).toBeNull();
    expect(host().textContent).toContain('Médica');
  });

  it('crear: envía código, nombre, descripción y soporte; muestra el mensaje del backend y recarga', () => {
    servicio.crearCategoria.and.returnValue(of({ exitoso: true, datos: { id: 'n' }, mensajeUsuario: 'Categoría creada.' }));
    comp.abrirCrear();
    comp.codigo.set('NUE');
    comp.nombre.set(' Nueva ');
    comp.descripcion.set('Texto');
    comp.requiereSoporte.set(true);
    expect(comp.formValido()).toBeTrue();
    comp.guardar();
    expect(servicio.crearCategoria).toHaveBeenCalledWith({ codigo: 'NUE', nombre: 'Nueva', descripcion: 'Texto', requiereSoporte: true });
    expect(toast.success).toHaveBeenCalledWith('Categoría creada.');
    expect(servicio.listarCategorias).toHaveBeenCalledTimes(2);
    expect(comp.formAbierto()).toBeFalse();
  });

  it('crear sin descripción no la envía y usa el aviso por defecto', () => {
    servicio.crearCategoria.and.returnValue(of({ exitoso: true, datos: { id: 'n' } }));
    comp.abrirCrear();
    comp.codigo.set('NUE');
    comp.nombre.set('Nueva');
    comp.guardar();
    expect(servicio.crearCategoria).toHaveBeenCalledWith({ codigo: 'NUE', nombre: 'Nueva', requiereSoporte: false });
    expect(toast.success).toHaveBeenCalledWith('Registro guardado.');
  });

  it('crear con código duplicado (409 CTG_006) muestra el message del backend en el formulario', () => {
    servicio.crearCategoria.and.returnValue(throwError(() => errorApi(409, 'Ya existe una categoría con ese código o nombre.')));
    comp.abrirCrear();
    comp.codigo.set('MED');
    comp.nombre.set('Otra');
    comp.guardar();
    fixture.detectChanges();
    expect(comp.formAbierto()).toBeTrue();
    expect(host().querySelector('[data-testid="categoria-error"]')!.textContent).toContain('Ya existe una categoría con ese código o nombre.');
    expect(comp.guardando()).toBeFalse();
  });

  it('valida formato en el cliente: código, nombre vacío y signos menor y mayor que', () => {
    comp.abrirCrear();
    comp.codigo.set('ab-1');
    expect(comp.errorCodigo()).not.toBe('');
    comp.codigo.set('AB_1');
    expect(comp.errorCodigo()).toBe('');
    comp.nombre.set('   ');
    expect(comp.formValido()).toBeFalse();
    comp.nombre.set('N');
    comp.descripcion.set('a<b');
    expect(comp.errorDescripcion()).not.toBe('');
    expect(comp.formValido()).toBeFalse();
    comp.descripcion.set('x'.repeat(251));
    expect(comp.errorDescripcion()).toContain('250');
    comp.descripcion.set('');
    comp.nombre.set('n'.repeat(51));
    expect(comp.errorNombre()).toContain('50');
    comp.guardar();
    expect(servicio.crearCategoria).not.toHaveBeenCalled();
  });

  it('editar: precarga, no envía el código y muestra el mensaje del backend', () => {
    servicio.editarCategoria.and.returnValue(of({ exitoso: true, datos: { id: 'c-1' }, mensajeUsuario: 'Categoría actualizada.' }));
    comp.abrirEditar(a);
    expect(comp.codigo()).toBe('MED');
    expect(comp.errorCodigo()).toBe('');
    comp.nombre.set('Médica 2');
    comp.descripcion.set('');
    comp.guardar();
    expect(servicio.editarCategoria).toHaveBeenCalledWith('c-1', { nombre: 'Médica 2', requiereSoporte: true });
    expect(toast.success).toHaveBeenCalledWith('Categoría actualizada.');
  });

  it('desactivar: pide confirmación y no llama hasta confirmar', () => {
    servicio.cambiarEstadoCategoria.and.returnValue(of({ exitoso: true, datos: { id: 'c-1', estaActivo: false }, mensajeUsuario: 'Categoría desactivada.' }));
    comp.pedirCambioEstado(a);
    expect(servicio.cambiarEstadoCategoria).not.toHaveBeenCalled();
    expect(comp.mensajeConfirmacion()).toContain('Desactivar');
    comp.confirmarCambioEstado();
    expect(servicio.cambiarEstadoCategoria).toHaveBeenCalledWith('c-1', false);
    expect(toast.success).toHaveBeenCalledWith('Categoría desactivada.');
  });

  it('activar una inactiva envía estaActivo true', () => {
    servicio.cambiarEstadoCategoria.and.returnValue(of({ exitoso: true, datos: { id: 'c-2', estaActivo: true } }));
    comp.pedirCambioEstado(b);
    expect(comp.mensajeConfirmacion()).toContain('Activar');
    comp.confirmarCambioEstado();
    expect(servicio.cambiarEstadoCategoria).toHaveBeenCalledWith('c-2', true);
    expect(toast.success).toHaveBeenCalledWith('Estado actualizado.');
  });

  it('desactivar la última activa (409 CTG_003) muestra el message del backend', () => {
    servicio.cambiarEstadoCategoria.and.returnValue(throwError(() => errorApi(409, 'No se puede desactivar el último registro activo.')));
    comp.pedirCambioEstado(a);
    comp.confirmarCambioEstado();
    expect(toast.error).toHaveBeenCalledWith('No se puede desactivar el último registro activo.');
  });

  it('cancelar la confirmación no cambia el estado', () => {
    comp.pedirCambioEstado(a);
    comp.porCambiar.set(null);
    comp.confirmarCambioEstado();
    expect(servicio.cambiarEstadoCategoria).not.toHaveBeenCalled();
  });

  it('cerrarForm cierra salvo mientras guarda', () => {
    comp.abrirCrear();
    comp.guardando.set(true);
    comp.cerrarForm();
    expect(comp.formAbierto()).toBeTrue();
    comp.guardando.set(false);
    comp.cerrarForm();
    expect(comp.formAbierto()).toBeFalse();
  });
});
