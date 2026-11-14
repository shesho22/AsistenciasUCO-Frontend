import { of } from 'rxjs';
import { StudentRegistrationConfigService } from '../../../../core/services/student-registration-config.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoordinatorDocenteFormModalComponent } from './coordinator-docente-form-modal.component';
import { DocenteCandidato, TipoVinculacionItem, VincularDocenteExistentePayload, VincularDocenteNuevoPayload } from '../../../../core/models/docente-programa.model';

describe('CoordinatorDocenteFormModalComponent', () => {
  let fixture: ComponentFixture<CoordinatorDocenteFormModalComponent>;
  let component: CoordinatorDocenteFormModalComponent;

  const tiposId = [
    { id: 'tipo-1', tipoIdentificacion: 'CC', nombre: 'Cédula' },
    { id: 'tipo-2', tipoIdentificacion: 'CE', nombre: 'Extranjería' },
  ];
  const tiposVinc: TipoVinculacionItem[] = [
    { id: 'tv-1', codigo: 'PLA', nombre: 'Planta' },
    { id: 'tv-2', codigo: 'CAT', nombre: 'Cátedra' },
  ];
  const candidato: DocenteCandidato = {
    idDocente: 'doc-9', idUsuario: 'u-9', codigoTipoIdentificacion: 'CC', numeroIdentificacion: 123, nombreCompleto: 'Maria Rostagno',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CoordinatorDocenteFormModalComponent], providers: [{ provide: StudentRegistrationConfigService, useValue: { getEmailDomain: () => of('@uco.edu.co') } }] });
    fixture = TestBed.createComponent(CoordinatorDocenteFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tiposIdentificacion', tiposId);
    fixture.componentRef.setInput('tiposVinculacion', tiposVinc);
    fixture.componentRef.setInput('candidatos', []);
    fixture.detectChanges();
  });

  function llenarNuevo(): void {
    component.form.numeroIdentificacion = '1017555444';
    component.form.primerNombre = 'Jorge';
    component.form.segundoNombre = '';
    component.form.primerApellido = 'Henao';
    component.form.segundoApellido = '';
    component.form.correo = 'jorge.henao@uco.edu.co';
    component.form.password = 'Clave1234!';
    component.form.idTipoVinculacion = 'tv-2';
  }

  it('T-FE-03: selecciona por defecto el primer tipo del catálogo (sin GUID quemado) y el primer tipo de vinculación', () => {
    expect(component.tipoIdentificacionEfectivo()).toBe('tipo-1');
    const fuente = CoordinatorDocenteFormModalComponent.toString();
    expect(fuente).not.toContain('A1B2C3D4');
  });

  it('T-FE-03: el formulario pide contraseña inicial y tipo de vinculación, y NO pide especialidad ni departamento', () => {
    const html: string = fixture.nativeElement.innerHTML;
    expect(html).toContain('name="password"');
    expect(html).toContain('name="idTipoVinculacion"');
    expect(html).not.toContain('especialidad');
    expect(html).not.toContain('departamento');
  });

  it('T-FE-03: enviarNuevo emite el payload tipado con el tipo de documento del catálogo', () => {
    let emitido: VincularDocenteNuevoPayload | undefined;
    component.guardarNuevo.subscribe((p) => (emitido = p));
    llenarNuevo();

    component.enviarNuevo();

    expect(emitido).toEqual({
      idTipoIdentificacion: 'tipo-1',
      numeroIdentificacion: '1017555444',
      primerNombre: 'Jorge',
      primerApellido: 'Henao',
      correo: 'jorge.henao@uco.edu.co',
      password: 'Clave1234!',
      idTipoVinculacion: 'tv-2',
    });
  });

  it('incluye nombres y apellidos opcionales cuando se digitan', () => {
    let emitido: VincularDocenteNuevoPayload | undefined;
    component.guardarNuevo.subscribe((p) => (emitido = p));
    llenarNuevo();
    component.form.segundoNombre = ' Luis ';
    component.form.segundoApellido = 'Perez';

    component.enviarNuevo();

    expect(emitido?.segundoNombre).toBe('Luis');
    expect(emitido?.segundoApellido).toBe('Perez');
  });

  // DEC-073: formato de nombres, documento numérico, correo institucional y política de contraseña.
  it('DEC-073: no emite con nombres con números, documento con letras, correo no institucional o contraseña débil', () => {
    const emisiones: VincularDocenteNuevoPayload[] = [];
    component.guardarNuevo.subscribe((p) => emisiones.push(p));

    llenarNuevo();
    component.form.primerNombre = 'J0rge';
    component.enviarNuevo();
    expect(component.error()).toBe('El campo Primer Nombre solo admite letras, espacios, apóstrofo y guion (sin números ni otros signos).');

    llenarNuevo();
    component.form.numeroIdentificacion = '0123456';
    component.enviarNuevo();
    expect(component.error()).toBe('El campo Número de Identificación debe ser positivo y no comenzar con cero.');

    llenarNuevo();
    component.form.correo = 'jorge.henao@gmail.com';
    component.enviarNuevo();
    expect(component.error()).toBe('El correo debe ser institucional y terminar en @uco.edu.co.');

    llenarNuevo();
    component.form.password = 'clave';
    component.enviarNuevo();
    expect(component.error()).toContain('Contraseña');

    expect(emisiones).toEqual([]);
  });

  it('no emite si faltan campos obligatorios y deja el motivo en pantalla', () => {
    const emisiones: VincularDocenteNuevoPayload[] = [];
    component.guardarNuevo.subscribe((p) => emisiones.push(p));

    component.enviarNuevo();
    expect(emisiones.length).toBe(0);
    expect(component.error()).toBeTruthy();

    llenarNuevo();
    component.form.password = '';
    component.enviarNuevo();
    expect(emisiones.length).toBe(0);
  });

  it('el número de documento solo admite dígitos', () => {
    const input = document.createElement('input');
    input.value = '12ab-34';
    component.onNumeroInput({ target: input } as unknown as Event);
    expect(component.form.numeroIdentificacion).toBe('1234');
  });

  it('T-FE-04: el modo existente busca candidatos, selecciona uno y emite idDocente + tipo de vinculación', () => {
    const busquedas: string[] = [];
    let emitido: VincularDocenteExistentePayload | undefined;
    component.buscarCandidatos.subscribe((t) => busquedas.push(t));
    component.guardarExistente.subscribe((p) => (emitido = p));

    component.cambiarModo('EXISTENTE');
    component.onBusquedaCandidato('ros');
    expect(busquedas).toEqual(['ros']);

    fixture.componentRef.setInput('candidatos', [candidato]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Maria Rostagno');
    expect(fixture.nativeElement.textContent).not.toContain('@'); // sin correo (D4)

    component.seleccionarCandidato(candidato);
    component.form.idTipoVinculacion = 'tv-1';
    component.enviarExistente();

    expect(emitido).toEqual({ idDocente: 'doc-9', idTipoVinculacion: 'tv-1' });
  });

  it('el modo existente exige seleccionar un candidato y un tipo de vinculación', () => {
    const emisiones: VincularDocenteExistentePayload[] = [];
    component.guardarExistente.subscribe((p) => emisiones.push(p));
    component.cambiarModo('EXISTENTE');

    component.enviarExistente();
    expect(emisiones.length).toBe(0);
    expect(component.error()).toBeTruthy();

    component.seleccionarCandidato(candidato);
    component.form.idTipoVinculacion = '';
    component.enviarExistente();
    expect(emisiones.length).toBe(0);
  });

  it('cambiar de modo limpia el error y la selección', () => {
    component.cambiarModo('EXISTENTE');
    component.seleccionarCandidato(candidato);
    component.enviarExistente();
    expect(component.error()).toBeTruthy();

    component.cambiarModo('NUEVO');

    expect(component.error()).toBeNull();
    expect(component.candidatoSeleccionado()).toBeNull();
  });

  it('cerrar emite el evento', () => {
    let cerrado = false;
    component.cerrar.subscribe(() => (cerrado = true));
    component.solicitarCierre();
    expect(cerrado).toBeTrue();
  });
});
