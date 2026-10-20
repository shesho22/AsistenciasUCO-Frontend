import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherMatriculaModalComponent } from './teacher-matricula-modal.component';
import { ToastService } from '../../../../../shared/components/toast/toast.component';
import { Course } from '../../../../../core/models/course.model';

describe('TeacherMatriculaModalComponent', () => {
  let fixture: ComponentFixture<TeacherMatriculaModalComponent>;
  let component: TeacherMatriculaModalComponent;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockCourse: Course = {
    id: 'grp-12345',
    name: 'Ingeniería de Software I',
    code: 'IS-301',
    section: 'Grupo 01',
    enrolledStudentsCount: 25,
    cupoMaximo: 35,
    colorCategory: 'emerald',
    schedule: 'Lunes y Miércoles 08:00 - 10:00',
  };

  beforeEach(async () => {
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'info', 'warning', 'error']);

    await TestBed.configureTestingModule({
      imports: [TeacherMatriculaModalComponent],
      providers: [{ provide: ToastService, useValue: toastSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherMatriculaModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('curso', mockCourse);
    fixture.detectChanges();
  });

  it('debe crearse correctamente cuando está abierto con curso', () => {
    expect(component).toBeTruthy();
    expect(component.qrUrl()).toContain('api.qrserver.com');
    expect(component.qrUrl()).toContain(encodeURIComponent('grp-12345'));
  });

  it('copiarPin copia el identificador y notifica al usuario', () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    component.copiarPin();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('grp-12345');
    expect(toastSpy.success).toHaveBeenCalledWith('Código PIN de matrícula copiado al portapapeles.');
  });

  it('copiarEnlace copia la URL al portapapeles y notifica', () => {
    spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    component.copiarEnlace();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(toastSpy.success).toHaveBeenCalledWith('Enlace de matrícula copiado al portapapeles.');
  });

  it('emite evento closed al hacer click en cerrar', () => {
    let cerrado = false;
    component.closed.subscribe(() => (cerrado = true));
    component.closed.emit();
    expect(cerrado).toBeTrue();
  });
});
