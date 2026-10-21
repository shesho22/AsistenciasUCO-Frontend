import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { DeanFacultyComponent } from './dean-faculty.component';
import { environment } from '../../../../environments/environment';
import { Course } from '../../../core/models/course.model';
import { ClassSession } from '../../../core/models/attendance.model';

// LB-001B.1B (DB source of truth cleanup): AS-IS #14 (tabla de cursos), #15 (ficha resumen),
// #16 (badge de status de sesión) y #17 (filtro de búsqueda por docenteName).

describe('DeanFacultyComponent', () => {
  let fixture: ComponentFixture<DeanFacultyComponent>;
  let component: DeanFacultyComponent;
  let http: HttpTestingController;

  const MARCADOR_DOCENTE = 'MARCADOR-DOCENTE-NO-DEBE-RENDERIZARSE';

  const course: Course = {
    id: 'crs-1',
    code: 'MAT-301',
    name: 'Matemática Avanzada III',
    section: 'Sección A',
    schedule: 'Lun, Mié 08:00 - 10:00 AM',
    room: 'Aula A-204',
    enrolledStudentsCount: 32,
    cupoMaximo: 35,
    docenteName: MARCADOR_DOCENTE,
    colorCategory: 'emerald',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DeanFacultyComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(DeanFacultyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http = TestBed.inject(HttpTestingController);
    http.expectOne(`${environment.apiUrl}/docente/asignaturas`).flush({
      exitoso: true,
      total: 0,
      datos: [],
    });
    http.expectOne(`${environment.apiUrl}/docente/horarios`).flush({
      exitoso: true,
      total: 0,
      datos: [],
    });

    const catalogUrls = [
      `${environment.apiUrl}/admin/sedes`,
      `${environment.apiUrl}/admin/espacios-fisicos`,
      `${environment.apiUrl}/admin/facultades`,
      `${environment.apiUrl}/admin/areas`,
      `${environment.apiUrl}/admin/parametros`,
      `${environment.apiUrl}/admin/auditoria`,
      `${environment.apiUrl}/coordinador/planes-estudio`,
      `${environment.apiUrl}/coordinador/periodos-academicos`,
    ];
    for (const url of catalogUrls) {
      http.expectOne(url).flush({
        exitoso: true,
        total: 0,
        datos: [],
      });
    }
  });

  afterEach(() => http.verify());

  it('no renderiza docenteName en la tabla de grupos de la facultad', () => {
    component.courses.set([course]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain(MARCADOR_DOCENTE);
  });

  it('filteredCourses() ya no busca coincidencias por docenteName', () => {
    component.courses.set([course]);
    component.searchGroup = 'marcador-docente';
    fixture.detectChanges();

    expect(component.filteredCourses()).toEqual([]);
  });

  it('la ficha resumen del grupo ya no muestra docenteName', () => {
    component.abrirDetalleGrupo(course);
    http.expectOne(`${environment.apiUrl}/sesiones/grupo/crs-1`).flush({
      exitoso: true,
      total: 0,
      datos: [],
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain(MARCADOR_DOCENTE);
  });

  it('el cronograma de sesiones del grupo ya no muestra el status sintético', () => {
    const sesionConcluida: ClassSession = {
      id: 'ses-1',
      courseId: 'crs-1',
      sessionNumber: 1,
      title: 'Sesión 1',
      date: '2026-09-14',
      startTime: '08:00',
      endTime: '10:00',
      records: [],
    };
    component.abrirDetalleGrupo(course);
    http.expectOne(`${environment.apiUrl}/sesiones/grupo/crs-1`).flush({
      exitoso: true,
      total: 1,
      datos: [],
    });
    component.sessions.set([sesionConcluida]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('CONCLUIDA');
  });
});
