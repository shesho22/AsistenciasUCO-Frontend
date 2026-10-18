import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { DeanGrupoDetalleComponent } from './dean-grupo-detalle.component';
import { environment } from '../../../../environments/environment';
import { Course } from '../../../core/models/course.model';

describe('DeanGrupoDetalleComponent', () => {
  let fixture: ComponentFixture<DeanGrupoDetalleComponent>;
  let component: DeanGrupoDetalleComponent;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockCourse: Course = {
    id: 'crs-1',
    code: 'MAT-301',
    name: 'Matemática Avanzada III',
    section: 'Sección A',
    schedule: 'Lun, Mié 08:00 - 10:00 AM',
    room: 'Aula A-204',
    enrolledStudentsCount: 28,
    cupoMaximo: 35,
    colorCategory: 'emerald',
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [DeanGrupoDetalleComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ grupoId: 'crs-1' }) } },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanGrupoDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne(`${environment.apiUrl}/docente/horarios`).flush({
      exitoso: true,
      datos: [mockCourse],
    });
    http.expectOne(`${environment.apiUrl}/sesiones/grupo/crs-1`).flush({
      exitoso: true,
      datos: [
        {
          id: 'ses-1',
          courseId: 'crs-1',
          sessionNumber: 1,
          title: 'Sesión Inaugural',
          date: '2026-09-14',
          startTime: '08:00',
          endTime: '10:00',
          records: [],
        },
      ],
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('resuelve el curso y las sesiones del grupo por grupoId', () => {
    expect(component.selectedCourse()?.code).toBe('MAT-301');
    expect(component.sessions().length).toBe(1);
  });

  it('regresa a la lista de grupos de la facultad', () => {
    component.volverAGrupos();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/app/decano/grupos']);
  });
});
