import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AttendanceEnrollmentModalComponent } from './attendance-enrollment-modal.component';
import { StudentService } from '../../../../core/services/student.service';
import { EstudiantePaginaApiDto } from '../../../../core/api/models/estudiante-api-dto.model';

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
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceEnrollmentModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
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

  it('buscarEstudiante carga los datos cuando el estudiante ya existe en la base de datos', () => {
    const mockRespuesta: EstudiantePaginaApiDto = {
      items: [
        {
          id: 'est-1',
          idUsuario: 'usr-1',
          tipoIdentificacionId: 'tipo-cc',
          numeroIdentificacion: 1017123456,
          primerNombre: 'Ana',
          segundoNombre: 'María',
          primerApellido: 'Gómez',
          segundoApellido: 'Restrepo',
          nombreCompleto: 'Ana María Gómez Restrepo',
          correo: 'ana.gomez@uco.edu.co',
          estaActivoUsuario: true,
        },
      ],
      totalItems: 1,
      totalPages: 1,
      page: 0,
      size: 1,
    };

    studentServiceSpy.searchStudentByIdentification.and.returnValue(of(mockRespuesta));

    component.docType.set('tipo-cc');
    component.code.set('1017123456');
    component.buscarEstudiante();

    expect(studentServiceSpy.searchStudentByIdentification).toHaveBeenCalledWith('tipo-cc', 1017123456);
    expect(component.isExistingStudent()).toBeTrue();
    expect(component.firstName()).toBe('Ana');
    expect(component.lastName()).toBe('Gómez');
    expect(component.email()).toBe('ana.gomez@uco.edu.co');
    expect(component.searchStatus()).toBe('FOUND');
  });

  it('buscarEstudiante despliega formulario de registro si el estudiante no existe', () => {
    const mockVacio: EstudiantePaginaApiDto = {
      items: [],
      totalItems: 0,
      totalPages: 0,
      page: 0,
      size: 1,
    };

    studentServiceSpy.searchStudentByIdentification.and.returnValue(of(mockVacio));

    component.docType.set('tipo-cc');
    component.code.set('1017999999');
    component.buscarEstudiante();

    expect(component.isExistingStudent()).toBeFalse();
    expect(component.showRegistrationForm()).toBeTrue();
    expect(component.searchStatus()).toBe('NOT_FOUND');
  });

  it('buscarEstudiante despliega formulario limpio si el servicio responde con error', () => {
    studentServiceSpy.searchStudentByIdentification.and.returnValue(throwError(() => new Error('Not found')));

    component.docType.set('tipo-cc');
    component.code.set('1017999999');
    component.buscarEstudiante();

    expect(component.isExistingStudent()).toBeFalse();
    expect(component.showRegistrationForm()).toBeTrue();
    expect(component.searchStatus()).toBe('NOT_FOUND');
  });

  it('onSubmit emite submitted con datos válidos', () => {
    let payloadEmitido: any = null;
    component.submitted.subscribe((p) => (payloadEmitido = p));

    component.docType.set('tipo-cc');
    component.code.set('1017123456');
    component.firstName.set('Carlos');
    component.lastName.set('Ramírez');
    component.email.set('carlos.ramirez@uco.edu.co');
    component.password.set('Temporal2026*');
    component.confirmPassword.set('Temporal2026*');
    component.isExistingStudent.set(true);

    const event = new Event('submit');
    component.onSubmit(event);

    expect(payloadEmitido).toBeTruthy();
    expect(payloadEmitido.primerNombre).toBe('Carlos');
    expect(payloadEmitido.correo).toBe('carlos.ramirez@uco.edu.co');
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
});

