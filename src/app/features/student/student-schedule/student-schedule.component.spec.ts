import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { StudentScheduleComponent } from './student-schedule.component';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { HorarioItem } from '../../../core/models/role-management.model';

describe('StudentScheduleComponent', () => {
  let fixture: ComponentFixture<StudentScheduleComponent>;
  let component: StudentScheduleComponent;
  let studentServiceSpy: jasmine.SpyObj<StudentManagementService>;

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

    studentServiceSpy.getHorarios.and.returnValue(
      of({ exitoso: true, datos: mockHorarios })
    );

    await TestBed.configureTestingModule({
      imports: [StudentScheduleComponent],
      providers: [
        { provide: StudentManagementService, useValue: studentServiceSpy },
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

  it('un error HTTP no se presenta como horario vacio: muestra el estado de error con reintento', () => {
    studentServiceSpy.getHorarios.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.cargarHorario();
    fixture.detectChanges();

    expect(component.isLoading()).toBeFalse();
    expect(component.error()?.kind).toBe('SERVIDOR');
    expect(fixture.nativeElement.querySelector('[data-testid="horarios-error"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="horarios-vacio"]')).toBeNull();
  });

  it('una respuesta 200 sin filas indica que no hay clases registradas', () => {
    studentServiceSpy.getHorarios.and.returnValue(of({ exitoso: true, datos: [] }));
    component.cargarHorario();
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="horarios-vacio"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="horarios-error"]')).toBeNull();
  });

  it('muestra la columna del sabado solo cuando hay clases ese dia', () => {
    expect(component.diasVisibles()).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);

    studentServiceSpy.getHorarios.and.returnValue(
      of({ exitoso: true, datos: [{ ...mockHorarios[0], id: 'h3', dia: 'Sábado' }] })
    );
    component.cargarHorario();
    fixture.detectChanges();

    expect(component.diasVisibles()).toContain('Sábado');
    expect(fixture.nativeElement.textContent).toContain('Sábado');
  });

  it('renderiza "no informada/o" para aula y docente ausentes en lugar de textos vacios', () => {
    studentServiceSpy.getHorarios.and.returnValue(
      of({ exitoso: true, datos: [{ ...mockHorarios[0], aula: null, docente: null }] })
    );
    component.cargarHorario();
    fixture.detectChanges();

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Aula no informada');
    expect(texto).toContain('Docente no informado');
    expect(texto).not.toContain('null');
  });

  it('debe retornar estilos de clases para cada categoría de color', () => {
    expect(component.getClaseClasses('emerald')).toContain('bg-emerald-50');
    expect(component.getClaseClasses('amber')).toContain('bg-amber-50');
    expect(component.getClaseClasses('blue')).toContain('bg-sky-50');
    expect(component.getClaseClasses('purple')).toContain('bg-purple-50');
  });
});
