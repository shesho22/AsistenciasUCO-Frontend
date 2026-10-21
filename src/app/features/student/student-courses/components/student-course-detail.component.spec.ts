import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentCourseDetailComponent } from './student-course-detail.component';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
} from '../../../../core/models/role-management.model';
import { crearMateria, crearSesion } from '../../../../core/testing/student-portal.fixtures';

describe('StudentCourseDetailComponent', () => {
  let fixture: ComponentFixture<StudentCourseDetailComponent>;
  let component: StudentCourseDetailComponent;

  const mockMateria: MateriaEstudianteItem = crearMateria({
    nombre: 'Ingeniería de Software',
    codigo: 'IS-101',
    grupo: '01',
    docente: 'Carlos Docente',
    horario: 'Lunes 08:00 - 10:00',
    aula: 'Lab 2',
    creditos: 3,
    indicadores: { porcentajeAsistencia: 85, asistencias: 8, inasistencias: 2, totalClases: 10 },
    estado: 'Al día',
  });

  const mockSesiones: SesionMateriaDetalle[] = [
    crearSesion({ id: 'ses-1', numeroSesion: 1, fecha: '2026-09-01', horario: '08:00 - 10:00', estadoAsistencia: 'PRESENTE' }),
    crearSesion({
      id: 'ses-2',
      numeroSesion: 2,
      fecha: '2026-09-08',
      horario: '08:00 - 10:00',
      tema: 'Patrones GoF',
      estadoAsistencia: 'AUSENTE',
      reclamoId: 'rev-1',
      estadoReclamo: 'PENDIENTE',
      categoriaReclamo: 'Médico / Salud',
      justificacionEstudiante: 'Cita médica',
    }),
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

  describe('estados de la tabla de sesiones', () => {
    const texto = () => fixture.nativeElement.textContent as string;

    it('un error HTTP muestra el panel de error con reintento y NO "0 sesiones"', () => {
      spyOn(component.retry, 'emit');
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', []);
      fixture.componentRef.setInput('error', { kind: 'VALIDACION', titulo: 'Solicitud no válida', mensaje: 'rechazó' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-error"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-vacio"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="conteo-sesiones"]')).toBeNull();
      expect(texto()).not.toContain('0 sesiones');
      expect(texto()).not.toContain('No hay sesiones registradas');

      const reintentar = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
        .find((b) => b.textContent?.includes('Reintentar'));
      reintentar!.click();
      expect(component.retry.emit).toHaveBeenCalled();
    });

    it('un identificador invalido no ofrece reintento', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('error', { kind: 'IDENTIFICADOR', titulo: 'Identificador inválido', mensaje: 'x' });
      fixture.detectChanges();
      expect(texto()).not.toContain('Reintentar');
    });

    it('una respuesta 200 con cero sesiones muestra el estado vacio, sin error', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', []);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-vacio"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="sesiones-error"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="conteo-sesiones"]').textContent).toContain('0 sesiones');
    });

    it('una respuesta 200 con sesiones las lista', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', mockSesiones);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="conteo-sesiones"]').textContent).toContain('2 sesiones');
      expect(texto()).toContain('Patrones GoF');
    });

    it('NO_DISPONIBLE muestra "Estado no disponible" y NO ofrece Radicar Reclamo', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [crearSesion({ estadoAsistencia: 'NO_DISPONIBLE' })]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="estado-no-disponible"]')).not.toBeNull();
      expect(texto()).not.toContain('Radicar Reclamo');
      expect(texto()).not.toContain('AUSENTE');
    });

    it('una ausencia reclamable ofrece Radicar Reclamo; PRESENTE y JUSTIFICADA no', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'a', estadoAsistencia: 'AUSENTE', reclamable: true })]);
      fixture.detectChanges();
      expect(texto()).toContain('Radicar Reclamo');
      expect(fixture.nativeElement.querySelector('[data-testid="estado-no-disponible"]')).toBeNull();

      fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'r', estadoAsistencia: 'RETARDO', reclamable: true })]);
      fixture.detectChanges();
      expect(texto()).toContain('Radicar Reclamo');

      fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'b', estadoAsistencia: 'PRESENTE' })]);
      fixture.detectChanges();
      expect(texto()).not.toContain('Radicar Reclamo');

      fixture.componentRef.setInput('sesiones', [crearSesion({ id: 'j', estadoAsistencia: 'JUSTIFICADA' })]);
      fixture.detectChanges();
      expect(texto()).not.toContain('Radicar Reclamo');
    });

    it('una ausencia no reclamable (sin pista del backend) no ofrece Radicar Reclamo', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [crearSesion({ estadoAsistencia: 'AUSENTE', reclamable: false })]);
      fixture.detectChanges();
      expect(texto()).not.toContain('Radicar Reclamo');
    });

    it('una ausencia con solicitud existente muestra su estado y NO ofrece un reclamo duplicado', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [
        crearSesion({ estadoAsistencia: 'AUSENTE', reclamable: false, solicitudRevision: 'PENDIENTE' }),
      ]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="solicitud-existente"]').textContent)
        .toContain('pendiente');
      expect(texto()).not.toContain('Radicar Reclamo');
    });

    it('sin indicadores no renderiza NaN ni porcentajes inventados', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="detalle-asistencia-no-disponible"]')).not.toBeNull();
      expect(texto()).not.toContain('NaN');
      expect(texto()).not.toContain('undefined');
      expect(texto()).toContain('No informado');
    });

    it('marca la hora sin zona entregada por el backend', () => {
      fixture.componentRef.setInput('materia', crearMateria());
      fixture.componentRef.setInput('sesiones', [crearSesion({ temporalidad: 'SIN_ZONA' })]);
      fixture.detectChanges();
      expect(texto()).toContain('(sin zona)');
    });
  });
});
