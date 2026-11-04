import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AdminCatalogsComponent } from './admin-catalogs.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { TipoProgramaItem } from '../../../core/models/role-management.model';
import { CatalogService } from '../../../core/services/catalog.service';

describe('AdminCatalogsComponent - tipos de programa (HU154)', () => {
  let fixture: ComponentFixture<AdminCatalogsComponent>;
  let component: AdminCatalogsComponent;
  let service: jasmine.SpyObj<AdminManagementService> & { tiposPrograma: any };
  let toast: jasmine.SpyObj<ToastService>;

  const pre: TipoProgramaItem = { id: 't-1', codigo: 'PRE', nombre: 'pregrado', activo: true };
  const pos: TipoProgramaItem = { id: 't-2', codigo: 'POS', nombre: 'postgrado', activo: false };

  beforeEach(async () => {
    service = Object.assign(
      jasmine.createSpyObj('AdminManagementService', [
        'cargarTiposPrograma',
        'crearTipoPrograma',
        'actualizarTipoPrograma',
        'cambiarEstadoTipoPrograma',
      ]),
      { tiposPrograma: signal<TipoProgramaItem[]>([pre, pos]).asReadonly() }
    );
    service.cargarTiposPrograma.and.returnValue(of({ exitoso: true, datos: [pre, pos] }));
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [AdminCatalogsComponent],
      providers: [
        { provide: AdminManagementService, useValue: service },
        { provide: ToastService, useValue: toast },
        // HU153: la sección de tipos de documento tiene su propia spec.
        { provide: CatalogService, useValue: { getIdentityDocumentTypes: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCatalogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga el catalogo al iniciar y lo muestra con codigo, nombre y estado', () => {
    expect(service.cargarTiposPrograma).toHaveBeenCalled();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('PRE');
    expect(texto).toContain('pregrado');
    expect(texto).toContain('POS');
    expect(texto).toContain('Inactivo');
  });

  it('muestra el mensaje del backend si la carga falla', () => {
    service.cargarTiposPrograma.and.returnValue(throwError(() => ({ error: { message: 'Sin permisos' } })));

    component.ngOnInit();

    expect(toast.error).toHaveBeenCalledWith('Sin permisos');
  });

  it('usa un mensaje de respaldo si el error de carga no trae mensaje', () => {
    service.cargarTiposPrograma.and.returnValue(throwError(() => ({})));

    component.ngOnInit();

    expect(toast.error).toHaveBeenCalledWith('No fue posible cargar los tipos de programa.');
  });

  it('crear envia codigo y nombre, informa el exito y cierra el formulario', () => {
    service.crearTipoPrograma.and.returnValue(
      of({ exitoso: true, datos: { id: 't-3', codigo: 'ESP', nombre: 'especializacion', activo: true } })
    );
    component.abrirNuevo();
    component.form.codigo = 'esp';
    component.form.nombre = 'especializacion';

    component.guardar();

    expect(service.crearTipoPrograma).toHaveBeenCalledWith({ codigo: 'esp', nombre: 'especializacion' });
    expect(toast.success).toHaveBeenCalledWith('Tipo de programa registrado correctamente.');
    expect(component.formularioAbierto()).toBeFalse();
    expect(component.guardando()).toBeFalse();
  });

  it('crear con conflicto muestra el mensaje del backend y mantiene el formulario abierto', () => {
    service.crearTipoPrograma.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'Ya existe un Tipo de Programa registrado con este codigo.' } }))
    );
    component.abrirNuevo();
    component.form.codigo = 'PRE';
    component.form.nombre = 'otro';

    component.guardar();

    expect(toast.error).toHaveBeenCalledWith('Ya existe un Tipo de Programa registrado con este codigo.');
    expect(component.formularioAbierto()).toBeTrue();
    expect(component.guardando()).toBeFalse();
  });

  it('crear con respuesta no exitosa muestra mensajeUsuario del backend', () => {
    service.crearTipoPrograma.and.returnValue(of({ exitoso: false, mensajeUsuario: 'Dato invalido', datos: null as any }));
    component.abrirNuevo();
    component.form.codigo = 'ESP';
    component.form.nombre = 'especializacion';

    component.guardar();

    expect(toast.error).toHaveBeenCalledWith('Dato invalido');
    expect(component.formularioAbierto()).toBeTrue();
  });

  it('no envia si el formulario es invalido o ya hay una peticion en curso', () => {
    component.abrirNuevo();
    component.form.codigo = 'AB';
    component.form.nombre = 'x';
    component.guardar();
    expect(service.crearTipoPrograma).not.toHaveBeenCalled();

    component.form.codigo = 'ESP';
    component.form.nombre = 'especializacion';
    component.guardando.set(true);
    component.guardar();
    expect(service.crearTipoPrograma).not.toHaveBeenCalled();
  });

  it('editar abre el formulario con el codigo bloqueado y solo envia el nombre', () => {
    service.actualizarTipoPrograma.and.returnValue(of({ exitoso: true, datos: { ...pre, nombre: 'pregrado universitario' } }));

    component.abrirEdicion(pre);
    expect(component.edicion()).toEqual(pre);
    expect(component.form.codigo).toBe('PRE');
    component.form.nombre = 'pregrado universitario';

    component.guardar();

    expect(service.actualizarTipoPrograma).toHaveBeenCalledWith('t-1', { nombre: 'pregrado universitario' });
    expect(toast.success).toHaveBeenCalledWith('Tipo de programa actualizado correctamente.');
    expect(component.formularioAbierto()).toBeFalse();
  });

  it('editar con error muestra el mensaje del backend y conserva el formulario', () => {
    service.actualizarTipoPrograma.and.returnValue(throwError(() => ({ error: { message: 'Nombre duplicado' } })));
    component.abrirEdicion(pre);
    component.form.nombre = 'postgrado';

    component.guardar();

    expect(toast.error).toHaveBeenCalledWith('Nombre duplicado');
    expect(component.formularioAbierto()).toBeTrue();
  });

  it('alternar estado envia el estado deseado contrario al actual', () => {
    service.cambiarEstadoTipoPrograma.and.returnValue(of({ exitoso: true, datos: { ...pre, activo: false } }));

    component.alternarEstado(pre);

    expect(service.cambiarEstadoTipoPrograma).toHaveBeenCalledWith('t-1', false);
    expect(toast.success).toHaveBeenCalledWith('Tipo de programa desactivado correctamente.');
    expect(component.cambiandoEstadoId()).toBeNull();
  });

  it('alternar estado de un tipo inactivo lo activa', () => {
    service.cambiarEstadoTipoPrograma.and.returnValue(of({ exitoso: true, datos: { ...pos, activo: true } }));

    component.alternarEstado(pos);

    expect(service.cambiarEstadoTipoPrograma).toHaveBeenCalledWith('t-2', true);
    expect(toast.success).toHaveBeenCalledWith('Tipo de programa activado correctamente.');
  });

  it('alternar estado con error muestra el mensaje del backend', () => {
    service.cambiarEstadoTipoPrograma.and.returnValue(throwError(() => ({ error: { message: 'No existe' } })));

    component.alternarEstado(pre);

    expect(toast.error).toHaveBeenCalledWith('No existe');
    expect(component.cambiandoEstadoId()).toBeNull();
  });

  it('alternar estado con respuesta no exitosa informa el error', () => {
    service.cambiarEstadoTipoPrograma.and.returnValue(of({ exitoso: false, mensajeUsuario: 'Rechazado', datos: null as any }));

    component.alternarEstado(pre);

    expect(toast.error).toHaveBeenCalledWith('Rechazado');
  });

  it('cancelar cierra el formulario', () => {
    component.abrirNuevo();
    expect(component.formularioAbierto()).toBeTrue();

    component.cancelar();

    expect(component.formularioAbierto()).toBeFalse();
  });
});
