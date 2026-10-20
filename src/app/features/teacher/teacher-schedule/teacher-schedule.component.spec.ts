import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TeacherScheduleComponent } from './teacher-schedule.component';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { HorarioDocenteItem } from '../../../core/models/role-management.model';

describe('TeacherScheduleComponent', () => {
  let fixture: ComponentFixture<TeacherScheduleComponent>;
  let component: TeacherScheduleComponent;
  let claimServiceSpy: jasmine.SpyObj<AttendanceClaimService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockHorarios: HorarioDocenteItem[] = [
    {
      id: 'h1',
      codigoMateria: 'IS-101',
      nombreMateria: 'Ingeniería de Software',
      seccion: 'Grupo 01',
      dia: 'Lunes',
      horaInicio: '08:00',
      horaFin: '10:00',
      totalEstudiantes: 20,
      colorCategory: 'emerald',
    },
    {
      id: 'h2',
      codigoMateria: 'BD-201',
      nombreMateria: 'Bases de Datos',
      seccion: 'Grupo 02',
      dia: 'Miércoles',
      horaInicio: '10:00',
      horaFin: '12:00',
      totalEstudiantes: 25,
      colorCategory: 'amber',
    },
  ];

  beforeEach(async () => {
    claimServiceSpy = jasmine.createSpyObj('AttendanceClaimService', ['getHorarioDocente']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info']);

    claimServiceSpy.getHorarioDocente.and.returnValue(
      of({ exitoso: true, datos: mockHorarios })
    );

    await TestBed.configureTestingModule({
      imports: [TeacherScheduleComponent],
      providers: [
        { provide: AttendanceClaimService, useValue: claimServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crear el componente y cargar el horario docente', () => {
    expect(component).toBeTruthy();
    expect(claimServiceSpy.getHorarioDocente).toHaveBeenCalled();
    expect(component.horarios().length).toBe(2);
    expect(component.isLoading()).toBeFalse();
    expect(component.totalHorasSemanales()).toBe(4);
  });

  it('debe filtrar las clases por día correctamente', () => {
    const clasesLunes = component.clasesPorDia('Lunes');
    expect(clasesLunes.length).toBe(1);
    expect(clasesLunes[0].codigoMateria).toBe('IS-101');

    const clasesMartes = component.clasesPorDia('Martes');
    expect(clasesMartes.length).toBe(0);

    const clasesMiercoles = component.clasesPorDia('Miércoles');
    expect(clasesMiercoles.length).toBe(1);
    expect(clasesMiercoles[0].codigoMateria).toBe('BD-201');
  });

  it('debe manejar error al cargar el horario', () => {
    claimServiceSpy.getHorarioDocente.and.returnValue(throwError(() => new Error('Error')));
    component.cargarHorario();
    expect(component.isLoading()).toBeFalse();
    expect(toastSpy.error).toHaveBeenCalledWith('Error al cargar horario del docente.');
  });

  it('debe retornar estilos de clases para cada categoría de color', () => {
    expect(component.getClaseClasses('emerald')).toContain('bg-emerald-50');
    expect(component.getClaseClasses('amber')).toContain('bg-amber-50');
    expect(component.getClaseClasses('blue')).toContain('bg-sky-50');
    expect(component.getClaseClasses('purple')).toContain('bg-purple-50');
  });
});
