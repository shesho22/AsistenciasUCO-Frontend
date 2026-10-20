import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentCourseDetailComponent } from './student-course-detail.component';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
} from '../../../../core/models/role-management.model';

describe('StudentCourseDetailComponent', () => {
  let fixture: ComponentFixture<StudentCourseDetailComponent>;
  let component: StudentCourseDetailComponent;

  const mockMateria: MateriaEstudianteItem = {
    id: 'mat-1',
    codigo: 'IS-101',
    nombre: 'Ingeniería de Software',
    grupo: '01',
    docente: 'Carlos Docente',
    horario: 'Lunes 08:00 - 10:00',
    aula: 'Lab 2',
    creditos: 3,
    porcentajeAsistencia: 85,
    asistencias: 8,
    inasistencias: 2,
    totalClases: 10,
    estado: 'Al día',
  };

  const mockSesiones: SesionMateriaDetalle[] = [
    {
      id: 'ses-1',
      materiaId: 'mat-1',
      numeroSesion: 1,
      fecha: '2026-09-01',
      horario: '08:00 - 10:00',
      tema: 'Introducción',
      estadoAsistencia: 'PRESENTE',
    },
    {
      id: 'ses-2',
      materiaId: 'mat-1',
      numeroSesion: 2,
      fecha: '2026-09-08',
      horario: '08:00 - 10:00',
      tema: 'Patrones GoF',
      estadoAsistencia: 'AUSENTE',
      reclamoId: 'rev-1',
      estadoReclamo: 'PENDIENTE',
      categoriaReclamo: 'Médico / Salud',
      justificacionEstudiante: 'Cita médica',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentCourseDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentCourseDetailComponent);
    component = fixture.componentInstance;
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('debe emitir back cuando se hace clic en volver', () => {
    spyOn(component.back, 'emit');
    fixture.componentRef.setInput('materia', mockMateria);
    fixture.detectChanges();

    const backButton = fixture.nativeElement.querySelector('button');
    backButton.click();

    expect(component.back.emit).toHaveBeenCalled();
  });

  it('debe retornar variantes correctas en getBadgeVariant', () => {
    expect(component.getBadgeVariant('Al día')).toBe('success');
    expect(component.getBadgeVariant('Riesgo')).toBe('warning');
    expect(component.getBadgeVariant('Crítico')).toBe('danger');
    expect(component.getBadgeVariant('Desconocido' as any)).toBe('neutral');
  });

  it('debe retornar variantes correctas en getAsistenciaBadgeVariant', () => {
    expect(component.getAsistenciaBadgeVariant('PRESENTE')).toBe('success');
    expect(component.getAsistenciaBadgeVariant('RETARDO')).toBe('warning');
    expect(component.getAsistenciaBadgeVariant('AUSENTE')).toBe('danger');
    expect(component.getAsistenciaBadgeVariant('JUSTIFICADA')).toBe('info');
    expect(component.getAsistenciaBadgeVariant('OTRO' as any)).toBe('neutral');
  });

  it('debe retornar clases correctas en getReclamoStatusClasses', () => {
    expect(component.getReclamoStatusClasses('APROBADA')).toContain('text-emerald-800');
    expect(component.getReclamoStatusClasses('RECHAZADA')).toContain('text-red-800');
    expect(component.getReclamoStatusClasses('PENDIENTE')).toContain('text-amber-800');
  });

  it('debe renderizar sesiones e interactuar con startClaim y withdrawClaim', () => {
    spyOn(component.startClaim, 'emit');
    spyOn(component.withdrawClaim, 'emit');

    fixture.componentRef.setInput('materia', mockMateria);
    fixture.componentRef.setInput('sesiones', mockSesiones);
    fixture.detectChanges();

    component.startClaim.emit(mockSesiones[1]);
    expect(component.startClaim.emit).toHaveBeenCalledWith(mockSesiones[1]);

    component.withdrawClaim.emit(mockSesiones[1]);
    expect(component.withdrawClaim.emit).toHaveBeenCalledWith(mockSesiones[1]);
  });
});
