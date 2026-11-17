import { datosDePersonaSeleccionada } from './datos-persona-seleccionada';
import { UserPickerItem } from './user-picker-modal.component';

describe('datosDePersonaSeleccionada', () => {
  const tipos = [
    { id: 'tipo-ti', tipoIdentificacion: 'TI' },
    { id: 'tipo-cc', tipoIdentificacion: 'CC' },
  ];
  const persona: UserPickerItem = {
    id: 'u1',
    numeroIdentificacion: '1017000001',
    tipoIdentificacion: 'CC',
    primerNombre: 'Juan',
    segundoNombre: 'Carlos',
    primerApellido: 'Gómez',
    segundoApellido: 'Pérez',
    nombres: 'Juan Carlos',
    apellidos: 'Gómez Pérez',
    nombreCompleto: 'Juan Carlos Gómez Pérez',
    correo: 'juan.gomez@uco.edu.co',
  };

  it('toma los cuatro campos de nombre, el documento y el correo tal como llegan', () => {
    expect(datosDePersonaSeleccionada(persona, tipos)).toEqual({
      tipoIdentificacionId: 'tipo-cc',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '1017000001',
      primerNombre: 'Juan',
      segundoNombre: 'Carlos',
      primerApellido: 'Gómez',
      segundoApellido: 'Pérez',
      correo: 'juan.gomez@uco.edu.co',
    });
  });

  it('no deduce nombres ni correo cuando el backend no los entrega', () => {
    const sinDetalle: UserPickerItem = {
      id: 'u2',
      numeroIdentificacion: '99',
      nombres: 'Ana María',
      apellidos: 'Ruiz',
      nombreCompleto: 'Ana María Ruiz',
    };

    const datos = datosDePersonaSeleccionada(sinDetalle, tipos);

    expect(datos.primerNombre).toBe('');
    expect(datos.segundoNombre).toBe('');
    expect(datos.primerApellido).toBe('');
    expect(datos.segundoApellido).toBe('');
    expect(datos.correo).toBe('');
  });

  it('sin tipo en la persona conserva el primer tipo del catálogo', () => {
    const datos = datosDePersonaSeleccionada({ ...persona, tipoIdentificacion: undefined }, tipos);

    expect(datos.tipoIdentificacionId).toBe('tipo-ti');
    expect(datos.tipoIdentificacion).toBe('CC');
  });

  it('con el catálogo vacío deja el identificador del tipo vacío', () => {
    expect(datosDePersonaSeleccionada(persona, []).tipoIdentificacionId).toBe('');
  });
});
