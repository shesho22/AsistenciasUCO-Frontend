import { StudentRegistrationConfigService } from '../../../core/services/student-registration-config.service';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AdmisionEstudianteModalComponent } from './admision-estudiante-modal.component';
import { CatalogService } from '../../../core/services/catalog.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { AdmisionEstudianteDto, ProgramaInstitucionDto } from '../../../core/models/role-management.model';
import { TipoIdentificacionApiDto } from '../../../core/api/models/tipo-identificacion-api-dto.model';

const tiposMock: TipoIdentificacionApiDto[] = [
  { id: 't-cc', tipoIdentificacion: 'CC', nombre: 'Cédula de Ciudadanía' },
  { id: 't-ti', tipoIdentificacion: 'TI', nombre: 'Tarjeta de Identidad' },
];

const programasMock: ProgramaInstitucionDto[] = [
  { id: 'prog-1', codigo: 'SIS', nombre: 'Ingeniería de Sistemas', idFacultad: 'fac-1', nombreFacultad: 'Ingeniería' },
  { id: 'prog-2', codigo: 'IND', nombre: 'Ingeniería Industrial', idFacultad: 'fac-1', nombreFacultad: 'Ingeniería' },
];

/** Error con el contrato del golden path, igual al que envía el backend (code, message, details[].field). */
function errorApi(
  status: number,
  code: string,
  message: string,
  details?: { field: string; code: string; message: string }[]
): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: {
      timestamp: '2026-11-10T00:00:00Z',
      status,
      error: status === 409 ? 'Conflict' : 'Bad Request',
      code,
      message,
      path: '/api/v1/admin/estudiantes/admision',
      correlationId: null,
      ...(details ? { details } : {}),
    },
  });
}

