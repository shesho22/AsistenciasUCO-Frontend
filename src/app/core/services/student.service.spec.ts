import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { StudentService } from './student.service';
import { environment } from '../../../environments/environment';

describe('StudentService', () => {
  let service: StudentService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('USE_MOCKS', 'false');
    TestBed.configureTestingModule({
      providers: [StudentService, provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('USE_MOCKS');
  });

  it('rechaza una matrícula sin contraseña explícita y no llama al backend', () => {
    let receivedError: unknown;

    service
      .enrollStudentInGroup({
        grupo: 'grupo-1',
        tipoDocumento: 'tipo-1',
        numeroIdentificacion: 123456,
        primerNombre: 'Ada',
        primerApellido: 'Lovelace',
        correoElectronico: 'ada@example.test',
        password: '   ',
      })
      .subscribe({ error: (error) => (receivedError = error) });

    expect(receivedError).toBeTruthy();
    http.expectNone(`${environment.apiUrl}/grupos/grupo-1/estudiantes`);
  });

  it('matricula un estudiante con segundoNombre y segundoApellido exitosamente', () => {
    service
      .enrollStudentInGroup({
        grupo: 'grupo-1',
        tipoDocumento: 'tipo-cc',
        numeroIdentificacion: 1017123456,
        primerNombre: 'Ana',
        segundoNombre: 'María',
        primerApellido: 'Gómez',
        segundoApellido: 'Restrepo',
        correoElectronico: 'ana.gomez@uco.edu.co',
        password: 'PasswordSegura2026*',
      })
      .subscribe();

    const req = http.expectOne(`${environment.apiUrl}/grupos/grupo-1/estudiantes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      tipoIdentificacionId: 'tipo-cc',
      numeroIdentificacion: 1017123456,
      primerNombre: 'Ana',
      segundoNombre: 'María',
      primerApellido: 'Gómez',
      segundoApellido: 'Restrepo',
      correo: 'ana.gomez@uco.edu.co',
      password: 'PasswordSegura2026*',
    });
    req.flush({ exitoso: true, mensajeUsuario: 'Estudiante vinculado' });
  });

  it('obtiene los estudiantes de un grupo mediante getStudentsByGroup', () => {
    service.getStudentsByGroup('grupo-123').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/grupos/grupo-123/estudiantes`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [] });
  });

  it('obtiene los datos de un estudiante mediante getStudentById', () => {
    service.getStudentById('est-999').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/estudiantes/est-999`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'est-999', primerNombre: 'Test' });
  });

  it('A2-F-06 busca por documento exacto en el endpoint del grupo y no en /estudiantes', () => {
    let respuesta: unknown;
    service.searchStudentByIdentification('grupo-9', 'tipo-cc', 1017000111).subscribe((r) => (respuesta = r));

    const req = http.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/grupos/grupo-9/estudiantes/busqueda` &&
        r.params.get('tipoIdentificacionId') === 'tipo-cc' &&
        r.params.get('documento') === '1017000111'
    );
    expect(req.request.method).toBe('GET');
    http.expectNone((r) => r.url === `${environment.apiUrl}/estudiantes`);
    req.flush({
      exitoso: true,
      datos: {
        idEstudiante: 'est-1',
        primerNombre: 'Ana',
        segundoNombre: null,
        primerApellido: 'Gómez',
        segundoApellido: null,
        nombreCompleto: 'Ana Gómez',
        numeroIdentificacion: 1017000111,
        correoEnmascarado: 'a***@uco.edu.co',
        codigoEstadoMatriculaGrupo: 'I',
      },
    });
    expect((respuesta as { datos: { correoEnmascarado: string } }).datos.correoEnmascarado).toBe('a***@uco.edu.co');
  });

  it('A2-F-06 matricular a un estudiante existente no envía correo ni password', () => {
    service
      .enrollStudentInGroup({
        grupo: 'grupo-1',
        tipoDocumento: 'tipo-cc',
        numeroIdentificacion: 1017123456,
        primerNombre: 'Ana',
        primerApellido: 'Gómez',
      })
      .subscribe();

    const req = http.expectOne(`${environment.apiUrl}/grupos/grupo-1/estudiantes`);
    expect(req.request.method).toBe('POST');
    expect('correo' in req.request.body).toBeFalse();
    expect('password' in req.request.body).toBeFalse();
    expect(req.request.body.numeroIdentificacion).toBe(1017123456);
    req.flush({ exitoso: true, mensajeUsuario: 'ok' });
  });
});
