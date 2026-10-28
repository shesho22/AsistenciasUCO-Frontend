import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CoordinatorDocentesComponent } from './coordinator-docentes.component';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AccountAccessService } from '../../../core/services/account-access.service';
import { DocentePrograma, DocenteCandidato } from '../../../core/models/docente-programa.model';

describe('CoordinatorDocentesComponent', () => {
  let fixture: ComponentFixture<CoordinatorDocentesComponent>;
  let component: CoordinatorDocentesComponent;
  let docentesSignal: ReturnType<typeof signal<DocentePrograma[]>>;
  let totalSignal: ReturnType<typeof signal<number>>;
  let coordService: {
    docentes: ReturnType<typeof signal<DocentePrograma[]>>;
    totalDocentes: ReturnType<typeof signal<number>>;
    getDocentesPrograma: jasmine.Spy;
    getCandidatosDocente: jasmine.Spy;
    vincularDocente: jasmine.Spy;
    actualizarDocente: jasmine.Spy;
    cambiarEstadoDocente: jasmine.Spy;
    getFichaDocente: jasmine.Spy;
    getResumenDocentes: jasmine.Spy;
    getTiposVinculacion: jasmine.Spy;
  };
  let catalogService: jasmine.SpyObj<CatalogService>;
  let toast: jasmine.SpyObj<ToastService>;
  let accountAccess: jasmine.SpyObj<AccountAccessService>;

  const fila = (id: string, nombre: string, activo = true): DocentePrograma => ({
    idDocentePrograma: `dp-${id}`,
    idDocente: id,
    idUsuario: `u-${id}`,
    codigoTipoIdentificacion: 'CC',
    numeroIdentificacion: 1017000000 + Number(id.replace(/\D/g, '') || 0),
    primerNombre: nombre,
    segundoNombre: null,
    primerApellido: 'Prueba',
    segundoApellido: null,
    nombreCompleto: `${nombre} Prueba`,
    correo: `${nombre.toLowerCase()}@uco.edu.co`,
    idTipoVinculacion: 'tv-1',
    codigoTipoVinculacion: 'CAT',
    nombreTipoVinculacion: 'Cátedra',
    fechaVinculacionUtc: '2026-10-22T10:00:00Z',
    totalGruposPrograma: 2,
    estaActivo: activo,
  });

  function crear(): void {
    fixture = TestBed.createComponent(CoordinatorDocentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    docentesSignal = signal<DocentePrograma[]>([]);
    totalSignal = signal(0);
    coordService = {
      docentes: docentesSignal,
      totalDocentes: totalSignal,
      getDocentesPrograma: jasmine.createSpy('getDocentesPrograma').and.callFake(() => {
        docentesSignal.set([fila('doc-1', 'Roberto'), fila('doc-2', 'Luisa', false)]);
        totalSignal.set(12);
        return of({ exitoso: true, datos: docentesSignal(), total: 12 });
      }),
      getCandidatosDocente: jasmine.createSpy('getCandidatosDocente').and.returnValue(
        of({ exitoso: true, total: 1, datos: [{ idDocente: 'doc-9', idUsuario: 'u-9', codigoTipoIdentificacion: 'CC', numeroIdentificacion: 5, nombreCompleto: 'Maria Rostagno' } as DocenteCandidato] })
      ),
      vincularDocente: jasmine.createSpy('vincularDocente').and.returnValue(of({ exitoso: true, mensajeUsuario: 'ok', datos: fila('doc-3', 'Nuevo') })),
      actualizarDocente: jasmine.createSpy('actualizarDocente').and.returnValue(of({ exitoso: true, mensajeUsuario: 'Docente actualizado.', datos: fila('doc-1', 'Roberto') })),
      cambiarEstadoDocente: jasmine.createSpy('cambiarEstadoDocente').and.returnValue(of({ exitoso: true, mensajeUsuario: 'Estado del docente actualizado.', datos: fila('doc-1', 'Roberto', false) })),
      getFichaDocente: jasmine.createSpy('getFichaDocente').and.returnValue(
        of({ exitoso: true, datos: { docente: fila('doc-1', 'Roberto'), resumen: { totalGrupos: 0, totalPeriodos: 0, gruposVigentes: 0, estudiantesActivosVigentes: 0 }, historial: [], totalHistorial: 0 } })
      ),
      getResumenDocentes: jasmine.createSpy('getResumenDocentes').and.returnValue(
        of({
          exitoso: true,
          datos: {
            totalDocentes: 3,
            totalActivos: 2,
            totalInactivos: 1,
            porTipoVinculacion: [
              { idTipoVinculacion: 'tv-1', codigoTipoVinculacion: 'CAT', nombreTipoVinculacion: 'Cátedra', totalActivos: 2, totalInactivos: 1, total: 3 },
            ],
          },
        })
      ),
      getTiposVinculacion: jasmine.createSpy('getTiposVinculacion').and.returnValue(of([{ id: 'tv-1', codigo: 'CAT', nombre: 'Cátedra' }])),
    };
    catalogService = jasmine.createSpyObj<CatalogService>('CatalogService', ['getTiposIdentificacion']);
    catalogService.getTiposIdentificacion.and.returnValue(
      of({ exitoso: true, datos: [{ id: 'tipo-1', tipoIdentificacion: 'CC', nombre: 'Cédula' }] })
    );
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    accountAccess = jasmine.createSpyObj<AccountAccessService>('AccountAccessService', ['consult', 'reconcile']);
    accountAccess.consult.and.returnValue(
      of({ exitoso: true, datos: { usuario: 'u-3', estado: 'PENDIENTE_SINCRONIZACION', detalle: 'DOCENTE: perfil por asignar', roles: [] } })
    );

    TestBed.configureTestingModule({
      imports: [CoordinatorDocentesComponent],
      providers: [
        { provide: CoordinatorManagementService, useValue: coordService },
        { provide: CatalogService, useValue: catalogService },
        { provide: ToastService, useValue: toast },
        { provide: AccountAccessService, useValue: accountAccess },
      ],
    });
  });

  it('T-FE-02: carga el directorio una sola vez tras el debounce y los catálogos', fakeAsync(() => {
    crear();
    expect(coordService.getDocentesPrograma).not.toHaveBeenCalled(); // aún dentro del debounce
    tick(300);
    fixture.detectChanges();

    expect(coordService.getDocentesPrograma).toHaveBeenCalledTimes(1);
    expect(coordService.getDocentesPrograma.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ pagina: 1, tamano: 10 })
    );
    expect(coordService.getTiposVinculacion).toHaveBeenCalled();
    expect(catalogService.getTiposIdentificacion).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Roberto Prueba');
  }));

  it('T-FE-02: la búsqueda se filtra en el servidor con una sola llamada por término (debounce 300 ms)', fakeAsync(() => {
    crear();
    tick(300);
    coordService.getDocentesPrograma.calls.reset();

    component.onBusquedaChange('r');
    fixture.detectChanges();
    tick(100);
    component.onBusquedaChange('ro');
    fixture.detectChanges();
    tick(100);
    component.onBusquedaChange('ros');
    fixture.detectChanges();
    tick(300);

    expect(coordService.getDocentesPrograma).toHaveBeenCalledTimes(1);
    expect(coordService.getDocentesPrograma.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ busqueda: 'ros', pagina: 1 })
    );
  }));

  it('el filtro de estado se envía como estaActivo y reinicia la página', fakeAsync(() => {
    crear();
    tick(300);
    component.onPageChange(3);
    fixture.detectChanges();
    tick(300);
    coordService.getDocentesPrograma.calls.reset();

    component.onEstadoChange('INACTIVO');
    fixture.detectChanges();
    tick(300);

    const filtro = coordService.getDocentesPrograma.calls.mostRecent().args[0];
    expect(filtro.estaActivo).toBeFalse();
    expect(filtro.pagina).toBe(1);
  }));

  it('el cambio de página consulta la página pedida', fakeAsync(() => {
    crear();
    tick(300);
    coordService.getDocentesPrograma.calls.reset();

    component.onPageChange(2);
    fixture.detectChanges();
    tick(300);

    expect(coordService.getDocentesPrograma.calls.mostRecent().args[0].pagina).toBe(2);
  }));

  it('un error del directorio muestra el mensaje del backend y deja de cargar', fakeAsync(() => {
    coordService.getDocentesPrograma.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'Sin permiso' } }))
    );
    crear();
    tick(300);

    expect(toast.error).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  }));

  it('el directorio vacío muestra el estado vacío', fakeAsync(() => {
    coordService.getDocentesPrograma.and.callFake(() => {
      docentesSignal.set([]);
      totalSignal.set(0);
      return of({ exitoso: true, datos: [], total: 0 });
    });
    crear();
    tick(300);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se encontraron docentes');
  }));

  it('HU093: el botón de estado está habilitado y solo pide confirmación; no llama al servicio todavía', fakeAsync(() => {
    crear();
    tick(300);
    fixture.detectChanges();

    const boton = fixture.debugElement.query(By.css('[data-testid="toggle-estado"]'));
    expect(boton).toBeTruthy();
    expect((boton.nativeElement as HTMLButtonElement).disabled).toBeFalse();

    (boton.nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.docentePendienteEstado()).not.toBeNull();
    expect(coordService.cambiarEstadoDocente).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="confirmar-estado"]')).toBeTruthy();
  }));

  it('HU093: confirmar inactivación llama al servicio con el nuevo estado y recarga desde el servidor', fakeAsync(() => {
    crear();
    tick(300);
    const activo = fila('doc-1', 'Roberto', true);
    component.solicitarCambioEstado(activo);
    coordService.getDocentesPrograma.calls.reset();

    component.confirmarCambioEstado();
    fixture.detectChanges();
    tick(300);

    expect(coordService.cambiarEstadoDocente).toHaveBeenCalledWith('doc-1', false);
    expect(toast.success).toHaveBeenCalledWith('Estado del docente actualizado.');
    expect(component.docentePendienteEstado()).toBeNull();
    expect(coordService.getDocentesPrograma).toHaveBeenCalledTimes(1);
  }));

  it('HU093: confirmar sobre un docente inactivo lo reactiva (estaActivo=true)', fakeAsync(() => {
    crear();
    tick(300);
    component.solicitarCambioEstado(fila('doc-2', 'Luisa', false));

    component.confirmarCambioEstado();
    tick(300);

    expect(coordService.cambiarEstadoDocente).toHaveBeenCalledWith('doc-2', true);
  }));

  it('HU093: cancelar la confirmación no llama al servicio', fakeAsync(() => {
    crear();
    tick(300);
    component.solicitarCambioEstado(fila('doc-1', 'Roberto'));

    component.cancelarCambioEstado();

    expect(component.docentePendienteEstado()).toBeNull();
    expect(coordService.cambiarEstadoDocente).not.toHaveBeenCalled();
  }));

  it('HU093: confirmar sin docente pendiente no hace nada', fakeAsync(() => {
    crear();
    tick(300);

    component.confirmarCambioEstado();

    expect(coordService.cambiarEstadoDocente).not.toHaveBeenCalled();
  }));

  it('HU093: un error del backend se muestra y la lista no se modifica localmente', fakeAsync(() => {
    coordService.cambiarEstadoDocente.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 404,
        error: {
          timestamp: '2026-10-22T10:00:00Z', status: 404, error: 'Not Found', code: 'ERR_DOCENTE_NO_VINCULADO_PROGRAMA',
          message: 'El docente no está vinculado a este programa.', path: '/api/v1/coordinador/docentes/doc-1/estado', correlationId: null,
        },
      }))
    );
    crear();
    tick(300);
    component.solicitarCambioEstado(fila('doc-1', 'Roberto'));
    coordService.getDocentesPrograma.calls.reset();

    component.confirmarCambioEstado();
    tick(300);

    expect(toast.error).toHaveBeenCalledWith('El docente no está vinculado a este programa.');
    expect(component.docentePendienteEstado()).toBeNull();
    expect(coordService.getDocentesPrograma).not.toHaveBeenCalled();
  }));

  it('abre y cierra el formulario de vinculación', fakeAsync(() => {
    crear();
    tick(300);

    component.abrirFormulario();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-coordinator-docente-form-modal')).toBeTruthy();

    component.cerrarFormulario();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-coordinator-docente-form-modal')).toBeNull();
  }));

  it('T-FE-04: buscarCandidatos exige 3 caracteres y consulta al backend', fakeAsync(() => {
    crear();
    tick(300);

    component.buscarCandidatos('ab');
    expect(coordService.getCandidatosDocente).not.toHaveBeenCalled();
    expect(component.candidatos()).toEqual([]);

    component.buscarCandidatos('ros');
    expect(coordService.getCandidatosDocente).toHaveBeenCalledWith('ros');
    expect(component.candidatos().length).toBe(1);
  }));

  it('buscarCandidatos con error muestra el mensaje y limpia la lista', fakeAsync(() => {
    coordService.getCandidatosDocente.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'corto' } }))
    );
    crear();
    tick(300);

    component.buscarCandidatos('ros');

    expect(toast.error).toHaveBeenCalled();
    expect(component.candidatos()).toEqual([]);
  }));

  it('guardarNuevo vincula, recarga desde el servidor y NO inserta localmente', fakeAsync(() => {
    crear();
    tick(300);
    component.abrirFormulario();
    coordService.getDocentesPrograma.calls.reset();
    const payload = {
      idTipoIdentificacion: 'tipo-1', numeroIdentificacion: '1017555444', primerNombre: 'Jorge', primerApellido: 'Henao',
      correo: 'jorge@uco.edu.co', password: 'Clave1234!', idTipoVinculacion: 'tv-1',
    };

    component.guardarNuevo(payload);
    fixture.detectChanges();
    tick(300);

    expect(coordService.vincularDocente).toHaveBeenCalledWith(payload);
    expect(toast.success).toHaveBeenCalled();
    expect(component.formularioAbierto()).toBeFalse();
    expect(coordService.getDocentesPrograma).toHaveBeenCalledTimes(1); // recarga del servidor
  }));

  it('tras vincular un docente nuevo muestra el estado de acceso real de su cuenta y no declara éxito de acceso', fakeAsync(() => {
    crear();
    tick(300);
    expect(fixture.nativeElement.querySelector('[data-testid="account-access-status"]')).toBeNull();

    component.guardarNuevo({
      idTipoIdentificacion: 'tipo-1', numeroIdentificacion: '1017555444', primerNombre: 'Jorge', primerApellido: 'Henao',
      correo: 'jorge@uco.edu.co', password: 'Clave1234!', idTipoVinculacion: 'tv-1',
    });
    fixture.detectChanges();
    fixture.detectChanges();
    tick(300);

    expect(accountAccess.consult).toHaveBeenCalledOnceWith('jorge@uco.edu.co');
    const panel = fixture.nativeElement.querySelector('[data-testid="account-access-status"]') as HTMLElement;
    expect(panel.textContent).toContain('PENDIENTE DE SINCRONIZACIÓN');
    expect(panel.textContent).not.toContain('ACTIVA');
  }));

  it('vincular un docente existente no consulta el acceso de ninguna cuenta (no se crea cuenta)', fakeAsync(() => {
    crear();
    tick(300);

    component.guardarExistente({ idDocente: 'doc-9', idTipoVinculacion: 'tv-1' });
    fixture.detectChanges();
    tick(300);

    expect(accountAccess.consult).not.toHaveBeenCalled();
  }));

  it('T-FE-04: guardarExistente envía idDocente e idTipoVinculacion', fakeAsync(() => {
    crear();
    tick(300);

    component.guardarExistente({ idDocente: 'doc-9', idTipoVinculacion: 'tv-1' });

    expect(coordService.vincularDocente).toHaveBeenCalledWith({ idDocente: 'doc-9', idTipoVinculacion: 'tv-1' });
    tick(300); // vaciar el debounce de la recarga posterior al vinculo
  }));

  it('T-FE-06: el 409 se muestra tal cual lo devuelve el backend y el formulario sigue abierto', fakeAsync(() => {
    coordService.vincularDocente.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 409,
        error: {
          timestamp: '2026-10-22T10:00:00Z', status: 409, error: 'Conflict', code: 'ERR_DOCENTE_YA_VINCULADO_PROGRAMA',
          message: 'El docente ya está vinculado a este programa.', path: '/api/v1/coordinador/docentes', correlationId: null,
        },
      }))
    );
    crear();
    tick(300);
    component.abrirFormulario();

    component.guardarExistente({ idDocente: 'doc-1', idTipoVinculacion: 'tv-1' });

    expect(toast.error).toHaveBeenCalledWith('El docente ya está vinculado a este programa.');
    expect(component.formularioAbierto()).toBeTrue();
  }));

  it('HU092: abrirEdicion/cerrarEdicion controlan el modal de edición', fakeAsync(() => {
    crear();
    tick(300);
    const docente = fila('doc-1', 'Roberto');

    component.abrirEdicion(docente);
    fixture.detectChanges();
    expect(component.docenteEnEdicion()).toBe(docente);
    expect(fixture.nativeElement.querySelector('app-coordinator-docente-edit-modal')).toBeTruthy();

    component.cerrarEdicion();
    fixture.detectChanges();
    expect(component.docenteEnEdicion()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-coordinator-docente-edit-modal')).toBeNull();
  }));

  it('HU092: guardarEdicion actualiza, avisa, cierra y recarga desde el servidor (sin actualización optimista)', fakeAsync(() => {
    crear();
    tick(300);
    component.abrirEdicion(fila('doc-1', 'Roberto'));
    coordService.getDocentesPrograma.calls.reset();

    component.guardarEdicion({ idTipoVinculacion: 'tv-2', primerNombre: 'Nuevo' });
    fixture.detectChanges();
    tick(300);

    expect(coordService.actualizarDocente).toHaveBeenCalledWith('doc-1', { idTipoVinculacion: 'tv-2', primerNombre: 'Nuevo' });
    expect(toast.success).toHaveBeenCalledWith('Docente actualizado.');
    expect(component.docenteEnEdicion()).toBeNull();
    expect(coordService.getDocentesPrograma).toHaveBeenCalledTimes(1);
  }));

  it('HU092: un error al actualizar muestra el mensaje y mantiene el modal abierto', fakeAsync(() => {
    coordService.actualizarDocente.and.returnValue(
      throwError(() => new HttpErrorResponse({
        status: 404,
        error: {
          timestamp: '2026-10-22T10:00:00Z', status: 404, error: 'Not Found', code: 'ERR_DOCENTE_NO_VINCULADO_PROGRAMA',
          message: 'El docente no está vinculado a este programa.', path: '/api/v1/coordinador/docentes/doc-1', correlationId: null,
        },
      }))
    );
    crear();
    tick(300);
    component.abrirEdicion(fila('doc-1', 'Roberto'));

    component.guardarEdicion({ primerNombre: 'Nuevo' });

    expect(toast.error).toHaveBeenCalledWith('El docente no está vinculado a este programa.');
    expect(component.docenteEnEdicion()).not.toBeNull();
  }));

  it('HU092: guardarEdicion sin docente seleccionado no llama al servicio', fakeAsync(() => {
    crear();
    tick(300);

    component.guardarEdicion({ primerNombre: 'Nuevo' });

    expect(coordService.actualizarDocente).not.toHaveBeenCalled();
  }));

  it('HU094: la ficha se consulta al servidor solo al abrirla y cerrarFichaDocente la oculta', fakeAsync(() => {
    crear();
    tick(300);
    expect(coordService.getFichaDocente).not.toHaveBeenCalled();
    const docente = fila('doc-1', 'Roberto');

    component.verFichaDocente(docente);
    fixture.detectChanges();
    expect(component.docenteSeleccionado()).toBe(docente);
    expect(coordService.getFichaDocente).toHaveBeenCalledWith('doc-1', { pagina: 1, tamano: 5 });
    expect(fixture.nativeElement.querySelector('app-coordinator-docente-ficha-modal')).not.toBeNull();

    component.cerrarFichaDocente();
    fixture.detectChanges();
    expect(component.docenteSeleccionado()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-coordinator-docente-ficha-modal')).toBeNull();
  }));

  it('HU095: muestra el consolidado del programa y los contadores por tipo de vinculación', fakeAsync(() => {
    crear();
    tick(300);
    fixture.detectChanges();

    expect(coordService.getResumenDocentes).toHaveBeenCalledTimes(1);
    expect(component.resumen()?.totalDocentes).toBe(3);
    const texto = fixture.nativeElement.querySelector('[data-testid="resumen-docentes"]').textContent;
    expect(texto).toContain('3');
    expect(texto).toContain('2');
    expect(texto).toContain('1');
    const chip: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="chip-tipo-vinculacion"]');
    expect(chip.textContent).toContain('Cátedra: 3');
  }));

  it('HU095: el contador de un tipo filtra el directorio en el servidor y un segundo clic quita el filtro', fakeAsync(() => {
    crear();
    tick(300);
    fixture.detectChanges();
    coordService.getDocentesPrograma.calls.reset();

    (fixture.nativeElement.querySelector('[data-testid="chip-tipo-vinculacion"]') as HTMLButtonElement).click();
    tick(300);
    expect(component.filtroTipo()).toBe('tv-1');
    expect(component.pagina()).toBe(1);
    expect(coordService.getDocentesPrograma).toHaveBeenCalledWith(jasmine.objectContaining({ idTipoVinculacion: 'tv-1' }));

    component.alternarTipoVinculacion('tv-1');
    tick(300);
    expect(component.filtroTipo()).toBe('');
    expect(coordService.getDocentesPrograma.calls.mostRecent().args[0].idTipoVinculacion).toBeUndefined();
  }));

  it('HU095: el selector de tipo de vinculación filtra y vuelve a la primera página', fakeAsync(() => {
    crear();
    tick(300);
    component.onPageChange(3);
    component.onTipoVinculacionChange('tv-1');
    tick(300);
    expect(component.pagina()).toBe(1);
    expect(coordService.getDocentesPrograma.calls.mostRecent().args[0].idTipoVinculacion).toBe('tv-1');
  }));

  it('HU095: el consolidado se relee tras un cambio de estado y un error lo deja sin mostrar', fakeAsync(() => {
    crear();
    tick(300);
    expect(coordService.getResumenDocentes).toHaveBeenCalledTimes(1);

    component.solicitarCambioEstado(fila('doc-1', 'Roberto'));
    component.confirmarCambioEstado();
    tick(300);
    expect(coordService.getResumenDocentes).toHaveBeenCalledTimes(2);

    coordService.getResumenDocentes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.solicitarCambioEstado(fila('doc-1', 'Roberto'));
    component.confirmarCambioEstado();
    tick(300);
    expect(coordService.getResumenDocentes).toHaveBeenCalledTimes(3);
    expect(component.resumen()?.totalDocentes).toBe(3);
  }));

  it('no usa setInterval ni polling para refrescar', () => {
    const fuente = CoordinatorDocentesComponent.toString();
    expect(fuente).not.toContain('setInterval');
  });
});
