import { UltimaPeticion, listaIncluyeIdentidad } from './registro-confirmado.util';

describe('registro-confirmado.util', () => {
  const esperada = { numeroIdentificacion: '1020304050', correo: 'Nuevo@uco.edu.co' };

  it('encuentra a la persona por documento', () => {
    expect(listaIncluyeIdentidad([{ numeroIdentificacion: 1020304050, correo: 'otro@uco.edu.co' }], esperada)).toBeTrue();
  });

  it('encuentra a la persona por correo sin distinguir mayúsculas ni espacios', () => {
    expect(listaIncluyeIdentidad([{ numeroIdentificacion: '1', correo: ' nuevo@UCO.edu.co ' }], esperada)).toBeTrue();
  });

  it('no encuentra a otra persona ni tolera campos vacíos', () => {
    expect(listaIncluyeIdentidad([{ numeroIdentificacion: '1', correo: null }, {}], esperada)).toBeFalse();
    expect(listaIncluyeIdentidad([], esperada)).toBeFalse();
  });

  it('solo considera vigente la última petición iniciada', () => {
    const peticiones = new UltimaPeticion();
    const primera = peticiones.iniciar();
    const segunda = peticiones.iniciar();
    expect(peticiones.esVigente(primera)).toBeFalse();
    expect(peticiones.esVigente(segunda)).toBeTrue();
  });
});
