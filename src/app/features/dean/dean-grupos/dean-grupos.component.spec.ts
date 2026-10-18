import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { DeanGruposComponent } from './dean-grupos.component';
import { environment } from '../../../../environments/environment';
import { Course } from '../../../core/models/course.model';

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

    http.expectOne(`${environment.apiUrl}/docente/horarios`).flush({
      exitoso: true,
      datos: mockCourses,
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('debe cargar los grupos de la facultad y calcular métricas', () => {
    expect(component.courses().length).toBe(2);
    expect(component.totalEstudiantes()).toBe(50);
    expect(component.totalCupos()).toBe(65);
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
