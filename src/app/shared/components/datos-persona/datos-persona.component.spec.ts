import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CambioDatoPersona,
  DatosPersona,
  DatosPersonaComponent,
  DOCUMENTO_MAX_LENGTH,
  aplicarCambioPersona,
} from './datos-persona.component';

const VACIO: DatosPersona = {
  tipoIdentificacionId: 'tipo-cc',
  numeroIdentificacion: '',
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  correo: '',
};

describe('DatosPersonaComponent', () => {
  let fixture: ComponentFixture<DatosPersonaComponent>;
  let cambios: CambioDatoPersona[];

  function crear(datos: DatosPersona = VACIO, opciones: Record<string, unknown> = {}): HTMLElement {
    fixture = TestBed.createComponent(DatosPersonaComponent);
    fixture.componentRef.setInput('datos', datos);
    fixture.componentRef.setInput('tiposIdentificacion', [
      { id: 'tipo-cc', tipoIdentificacion: 'CC', nombre: 'Cedula de ciudadania' },
      { id: 'tipo-pa', tipoIdentificacion: 'PA', nombre: 'Pasaporte' },
    ]);
    for (const [nombre, valor] of Object.entries(opciones)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    cambios = [];
    fixture.componentInstance.cambio.subscribe((c) => cambios.push(c));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const etiquetas = (host: HTMLElement) =>
    Array.from(host.querySelectorAll('label')).map((l) => l.textContent?.replace(/\s+/g, ' ').replace('*', '').trim());

  it('muestra los campos en el orden comun: documento, nombres, apellidos y correo', () => {
    const host = crear();

    expect(etiquetas(host)).toEqual([
      'Tipo de documento',
      'Número de documento',
      'Primer nombre',
      'Segundo nombre (opcional)',
      'Primer apellido',
      'Segundo apellido (opcional)',
      'Correo institucional',
    ]);
  });

  it('pinta los valores recibidos y el tipo de documento elegido', () => {
    const host = crear({ ...VACIO, tipoIdentificacionId: 'tipo-pa', primerNombre: 'Ana', correo: 'ana@uco.edu.co' });

    expect((host.querySelector('select[name="tipoIdentificacionId"]') as HTMLSelectElement).value).toBe('tipo-pa');
    expect((host.querySelector('input[name="primerNombre"]') as HTMLInputElement).value).toBe('Ana');
    expect((host.querySelector('input[name="correo"]') as HTMLInputElement).value).toBe('ana@uco.edu.co');
  });

  it('emite cada cambio con su campo', () => {
    const host = crear();
    const nombre = host.querySelector('input[name="primerNombre"]') as HTMLInputElement;
    nombre.value = 'Jorge';
    nombre.dispatchEvent(new Event('input'));
    const tipo = host.querySelector('select[name="tipoIdentificacionId"]') as HTMLSelectElement;
    tipo.value = 'tipo-pa';
    tipo.dispatchEvent(new Event('change'));

    expect(cambios).toEqual([
      { campo: 'primerNombre', valor: 'Jorge' },
      { campo: 'tipoIdentificacionId', valor: 'tipo-pa' },
    ]);
  });

  it('el documento solo admite digitos y como maximo 10', () => {
    const host = crear();
    const documento = host.querySelector('input[name="numeroIdentificacion"]') as HTMLInputElement;

    documento.value = '10-17a 55.5444999';
    documento.dispatchEvent(new Event('input'));

    expect(documento.value.length).toBe(DOCUMENTO_MAX_LENGTH);
    expect(documento.value).toBe('1017555444');
    expect(cambios).toEqual([{ campo: 'numeroIdentificacion', valor: '1017555444' }]);
  });

  it('pegar un documento con puntos conserva sus 10 digitos (el limite no trunca el texto antes de filtrar)', () => {
    const host = crear();
    const documento = host.querySelector('input[name="numeroIdentificacion"]') as HTMLInputElement;
    expect(documento.hasAttribute('maxlength')).toBeFalse();

    documento.value = '1.017.555.444';
    documento.dispatchEvent(new Event('input'));

    expect(documento.value).toBe('1017555444');
  });

  it('muestra el error de cada campo debajo de su control', () => {
    const host = crear(VACIO, { errores: { primerNombre: 'El primer nombre es obligatorio.', correo: 'Correo invalido.' } });
    const alertas = Array.from(host.querySelectorAll('[role="alert"]')).map((a) => a.textContent?.trim());

    expect(alertas).toEqual(['El primer nombre es obligatorio.', 'Correo invalido.']);
  });

  it('puede omitir el documento (matricula) y el correo (persona existente)', () => {
    const host = crear(VACIO, { incluirDocumento: false, incluirCorreo: false });

    expect(host.querySelector('[name="numeroIdentificacion"]')).toBeNull();
    expect(host.querySelector('[name="tipoIdentificacionId"]')).toBeNull();
    expect(host.querySelector('[name="correo"]')).toBeNull();
    expect(host.querySelector('[name="primerNombre"]')).not.toBeNull();
  });

  it('muestra el aviso de activacion y la ayuda del correo', () => {
    const host = crear(VACIO, { aviso: 'Recibira un enlace para activar la cuenta.', ayudaCorreo: 'Debe terminar en @uco.edu.co.' });

    expect(host.querySelector('[data-testid="aviso-activacion-cuenta"]')?.textContent).toContain('enlace para activar');
    expect(host.textContent).toContain('Debe terminar en @uco.edu.co.');
  });

  it('en solo lectura no permite editar', () => {
    const host = crear(VACIO, { soloLectura: true });

    expect((host.querySelector('input[name="primerNombre"]') as HTMLInputElement).readOnly).toBeTrue();
    expect((host.querySelector('select[name="tipoIdentificacionId"]') as HTMLSelectElement).disabled).toBeTrue();
  });

  it('aplicarCambioPersona devuelve una copia con el campo cambiado y conserva los demas', () => {
    const original = { ...VACIO, idPrograma: 'p-1' };
    const copia = aplicarCambioPersona(original, { campo: 'primerNombre', valor: 'Ana' });

    expect(copia).toEqual({ ...original, primerNombre: 'Ana' });
    expect(copia).not.toBe(original);
  });
});
