import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CambioParametroDto, ParametroAdminDto } from '../../../core/models/role-management.model';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { ParametrosRespaldoComponent } from './parametros-respaldo.component';

const param = (n: number, extra: Partial<ParametroAdminDto> = {}): ParametroAdminDto => ({
  id: `p-${n}`,
  grupo: 'ASISTENCIA',
  clave: `clave.${n}`,
  valor: String(n * 10),
  tipoDato: 'INT',
  esEditable: true,
  etiqueta: `Etiqueta ${n}`,
  fechaModificacion: '2026-11-01T10:00:00Z',
  ...extra,
});

const pagina = (elementos: ParametroAdminDto[], extra: Record<string, number> = {}) => ({
  exitoso: true,
  elementos,
  datos: elementos,
  numeroPagina: 1,
  tamanoPagina: 10,
  totalElementos: elementos.length,
  totalPaginas: 1,
  ...extra,
});

const errorApi = (status: number, code: string, message: string) =>
  new HttpErrorResponse({
    status,
    error: {
      timestamp: '2026-11-20T10:00:00Z',
      status,
      error: 'Error',
      code,
      message,
      path: '/api/v1/admin/parametros/p-1',
      correlationId: null,
    },
  });

describe('ParametrosRespaldoComponent', () => {
  let fixture: ComponentFixture<ParametrosRespaldoComponent>;
  let component: ParametrosRespaldoComponent;
  let admin: jasmine.SpyObj<AdminManagementService>;
  let toast: jasmine.SpyObj<ToastService>;
  const el = () => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(sel: string) => el().querySelector(sel) as T | null;
  const filas = () => el().querySelectorAll('[data-testid="fila-parametro"]');

  function escribir(selector: string, valor: string): void {
    const campo = q<HTMLInputElement>(selector)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    admin = jasmine.createSpyObj<AdminManagementService>('AdminManagementService', [
      'cargarParametros',
      'actualizarParametro',
      'consultarCambiosParametro',
    ]);
    admin.cargarParametros.and.returnValue(of(pagina([param(1), param(2, { esEditable: false })])));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info', 'warning']);
    await TestBed.configureTestingModule({
      imports: [ParametrosRespaldoComponent],
      providers: [
        { provide: AdminManagementService, useValue: admin },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ParametrosRespaldoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('lista', () => {
    it('carga la primera página al abrirse y muestra grupo, clave, valor, descripción y editable', () => {
      expect(admin.cargarParametros).toHaveBeenCalledWith({
        grupo: undefined,
        texto: undefined,
        soloEditables: undefined,
        pagina: 1,
        tamano: 10,
      });
      expect(filas().length).toBe(2);
      const primera = filas()[0].textContent!;
      expect(primera).toContain('ASISTENCIA');
      expect(primera).toContain('clave.1');
      expect(primera).toContain('10');
      expect(primera).toContain('Etiqueta 1');
      expect(primera).toContain('Sí');
      expect(filas()[1].textContent).toContain('No');
    });

    it('solo ofrece Editar en los parámetros editables, pero Historial en todos', () => {
      expect(el().querySelectorAll('[data-testid="btn-editar"]').length).toBe(1);
      expect(el().querySelectorAll('[data-testid="btn-historial"]').length).toBe(2);
    });

    it('buscar envía texto, grupo y solo editables desde la página 1', () => {
      component.pagina.set(3);
      escribir('[data-testid="filtro-texto"]', ' inasistencia ');
      escribir('[data-testid="filtro-grupo"]', 'ASISTENCIA');
      const check = q<HTMLInputElement>('[data-testid="filtro-editables"]')!;
      check.checked = true;
      check.dispatchEvent(new Event('change'));
      admin.cargarParametros.calls.reset();
      admin.cargarParametros.and.returnValue(of(pagina([param(1)])));
      q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      expect(admin.cargarParametros).toHaveBeenCalledWith({
        grupo: 'ASISTENCIA',
        texto: 'inasistencia',
        soloEditables: true,
        pagina: 1,
        tamano: 10,
      });
      expect(filas().length).toBe(1);
    });

    it('pagina y cambia el tamaño pidiendo la página al backend', () => {
      admin.cargarParametros.and.returnValue(of(pagina([param(1)], { totalElementos: 25, totalPaginas: 3 })));
      component.irAPagina(2);
      expect(admin.cargarParametros.calls.mostRecent().args[0]?.pagina).toBe(2);
      expect(component.totalElementos()).toBe(25);
      expect(component.totalPaginas()).toBe(3);
      component.cambiarTamano(20);
      expect(admin.cargarParametros.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ pagina: 1, tamano: 20 }));
    });

    it('lista vacía muestra el estado vacío', () => {
      admin.cargarParametros.and.returnValue(of(pagina([])));
      component.cargar();
      fixture.detectChanges();
      expect(el().textContent).toContain('Sin parámetros');
    });

    it('un error de carga se muestra como alerta y volver a cargar lo limpia', () => {
      admin.cargarParametros.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.cargar();
      fixture.detectChanges();
      expect(q('[data-testid="error-carga"]')).toBeTruthy();
      expect(filas().length).toBe(0);
      expect(el().textContent).not.toContain('Sin parámetros');
      admin.cargarParametros.and.returnValue(of(pagina([param(1)])));
      component.cargar();
      fixture.detectChanges();
      expect(q('[data-testid="error-carga"]')).toBeNull();
      expect(filas().length).toBe(1);
    });
  });

  describe('edición', () => {
    function abrirEdicion(): void {
      q<HTMLButtonElement>('[data-testid="btn-editar"]')!.click();
      fixture.detectChanges();
    }

    it('abre el modal con el valor actual y el guardado exige motivo de 10 a 500 caracteres', () => {
      abrirEdicion();
      expect(q('[data-testid="modal-edicion"]')).toBeTruthy();
      expect(q<HTMLInputElement>('[data-testid="input-valor"]')!.value).toBe('10');
      expect(q<HTMLInputElement>('[data-testid="input-valor"]')!.type).toBe('number');
      expect(q<HTMLButtonElement>('[data-testid="btn-guardar"]')!.disabled).toBeTrue();
      escribir('[data-testid="input-motivo"]', 'corto');
      expect(q<HTMLButtonElement>('[data-testid="btn-guardar"]')!.disabled).toBeTrue();
      escribir('[data-testid="input-motivo"]', 'Ajuste aprobado por el comité');
      expect(q<HTMLButtonElement>('[data-testid="btn-guardar"]')!.disabled).toBeFalse();
      escribir('[data-testid="input-motivo"]', 'x'.repeat(501));
      expect(q<HTMLButtonElement>('[data-testid="btn-guardar"]')!.disabled).toBeTrue();
    });

    it('guardar llama al PUT con valor, motivo y fecha esperada; muestra el mensaje del backend y recarga', () => {
      admin.actualizarParametro.and.returnValue(
        of({ exitoso: true, mensajeUsuario: 'Parámetro guardado por el backend', datos: undefined as never })
      );
      abrirEdicion();
      escribir('[data-testid="input-valor"]', '25');
      escribir('[data-testid="input-motivo"]', 'Ajuste aprobado por el comité');
      admin.cargarParametros.calls.reset();
      q<HTMLButtonElement>('[data-testid="btn-guardar"]')!.click();
      fixture.detectChanges();
      expect(admin.actualizarParametro).toHaveBeenCalledWith('p-1', {
        valor: '25',
        fechaModificacionEsperada: '2026-11-01T10:00:00Z',
        motivo: 'Ajuste aprobado por el comité',
      });
      expect(toast.success).toHaveBeenCalledWith('Parámetro guardado por el backend');
      expect(admin.cargarParametros).toHaveBeenCalledTimes(1);
      expect(q('[data-testid="modal-edicion"]')).toBeNull();
    });

    it('si el backend no envía mensaje usa el texto del catálogo', () => {
      admin.actualizarParametro.and.returnValue(of({ exitoso: true, datos: undefined as never }));
      abrirEdicion();
      escribir('[data-testid="input-motivo"]', 'Ajuste aprobado por el comité');
      component.guardar(component.edicion()!);
      expect(toast.success).toHaveBeenCalledWith('Parámetro actualizado exitosamente.');
    });

    it('un error muestra el mensaje del backend dentro del modal y lo deja abierto', () => {
      admin.actualizarParametro.and.returnValue(
        throwError(() => errorApi(422, 'VALIDATION_ERROR', 'El valor excede el máximo permitido.'))
      );
      abrirEdicion();
      escribir('[data-testid="input-motivo"]', 'Ajuste aprobado por el comité');
      admin.cargarParametros.calls.reset();
      q<HTMLButtonElement>('[data-testid="btn-guardar"]')!.click();
      fixture.detectChanges();
      expect(q('[data-testid="error-edicion"]')!.textContent).toContain('El valor excede el máximo permitido.');
      expect(q('[data-testid="modal-edicion"]')).toBeTruthy();
      expect(toast.success).not.toHaveBeenCalled();
      expect(admin.cargarParametros).not.toHaveBeenCalled();
      expect(component.guardando()).toBeFalse();
    });

    it('un conflicto 409 recarga la lista para traer la versión vigente', () => {
      admin.actualizarParametro.and.returnValue(
        throwError(() => errorApi(409, 'CONFLICT', 'El parámetro cambió mientras lo editaba.'))
      );
      abrirEdicion();
      escribir('[data-testid="input-motivo"]', 'Ajuste aprobado por el comité');
      admin.cargarParametros.calls.reset();
      component.guardar(component.edicion()!);
      expect(component.errorEdicion()).toBe('El parámetro cambió mientras lo editaba.');
      expect(admin.cargarParametros).toHaveBeenCalledTimes(1);
    });

    it('booleanos y valores permitidos se editan con lista cerrada', () => {
      component.abrirEdicion(param(3, { tipoDato: 'BOOLEAN', valor: 'true' }));
      expect(component.opcionesPermitidas()).toEqual(['true', 'false']);
      component.abrirEdicion(param(4, { tipoDato: 'TEXTO', valoresPermitidos: 'A, B ,,C' }));
      expect(component.opcionesPermitidas()).toEqual(['A', 'B', 'C']);
      component.abrirEdicion(param(5, { tipoDato: 'TEXTO', valoresPermitidos: ['X', 'Y'] }));
      expect(component.opcionesPermitidas()).toEqual(['X', 'Y']);
      component.abrirEdicion(param(6, { tipoDato: 'TEXTO', valoresPermitidos: null }));
      expect(component.opcionesPermitidas()).toEqual([]);
      fixture.detectChanges();
      expect(q<HTMLInputElement>('[data-testid="input-valor"]')!.type).toBe('text');
      component.abrirEdicion(param(3, { tipoDato: 'BOOLEAN', valor: 'true' }));
      fixture.detectChanges();
      const select = q<HTMLSelectElement>('select[data-testid="input-valor"]')!;
      select.value = 'false';
      select.dispatchEvent(new Event('change'));
      expect(component.valorEfectivo()).toBe('false');
    });

    it('cancelar cierra sin llamar al backend y no cierra mientras guarda', () => {
      abrirEdicion();
      component.cerrarEdicion();
      expect(component.edicion()).toBeNull();
      expect(admin.actualizarParametro).not.toHaveBeenCalled();
      component.abrirEdicion(param(1));
      component.guardando.set(true);
      component.cerrarEdicion();
      expect(component.edicion()).not.toBeNull();
      component.guardar(component.edicion()!);
      expect(admin.actualizarParametro).not.toHaveBeenCalled();
    });
  });

  describe('historial de cambios', () => {
    const cambio = (n: number): CambioParametroDto => ({
      id: `c-${n}`,
      valorAnterior: '20',
      valorNuevo: '25',
      motivo: 'Ajuste de política',
      nombreEjecutor: 'Ana Admin',
      fechaCambioUtc: '2026-11-01T10:00:00Z',
    });
    const respuesta = (elementos: CambioParametroDto[], extra: Record<string, number> = {}) => ({
      exitoso: true,
      elementos,
      numeroPagina: 1,
      tamanoPagina: 10,
      totalElementos: elementos.length,
      totalPaginas: 1,
      ...extra,
    });

    function abrirHistorial(): void {
      q<HTMLButtonElement>('[data-testid="btn-historial"]')!.click();
      fixture.detectChanges();
    }

    it('consulta los cambios del parámetro y los lista', () => {
      admin.consultarCambiosParametro.and.returnValue(of(respuesta([cambio(1), cambio(2)])));
      abrirHistorial();
      expect(admin.consultarCambiosParametro).toHaveBeenCalledWith('p-1', 1, 10);
      expect(q('[data-testid="modal-historial"]')).toBeTruthy();
      const rows = el().querySelectorAll('[data-testid="fila-cambio"]');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('01/11/2026 10:00');
      expect(rows[0].textContent).toContain('Ajuste de política');
      expect(rows[0].textContent).toContain('Ana Admin');
    });

    it('muestra guion en los campos nulos y estado vacío sin cambios', () => {
      admin.consultarCambiosParametro.and.returnValue(
        of(respuesta([{ ...cambio(1), valorAnterior: null, motivo: null, nombreEjecutor: null }]))
      );
      abrirHistorial();
      expect(el().querySelector('[data-testid="fila-cambio"]')!.textContent).toContain('—');
      admin.consultarCambiosParametro.and.returnValue(of(respuesta([])));
      component.cargarHistorial(1);
      fixture.detectChanges();
      expect(el().textContent).toContain('Sin cambios registrados');
    });

    it('pagina el historial cuando hay más de una página', () => {
      admin.consultarCambiosParametro.and.returnValue(of(respuesta([cambio(1)], { totalElementos: 15, totalPaginas: 2 })));
      abrirHistorial();
      expect(el().querySelectorAll('app-pagination').length).toBe(2);
      admin.consultarCambiosParametro.and.returnValue(
        of(respuesta([cambio(2)], { numeroPagina: 2, totalElementos: 15, totalPaginas: 2 }))
      );
      component.cargarHistorial(2);
      expect(admin.consultarCambiosParametro.calls.mostRecent().args).toEqual(['p-1', 2, 10]);
      expect(component.historialPagina()).toBe(2);
    });

    it('un error al consultar el historial se muestra como alerta y se recupera al reintentar', () => {
      admin.consultarCambiosParametro.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      abrirHistorial();
      expect(q('[data-testid="error-carga"]')).toBeTruthy();
      admin.consultarCambiosParametro.and.returnValue(of(respuesta([cambio(1)])));
      component.cargarHistorial(1);
      fixture.detectChanges();
      expect(q('[data-testid="error-carga"]')).toBeNull();
    });

    it('cerrar el historial lo oculta y no consulta sin parámetro abierto', () => {
      admin.consultarCambiosParametro.and.returnValue(of(respuesta([])));
      abrirHistorial();
      component.cerrarHistorial();
      fixture.detectChanges();
      expect(q('[data-testid="modal-historial"]')).toBeNull();
      admin.consultarCambiosParametro.calls.reset();
      component.cargarHistorial(1);
      expect(admin.consultarCambiosParametro).not.toHaveBeenCalled();
    });
  });
});