describe('AdmisionEstudianteModalComponent (HU156)', () => {
  let fixture: ComponentFixture<AdmisionEstudianteModalComponent>;
  let component: AdmisionEstudianteModalComponent;
  let catalogService: jasmine.SpyObj<CatalogService>;
  let adminService: jasmine.SpyObj<AdminManagementService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    catalogService = jasmine.createSpyObj('CatalogService', ['getTiposIdentificacion']);
    adminService = jasmine.createSpyObj('AdminManagementService', ['getProgramasInstitucion', 'admitirEstudiante']);
    toastService = jasmine.createSpyObj('ToastService', ['success', 'warning', 'error', 'info']);

    catalogService.getTiposIdentificacion.and.returnValue(of({ exitoso: true, datos: tiposMock }));
    adminService.getProgramasInstitucion.and.returnValue(
      of({ exitoso: true, elementos: programasMock, numeroPagina: 1, tamanoPagina: 20, totalElementos: 2, totalPaginas: 1 })
    );

    TestBed.configureTestingModule({
      imports: [AdmisionEstudianteModalComponent],
      providers: [
        { provide: StudentRegistrationConfigService, useValue: { getEmailDomain: () => of('@uco.edu.co') } },
        { provide: CatalogService, useValue: catalogService },
        { provide: AdminManagementService, useValue: adminService },
        { provide: ToastService, useValue: toastService },
      ],
    });

    fixture = TestBed.createComponent(AdmisionEstudianteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicializa cargando tipos de identificación y lista de programas institucional', () => {
    expect(catalogService.getTiposIdentificacion).toHaveBeenCalled();
    expect(adminService.getProgramasInstitucion).toHaveBeenCalledWith({ texto: '', pagina: 1, tamano: 20 });
    expect(component.tipos().length).toBe(2);
    expect(component.programas().length).toBe(2);
    expect(component.tipoIdentificacionId()).toBe('t-cc');
  });

  it('valida campos obligatorios y bloquea guardar si faltan campos', () => {
    expect(component.esValido()).toBeFalse();

    component.numeroIdentificacion.set('1017000222');
    component.primerNombre.set('Carlos');
    component.primerApellido.set('Pérez');
    component.correo.set('carlos.perez@uco.edu.co');
    component.idPrograma.set('prog-1');

    expect(component.esValido()).toBeTrue();
  });

  it('permite buscar programas en el servidor reactivamente', fakeAsync(() => {
    adminService.getProgramasInstitucion.and.returnValue(
      of({ exitoso: true, elementos: [programasMock[0]], numeroPagina: 1, tamanoPagina: 20, totalElementos: 1, totalPaginas: 1 })
    );

    component.buscarProgramas('Sistemas');
    tick(300);

    expect(adminService.getProgramasInstitucion).toHaveBeenCalledWith({ texto: 'Sistemas', pagina: 1, tamano: 20 });
    expect(component.programas().length).toBe(1);
    expect(component.programas()[0].codigo).toBe('SIS');
  }));

  it('envía admisión exitosa con estadoCuenta ACTIVA, emite admitido y muestra toast de éxito', () => {
    const admitidoDto: AdmisionEstudianteDto = {
      idEstudiante: 'est-10',
      idUsuario: 'usr-10',
      esUsuarioNuevo: true,
      estadoCuenta: 'ACTIVA',
      cuentaReparada: false,
    };
    adminService.admitirEstudiante.and.returnValue(of({ exitoso: true, datos: admitidoDto }));

    let resultado: AdmisionEstudianteDto | null = null;
    component.admitido.subscribe((dto: AdmisionEstudianteDto) => (resultado = dto));

    component.numeroIdentificacion.set('1017000222');
    component.primerNombre.set('Carlos');
    component.segundoNombre.set('Andrés');
    component.primerApellido.set('Pérez');
    component.segundoApellido.set('Gómez');
    component.correo.set('carlos.perez@uco.edu.co');
    component.idPrograma.set('prog-1');

    component.onGuardar();

    expect(adminService.admitirEstudiante).toHaveBeenCalledWith({
      tipoIdentificacionId: 't-cc',
      numeroIdentificacion: 1017000222,
      primerNombre: 'Carlos',
      segundoNombre: 'Andrés',
      primerApellido: 'Pérez',
      segundoApellido: 'Gómez',
      correo: 'carlos.perez@uco.edu.co',
      idPrograma: 'prog-1',
    });
    expect(resultado as unknown).toEqual(admitidoDto);
    expect(toastService.success).toHaveBeenCalledWith(
      'Estudiante admitido exitosamente. Aparecerá en la lista de estudiantes cuando esté inscrito en un grupo.'
    );
  });

  it('HU156: el formulario avisa que el admitido aparece en la lista cuando tenga grupo', () => {
    fixture.detectChanges();
    const aviso = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="aviso-admitido-sin-grupo"]');
    expect(aviso?.textContent?.trim()).toBe('Aparecerá en la lista de estudiantes cuando esté inscrito en un grupo.');
  });

  it('cuando estadoCuenta es PENDIENTE_SINCRONIZACION muestra aviso de estado al usuario', () => {
    const admitidoDto: AdmisionEstudianteDto = {
      idEstudiante: 'est-11',
      idUsuario: 'usr-11',
      esUsuarioNuevo: true,
      estadoCuenta: 'PENDIENTE_SINCRONIZACION',
      cuentaReparada: false,
    };
    adminService.admitirEstudiante.and.returnValue(of({ exitoso: true, datos: admitidoDto }));

    let resultado: AdmisionEstudianteDto | null = null;
    component.admitido.subscribe((dto: AdmisionEstudianteDto) => (resultado = dto));

    component.numeroIdentificacion.set('1017000333');
    component.primerNombre.set('Laura');
    component.primerApellido.set('Ramírez');
    component.correo.set('laura.ramirez@uco.edu.co');
    component.idPrograma.set('prog-2');

    component.onGuardar();

    expect(resultado as unknown).toEqual(admitidoDto);
    expect(toastService.warning).toHaveBeenCalledWith(
      'Estudiante admitido. La cuenta de acceso quedó en estado PENDIENTE_SINCRONIZACION. ' +
        'Aparecerá en la lista de estudiantes cuando esté inscrito en un grupo.'
    );
  });

  it('IDENT-002: no hay campo de contraseña y el formulario explica la activación por correo', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('input[type="password"]')).toBeNull();
    expect(host.querySelector('[data-testid="aviso-activacion-cuenta"]')?.textContent).toContain('activar la cuenta');
  });

  it('maneja error 400 con details mapeando errores a los campos respectivos', () => {
    const errorResponse = errorApi(400, 'VALIDATION_ERROR', 'Errores de validación en la solicitud.', [
      { field: 'correo', code: 'ADS_005', message: 'El correo debe ser institucional.' },
      { field: 'primerNombre', code: 'VAL_001', message: 'El primer nombre es obligatorio.' },
    ]);
    adminService.admitirEstudiante.and.returnValue(throwError(() => errorResponse));

    component.numeroIdentificacion.set('1017000555');
    component.primerNombre.set('Juan');
    component.primerApellido.set('Gómez');
    // El formato es válido en el cliente; el 400 simulado prueba el mapeo de los detalles del backend a cada campo.
    component.correo.set('juan@uco.edu.co');
    component.idPrograma.set('prog-1');

    component.onGuardar();

    expect(component.erroresCampos()['correo']).toBe('El correo debe ser institucional.');
    expect(component.erroresCampos()['primerNombre']).toBe('El primer nombre es obligatorio.');
  });

  // DEC-073: el cliente avisa antes de enviar un correo no institucional o un nombre con números.
  it('DEC-073: bloquea correo no institucional y nombres con números antes de enviar', () => {
    component.numeroIdentificacion.set('1017000555');
    component.primerNombre.set('Juan');
    component.primerApellido.set('Gómez');
    component.correo.set('juan@gmail.com');
    component.idPrograma.set('prog-1');

    expect(component.errorLocal('correo')).toBe('El correo debe ser institucional y terminar en @uco.edu.co.');
    expect(component.esValido()).toBeFalse();

    component.correo.set('juan@uco.edu.co');
    component.segundoNombre.set('Pabl0');
    expect(component.errorLocal('segundoNombre')).toContain('solo admite letras');
    expect(component.esValido()).toBeFalse();

    component.segundoNombre.set('Pablo');
    expect(component.esValido()).toBeTrue();
  });

  it('maneja error 409 de unicidad o ya admitido sin cerrar el modal', () => {
    const errorResponse = errorApi(409, 'ADS_002', 'El estudiante ya está admitido en este programa.');
    adminService.admitirEstudiante.and.returnValue(throwError(() => errorResponse));

    component.numeroIdentificacion.set('1017000111');
    component.primerNombre.set('Ana');
    component.primerApellido.set('Ruiz');
    component.correo.set('ana@uco.edu.co');
    component.idPrograma.set('prog-1');

    component.onGuardar();

    expect(component.errorGeneral()).toBe('El estudiante ya está admitido en este programa.');
  });

  it('al cancelar emite cerrar', () => {
    let cancelado = false;
    component.cerrar.subscribe(() => (cancelado = true));

    component.onCancelar();

    expect(cancelado).toBeTrue();
  });

  // CERT-CULM001 (HU156): hallazgos de la certificación en pantalla del 2026-11-09.
  it('envía el documento como entero, que es lo que espera el backend', () => {
    adminService.admitirEstudiante.and.returnValue(throwError(() => errorApi(409, 'ADS_002', 'Ya admitido.')));
    component.numeroIdentificacion.set(' 970000301 ');
    component.primerNombre.set('QA');
    component.primerApellido.set('Admision');
    component.correo.set('qa.estudiante.admision@uco.edu.co');
    component.idPrograma.set('prog-1');

    component.onGuardar();

    const enviado = adminService.admitirEstudiante.calls.mostRecent().args[0];
    expect(enviado.numeroIdentificacion).toBe(970000301);
    expect(typeof enviado.numeroIdentificacion).toBe('number');
  });

  it('no deja guardar con un documento que no es un entero válido', () => {
    component.primerNombre.set('QA');
    component.primerApellido.set('Admision');
    component.correo.set('qa@uco.edu.co');
    component.idPrograma.set('prog-1');
    for (const invalido of ['abc', '12a4', '0123', '99999999999', '2147483648']) {
      component.numeroIdentificacion.set(invalido);
      expect(component.esValido()).withContext(invalido).toBeFalse();
    }
    component.numeroIdentificacion.set('2147483647');
    expect(component.esValido()).toBeTrue();
  });

  it('muestra el error del documento que devuelve la API en el campo', () => {
    adminService.admitirEstudiante.and.returnValue(
      throwError(() =>
        errorApi(400, 'INVALID_REQUEST', 'La solicitud no es válida.', [
          { field: 'numeroIdentificacion', code: 'FIELD_INVALID_TYPE', message: 'El numero de identificacion debe contener un numero entero valido.' },
        ])
      )
    );
    component.numeroIdentificacion.set('1017000666');
    component.primerNombre.set('QA');
    component.primerApellido.set('Admision');
    component.correo.set('qa@uco.edu.co');
    component.idPrograma.set('prog-1');

    component.onGuardar();

    expect(component.erroresCampos()['numeroIdentificacion']).toContain('entero');
    expect(component.errorGeneral()).toBeNull();
  });

  it('si los detalles no son de campos del formulario, muestra el mensaje general', () => {
    adminService.admitirEstudiante.and.returnValue(
      throwError(() =>
        errorApi(400, 'INVALID_REQUEST', 'La solicitud no es válida.', [
          { field: 'body', code: 'FIELD_REQUIRED', message: 'Falta el cuerpo.' },
        ])
      )
    );
    component.numeroIdentificacion.set('1017000777');
    component.primerNombre.set('QA');
    component.primerApellido.set('Admision');
    component.correo.set('qa@uco.edu.co');
    component.idPrograma.set('prog-1');

    component.onGuardar();

    expect(component.erroresCampos()).toEqual({});
    expect(component.errorGeneral()).toBeTruthy();
  });

  it('IDENT-002: un error de un backend anterior que pida la clave se muestra arriba sin abrir ningún campo', () => {
    adminService.admitirEstudiante.and.returnValue(
      throwError(() => errorApi(400, 'ERR_PASSWORD_REQUERIDO', 'La clave es obligatoria.'))
    );
    component.numeroIdentificacion.set('970000301');
    component.primerNombre.set('QA');
    component.primerApellido.set('Admision');
    component.correo.set('qa.estudiante.admision@uco.edu.co');
    component.idPrograma.set('prog-1');
    expect(component.esValido()).toBeTrue();

    component.onGuardar();
    fixture.detectChanges();

    expect(component.errorGeneral()).toBe('La clave es obligatoria.');
    expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeNull();
  });

  it('explica por qué no se puede admitir cuando el documento no es un número válido', () => {
    const aviso = () =>
      (Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="datos-persona"] [role="alert"]'))
        .find((a) => a.textContent?.includes('solo números')) as HTMLElement | undefined) ?? null;
    fixture.detectChanges();
    expect(aviso()).toBeNull();

    component.numeroIdentificacion.set('12a4');
    fixture.detectChanges();
    expect(component.documentoInvalido()).toBeTrue();
    expect(aviso()!.textContent).toContain('solo números');

    component.numeroIdentificacion.set('1017000111');
    fixture.detectChanges();
    expect(aviso()).toBeNull();
  });
});
