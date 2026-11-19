import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StudentScheduleComponent } from './student-schedule.component';
import { environment } from '../../../../environments/environment';

describe('StudentScheduleComponent (ATA D7)', () => {
  it('muestra el título y consulta el calendario del estudiante, no los horarios regulares', () => {
    TestBed.configureTestingModule({
      imports: [StudentScheduleComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StudentScheduleComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('Mi Horario de Clases');
    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/estudiante/sesiones/calendario`);
    expect(req.request.params.has('desde')).toBeTrue();
    http.expectNone(`${environment.apiUrl}/estudiante/horarios`);
    req.flush({ exitoso: true, datos: [] });
    http.verify();
  });
});
