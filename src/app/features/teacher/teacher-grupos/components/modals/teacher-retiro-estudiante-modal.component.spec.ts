import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TeacherRetiroEstudianteModalComponent } from './teacher-retiro-estudiante-modal.component';
import { ToastService } from '../../../../../shared/components/toast/toast.component';
import { environment } from '../../../../../../environments/environment';

const URL_RETIRO = `${environment.apiUrl}/docente/grupos/grp-1/estudiantes/est-1/retiro`;

describe('TeacherRetiroEstudianteModalComponent (HU051)', () => {
  let fixture: ComponentFixture<TeacherRetiroEstudianteModalComponent>;
  let component: TeacherRetiroEstudianteModalComponent;
  let http: HttpTestingController;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    TestBed.configureTestingModule({
      imports: [TeacherRetiroEstudianteModalComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: ToastService, useValue: toastSpy }],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TeacherRetiroEstudianteModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('grupoId', 'grp-1');
    fixture.componentRef.setInput('estudiante', { idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez' });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('RT-01 muestra a quién se retira y que se notificará', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ana Gómez');
    expect(texto).toContain('Motivo del retiro');
  });

  it('RT-02 el motivo es obligatorio: vacío o solo espacios no llama al backend', () => {
    component.motivo.set('   ');
    component.confirmar();
    expect(component.error()).toContain('obligatorio');
    http.expectNone(URL_RETIRO);
  });

  it('RT-03 el motivo no supera 500 caracteres', () => {
    component.motivo.set('x'.repeat(501));
    component.confirmar();
    expect(component.error()).toContain('500');
    http.expectNone(URL_RETIRO);
  });

  it('RT-04 confirma: POST con el motivo sin espacios extremos, avisa y emite retirado', () => {
    const retirado = jasmine.createSpy('retirado');
    component.retirado.subscribe(retirado);
    component.motivo.set('  Inasistencia reiterada  ');

    component.confirmar();
    const req = http.expectOne(URL_RETIRO);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'Inasistencia reiterada' });
    req.flush({ exitoso: true, datos: null });

    expect(retirado).toHaveBeenCalledWith('est-1');
    expect(toastSpy.success).toHaveBeenCalled();
    expect(component.enviando()).toBeFalse();
  });

  it('RT-05 un rechazo del backend (409 período terminado) se muestra y no emite retirado', () => {
    const retirado = jasmine.createSpy('retirado');
    component.retirado.subscribe(retirado);
    component.motivo.set('Motivo');

    component.confirmar();
    http.expectOne(URL_RETIRO).flush(
      { exitoso: false, message: 'El período académico del grupo ya terminó; no se puede retirar al estudiante.' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(retirado).not.toHaveBeenCalled();
    expect(component.error()).toContain('ya terminó');
    expect(component.enviando()).toBeFalse();
  });

  it('RT-06 cerrar emite closed y limpia el formulario', () => {
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);
    component.motivo.set('algo');
    component.cerrar();
    expect(closed).toHaveBeenCalled();
    expect(component.motivo()).toBe('');
  });

  it('RT-13 sin grupo o mientras envía no llama al backend', () => {
    fixture.componentRef.setInput('grupoId', null);
    component.motivo.set('Motivo');
    component.confirmar();
    http.expectNone(URL_RETIRO);

    fixture.componentRef.setInput('grupoId', 'grp-1');
    component.enviando.set(true);
    component.confirmar();
    http.expectNone(URL_RETIRO);
  });

  it('RT-14 sin nombre usa un texto genérico en el aviso', () => {
    fixture.componentRef.setInput('estudiante', { idEstudiante: 'est-1' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Estudiante');
    component.motivo.set('Motivo');
    component.confirmar();
    http.expectOne(URL_RETIRO).flush({ exitoso: true, datos: null });
    expect(toastSpy.success).toHaveBeenCalledWith('El estudiante fue retirado del grupo.');
  });

});
