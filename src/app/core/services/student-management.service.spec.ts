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

  it('getHorarios consulta /estudiante/horarios y adapta HorarioEstudianteDTO (dias reales, horas HH:mm)', () => {
    let resultado: HorarioItem[] = [];
    service.getHorarios().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      resultado = res.datos;
    });

    const req = http.expectOne(`${environment.apiUrl}/estudiante/horarios`);
    expect(req.request.method).toBe('GET');
    req.flush({
      exitoso: true,
      total: 2,
      datos: [
        {
          id: 'b1b2b3b4-0000-4000-8000-000000000001', idEstudiante: 'c1c2c3c4-0000-4000-8000-000000000001',
          idGrupo: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', codigoMateria: 'MAT101', nombreMateria: 'Cálculo I',
          grupo: 'G01', dia: 'LUNES', horaInicio: '08:00:00', horaFin: '10:00:00', docente: 'Dr. Roberto Gómez',
        },
        {
          id: 'b1b2b3b4-0000-4000-8000-000000000002', idEstudiante: 'c1c2c3c4-0000-4000-8000-000000000001',
          idGrupo: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', codigoMateria: 'MAT101', nombreMateria: 'Cálculo I',
          grupo: 'G01', dia: 'SABADO', horaInicio: '09:00:00', horaFin: '11:00:00', docente: 'Dr. Roberto Gómez',
        },
      ],
    });

    expect(resultado.map((h) => h.dia)).toEqual(['Lunes', 'Sábado']);
    expect(resultado[0].horaInicio).toBe('08:00');
    expect(resultado[0].aula).toBeNull();
  });

  it('getHorarios con datos vacios devuelve una lista vacia (no un error)', () => {
    let resultado: HorarioItem[] | undefined;
    service.getHorarios().subscribe((res) => (resultado = res.datos));
    http.expectOne(`${environment.apiUrl}/estudiante/horarios`).flush({ exitoso: true, datos: [], total: 0 });
    expect(resultado).toEqual([]);
  });

  it('getMaterias consulta /estudiante/materias y adapta MateriaEstudianteDTO sin inventar campos', () => {
    let resultado: MateriaEstudianteItem[] = [];
    service.getMaterias().subscribe((res) => {
      expect(res.exitoso).toBeTrue();
      resultado = res.datos;
    });

    const req = http.expectOne(`${environment.apiUrl}/estudiante/materias`);
    expect(req.request.method).toBe('GET');
    req.flush({
      exitoso: true,
      total: 1,
      datos: [{
        idAsignatura: 'e2f3a4b5-0000-0000-0000-000000000001',
        nombreAsignatura: 'Arquitectura de Software',
        idGrupo: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        nombreGrupo: 'Grupo 001 - Arq Software',
      }],
    });
    http.expectOne(`${environment.apiUrl}/estudiante/horarios`).flush({ exitoso: true, total: 0, datos: [] });

    expect(resultado.length).toBe(1);
    expect(resultado[0].id).toBe('e2f3a4b5-0000-0000-0000-000000000001');
    expect(resultado[0].nombre).toBe('Arquitectura de Software');
    expect(resultado[0].grupo).toBe('Grupo 001 - Arq Software');
    expect(resultado[0].indicadores).toBeNull();
  });

  it('F3-EST-01/02: cruza docente y horario por idGrupo con /estudiante/horarios y toma creditos y caracter', () => {
    const idGrupo = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    let resultado: MateriaEstudianteItem[] = [];
    service.getMaterias().subscribe((res) => (resultado = res.datos));
    http.expectOne(`${environment.apiUrl}/estudiante/materias`).flush({
      exitoso: true,
      datos: [{
        idAsignatura: 'e2f3a4b5-0000-0000-0000-000000000001',
        nombreAsignatura: 'Arquitectura de Software',
        idGrupo,
        nombreGrupo: 'Grupo 001',
        creditos: 3,
        codigoCaracter: 'OBL',
        nombreCaracter: 'Obligatoria',
      }],
    });
    http.expectOne(`${environment.apiUrl}/estudiante/horarios`).flush({
      exitoso: true,
      datos: [{
        id: 'f0000000-0000-0000-0000-000000000001', idEstudiante: 'f0000000-0000-0000-0000-000000000009', idGrupo,
        codigoMateria: 'ARQ-401', nombreMateria: 'Arquitectura de Software', grupo: 'Grupo 001',
        dia: 'Lunes', horaInicio: '08:00:00', horaFin: '10:00:00', docente: 'Ana Gómez',
      }],
    });
    expect(resultado[0].docente).toBe('Ana Gómez');
    expect(resultado[0].horario).toContain('08:00-10:00');
    expect(resultado[0].creditos).toBe(3);
    expect(resultado[0].caracter).toBe('Obligatoria');
  });

  it('si /estudiante/horarios falla, las materias se entregan igual con docente y horario en null', () => {
    let resultado: MateriaEstudianteItem[] = [];
    service.getMaterias().subscribe((res) => (resultado = res.datos));
    http.expectOne(`${environment.apiUrl}/estudiante/materias`).flush({
      exitoso: true,
      datos: [{ idAsignatura: 'e2f3a4b5-0000-0000-0000-000000000001', nombreAsignatura: 'X', idGrupo: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nombreGrupo: 'G' }],
    });
    http.expectOne(`${environment.apiUrl}/estudiante/horarios`).flush({}, { status: 500, statusText: 'err' });
    expect(resultado.length).toBe(1);
    expect(resultado[0].docente).toBeNull();
    expect(resultado[0].horario).toBeNull();
  });
});
