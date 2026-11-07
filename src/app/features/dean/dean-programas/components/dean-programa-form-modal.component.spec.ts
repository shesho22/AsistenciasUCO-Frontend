import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeanProgramaFormModalComponent } from './dean-programa-form-modal.component';
import { CatalogoPrograma, ProgramaAcademico, ProgramaPayload } from '../../../../core/models/programa-academico.model';

describe('DeanProgramaFormModalComponent', () => {
  let fixture: ComponentFixture<DeanProgramaFormModalComponent>;
  let component: DeanProgramaFormModalComponent;

  const tipos: CatalogoPrograma[] = [{ id: 't-1', codigo: 'PRE', nombre: 'pregrado' }];
  const modalidades: CatalogoPrograma[] = [{ id: 'm-1', codigo: 'PRE', nombre: 'Presencial' }];
  const jornadas: CatalogoPrograma[] = [{ id: 'j-1', codigo: 'DIU', nombre: 'Diurna' }];
  const disponibles = [{ id: 'c-2', nombre: 'Luis Gómez' }];
  const existente: ProgramaAcademico = {
    id: 'p-1', nombre: 'Sistemas', idTipoPrograma: 't-1', nombreTipoPrograma: 'pregrado',
    idModalidad: 'm-1', nombreModalidad: 'Presencial', idJornada: null, nombreJornada: null,
    idCoordinador: 'c-1', nombreCoordinador: 'Ana Pérez', idFacultad: 'f-1', nombreFacultad: 'Ingeniería', estaActivo: true,
  };

  function crear(programa: ProgramaAcademico | null): void {
    fixture = TestBed.createComponent(DeanProgramaFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programa', programa);
    fixture.componentRef.setInput('coordinadoresDisponibles', disponibles);
    fixture.componentRef.setInput('tiposPrograma', tipos);
    fixture.componentRef.setInput('modalidades', modalidades);
    fixture.componentRef.setInput('jornadas', jornadas);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [DeanProgramaFormModalComponent] }));

  it('alta: solo ofrece los coordinadores disponibles y bloquea el envío con campos obligatorios vacíos', () => {
    crear(null);
    expect(component.opcionesCoordinador()).toEqual(disponibles);
    expect(component.esEdicion()).toBeFalse();
    expect(component.valido()).toBeFalse();

    const emitido: ProgramaPayload[] = [];
    component.guardar.subscribe((p) => emitido.push(p));
    component.enviar();
    expect(emitido.length).toBe(0);
  });

  it('alta: emite el payload tipado con modalidad y jornada opcionales como null', () => {
    crear(null);
    const emitido: ProgramaPayload[] = [];
    component.guardar.subscribe((p) => emitido.push(p));

    component.nombre.set('  Industrial  ');
    component.idTipoPrograma.set('t-1');
    component.idCoordinador.set('c-2');
    expect(component.valido()).toBeTrue();
    component.enviar();

    expect(emitido).toEqual([{ nombre: 'Industrial', idTipoPrograma: 't-1', idCoordinador: 'c-2', idModalidad: null, idJornada: null }]);
  });

  it('el nombre de más de 50 caracteres o solo espacios no es válido', () => {
    crear(null);
    component.idTipoPrograma.set('t-1');
    component.idCoordinador.set('c-2');
    component.nombre.set('   ');
    expect(component.valido()).toBeFalse();
    component.nombre.set('X'.repeat(51));
    expect(component.valido()).toBeFalse();
    component.nombre.set('X'.repeat(50));
    expect(component.valido()).toBeTrue();
  });

  it('edición: precarga los valores y el selector incluye al coordinador actual además de los disponibles', () => {
    crear(existente);
    expect(component.esEdicion()).toBeTrue();
    expect(component.nombre()).toBe('Sistemas');
    expect(component.idModalidad()).toBe('m-1');
    expect(component.idJornada()).toBe('');
    expect(component.opcionesCoordinador().map((o) => o.id)).toEqual(['c-2', 'c-1']);

    const emitido: ProgramaPayload[] = [];
    component.guardar.subscribe((p) => emitido.push(p));
    component.enviar();
    expect(emitido[0]).toEqual({ nombre: 'Sistemas', idTipoPrograma: 't-1', idCoordinador: 'c-1', idModalidad: 'm-1', idJornada: null });
  });

  it('cancelar emite cerrar', () => {
    crear(null);
    let cerrado = false;
    component.cerrar.subscribe(() => (cerrado = true));
    component.cancelar();
    expect(cerrado).toBeTrue();
  });

  it('muestra el mensaje de error recibido tal cual lo devolvió el backend', () => {
    crear(null);
    fixture.componentRef.setInput('error', 'Ya existe un programa académico con ese nombre en la facultad.');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ya existe un programa académico con ese nombre en la facultad.');
  });

  it('F-DEC-S03: un envio vacio muestra bajo cada campo obligatorio su mensaje y el boton no esta deshabilitado', () => {
    crear(null);
    const el = fixture.nativeElement as HTMLElement;
    const enviar = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(enviar.disabled).toBeFalse();
    expect(el.querySelectorAll('p[role="alert"]').length).toBe(0);
    component.enviar();
    fixture.detectChanges();
    const textos = Array.from(el.querySelectorAll('p[role="alert"]')).map((p) => p.textContent);
    expect(textos.some((t) => t?.includes('nombre del programa es obligatorio'))).toBeTrue();
    expect(textos.some((t) => t?.includes('tipo de programa'))).toBeTrue();
    expect(textos.some((t) => t?.includes('coordinador'))).toBeTrue();
  });
});
