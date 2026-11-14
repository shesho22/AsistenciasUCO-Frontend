import {
  CLAIM_RESPONSE_MAX,
  getClaimResponseError,
  getCreditsError,
  getFreeTextError,
  getPersonNameError,
  getPersonNamesError,
  getSafeTextError,
  getStaffEmailError,
} from './form-fields.util';

/** DEC-073: las reglas de campo del frontend son las mismas del backend (ValidationPatterns / ValidationHelper). */
describe('form-fields.util (DEC-073)', () => {
  describe('getPersonNameError', () => {
    it('acepta letras con tildes, apóstrofo, guion y espacios internos', () => {
      for (const valor of ['José', 'María José', "O'Neill", 'Ruiz-Pérez', 'Ñuñez', '  Ana  ']) {
        expect(getPersonNameError(valor, 'Primer Nombre')).withContext(valor).toBeNull();
      }
    });

    it('rechaza números, signos, HTML y separadores al borde o repetidos', () => {
      for (const valor of ['Juan2', 'Ana!', '<b>Ana</b>', '-Ana', "Ana'", 'Ana  --Luz', 'Ana\tLuz']) {
        expect(getPersonNameError(valor, 'Primer Nombre')).withContext(valor).toContain('solo admite letras');
      }
    });

    it('vacío es error solo si es obligatorio', () => {
      expect(getPersonNameError('  ', 'Primer Nombre', { required: true })).toBe('El campo Primer Nombre es obligatorio.');
      expect(getPersonNameError(null, 'Segundo Nombre')).toBeNull();
      expect(getPersonNameError(undefined, 'Segundo Nombre')).toBeNull();
    });

    it('respeta la longitud de la columna (50)', () => {
      expect(getPersonNameError('a'.repeat(50), 'Primer Nombre')).toBeNull();
      expect(getPersonNameError('a'.repeat(51), 'Primer Nombre')).toBe('El campo Primer Nombre no puede superar 50 caracteres.');
    });
  });

  describe('getPersonNamesError', () => {
    it('devuelve el primer error en orden y null si todo es válido', () => {
      expect(getPersonNamesError({ primerNombre: 'Ana', primerApellido: 'Ruiz' })).toBeNull();
      expect(getPersonNamesError({ primerNombre: '', primerApellido: 'Ruiz' })).toBe('El campo Primer Nombre es obligatorio.');
      expect(getPersonNamesError({ primerNombre: 'Ana', segundoNombre: 'L3', primerApellido: 'Ruiz' })).toContain('Segundo Nombre');
      expect(getPersonNamesError({ primerNombre: 'Ana', primerApellido: '' })).toBe('El campo Primer Apellido es obligatorio.');
      expect(getPersonNamesError({ primerNombre: 'Ana', primerApellido: 'Ruiz', segundoApellido: '#' })).toContain('Segundo Apellido');
    });
  });

  describe('getSafeTextError', () => {
    it('acepta letras, números y los signos permitidos', () => {
      expect(getSafeTextError('Sistemas (Nocturno) - 2027/1 #3: A.B,C_D', 'Nombre')).toBeNull();
      expect(getSafeTextError('Ingeniería de Sistemas', 'Nombre')).toBeNull();
    });

    it('rechaza < > comillas y otros signos', () => {
      for (const valor of ['<script>', 'Grupo "A"', "Grupo 'A'", 'A & B', 'A;B']) {
        expect(getSafeTextError(valor, 'Nombre')).withContext(valor).toContain('solo admite');
      }
    });

    it('aplica obligatorio, mínimo y máximo', () => {
      expect(getSafeTextError('', 'Nombre', { required: true })).toBe('El campo Nombre es obligatorio.');
      expect(getSafeTextError('', 'Nombre')).toBeNull();
      expect(getSafeTextError('ab', 'Nombre', { minLength: 3 })).toBe('El campo Nombre debe tener al menos 3 caracteres.');
      expect(getSafeTextError('x'.repeat(21), 'Nombre', { maxLength: 20 })).toBe('El campo Nombre no puede superar 20 caracteres.');
    });
  });

  describe('getFreeTextError', () => {
    it('admite texto libre pero no < ni >', () => {
      expect(getFreeTextError('Faltó el soporte; revise "anexo 2".', 'Respuesta', { maxLength: 500 })).toBeNull();
      expect(getFreeTextError('<b>no</b>', 'Respuesta', { maxLength: 500 })).toBe('El campo Respuesta no admite los caracteres < ni >.');
      expect(getFreeTextError('', 'Respuesta', { maxLength: 500 })).toBeNull();
      expect(getFreeTextError(' ', 'Respuesta', { maxLength: 500, required: true })).toBe('El campo Respuesta es obligatorio.');
    });
  });

  describe('getStaffEmailError', () => {
    it('exige formato válido y el dominio institucional vigente', () => {
      expect(getStaffEmailError('decano@uco.edu.co', '@uco.edu.co')).toBeNull();
      expect(getStaffEmailError(' Decano@UCO.edu.co ', '@uco.edu.co')).toBeNull();
      expect(getStaffEmailError('decano@gmail.com', '@uco.edu.co')).toBe('El correo debe ser institucional y terminar en @uco.edu.co.');
      expect(getStaffEmailError('', '@uco.edu.co')).toBe('El campo Correo Institucional es obligatorio.');
      expect(getStaffEmailError('sin-arroba', '@uco.edu.co')).toContain('formato válido');
    });

    it('sin dominio cargado solo valida el formato (el backend decide)', () => {
      expect(getStaffEmailError('decano@gmail.com', null)).toBeNull();
      expect(getStaffEmailError(undefined, null)).toBe('El campo Correo Institucional es obligatorio.');
    });
  });

  describe('getCreditsError', () => {
    it('acepta enteros de 1 a 10', () => {
      expect(getCreditsError(1)).toBeNull();
      expect(getCreditsError('10')).toBeNull();
    });

    it('rechaza vacío, decimales, texto y fuera de rango', () => {
      expect(getCreditsError(null)).toBe('El campo Créditos es obligatorio.');
      expect(getCreditsError(undefined)).toBe('El campo Créditos es obligatorio.');
      expect(getCreditsError(' ')).toBe('El campo Créditos es obligatorio.');
      expect(getCreditsError('2.5')).toBe('El campo Créditos debe ser un número entero.');
      expect(getCreditsError('abc')).toBe('El campo Créditos debe ser un número entero.');
      expect(getCreditsError(0)).toBe('El campo Créditos debe estar entre 1 y 10.');
      expect(getCreditsError(11)).toBe('El campo Créditos debe estar entre 1 y 10.');
    });
  });

  describe('getClaimResponseError', () => {
    it('al rechazar la respuesta es obligatoria y de 10 a 500', () => {
      expect(getClaimResponseError('RECHAZADA', '')).toBe('El campo Respuesta es obligatorio.');
      expect(getClaimResponseError('RECHAZADA', 'corta')).toBe('El campo Respuesta debe tener al menos 10 caracteres.');
      expect(getClaimResponseError('RECHAZADA', 'No presentó soporte.')).toBeNull();
    });

    it('al aprobar es opcional pero con máximo y sin HTML', () => {
      expect(getClaimResponseError('APROBADA', '')).toBeNull();
      expect(getClaimResponseError('APROBADA', 'ok')).toBeNull();
      expect(getClaimResponseError('APROBADA', 'x'.repeat(CLAIM_RESPONSE_MAX + 1))).toBe('El campo Respuesta no puede superar 500 caracteres.');
      expect(getClaimResponseError('APROBADA', '<i>ok</i>')).toBe('El campo Respuesta no admite los caracteres < ni >.');
    });
  });
});
