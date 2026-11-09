import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminFacultadesComponent } from './admin-facultades.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { of, Subject, throwError } from 'rxjs';

describe('AdminFacultadesComponent', () => {
  let fixture: ComponentFixture<AdminFacultadesComponent>;
  let component: AdminFacultadesComponent;
  let adminService: AdminManagementService;
  let toastService: jasmine.SpyObj<ToastService>;
  let http: HttpTestingController;

  const mockFacultades = [
    {
      id: 'fac-1',
      codigo: '',
      nombre: 'Facultad de Ingeniería',
      decanoId: 'dec-1',
      decanoNombre: 'Dr. Roberto Gómez',
      estado: 'ACTIVO' as const,
      totalProgramas: 4,
      totalEstudiantes: 320,
    },
    {
      id: 'fac-2',
      codigo: '',
      nombre: 'Facultad de Ciencias Económicas',
      decanoId: 'dec-2',
      decanoNombre: 'Dra. María Pérez',
      estado: 'INACTIVO' as const,
      totalProgramas: 3,
      totalEstudiantes: 210,
    },
  ];

  const mockFacultadesApi = [
    {
      id: 'fac-1',
      nombreFacultad: 'Facultad de Ingeniería',
      idDecano: 'dec-1',
      nombreCompletoDecano: 'Dr. Roberto Gómez',
      estaActivaFacultad: true,
      totalProgramas: 4,
      totalEstudiantes: 320,
    },
    {
      id: 'fac-2',
      nombreFacultad: 'Facultad de Ciencias Económicas',
      idDecano: 'dec-2',
      nombreCompletoDecano: 'Dra. María Pérez',
      estaActivaFacultad: false,
      totalProgramas: 3,
      totalEstudiantes: 210,
    },
  ];

  const mockDecanos = [
    {
      id: 'dec-1',
      numeroIdentificacion: '12345678',
      nombres: 'Roberto',
      apellidos: 'Gómez',
      correo: 'rgomez@uco.edu.co',
      facultad: 'Facultad de Ingeniería',
      telefono: '123456',
      fechaAsignacion: '2026-01-01',
      estado: 'ACTIVO' as const,
    },
    {
      id: 'dec-2',
      numeroIdentificacion: '87654321',
      nombres: 'María',
      apellidos: 'Pérez',
      correo: 'mperez@uco.edu.co',
      facultad: 'Facultad de Ciencias Económicas',
      telefono: '654321',
      fechaAsignacion: '2026-01-01',
      estado: 'ACTIVO' as const,
    },
  ];

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [AdminFacultadesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    adminService = TestBed.inject(AdminManagementService);
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AdminFacultadesComponent);
    component = fixture.componentInstance;
  });
  const flushCoordinatorCatalogs = () => {
    // ADM-16: el administrador no consulta rutas de coordinador (planes-estudio responde 403 sin alcance de programa).
    http.expectNone(`${environment.apiUrl}/coordinador/planes-estudio`);
    http.expectNone(`${environment.apiUrl}/coordinador/periodos-academicos`);
  };

  afterEach(() => {
    http.verify();
  });

  it('debe inicializarse correctamente y cargar facultades y decanos', () => {
    fixture.detectChanges();

    const reqFac = http.expectOne(`${environment.apiUrl}/admin/facultades`);
    reqFac.flush({ exitoso: true, datos: mockFacultadesApi });

    const reqDec = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    reqDec.flush({ exitoso: true, datos: mockDecanos });

    const reqInst = http.expectOne(`${environment.apiUrl}/admin/instituciones`);
    reqInst.flush({ exitoso: true, datos: [{ id: 'inst-uco', nombre: 'UCO' }] });
    flushCoordinatorCatalogs();

    expect(component).toBeTruthy();
    expect(component.facultades().length).toBe(2);
  });

  it('F3-ADM-01: muestra los totales reales (incluido 0) y "—" si el backend no los entrega, sin cifras fijas', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
      exitoso: true,
      datos: [
        { id: 'fac-0', nombreFacultad: 'Inactiva en cero', estaActivaFacultad: false, totalProgramas: 0, totalEstudiantes: 0 },
        { id: 'fac-x', nombreFacultad: 'Sin conteos', estaActivaFacultad: false },
      ],
    });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [] });
    flushCoordinatorCatalogs();
    fixture.detectChanges();

    const texto = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
    expect(texto).not.toContain('320');
    expect(texto).toContain('Programas0');
    expect(texto).toContain('Estudiantes0');
    expect(texto).toContain('Programas—');
    expect(texto).toContain('Estudiantes—');
  });

  it('calcula métricas Bento Grid correctamente (Totales, Activas, Inactivas, Con Decano)', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultadesApi });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [] });
    flushCoordinatorCatalogs();

    expect(component.totalActivas()).toBe(1);
    expect(component.totalInactivas()).toBe(1);
    expect(component.totalConDecano()).toBe(2);
  });

  it('el formulario de creación de facultad exige decano titular obligatorio (HU116)', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: [] });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [{ id: 'inst-1', nombre: 'UCO' }] });
    flushCoordinatorCatalogs();

    component.abrirFormularioCrear();
    fixture.detectChanges();

    expect(component.vista()).toBe('FORM');
    expect(component.facultadEnEdicion).toBeNull();
    // En el modelo formFacultad se inicializa con el primer decano disponible
    expect(component.formFacultad.idDecano).toBe('dec-1');
  });

  it('guarda una nueva facultad invocando el endpoint con nombre e idDecano', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: [] });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [{ id: 'inst-1', nombre: 'UCO' }] });
    flushCoordinatorCatalogs();

    component.abrirFormularioCrear();
    component.formFacultad.nombre = 'Facultad de Teología';
    component.formFacultad.idDecano = 'dec-2';

    spyOn(adminService, 'crearFacultad').and.returnValue(
      of({ exitoso: true, datos: { id: 'fac-3', nombre: 'Facultad de Teología' } })
    );

    component.guardar();

    expect(adminService.crearFacultad).toHaveBeenCalledWith(
      jasmine.objectContaining({
        nombre: 'Facultad de Teología',
        idDecano: 'dec-2',
      })
    );
    expect(toastService.success).toHaveBeenCalledWith('Facultad registrada exitosamente.');
    expect(component.vista()).toBe('LISTA');
  });

  it('detecta nombre duplicado e impide el envío del formulario', () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultadesApi });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [] });
    flushCoordinatorCatalogs();

    component.abrirFormularioCrear();
    component.formFacultad.nombre = 'facultad de ingeniería'; // case-insensitive duplicate
    component.formFacultad.idDecano = 'dec-1';

    expect(component.nombreDuplicado()).toBeTrue();

    spyOn(adminService, 'crearFacultad');
    component.guardar();
    expect(adminService.crearFacultad).not.toHaveBeenCalled();
  });

  const inicializar = () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultadesApi });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: [] });
    flushCoordinatorCatalogs();
  };

  it('permite cambiar decano titular vía modal usando actualizarFacultad (HU117)', () => {
    inicializar();
    const fac = mockFacultades[0];
    component.abrirModalVincularDecano(fac);
    expect(component.facultadParaDecano()?.id).toBe(fac.id);

    component.decanoSeleccionadoId = 'dec-2';
    spyOn(adminService, 'actualizarFacultad').and.returnValue(of({ exitoso: true, datos: mockFacultades[0] }));

    component.confirmarAsignacionDecano();

    expect(adminService.actualizarFacultad).toHaveBeenCalledWith(fac.id, { idDecano: 'dec-2' });
    expect(toastService.success).toHaveBeenCalled();
    expect(component.facultadParaDecano()).toBeNull();
  });

  it('cambiar decano: el toast de exito solo aparece tras la respuesta y el modal sigue abierto mientras tanto', () => {
    inicializar();
    component.abrirModalVincularDecano(mockFacultades[0]);
    component.decanoSeleccionadoId = 'dec-2';
    const pendiente = new Subject<any>();
    spyOn(adminService, 'actualizarFacultad').and.returnValue(pendiente);

    component.confirmarAsignacionDecano();

    expect(component.guardandoDecano()).toBeTrue();
    expect(toastService.success).not.toHaveBeenCalled();
    expect(component.facultadParaDecano()).not.toBeNull();

    component.confirmarAsignacionDecano(); // segundo clic ignorado
    expect(adminService.actualizarFacultad).toHaveBeenCalledTimes(1);

    pendiente.next({ exitoso: true, datos: mockFacultades[0] });
    pendiente.complete();
    expect(component.guardandoDecano()).toBeFalse();
    expect(toastService.success).toHaveBeenCalled();
    expect(component.facultadParaDecano()).toBeNull();
  });

  it('cambiar decano: ante 409 muestra el mensaje del backend y mantiene el modal abierto', () => {
    inicializar();
    component.abrirModalVincularDecano(mockFacultades[0]);
    component.decanoSeleccionadoId = 'dec-2';
    spyOn(adminService, 'actualizarFacultad').and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'El decano ya es titular de otra facultad activa.' } }))
    );

    component.confirmarAsignacionDecano();

    expect(toastService.error).toHaveBeenCalledWith('El decano ya es titular de otra facultad activa.');
    expect(toastService.success).not.toHaveBeenCalled();
    expect(component.facultadParaDecano()).not.toBeNull();
    expect(component.guardandoDecano()).toBeFalse();
  });

  it('editar facultad (HU110) llama actualizarFacultad con nombre e idDecano y confirma tras la respuesta', () => {
    inicializar();
    component.editarFacultad(mockFacultades[0]);
    component.formFacultad.nombre = 'Facultad de Ingeniería y Ciencias';
    component.formFacultad.idDecano = 'dec-1';
    const pendiente = new Subject<any>();
    spyOn(adminService, 'actualizarFacultad').and.returnValue(pendiente);

    component.guardar();

    expect(adminService.actualizarFacultad).toHaveBeenCalledWith('fac-1', {
      nombre: 'Facultad de Ingeniería y Ciencias',
      idDecano: 'dec-1',
    });
    expect(toastService.success).not.toHaveBeenCalled();
    expect(component.guardando()).toBeTrue();

    pendiente.next({ exitoso: true, datos: mockFacultades[0] });
    pendiente.complete();

    expect(toastService.success).toHaveBeenCalledWith('Facultad actualizada correctamente.');
    expect(component.guardando()).toBeFalse();
    expect(component.vista()).toBe('LISTA');
  });

  it('editar facultad: un error muestra el mensaje del backend y no cierra el formulario', () => {
    inicializar();
    component.editarFacultad(mockFacultades[0]);
    component.formFacultad.nombre = 'Nombre Nuevo';
    spyOn(adminService, 'actualizarFacultad').and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'Ya existe una facultad con ese nombre.' } }))
    );

    component.guardar();

    expect(toastService.error).toHaveBeenCalledWith('Ya existe una facultad con ese nombre.');
    expect(toastService.success).not.toHaveBeenCalled();
    expect(component.vista()).toBe('FORM');
    expect(component.guardando()).toBeFalse();
  });

  it('editar facultad: conservar el nombre propio no cuenta como duplicado', () => {
    inicializar();
    component.editarFacultad(mockFacultades[0]);
    component.formFacultad.nombre = mockFacultades[0].nombre;

    expect(component.nombreDuplicado()).toBeFalse();
  });

  it('alternar estado (HU111) envia el estado deseado y confirma solo tras la respuesta', () => {
    inicializar();
    const activa = mockFacultades[0]; // ACTIVO -> se pide inactivar
    const pendiente = new Subject<any>();
    spyOn(adminService, 'cambiarEstadoFacultad').and.returnValue(pendiente);

    component.toggleEstadoFacultad(activa);

    expect(adminService.cambiarEstadoFacultad).toHaveBeenCalledWith('fac-1', false);
    expect(component.facultadCambiandoEstado()).toBe('fac-1');
    expect(toastService.info).not.toHaveBeenCalled();
    expect(toastService.success).not.toHaveBeenCalled();

    component.toggleEstadoFacultad(activa); // clic repetido ignorado
    expect(adminService.cambiarEstadoFacultad).toHaveBeenCalledTimes(1);

    pendiente.next({ exitoso: true, datos: { ...activa, estado: 'INACTIVO' } });
    pendiente.complete();

    expect(component.facultadCambiandoEstado()).toBeNull();
    expect(toastService.success).toHaveBeenCalled();
  });

  it('alternar estado: una facultad inactiva se reactiva enviando activa=true', () => {
    inicializar();
    spyOn(adminService, 'cambiarEstadoFacultad').and.returnValue(of({ exitoso: true, datos: mockFacultades[1] }));

    component.toggleEstadoFacultad(mockFacultades[1]);

    expect(adminService.cambiarEstadoFacultad).toHaveBeenCalledWith('fac-2', true);
  });

  it('alternar estado: ante 409 muestra el mensaje del backend y libera el bloqueo', () => {
    inicializar();
    spyOn(adminService, 'cambiarEstadoFacultad').and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'El decano ya titulariza otra facultad activa.' } }))
    );

    component.toggleEstadoFacultad(mockFacultades[1]);

    expect(toastService.error).toHaveBeenCalledWith('El decano ya titulariza otra facultad activa.');
    expect(toastService.success).not.toHaveBeenCalled();
    expect(component.facultadCambiandoEstado()).toBeNull();
  });

  it('no existe la accion de desvincular decano (decano es obligatorio)', () => {
    inicializar();
    expect((component as any).desvincularDecano).toBeUndefined();
  });

  describe('rutas alternas de mensajes (HU110, HU111, HU117)', () => {
    it('editar: exitoso=false muestra mensajeUsuario del backend y mantiene el formulario', () => {
      inicializar();
      component.editarFacultad(mockFacultades[0]);
      component.formFacultad.nombre = 'Nombre Nuevo';
      spyOn(adminService, 'actualizarFacultad').and.returnValue(
        of({ exitoso: false, mensajeUsuario: 'No se pudo actualizar por regla de negocio.', datos: null as any })
      );

      component.guardar();

      expect(toastService.error).toHaveBeenCalledWith('No se pudo actualizar por regla de negocio.');
      expect(component.vista()).toBe('FORM');
      expect(component.guardando()).toBeFalse();
    });

    it('editar: exitoso=false sin mensajeUsuario usa el texto de respaldo', () => {
      inicializar();
      component.editarFacultad(mockFacultades[0]);
      component.formFacultad.nombre = 'Nombre Nuevo';
      spyOn(adminService, 'actualizarFacultad').and.returnValue(of({ exitoso: false, datos: null as any }));

      component.guardar();

      expect(toastService.error).toHaveBeenCalledWith('No fue posible actualizar la facultad.');
    });

    it('editar: un error sin message usa error.mensajeUsuario o el texto de respaldo', () => {
      inicializar();
      component.editarFacultad(mockFacultades[0]);
      component.formFacultad.nombre = 'Nombre Nuevo';
      const spy = spyOn(adminService, 'actualizarFacultad');

      spy.and.returnValue(throwError(() => ({ status: 500, error: { mensajeUsuario: 'Falla controlada.' } })));
      component.guardar();
      expect(toastService.error).toHaveBeenCalledWith('Falla controlada.');

      spy.and.returnValue(throwError(() => ({ status: 0 })));
      component.guardar();
      expect(toastService.error).toHaveBeenCalledWith('No fue posible actualizar la facultad.');
    });

    it('alternar estado: exitoso=false muestra mensajeUsuario o el texto de respaldo y libera el bloqueo', () => {
      inicializar();
      const spy = spyOn(adminService, 'cambiarEstadoFacultad');

      spy.and.returnValue(of({ exitoso: false, mensajeUsuario: 'Estado no modificable.', datos: null as any }));
      component.toggleEstadoFacultad(mockFacultades[0]);
      expect(toastService.error).toHaveBeenCalledWith('Estado no modificable.');
      expect(component.facultadCambiandoEstado()).toBeNull();

      spy.and.returnValue(of({ exitoso: false, datos: null as any }));
      component.toggleEstadoFacultad(mockFacultades[0]);
      expect(toastService.error).toHaveBeenCalledWith('No fue posible cambiar el estado de la facultad.');
    });

    it('alternar estado: un error sin message usa el texto de respaldo', () => {
      inicializar();
      spyOn(adminService, 'cambiarEstadoFacultad').and.returnValue(throwError(() => ({ status: 0 })));

      component.toggleEstadoFacultad(mockFacultades[0]);

      expect(toastService.error).toHaveBeenCalledWith('No fue posible cambiar el estado de la facultad.');
      expect(component.facultadCambiandoEstado()).toBeNull();
    });

    it('cambiar decano: exitoso=false muestra mensajeUsuario o el respaldo y mantiene el modal', () => {
      inicializar();
      component.abrirModalVincularDecano(mockFacultades[0]);
      component.decanoSeleccionadoId = 'dec-2';
      const spy = spyOn(adminService, 'actualizarFacultad');

      spy.and.returnValue(of({ exitoso: false, mensajeUsuario: 'Decano no asignable.', datos: null as any }));
      component.confirmarAsignacionDecano();
      expect(toastService.error).toHaveBeenCalledWith('Decano no asignable.');
      expect(component.facultadParaDecano()).not.toBeNull();

      spy.and.returnValue(of({ exitoso: false, datos: null as any }));
      component.confirmarAsignacionDecano();
      expect(toastService.error).toHaveBeenCalledWith('No se pudo asignar el decano.');
    });

    it('cambiar decano: un error sin message usa el texto de respaldo', () => {
      inicializar();
      component.abrirModalVincularDecano(mockFacultades[0]);
      component.decanoSeleccionadoId = 'dec-2';
      spyOn(adminService, 'actualizarFacultad').and.returnValue(throwError(() => ({ status: 0 })));

      component.confirmarAsignacionDecano();

      expect(toastService.error).toHaveBeenCalledWith('No se pudo asignar el decano en este momento.');
      expect(component.guardandoDecano()).toBeFalse();
    });

    it('cambiar decano: sin facultad o decano seleccionado no llama al backend', () => {
      inicializar();
      spyOn(adminService, 'actualizarFacultad');

      component.confirmarAsignacionDecano();

      expect(adminService.actualizarFacultad).not.toHaveBeenCalled();
    });
  });

  // F-ADM-S05 / F-ADM-S08 / F-ADM-S23
  describe('mensajes en pantalla del formulario de facultad', () => {
    it('S05/S08: un 409 al editar o crear muestra el message del backend junto al boton y libera "Guardando"', () => {
      inicializar();
      component.editarFacultad(mockFacultades[0]);
      component.formFacultad.nombre = 'Nombre Nuevo';
      const conflicto = new HttpErrorResponse({
        status: 409,
        error: { code: 'CONFLICT', message: 'El decano ya es titular de otra facultad.' },
      });
      spyOn(adminService, 'actualizarFacultad').and.returnValue(throwError(() => conflicto));
      component.guardar();
      fixture.detectChanges();

      expect(component.guardando()).toBeFalse();
      expect(component.errorGuardado()).toBe('El decano ya es titular de otra facultad.');
      expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('El decano ya es titular de otra facultad.');
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Conflicto 409');

      component.abrirFormularioCrear();
      component.formFacultad.nombre = 'Facultad Distinta';
      component.formFacultad.idDecano = 'dec-1';
      spyOn(adminService, 'crearFacultad').and.returnValue(throwError(() => conflicto));
      component.guardar();
      expect(toastService.error).toHaveBeenCalledWith('El decano ya es titular de otra facultad.');
    });

    it('S23: un nombre de 2 caracteres muestra un error asociado al campo y el boton sigue habilitado', () => {
      inicializar();
      component.abrirFormularioCrear();
      component.formFacultad.nombre = 'ab';
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const campo = el.querySelector("[id=\"fac-nombre\"]") as HTMLInputElement;
      expect(campo.getAttribute('aria-invalid')).toBe('true');
      expect(campo.getAttribute('aria-describedby')).toBe('fac-nombre-error');
      expect(el.querySelector("[id=\"fac-nombre-error\"]")?.textContent).toContain('entre 3 y 50');
      const guardar = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Guardar Facultad')) as HTMLButtonElement;
      expect(guardar.disabled).toBeFalse();
      expect(el.querySelector('label[for="fac-nombre"]')).toBeTruthy();
    });
  });
});
