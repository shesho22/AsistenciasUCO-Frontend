import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AdminDecanosComponent } from './admin-decanos.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { TeacherService } from '../../../core/services/teacher.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { environment } from '../../../../environments/environment';
import { UserPickerItem } from '../../../shared/components/user-picker-modal/user-picker-modal.component';

describe('AdminDecanosComponent', () => {
  let fixture: ComponentFixture<AdminDecanosComponent>;
  let component: AdminDecanosComponent;
  let adminService: AdminManagementService;
  let toastService: jasmine.SpyObj<ToastService>;
  let http: HttpTestingController;

  const mockDecanos = [
    {
      id: 'dec-1',
      idUsuario: 'usr-1',
      numeroIdentificacion: '1017000001',
      primerNombre: 'Roberto',
      segundoNombre: 'Carlos',
      primerApellido: 'Gómez',
      segundoApellido: 'Pérez',
      nombres: 'Roberto Carlos',
      apellidos: 'Gómez Pérez',
      nombreCompleto: 'Roberto Carlos Gómez Pérez',
      correo: 'rgomez@uco.edu.co',
      facultad: 'Facultad de Ingeniería',
      idFacultad: 'fac-1',
      telefono: '123456',
      fechaAsignacion: '2026-01-01',
      estado: 'ACTIVO' as const,
      estaActivoDecano: true,
    },
    {
      id: 'dec-2',
      idUsuario: 'usr-2',
      numeroIdentificacion: '1017000002',
      primerNombre: 'María',
      primerApellido: 'Zapata',
      nombres: 'María',
      apellidos: 'Zapata',
      nombreCompleto: 'María Zapata',
      correo: 'mzapata@uco.edu.co',
      facultad: 'Facultad de Ciencias de la Salud',
      idFacultad: 'fac-2',
      telefono: '',
      fechaAsignacion: '2026-02-01',
      estado: 'INACTIVO' as const,
      estaActivoDecano: false,
    },
  ];

  const mockTiposDoc = [
    { id: 'tipo-1', tipoIdentificacion: 'CC', nombre: 'Cédula de Ciudadanía', codigo: 'CC', estado: 'ACTIVO' as const },
    { id: 'tipo-2', tipoIdentificacion: 'CE', nombre: 'Cédula de Extranjería', codigo: 'CE', estado: 'ACTIVO' as const },
  ];

  const mockFacultades = [
    { id: 'fac-1', codigo: 'ING', nombre: 'Facultad de Ingeniería', estado: 'ACTIVO' as const },
    { id: 'fac-2', codigo: 'SAL', nombre: 'Facultad de Ciencias de la Salud', estado: 'ACTIVO' as const },
  ];

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [AdminDecanosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastSpy },
        { provide: TeacherService, useValue: { getAllTeachers: () => of([]) } },
        { provide: CoordinatorManagementService, useValue: { getDocentes: () => of({ exitoso: true, datos: [] }) } },
      ],
    });

    adminService = TestBed.inject(AdminManagementService);
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AdminDecanosComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    http.verify();
  });

  function satisfyInitRequests() {
    const reqTipos = http.expectOne(`${environment.apiUrl}/tipos-identificacion`);
    reqTipos.flush(mockTiposDoc);

    const reqFac = http.expectOne(`${environment.apiUrl}/admin/facultades`);
    reqFac.flush({ exitoso: true, datos: mockFacultades });

    const reqDec = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    reqDec.flush({ exitoso: true, datos: mockDecanos });
  }

  it('debe crearse y cargar datos iniciales correctamente', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    expect(component).toBeTruthy();
    expect(component.decanos().length).toBe(2);
    expect(component.facultades().length).toBe(2);
    expect(component.tiposIdentificacion().length).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('maneja errores en cargarFacultades, cargarTiposIdentificacion y cargarDecanos', () => {
    spyOn(console, 'warn');
    fixture.detectChanges();

    const reqTipos = http.expectOne(`${environment.apiUrl}/tipos-identificacion`);
    reqTipos.error(new ProgressEvent('Network error'));

    const reqFac = http.expectOne(`${environment.apiUrl}/admin/facultades`);
    reqFac.error(new ProgressEvent('Network error'));

    const reqDec = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    reqDec.error(new ProgressEvent('Network error'));

    expect(console.warn).toHaveBeenCalledWith('Usando catálogo local de tipos de documento.');
    expect(console.warn).toHaveBeenCalledWith('Usando catálogo local de facultades.');
    expect(toastService.error).toHaveBeenCalledWith('Error al cargar la lista de decanos.');
    expect(component.isLoading()).toBeFalse();
  });

  it('onTipoIdentificacionChange actualiza tipoIdentificacion correctamente', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    const eventFound = { target: { value: 'tipo-2' } } as unknown as Event;
    component.onTipoIdentificacionChange(eventFound);
    expect(component.formData.tipoIdentificacion).toBe('CE');
    expect(component.formData.tipoIdentificacionId).toBe('tipo-2');

    const eventNotFound = { target: { value: 'inexistente' } } as unknown as Event;
    component.onTipoIdentificacionChange(eventNotFound);
    expect(component.formData.tipoIdentificacion).toBe('CE');
  });

  it('filteredDecanos filtra por todos los campos soportados y por estado', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    const triggerFilter = () => component.decanos.set([...component.decanos()]);

    component.searchQuery = 'roberto';
    component.selectedEstado = 'TODOS';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = 'carlos';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = 'zapata';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = 'ingeniería';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = '1017000002';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = '';
    component.selectedEstado = 'INACTIVO';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);
    expect(component.filteredDecanos()[0].id).toBe('dec-2');

    component.selectedEstado = 'ACTIVO';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);
    expect(component.filteredDecanos()[0].id).toBe('dec-1');
  });

  it('toggleEstado cambia el estado del decano exitosamente', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.toggleEstado(mockDecanos[0]);
    const req = http.expectOne(`${environment.apiUrl}/admin/decanos/dec-1/toggle`);
    expect(req.request.method).toBe('PATCH');

    const updated = { ...mockDecanos[0], estado: 'INACTIVO' as const, estaActivoDecano: false };
    req.flush({ exitoso: true, datos: updated, mensajeUsuario: 'Decano desactivado.' });

    expect(toastService.success).toHaveBeenCalledWith('Decano desactivado.');
    expect(component.decanos().find((d) => d.id === 'dec-1')?.estado).toBe('INACTIVO');
  });

  it('toggleEstado notifica error cuando la llamada a la api falla', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.toggleEstado(mockDecanos[0]);
    const req = http.expectOne(`${environment.apiUrl}/admin/decanos/dec-1/toggle`);
    req.flush({ message: 'Error al cambiar estado' }, { status: 500, statusText: 'Server Error' });

    expect(toastService.error).toHaveBeenCalled();
  });

  it('abrirFormularioRegistro, volverALista y onNumeroIdentificacionInput funcionan como se espera', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.abrirFormularioRegistro();
    expect(component.vistaActual()).toBe('REGISTRO');
    expect(component.formData.numeroIdentificacion).toBe('');

    component.onNumeroIdentificacionInput({ target: { value: '102030ABC-40' } } as unknown as Event);
    expect(component.formData.numeroIdentificacion).toBe('10203040');

    component.volverALista();
    expect(component.vistaActual()).toBe('LISTA');
  });

  describe('validaciones de guardarDecano', () => {
    beforeEach(() => {
      fixture.detectChanges();
      satisfyInitRequests();
      component.abrirFormularioRegistro();
    });

    it('valida tipo de identificación obligatorio', () => {
      component.formData.tipoIdentificacionId = '';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('El campo Tipo de Documento es obligatorio.');
    });

    it('valida número de identificación válido', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '123';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalled();
    });

    it('valida primer nombre obligatorio', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = '';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('El campo Primer Nombre es obligatorio.');
    });

    it('valida primer apellido obligatorio', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = '';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('El campo Primer Apellido es obligatorio.');
    });

    it('valida correo institucional obligatorio y válido', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'correo-no-valido';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalled();
    });

    it('valida contraseña obligatoria', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'ana.mora@uco.edu.co';
      component.formData.password = '';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('La contraseña inicial de acceso es obligatoria.');
    });

    it('valida longitud mínima de 12 caracteres', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'ana.mora@uco.edu.co';
      component.formData.password = 'Pass123!';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('La contraseña inicial debe tener mínimo 12 caracteres según las políticas de Keycloak.');
    });

    it('valida políticas de complejidad de contraseña (mayúscula, minúscula, dígito, símbolo)', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'ana.mora@uco.edu.co';
      component.formData.password = 'contraseniasinmayusculas123!';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un símbolo (!@#$%^&*()_+-=%).');
    });

    it('valida que la contraseña no coincida con el documento ni correo', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'Ana12345!@uco.edu.co';
      component.formData.password = 'Ana12345!@uco.edu.co';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('La contraseña no puede coincidir con el documento de identidad ni con el correo.');
    });

    it('guarda exitosamente el decano y actualiza la lista', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Carlos';
      component.formData.segundoNombre = 'Andrés';
      component.formData.primerApellido = 'Zapata';
      component.formData.segundoApellido = 'Mejía';
      component.formData.correo = 'carlos.zapata@uco.edu.co';
      component.formData.password = 'ClaveSegura2026#';

      component.guardarDecano();

      const reqPost = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      expect(reqPost.request.method).toBe('POST');
      expect(reqPost.request.body.primerNombre).toBe('Carlos');
      expect(reqPost.request.body.idFacultad).toBeNull();

      reqPost.flush({ exitoso: true, mensajeUsuario: 'Decano registrado exitosamente.' });

      const reqDecReload = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      reqDecReload.flush({ exitoso: true, datos: mockDecanos });

      const reqFacReload = http.expectOne(`${environment.apiUrl}/admin/facultades`);
      reqFacReload.flush({ exitoso: true, datos: mockFacultades });

      expect(toastService.success).toHaveBeenCalledWith('Decano registrado exitosamente.');
      expect(component.vistaActual()).toBe('LISTA');
    });

    it('muestra error cuando el guardado falla en el backend', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Carlos';
      component.formData.primerApellido = 'Zapata';
      component.formData.correo = 'carlos.zapata@uco.edu.co';
      component.formData.password = 'ClaveSegura2026#';

      component.guardarDecano();

      const reqPost = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      reqPost.flush({ message: 'Error de servidor' }, { status: 500, statusText: 'Server Error' });

      expect(toastService.error).toHaveBeenCalled();
    });
  });

  describe('modal de selección y nombramiento de decano desde directorio', () => {
    beforeEach(() => {
      fixture.detectChanges();
      satisfyInitRequests();
    });

    it('abrirModalSeleccionarDecano y onSolicitarRegistroNuevo alternan estados correctamente', () => {
      component.abrirModalSeleccionarDecano();
      expect(component.isPickerModalOpen()).toBeTrue();

      component.onSolicitarRegistroNuevo();
      expect(component.isPickerModalOpen()).toBeFalse();
      expect(component.vistaActual()).toBe('REGISTRO');
    });

    it('onDecanoSeleccionadoDelDirectorio avisa si el usuario ya es decano', () => {
      const existingUser: UserPickerItem = {
        id: 'usr-1',
        numeroIdentificacion: '1017000001',
        nombres: 'Roberto Carlos',
        apellidos: 'Gómez Pérez',
        correo: 'rgomez@uco.edu.co',
      };

      component.onDecanoSeleccionadoDelDirectorio(existingUser);
      expect(toastService.info).toHaveBeenCalledWith('El profesional Roberto Carlos Gómez Pérez ya está nombrado como Decano.');
    });

    it('onDecanoSeleccionadoDelDirectorio precarga datos cuando es un nuevo decano', () => {
      const newUser: UserPickerItem = {
        id: 'usr-nuevo',
        numeroIdentificacion: '1099887766',
        primerNombre: 'Esteban',
        segundoNombre: 'David',
        primerApellido: 'López',
        segundoApellido: 'Restrepo',
        nombres: 'Esteban David',
        apellidos: 'López Restrepo',
        correo: 'esteban.lopez@uco.edu.co',
        tipoIdentificacion: 'CC',
      };

      component.onDecanoSeleccionadoDelDirectorio(newUser);

      expect(component.vistaActual()).toBe('REGISTRO');
      expect(component.formData.numeroIdentificacion).toBe('1099887766');
      expect(component.formData.primerNombre).toBe('Esteban');
      expect(component.formData.primerApellido).toBe('López');
      expect(component.formData.correo).toBe('esteban.lopez@uco.edu.co');
      expect(component.formData.password).toBe('');
      expect(toastService.info).toHaveBeenCalled();
    });
  });
});
