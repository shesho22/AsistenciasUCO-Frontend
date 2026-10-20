import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StudentManagementService } from './student-management.service';
import { environment } from '../../../environments/environment';
import { HorarioItem, MateriaEstudianteItem } from '../models/role-management.model';

describe('StudentManagementService', () => {
  let service: StudentManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StudentManagementService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getHorarios realiza petición GET a /estudiante/horarios', () => {
    const mockHorarios: HorarioItem[] = [
      {
        id: 'hor-1',
        dia: 'Lunes',
        horaInicio: '08:00',
        horaFin: '10:00',
        codigoMateria: 'MAT101',
        nombreMateria: 'Cálculo I',
        grupo: 'G01',
        aula: 'A-201',
        docente: 'Dr. Roberto Gómez',
        colorCategory: 'blue',
      },
    ];

    service.getHorarios().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
    });

    const req = http.expectOne(`${environment.apiUrl}/estudiante/horarios`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: mockHorarios });
  });

  it('getMaterias realiza petición GET a /estudiante/materias', () => {
    const mockMaterias: MateriaEstudianteItem[] = [
      {
        id: 'mat-1',
        codigo: 'MAT101',
        nombre: 'Cálculo I',
        creditos: 3,
        docente: 'Dr. Roberto Gómez',
        grupo: 'G01',
        aula: 'A-201',
        horario: 'Lun 08:00 - 10:00',
        totalClases: 20,
        asistencias: 19,
        inasistencias: 1,
        porcentajeAsistencia: 95,
        estado: 'Al día',
      },
    ];

    service.getMaterias().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      expect(res.datos?.length).toBe(1);
    });

    const req = http.expectOne(`${environment.apiUrl}/estudiante/materias`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: mockMaterias });
  });

  it('getPrerrequisitosMateria realiza petición GET para prerrequisitos', () => {
    service.getPrerrequisitosMateria('mat-1').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const req = http.expectOne(`${environment.apiUrl}/estudiante/materias/mat-1/prerrequisitos`);
    expect(req.request.method).toBe('GET');
    req.flush({ exitoso: true, datos: [] });
  });

  it('matricularGrupo realiza petición POST con el código o pin', () => {
    service.matricularGrupo('PIN-12345').subscribe((res) => {
      expect(res.exitoso).toBeTrue();
    });

    const req = http.expectOne(`${environment.apiUrl}/estudiante/matricular-grupo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ codigo: 'PIN-12345' });
    req.flush({ exitoso: true, datos: { matriculado: true } });
  });
});
