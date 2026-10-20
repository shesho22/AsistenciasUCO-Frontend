import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TeacherService } from './teacher.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { DocenteApiDto } from '../api/models/docente-api-dto.model';
import { UserRole } from '../models/user.model';

describe('TeacherService', () => {
  let service: TeacherService;
  let http: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockTeacher: DocenteApiDto = {
    id: 'doc-1',
    idUsuario: 'usr-1',
    numeroIdentificacion: 1017001,
    nombreCompleto: 'Pedro Pérez',
    estaActivoUsuario: true,
  };

  beforeEach(() => {
    const mockUserSignal = signal({
      id: 'usr-1',
      name: 'Pedro Pérez',
      email: 'pperez@uco.edu.co',
      role: 'DOCENTE' as UserRole,
    });

    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: mockUserSignal.asReadonly(),
    });

    TestBed.configureTestingModule({
      providers: [
        TeacherService,
        { provide: AuthService, useValue: authServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(TeacherService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getAllTeachers realiza GET a /docentes', () => {
    service.getAllTeachers().subscribe((docentes) => {
      expect(docentes.length).toBe(1);
      expect(docentes[0].nombreCompleto).toBe('Pedro Pérez');
    });

    const req = http.expectOne(`${environment.apiUrl}/docentes`);
    expect(req.request.method).toBe('GET');
    req.flush([mockTeacher]);
  });

  it('getTeacherById realiza GET al endpoint con ID', () => {
    service.getTeacherById('doc-1').subscribe((res) => {
      expect(res.datos?.id).toBe('doc-1');
    });

    const req = http.expectOne(`${environment.apiUrl}/docentes/doc-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: { ...mockTeacher, totalGrupos: 2 } });
  });

  it('getCurrentTeacher retorna el docente asociado al usuario autenticado', () => {
    service.getCurrentTeacher().subscribe((docente) => {
      expect(docente.id).toBe('doc-1');
      expect(docente.idUsuario).toBe('usr-1');
    });

    const req = http.expectOne(`${environment.apiUrl}/docentes`);
    expect(req.request.method).toBe('GET');
    req.flush([mockTeacher]);
  });

  it('registerTeacherFromUser realiza POST a /docentes con usuarioId', () => {
    service.registerTeacherFromUser('usr-2').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const req = http.expectOne(`${environment.apiUrl}/docentes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ usuario: 'usr-2' });
    req.flush({ exitoso: true, mensajeUsuario: 'Docente registrado' });
  });

  it('assignTeacherToGroup realiza POST a /docentes/asignaciones/grupo', () => {
    service.assignTeacherToGroup('doc-1', 'grp-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const req = http.expectOne(`${environment.apiUrl}/docentes/asignaciones/grupo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ docente: 'doc-1', grupo: 'grp-1' });
    req.flush({ exitoso: true, mensajeUsuario: 'Asignación creada' });
  });

  it('getTeacherAssignments y getCurrentTeacherAssignments realizan peticiones correspondientes', () => {
    service.getTeacherAssignments('doc-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos.length).toBe(1);
    });

    const req = http.expectOne(`${environment.apiUrl}/docentes/doc-1/asignaciones`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, total: 1, datos: [{ idAsignacion: 'asig-1', idGrupo: 'grp-1', idDocente: 'doc-1' }] });

    service.getCurrentTeacherAssignments().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const reqDocentes = http.expectOne(`${environment.apiUrl}/docentes`);
    reqDocentes.flush([mockTeacher]);

    const reqAsig = http.expectOne(`${environment.apiUrl}/docentes/doc-1/asignaciones`);
    reqAsig.flush({ exitoso: true, total: 1, datos: [{ idAsignacion: 'asig-1', idGrupo: 'grp-1', idDocente: 'doc-1' }] });
  });
});
