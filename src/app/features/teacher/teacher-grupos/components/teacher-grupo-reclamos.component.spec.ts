import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherGrupoReclamosComponent } from './teacher-grupo-reclamos.component';

describe('TeacherGrupoReclamosComponent', () => {
  let fixture: ComponentFixture<TeacherGrupoReclamosComponent>;
  let component: TeacherGrupoReclamosComponent;

  const mockReclamos = [
    {
      id: 'rec-12345678-abcd',
      estudianteNombre: 'Laura Gómez',
      estadoSolicitud: 'PENDIENTE',
      justificacionSolicitud: 'Incapacidad médica EPS',
      categoria: 'Salud',
      fechaSolicitud: '2026-03-01',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherGrupoReclamosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherGrupoReclamosComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse en estado vacío correctamente', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('No hay justificaciones ni reclamos pendientes');
  });

  it('renderiza la lista de reclamos cuando se suministran', () => {
    fixture.componentRef.setInput('reclamos', mockReclamos);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Laura Gómez');
    expect(text).toContain('Incapacidad médica EPS');
    expect(text).toContain('PENDIENTE');
  });

  it('emite irAReclamos al hacer clic en el botón del portal', () => {
    let emitido = false;
    component.irAReclamos.subscribe(() => (emitido = true));

    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    btn.click();

    expect(emitido).toBeTrue();
  });
});
