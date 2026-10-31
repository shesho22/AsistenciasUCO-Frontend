import { isInstitutionalEmail } from './institutional-email.util';

describe('isInstitutionalEmail (IDENT-001)', () => {
  const dominio = '@uco.edu.co';

  it('acepta el dominio exacto sin distinguir mayusculas ni espacios laterales', () => {
    expect(isInstitutionalEmail('a@uco.edu.co', dominio)).toBeTrue();
    expect(isInstitutionalEmail('A@UCO.EDU.CO ', dominio)).toBeTrue();
    expect(isInstitutionalEmail('  maria.perez@uco.edu.co', dominio)).toBeTrue();
  });

  it('rechaza subdominios, sufijos adicionales y arrobas repetidas', () => {
    expect(isInstitutionalEmail('a@a.uco.edu.co', dominio)).toBeFalse();
    expect(isInstitutionalEmail('a@uco.edu.co.evil.com', dominio)).toBeFalse();
    expect(isInstitutionalEmail('@uco.edu.co', dominio)).toBeFalse();
    expect(isInstitutionalEmail('a@@uco.edu.co', dominio)).toBeFalse();
    expect(isInstitutionalEmail('a@uco.edu.co@x.com', dominio)).toBeFalse();
    expect(isInstitutionalEmail('a@gmail.com', dominio)).toBeFalse();
    expect(isInstitutionalEmail('auco.edu.co', dominio)).toBeFalse();
  });

  it('rechaza correo nulo o vacio', () => {
    expect(isInstitutionalEmail(null, dominio)).toBeFalse();
    expect(isInstitutionalEmail(undefined, dominio)).toBeFalse();
    expect(isInstitutionalEmail('', dominio)).toBeFalse();
  });

  it('un dominio mal configurado rechaza todo (fail-closed)', () => {
    expect(isInstitutionalEmail('a@uco.edu.co', '')).toBeFalse();
    expect(isInstitutionalEmail('a@uco.edu.co', null)).toBeFalse();
    expect(isInstitutionalEmail('a@uco.edu.co', 'uco.edu.co')).toBeFalse();
    expect(isInstitutionalEmail('a@uco.edu.co', '@')).toBeFalse();
    expect(isInstitutionalEmail('a@uco.edu.co', '@uco.edu.co@x')).toBeFalse();
  });

  it('usa el dominio recibido y no uno fijo', () => {
    expect(isInstitutionalEmail('a@otra.edu', '@otra.edu')).toBeTrue();
    expect(isInstitutionalEmail('a@uco.edu.co', '@otra.edu')).toBeFalse();
  });
});
