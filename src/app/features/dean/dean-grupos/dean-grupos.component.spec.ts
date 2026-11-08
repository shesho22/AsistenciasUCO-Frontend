import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { DeanGruposComponent } from './dean-grupos.component';
import { environment } from '../../../../environments/environment';
import { Course } from '../../../core/models/course.model';
import { HorarioDocenteApiDto } from '../../../core/api/models/horario-docente-api-dto.model';
import { grupoFacultadApi, paginaApi, porUrl } from '../../../core/testing/pagina-api';

describe('DeanGruposComponent', () => {
  let fixture: ComponentFixture<DeanGruposComponent>;
  let component: DeanGruposComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockCourses: Course[] = [
    {
      id: 'crs-1',
      code: 'MAT-301',
      name: 'Matemática Avanzada III',
      section: 'Sección A',
      schedule: 'Lun, Mié 08:00 - 10:00 AM',
      room: 'Aula A-204',
      enrolledStudentsCount: 28,
      cupoMaximo: 35,
      colorCategory: 'emerald',
    },
    {
      id: 'crs-2',
      code: 'SIS-102',
      name: 'Ingeniería de Software I',
      section: 'Sección B',
      schedule: 'Mar, Jue 10:00 - 12:00 PM',
      room: 'Lab B-101',
      enrolledStudentsCount: 22,
      cupoMaximo: 30,
      colorCategory: 'blue',
    },
  ];

  const mockCoursesApi: HorarioDocenteApiDto[] = [
    {
      id: 'hor-1',
      idDocente: 'doc-1',
      idGrupo: 'crs-1',
      codigoMateria: 'MAT-301',
      nombreMateria: 'Matemática Avanzada III',
      seccion: 'Sección A',
      dia: 'Lunes',
      horaInicio: '08:00',
      horaFin: '10:00',
      totalEstudiantes: 28,
    },
    {
      id: 'hor-2',
      idDocente: 'doc-1',
      idGrupo: 'crs-2',
      codigoMateria: 'SIS-102',
      nombreMateria: 'Ingeniería de Software I',
      seccion: 'Sección B',
      dia: 'Martes',
      horaInicio: '10:00',
      horaFin: '12:00',
      totalEstudiantes: 22,
    },
  ];

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [DeanGruposComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanGruposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Hallazgo del recorrido de vistas: el decano recibia 403 al pedir /docente/asignaturas y /docente/horarios
    // (endpoints del docente autenticado). Su listado de grupos sale de GET /decano/grupos (ambito de facultad).
    // B2NM: GET /decano/grupos es una página (ApiPageResponse) y cada grupo trae los nombres de sus programas.
    http.expectOne(porUrl(`${environment.apiUrl}/decano/grupos`)).flush(
      paginaApi(
        mockCoursesApi.map((h) =>
          grupoFacultadApi({
            idGrupo: h.idGrupo,
            codigo: h.codigoMateria,
            nombre: h.seccion,
            idAsignatura: `asig-${h.idGrupo}`,
            nombreAsignatura: h.nombreMateria,
            idDocente: h.idDocente,
            capacidadMaximaPermitida: 30,
            estudiantesActivos: h.totalEstudiantes,
            cuposDisponibles: 30 - (h.totalEstudiantes ?? 0),
            programas: h.idGrupo === 'crs-1' ? ['Ingeniería de Sistemas', 'Ingeniería de Software'] : ['Ingeniería de Sistemas'],
          })
        )
      )
    );
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('debe cargar los grupos de la facultad y calcular métricas', () => {
    expect(component.courses().length).toBe(2);
    expect(component.totalEstudiantes()).toBe(50);
    expect(component.totalCupos()).toBe(60);
  });

  it('B2NM: muestra los programas de cada grupo', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.courses()[0].programas).toEqual(['Ingeniería de Sistemas', 'Ingeniería de Software']);
    expect(texto).toContain('Ingeniería de Sistemas, Ingeniería de Software');
  });

  it('filtra grupos reactivamente mediante filtroTexto signal', () => {
    component.onFiltroChange('SIS-102');
    expect(component.filteredCourses().length).toBe(1);
    expect(component.filteredCourses()[0].id).toBe('crs-2');
  });

  it('navega al detalle del grupo mediante su ruta dedicada', () => {
    component.abrirDetalleGrupo(mockCourses[0]);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/grupos', 'crs-1']);
  });
});
