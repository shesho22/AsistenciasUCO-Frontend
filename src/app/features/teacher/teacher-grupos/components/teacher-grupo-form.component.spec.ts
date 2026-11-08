import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherGrupoFormComponent } from './teacher-grupo-form.component';
import { OfertaCreacionGruposDocenteApiDto } from '../../../../core/api/models/oferta-creacion-grupos-docente-api-dto.model';

const OFERTA: OfertaCreacionGruposDocenteApiDto = {
  idDocente: 'doc-1',
  asignaturas: [
    { idAsignatura: 'asig-1', codigoAsignatura: 'MAT1', nombreAsignatura: 'Algebra', programas: ['Sistemas', 'Software'] },
  ],
};

describe('TeacherGrupoFormComponent (F3)', () => {
  let fixture: ComponentFixture<TeacherGrupoFormComponent>;
  let component: TeacherGrupoFormComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TeacherGrupoFormComponent] });
    fixture = TestBed.createComponent(TeacherGrupoFormComponent);
    component = fixture.componentInstance;
  });

  function conOferta(oferta: OfertaCreacionGruposDocenteApiDto | null, cargando = false): void {
    fixture.componentRef.setInput('oferta', oferta);
    fixture.componentRef.setInput('cargando', cargando);
    fixture.detectChanges();
  }

  it('muestra las asignaturas de la oferta y el botón crear', () => {
    conOferta(OFERTA);

    const opciones = fixture.nativeElement.querySelectorAll('select[name="idAsignatura"] option');
    expect(opciones.length).toBe(2);
    expect(opciones[1].textContent).toContain('MAT1 - Algebra (Sistemas, Software)');
    expect(fixture.nativeElement.querySelector('[data-testid="sin-oferta"]')).toBeNull();
  });

  it('sin asignaturas avisa que debe vincularse a un programa y bloquea el envío', () => {
    conOferta({ idDocente: 'doc-1', asignaturas: [] });

    expect(fixture.nativeElement.querySelector('[data-testid="sin-oferta"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
  });

  it('mientras carga la oferta muestra el aviso de carga', () => {
    conOferta(null, true);

    expect(fixture.nativeElement.querySelector('[data-testid="cargando-oferta"]')).not.toBeNull();
  });

  it('valida asignatura, código y nombre, y las franjas, antes de emitir', () => {
    conOferta(OFERTA);
    const emitidos: unknown[] = [];
    component.guardar.subscribe((p) => emitidos.push(p));

    component.enviar();
    expect(component.error()).toBe('Seleccione la asignatura.');

    component.idAsignatura = 'asig-1';
    component.enviar();
    expect(component.error()).toBe('El código y el nombre del grupo son obligatorios.');

    component.codigo = 5;
    component.nombre = 'Grupo 5';
    component.franjas = [{ dia: 'LU', horaInicio: '10:00', horaFin: '08:00' }];
    component.enviar();
    expect(component.error()).toBe('En cada franja la hora de fin debe ser mayor que la de inicio.');
    expect(emitidos.length).toBe(0);
  });

  it('emite el grupo a nombre del propio docente, con su horario y sin período', () => {
    conOferta(OFERTA);
    const emitidos: unknown[] = [];
    component.guardar.subscribe((p) => emitidos.push(p));
    component.idAsignatura = 'asig-1';
    component.codigo = 5;
    component.nombre = '  Grupo 5 ';
    component.franjas = [{ dia: 'MA', horaInicio: '08:00', horaFin: '10:00' }];

    component.enviar();

    expect(component.error()).toBeNull();
    expect(emitidos).toEqual([
      {
        idAsignatura: 'asig-1',
        codigo: 5,
        nombre: 'Grupo 5',
        idDocente: 'doc-1',
        franjas: [{ dia: 'MA', horaInicio: '08:00', horaFin: '10:00' }],
      },
    ]);
  });

  it('cancelar emite el evento', () => {
    conOferta(OFERTA);
    let cancelado = false;
    component.cancelar.subscribe(() => (cancelado = true));

    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    botones.find((b) => b.textContent?.trim() === 'Cancelar')?.click();

    expect(cancelado).toBeTrue();
  });
});
