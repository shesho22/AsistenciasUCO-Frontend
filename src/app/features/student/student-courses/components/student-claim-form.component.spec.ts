import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentClaimFormComponent } from './student-claim-form.component';
import { SOPORTE_ACCEPT } from '../../../../core/files/soporte-file.validator';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  SoporteAdjuntoItem,
} from '../../../../core/models/role-management.model';
import { crearMateria, crearSesion } from '../../../../core/testing/student-portal.fixtures';

describe('StudentClaimFormComponent — soporte (LB-004D FE-01..FE-03)', () => {
  let fixture: ComponentFixture<StudentClaimFormComponent>;
  let component: StudentClaimFormComponent;

  const setInputs = (inputs: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StudentClaimFormComponent] });
    fixture = TestBed.createComponent(StudentClaimFormComponent);
    component = fixture.componentInstance;
    setInputs({
      materia: { id: 'm-1', nombre: 'Matemáticas', docente: 'Prof. X' },
      sesion: { id: 's-1', numeroSesion: 3, fecha: '2026-10-19', horario: '08:00', estadoAsistencia: 'AUSENTE', tema: 'Álgebra' },
    });
  });

  it('anuncia el límite real de 5 MB y restringe el selector a PDF/PNG/JPEG', () => {
    expect(host().textContent).toContain('Máx. 5 MB');
    expect(host().textContent).not.toContain('10MB');
    const input = host().querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('accept')).toBe(SOPORTE_ACCEPT);
  });

  it('el soporte es opcional: se puede radicar solo con la justificación', () => {
    const emitted: unknown[] = [];
    component.submitted.subscribe((value) => emitted.push(value));
    component.justificacion.set('  Cita médica  ');
    component.onSubmit();
    expect(emitted).toEqual([{ categoria: 'Médico / Salud', justificacion: 'Cita médica' }]);
  });

  it('no emite una justificación vacía', () => {
    const emitted: unknown[] = [];
    component.submitted.subscribe((value) => emitted.push(value));
    component.justificacion.set('   ');
    component.onSubmit();
    expect(emitted).toEqual([]);
  });

  it('muestra el estado de subida con opción de cancelar y oculta el selector mientras sube', () => {
    let removed = 0;
    component.removeFile.subscribe(() => removed++);
    setInputs({ subiendo: true });

    expect(host().textContent).toContain('Subiendo y analizando');
    expect(host().querySelector('input[type="file"]')).toBeNull();
    (Array.from(host().querySelectorAll('button')).find((b) => b.textContent?.includes('Cancelar') && b.className.includes('red')) as HTMLButtonElement).click();
    expect(removed).toBe(1);
  });

  it('muestra el error del soporte de forma accesible', () => {
    setInputs({ errorSoporte: 'El archivo supera el tamaño máximo permitido de 5 MB.' });
    const alert = host().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('5 MB');
  });

  it('muestra el adjunto ya cargado y permite removerlo', () => {
    let removed = 0;
    component.removeFile.subscribe(() => removed++);
    setInputs({ archivo: { fileId: 'f-1', nombre: 'evidencia.pdf', tipo: 'application/pdf', tamanioKb: 4, fechaSubida: '2026-10-19' } });

    expect(host().textContent).toContain('evidencia.pdf');
    (host().querySelector('button[title="Remover adjunto"]') as HTMLButtonElement).click();
    expect(removed).toBe(1);
  });

  it('propaga la selección de archivo al contenedor', () => {
    const events: Event[] = [];
    component.fileSelected.subscribe((event) => events.push(event));
    const input = host().querySelector('input[type="file"]') as HTMLInputElement;
    input.dispatchEvent(new Event('change'));
    expect(events.length).toBe(1);
  });
});

describe('StudentClaimFormComponent', () => {
  let fixture: ComponentFixture<StudentClaimFormComponent>;
  let component: StudentClaimFormComponent;

  const mockMateria: MateriaEstudianteItem = crearMateria({
    codigo: 'IS-101',
    nombre: 'Ingeniería de Software',
    grupo: '01',
    docente: 'Carlos Docente',
    horario: 'Lunes 08:00 - 10:00',
    aula: 'Lab 2',
    creditos: 3,
    indicadores: { porcentajeAsistencia: 85, asistencias: 8, inasistencias: 2, totalClases: 10 },
    estado: 'Al día',
  });

  const mockSesion: SesionMateriaDetalle = crearSesion({
    id: 'ses-1',
    numeroSesion: 2,
    fecha: '2026-09-08',
    horario: '08:00 - 10:00',
    tema: 'Arquitectura Limpia',
    estadoAsistencia: 'AUSENTE',
  });

  const mockArchivo: SoporteAdjuntoItem = {
    fileId: 'file-123',
    nombre: 'constancia_medica.pdf',
    tipo: 'application/pdf',
    tamanioKb: 245,
    fechaSubida: '2026-09-09',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StudentClaimFormComponent] }).compileComponents();
    fixture = TestBed.createComponent(StudentClaimFormComponent);
    component = fixture.componentInstance;
  });

  function prepare() {
    fixture.componentRef.setInput('materia', mockMateria);
    fixture.componentRef.setInput('sesion', mockSesion);
    fixture.detectChanges();
  }

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('no debe enviar el formulario si la justificación está vacía', () => {
    spyOn(component.submitted, 'emit');
    prepare();
    component.justificacion.set('   ');
    component.onSubmit();
    expect(component.submitted.emit).not.toHaveBeenCalled();
  });

  it('debe emitir submitted con categoría y justificación válidas', () => {
    spyOn(component.submitted, 'emit');
    prepare();
    component.categoria.set('Médico / Salud');
    component.justificacion.set('Cita de especialista en EPS');
    component.onSubmit();
    expect(component.submitted.emit).toHaveBeenCalledWith({
      categoria: 'Médico / Salud',
      justificacion: 'Cita de especialista en EPS',
    });
  });

  it('debe emitir back cuando se hace clic en volver', () => {
    spyOn(component.back, 'emit');
    prepare();
    fixture.nativeElement.querySelectorAll('button')[0].click();
    expect(component.back.emit).toHaveBeenCalled();
  });

  it('debe emitir removeFile cuando hay archivo y se hace clic en remover', () => {
    spyOn(component.removeFile, 'emit');
    prepare();
    fixture.componentRef.setInput('archivo', mockArchivo);
    fixture.detectChanges();
    const removeBtn = fixture.nativeElement.querySelector('button[title="Remover adjunto"]');
    expect(removeBtn).toBeTruthy();
    removeBtn.click();
    expect(component.removeFile.emit).toHaveBeenCalled();
  });

  it('debe emitir fileSelected cuando se selecciona un archivo', () => {
    spyOn(component.fileSelected, 'emit');
    prepare();
    fixture.componentRef.setInput('archivo', null);
    fixture.detectChanges();
    const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    fileInput.dispatchEvent(new Event('change'));
    expect(component.fileSelected.emit).toHaveBeenCalled();
  });
});
