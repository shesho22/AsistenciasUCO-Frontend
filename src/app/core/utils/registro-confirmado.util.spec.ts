import { REGISTRO_NO_LISTADO_WARNING, UltimaPeticion, advertirRegistroNoListado, listaIncluyeIdentidad } from './registro-confirmado.util';

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

  it('advierte solo cuando se espera una persona y la lista no la incluye', () => {
    const advertir = jasmine.createSpy('advertir');

    advertirRegistroNoListado([], esperada, advertir);
    advertirRegistroNoListado([{ numeroIdentificacion: '1020304050' }], esperada, advertir);
    advertirRegistroNoListado([], undefined, advertir);

    expect(advertir).toHaveBeenCalledTimes(1);
    expect(advertir).toHaveBeenCalledWith(REGISTRO_NO_LISTADO_WARNING);
  });
});
