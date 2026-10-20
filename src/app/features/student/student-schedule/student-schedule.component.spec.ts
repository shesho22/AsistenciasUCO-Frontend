import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StudentScheduleComponent } from './student-schedule.component';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { HorarioItem } from '../../../core/models/role-management.model';

describe('StudentScheduleComponent', () => {
  let fixture: ComponentFixture<StudentScheduleComponent>;
  let component: StudentScheduleComponent;
  let studentServiceSpy: jasmine.SpyObj<StudentManagementService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockHorarios: HorarioItem[] = [
    {
      id: 'h1',
      codigoMateria: 'MAT-101',
      nombreMateria: 'Cálculo Diferencial',
      grupo: '01',
      dia: 'Martes',
      horaInicio: '08:00',
      horaFin: '10:00',
      aula: 'Aula 204',
      docente: 'Profesor Carlos',
      colorCategory: 'blue',
    },
    {
      id: 'h2',
      codigoMateria: 'FIS-102',
      nombreMateria: 'Física Mecánica',
      grupo: '02',
      dia: 'Jueves',
      horaInicio: '14:00',
      horaFin: '16:00',
      aula: 'Laboratorio 1',
      docente: 'Profesora Ana',
      colorCategory: 'emerald',
    },
  ];

  beforeEach(async () => {
    studentServiceSpy = jasmine.createSpyObj('StudentManagementService', ['getHorarios']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info']);

    studentServiceSpy.getHorarios.and.returnValue(
      of({ exitoso: true, datos: mockHorarios })
    );

    await TestBed.configureTestingModule({
      imports: [StudentScheduleComponent],
      providers: [
        { provide: StudentManagementService, useValue: studentServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar el horario de estudiante', () => {
    expect(component).toBeTruthy();
    expect(studentServiceSpy.getHorarios).toHaveBeenCalled();
    expect(component.horarios().length).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('debe filtrar las clases por día correctamente', () => {
    const clasesMartes = component.clasesPorDia('Martes');
    expect(clasesMartes.length).toBe(1);
    expect(clasesMartes[0].codigoMateria).toBe('MAT-101');

    const clasesLunes = component.clasesPorDia('Lunes');
    expect(clasesLunes.length).toBe(0);

    const clasesJueves = component.clasesPorDia('Jueves');
    expect(clasesJueves.length).toBe(1);
    expect(clasesJueves[0].codigoMateria).toBe('FIS-102');
  });

  it('debe manejar error al cargar el horario', () => {
    studentServiceSpy.getHorarios.and.returnValue(throwError(() => new Error('Error')));
    component.cargarHorario();
    expect(component.isLoading()).toBeFalse();
    expect(toastSpy.error).toHaveBeenCalledWith('Error al cargar horario de clases.');
  });

  it('debe retornar estilos de clases para cada categoría de color', () => {
    expect(component.getClaseClasses('emerald')).toContain('bg-emerald-50');
    expect(component.getClaseClasses('amber')).toContain('bg-amber-50');
    expect(component.getClaseClasses('blue')).toContain('bg-sky-50');
    expect(component.getClaseClasses('purple')).toContain('bg-purple-50');
  });
});
