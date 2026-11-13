import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { of, throwError } from 'rxjs';
import { AttendanceEnrollmentModalComponent } from './attendance-enrollment-modal.component';
import { StudentService } from '../../../../core/services/student.service';
import { EstudianteBusquedaApiDto } from '../../../../core/api/models/estudiante-busqueda-api-dto.model';
import { apiHttpError } from '../../../../core/testing/api-error.fixture';

describe('AttendanceEnrollmentModalComponent', () => {
  let fixture: ComponentFixture<AttendanceEnrollmentModalComponent>;
  let component: AttendanceEnrollmentModalComponent;
  let studentServiceSpy: jasmine.SpyObj<StudentService>;

  beforeEach(async () => {
    studentServiceSpy = jasmine.createSpyObj('StudentService', ['searchStudentByIdentification']);

    await TestBed.configureTestingModule({
      imports: [AttendanceEnrollmentModalComponent],
      providers: [
        { provide: StudentService, useValue: studentServiceSpy },
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceEnrollmentModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('grupoId', 'grupo-7');
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('onDocTypeChange actualiza el tipo de documento y emite clearFieldError', () => {
    let clearedField = '';
    component.clearFieldError.subscribe((f) => (clearedField = f));

    component.onDocTypeChange('tipo-cc-uuid');
    expect(component.docType()).toBe('tipo-cc-uuid');
    expect(clearedField).toBe('tipoIdentificacionId');
  });

  it('onCodeChange actualiza el código y limpia el error', () => {
    let clearedField = '';
    component.clearFieldError.subscribe((f) => (clearedField = f));

    component.onCodeChange('1017123456');
    expect(component.code()).toBe('1017123456');
    expect(clearedField).toBe('numeroIdentificacion');
  });

  const encontrado = (extra: Partial<EstudianteBusquedaApiDto> = {}): EstudianteBusquedaApiDto => ({
    idEstudiante: 'est-1',
    primerNombre: 'Ana',
    segundoNombre: 'María',
    primerApellido: 'Gómez',
    segundoApellido: 'Restrepo',
    nombreCompleto: 'Ana María Gómez Restrepo',
    numeroIdentificacion: 1017123456,
    correoEnmascarado: 'a***@uco.edu.co',
    codigoEstadoMatriculaGrupo: null,
    ...extra,
  });

  function buscar(datos: EstudianteBusquedaApiDto | null): void {
    studentServiceSpy.searchStudentByIdentification.and.returnValue(of({ exitoso: true, datos }));
    component.docType.set('tipo-cc');
    component.code.set('1017123456');
    component.buscarEstudiante();
    fixture.detectChanges();
  }

  it('A2-F-06 la búsqueda usa el grupo, el tipo y el documento exactos', () => {
    buscar(encontrado());
    expect(studentServiceSpy.searchStudentByIdentification).toHaveBeenCalledOnceWith('grupo-7', 'tipo-cc', 1017123456);
  });

  it('A2-F-06 con resultado rellena los nombres y muestra el correo enmascarado de solo lectura', () => {
    buscar(encontrado());

    expect(component.isExistingStudent()).toBeTrue();
    expect(component.firstName()).toBe('Ana');
    expect(component.secondName()).toBe('María');
    expect(component.lastName()).toBe('Gómez');
    expect(component.secondLastName()).toBe('Restrepo');
    expect(component.searchStatus()).toBe('FOUND');
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('a***@uco.edu.co');
    expect(host.querySelector('input[name="studentEmail"]')).toBeNull();
    expect(host.querySelector('input[type="password"]')).toBeNull();
  });

  it('A2-F-06 matricular a un existente no envía correo ni password', () => {
    buscar(encontrado());
    let payload: { correo: string; password: string; esNuevoEstudiante?: boolean } | undefined;
    component.submitted.subscribe((p) => (payload = p));

    component.onSubmit(new Event('submit'));

    expect(payload?.correo).toBe('');
    expect(payload?.password).toBe('');
    expect(payload?.esNuevoEstudiante).toBeFalse();
  });

  it('A2-F-06 con matrícula activa (A) avisa "Ya está matriculado" y bloquea el envío', () => {
    buscar(encontrado({ codigoEstadoMatriculaGrupo: 'A' }));
    let emitido = false;
    component.submitted.subscribe(() => (emitido = true));

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ya está matriculado en este grupo');
    component.onSubmit(new Event('submit'));

    expect(emitido).toBeFalse();
  });

  it('A2-F-06 con matrícula retirada (I) avisa que se reactivará y permite enviar', () => {
    buscar(encontrado({ codigoEstadoMatriculaGrupo: 'I' }));
    let emitido = false;
    component.submitted.subscribe(() => (emitido = true));

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('se reactivará');
    component.onSubmit(new Event('submit'));

    expect(emitido).toBeTrue();
  });

  it('A2-F-06 sin resultado abre el alta de estudiante nuevo con el formulario limpio', () => {
    buscar(null);

    expect(component.isExistingStudent()).toBeFalse();
    expect(component.showRegistrationForm()).toBeTrue();
    expect(component.searchStatus()).toBe('NOT_FOUND');
    expect(component.firstName()).toBe('');
    expect(component.email()).toBe('');
  });

  it('A2-F-06 un 403 muestra el message del backend y no abre el alta', () => {
    studentServiceSpy.searchStudentByIdentification.and.returnValue(
      throwError(() => apiHttpError(403, 'No tiene permiso sobre este grupo.', 'ACCESS_DENIED'))
    );
    component.docType.set('tipo-cc');
    component.code.set('1017999999');
    component.buscarEstudiante();
    fixture.detectChanges();

    expect(component.showRegistrationForm()).toBeFalse();
    expect(component.isExistingStudent()).toBeFalse();
    expect(component.searchError()).toBe('No tiene permiso sobre este grupo.');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No tiene permiso sobre este grupo.');
  });

  it('A2-F-06 un 400 muestra el message del backend y no abre el alta', () => {
    studentServiceSpy.searchStudentByIdentification.and.returnValue(
      throwError(() => apiHttpError(400, 'El número de documento no es válido.', 'FIELD_INVALID_DOCUMENTO'))
    );
    component.docType.set('tipo-cc');
    component.code.set('1017999999');
    component.buscarEstudiante();

    expect(component.showRegistrationForm()).toBeFalse();
    expect(component.searchError()).toBe('El número de documento no es válido.');
  });

  it('onSubmit emite submitted con los datos del alta de un estudiante nuevo', () => {
    let payloadEmitido: any = null;
    component.submitted.subscribe((p) => (payloadEmitido = p));

    component.docType.set('tipo-cc');
    component.code.set('1017123456');
    component.showRegistrationForm.set(true);
    component.firstName.set('Carlos');
    component.lastName.set('Ramírez');
    component.email.set('carlos.ramirez@uco.edu.co');
    component.password.set('Temporal2026*');
    component.confirmPassword.set('Temporal2026*');

    component.onSubmit(new Event('submit'));

    expect(payloadEmitido).toBeTruthy();
    expect(payloadEmitido.primerNombre).toBe('Carlos');
    expect(payloadEmitido.correo).toBe('carlos.ramirez@uco.edu.co');
    expect(payloadEmitido.esNuevoEstudiante).toBeTrue();
  });

  it('onFieldInput actualiza el valor y limpia los errores de confirmPassword', () => {
    let campoLimpio = '';
    component.clearFieldError.subscribe((f) => (campoLimpio = f));

    component.confirmPasswordError.set('Error previo');
    component.password.set('Secret123*');
    component.onFieldInput('confirmPassword', 'Secret123*', component.confirmPassword);

    expect(component.confirmPassword()).toBe('Secret123*');
    expect(component.confirmPasswordError()).toBe('');
    expect(campoLimpio).toBe('confirmPassword');
  });

  it('desplegarFormularioNuevoEstudiante limpia formulario y muestra campos', () => {
    component.firstName.set('Previo');
    component.desplegarFormularioNuevoEstudiante();

    expect(component.isExistingStudent()).toBeFalse();
    expect(component.firstName()).toBe('');
    expect(component.showRegistrationForm()).toBeTrue();
    expect(component.searchStatus()).toBe('NOT_FOUND');
  });

  it('onCodeBlur y onCodeEnter invocan buscarEstudiante si no es estudiante existente ni nuevo registro', () => {
    spyOn(component, 'buscarEstudiante');

    component.onCodeBlur();
    expect(component.buscarEstudiante).toHaveBeenCalledTimes(1);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onCodeEnter(event);
    expect(component.buscarEstudiante).toHaveBeenCalledTimes(2);
  });

  it('buscarEstudiante no ejecuta búsqueda si falta tipo o el código tiene menos de 5 caracteres', () => {
    component.docType.set('');
    component.code.set('123');
    component.buscarEstudiante();
    expect(studentServiceSpy.searchStudentByIdentification).not.toHaveBeenCalled();

    component.docType.set('tipo-cc');
    component.code.set('abcde');
    component.buscarEstudiante();
    expect(studentServiceSpy.searchStudentByIdentification).not.toHaveBeenCalled();
  });

  it('onSubmit valida contraseñas al registrar nuevo estudiante', () => {
    let payloadEmitido: any = null;
    component.submitted.subscribe((p) => (payloadEmitido = p));

    component.showRegistrationForm.set(true);
    component.docType.set('tipo-cc');
    component.code.set('1017123456');
    component.firstName.set('Nuevo');
    component.lastName.set('Alumno');
    component.email.set('nuevo@uco.edu.co');
    component.password.set('Pass1234*');
    component.confirmPassword.set('');

    const event = new Event('submit');
    component.onSubmit(event);

    expect(component.confirmPasswordError()).toBe('Debe confirmar la contraseña.');
    expect(payloadEmitido.hasLocalConfirmError).toBeTrue();

    // Contraseñas no coinciden
    component.confirmPassword.set('PassDistinta*');
    component.onSubmit(event);
    expect(component.confirmPasswordError()).toBe('Las contraseñas no coinciden.');
    expect(payloadEmitido.hasLocalConfirmError).toBeTrue();

    // Contraseñas coinciden
    component.confirmPassword.set('Pass1234*');
    component.onSubmit(event);
    expect(component.confirmPasswordError()).toBe('');
    expect(payloadEmitido.hasLocalConfirmError).toBeFalse();
  });

  it('IDENT-001: el payload distingue al estudiante nuevo del existente', () => {
    let payloadEmitido: any = null;
    component.submitted.subscribe((p) => (payloadEmitido = p));
    const event = new Event('submit');

    component.showRegistrationForm.set(true);
    component.onSubmit(event);
    expect(payloadEmitido.esNuevoEstudiante).toBeTrue();

    component.showRegistrationForm.set(false);
    component.onSubmit(event);
    expect(payloadEmitido.esNuevoEstudiante).toBeFalse();
  });

  it('IDENT-001: muestra el dominio exigido y lo usa en el ejemplo del campo correo', () => {
    component.showRegistrationForm.set(true);
    fixture.componentRef.setInput('emailDomain', '@otra.edu');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="email-domain-hint"]')?.textContent).toContain('@otra.edu');
    expect(host.querySelector<HTMLInputElement>('input[name="studentEmail"]')?.placeholder).toBe('juan.perez@otra.edu');
  });

  it('IDENT-001: sin dominio conocido no muestra la ayuda y conserva el ejemplo institucional', () => {
    component.showRegistrationForm.set(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="email-domain-hint"]')).toBeNull();
    expect(host.querySelector<HTMLInputElement>('input[name="studentEmail"]')?.placeholder).toBe('juan.perez@uco.edu.co');
  });

  describe('F-DOC-006: discriminación de errores en buscarEstudiante', () => {
    it('un error 404 abre el formulario de nuevo registro', () => {
      studentServiceSpy.searchStudentByIdentification.and.returnValue(
        throwError(() => apiHttpError(404, 'Estudiante no encontrado.', 'RESOURCE_NOT_FOUND'))
      );
      component.docType.set('tipo-cc');
      component.code.set('1017123456');
      component.buscarEstudiante();
      fixture.detectChanges();

      expect(component.showRegistrationForm()).toBeTrue();
      expect(component.searchStatus()).toBe('NOT_FOUND');
      expect(component.isExistingStudent()).toBeFalse();
    });

    it('un error 403 no abre el formulario de registro y muestra el mensaje', () => {
      studentServiceSpy.searchStudentByIdentification.and.returnValue(
        throwError(() => apiHttpError(403, 'No tiene permisos para buscar estudiantes.', 'FORBIDDEN'))
      );
      component.docType.set('tipo-cc');
      component.code.set('1017123456');
      component.buscarEstudiante();
      fixture.detectChanges();

      expect(component.showRegistrationForm()).toBeFalse();
      expect(component.searchStatus()).toBe('IDLE');
      expect(component.searchError()).toContain('No tiene permisos');
    });

    it('un error 500 o fallo de red no abre el formulario de registro', () => {
      studentServiceSpy.searchStudentByIdentification.and.returnValue(
        throwError(() => apiHttpError(500, 'Error interno del servidor.', 'INTERNAL_ERROR'))
      );
      component.docType.set('tipo-cc');
      component.code.set('1017123456');
      component.buscarEstudiante();
      fixture.detectChanges();

      expect(component.showRegistrationForm()).toBeFalse();
      expect(component.searchStatus()).toBe('IDLE');
      expect(component.searchError()).toBeTruthy();
    });
  });

  it('onClose resetea el formulario y emite evento closed', () => {
    let cerrado = false;
    component.closed.subscribe(() => (cerrado = true));

    component.docType.set('tipo-cc');
    component.code.set('1017123456');
    component.firstName.set('Nombre');

    component.onClose();

    expect(component.docType()).toBe('');
    expect(component.code()).toBe('');
    expect(component.firstName()).toBe('');
    expect(cerrado).toBeTrue();
  });

  // CULM-001 B2NM: el docente elige el programa del estudiante solo cuando el grupo tiene más de uno.
  describe('programa del estudiante en grupos mixtos', () => {
    let http: HttpTestingController;
    const url = `${environment.apiUrl}/grupos/grupo-7/programas`;

    beforeEach(() => {
      http = TestBed.inject(HttpTestingController);
    });

    it('consulta los programas del grupo al abrir y, con uno solo, no muestra el selector ni envía idPrograma', () => {
      http.expectOne(url).flush({ exitoso: true, total: 1, datos: [{ idPrograma: 'prg-a', nombrePrograma: 'Sistemas' }] });
      fixture.detectChanges();
      let emitido: { idPrograma?: string } | null = null;
      component.submitted.subscribe((p) => (emitido = p));

      expect(component.programas().length).toBe(1);
      expect(component.idPrograma()).toBe('prg-a');
      expect(fixture.nativeElement.textContent).not.toContain('Programa del estudiante');
      component.docType.set('tipo-cc');
      component.code.set('1017123456');
      component.onSubmit(new Event('submit'));
      expect(emitido!.idPrograma).toBeUndefined();
    });

    it('con varios programas muestra el selector, exige elegir uno y envía idPrograma', () => {
      http.expectOne(url).flush({
        exitoso: true, total: 2,
        datos: [{ idPrograma: 'prg-a', nombrePrograma: 'Sistemas' }, { idPrograma: 'prg-b', nombrePrograma: 'Software' }],
      });
      fixture.detectChanges();
      const emitidos: { idPrograma?: string }[] = [];
      component.submitted.subscribe((p) => emitidos.push(p));

      const host = fixture.nativeElement as HTMLElement;
      expect(host.textContent).toContain('Programa del estudiante');
      expect(component.opcionesPrograma().map((o) => o.label)).toEqual(['Sistemas', 'Software']);
      expect(component.faltaPrograma()).toBeTrue();

      component.docType.set('tipo-cc');
      component.code.set('1017123456');
      component.onSubmit(new Event('submit'));
      expect(emitidos.length).toBe(0);

      component.idPrograma.set('prg-b');
      expect(component.faltaPrograma()).toBeFalse();
      component.onSubmit(new Event('submit'));
      expect(emitidos[0].idPrograma).toBe('prg-b');
    });

    it('si la consulta de programas falla no muestra selector (el backend responde EST_005 si hace falta)', () => {
      http.expectOne(url).flush({ message: 'Error' }, { status: 500, statusText: 'Error' });
      expect(component.programas()).toEqual([]);
      expect(component.faltaPrograma()).toBeFalse();
    });

    it('cerrado no consulta y al cambiar de grupo reinicia la selección', () => {
      http.expectOne(url).flush({ exitoso: true, total: 0, datos: [] });
      fixture.componentRef.setInput('isOpen', false);
      fixture.detectChanges();
      http.expectNone(`${environment.apiUrl}/grupos/grupo-7/programas`);
      expect(component.programas()).toEqual([]);
      expect(component.idPrograma()).toBe('');
    });
  });
});
