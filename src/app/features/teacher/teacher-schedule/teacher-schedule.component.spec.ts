import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TeacherScheduleComponent } from './teacher-schedule.component';
import { environment } from '../../../../environments/environment';

describe('TeacherScheduleComponent (ATA D7)', () => {
  it('muestra el título y consulta el calendario del docente, no los horarios regulares', () => {
    TestBed.configureTestingModule({
      imports: [TeacherScheduleComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TeacherScheduleComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('Mi Horario Académico');
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/docente/sesiones/calendario`);
    expect(req.request.params.has('hasta')).toBeTrue();
    http.expectNone(`${environment.apiUrl}/docente/horarios`);
    req.flush({ exitoso: true, datos: [] });
    http.verify();
  });
});
