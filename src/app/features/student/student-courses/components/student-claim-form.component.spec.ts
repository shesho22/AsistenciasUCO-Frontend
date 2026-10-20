import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentClaimFormComponent } from './student-claim-form.component';
import {
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  SoporteAdjuntoItem,
} from '../../../../core/models/role-management.model';

describe('StudentClaimFormComponent', () => {
  let fixture: ComponentFixture<StudentClaimFormComponent>;
  let component: StudentClaimFormComponent;

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

  const mockSesion: SesionMateriaDetalle = {
    id: 'ses-1',
    materiaId: 'mat-1',
    numeroSesion: 2,
    fecha: '2026-09-08',
    horario: '08:00 - 10:00',
    tema: 'Arquitectura Limpia',
    estadoAsistencia: 'AUSENTE',
  };

  const mockArchivo: SoporteAdjuntoItem = {
    fileId: 'file-123',
    nombre: 'constancia_medica.pdf',
    tipo: 'application/pdf',
    tamanioKb: 245,
    fechaSubida: '2026-09-09',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentClaimFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentClaimFormComponent);
    component = fixture.componentInstance;
  });

  it('debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('no debe enviar el formulario si la justificación está vacía', () => {
    spyOn(component.submitted, 'emit');
    fixture.componentRef.setInput('materia', mockMateria);
    fixture.componentRef.setInput('sesion', mockSesion);
    fixture.detectChanges();

    component.justificacion.set('   ');
    component.onSubmit();

    expect(component.submitted.emit).not.toHaveBeenCalled();
  });

  it('debe emitir submitted con categoría y justificación válidas', () => {
    spyOn(component.submitted, 'emit');
    fixture.componentRef.setInput('materia', mockMateria);
    fixture.componentRef.setInput('sesion', mockSesion);
    fixture.detectChanges();

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
    fixture.componentRef.setInput('materia', mockMateria);
    fixture.componentRef.setInput('sesion', mockSesion);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[0].click();

    expect(component.back.emit).toHaveBeenCalled();
  });

  it('debe emitir removeFile cuando hay archivo y se hace clic en remover', () => {
    spyOn(component.removeFile, 'emit');
    fixture.componentRef.setInput('materia', mockMateria);
    fixture.componentRef.setInput('sesion', mockSesion);
    fixture.componentRef.setInput('archivo', mockArchivo);
    fixture.detectChanges();

    const removeBtn = fixture.nativeElement.querySelector('button[title="Remover adjunto"]');
    expect(removeBtn).toBeTruthy();
    removeBtn.click();

    expect(component.removeFile.emit).toHaveBeenCalled();
  });

  it('debe emitir fileSelected cuando se selecciona un archivo', () => {
    spyOn(component.fileSelected, 'emit');
    fixture.componentRef.setInput('materia', mockMateria);
    fixture.componentRef.setInput('sesion', mockSesion);
    fixture.componentRef.setInput('archivo', null);
    fixture.detectChanges();

    const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    const event = new Event('change');
    fileInput.dispatchEvent(event);

    expect(component.fileSelected.emit).toHaveBeenCalled();
  });
});
