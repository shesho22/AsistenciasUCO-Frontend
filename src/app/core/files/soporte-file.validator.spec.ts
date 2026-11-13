import {
  SOPORTE_MAX_BYTES,
  describirTamano,
  validateSoporteFile,
} from './soporte-file.validator';

function file(name: string, size: number, type: string): Pick<File, 'name' | 'size' | 'type'> {
  return { name, size, type };
}

describe('validateSoporteFile (LB-004D FE-01/FE-02)', () => {
  it('PAR-05 aplica el tamano maximo parametrizado (tamanioMaximoBytes de /configuracion/reclamos)', () => {
    const limite = 512 * 1024;
    expect(validateSoporteFile(file('a.pdf', limite, 'application/pdf'), limite).valid).toBeTrue();
    const result = validateSoporteFile(file('a.pdf', limite + 1, 'application/pdf'), limite);
    expect(result.code).toBe('TOO_LARGE');
    expect(result.message).toContain('512 KB');
  });

  it('PAR-05 usa el respaldo de 5 MB si el parametro falta o supera el techo del servidor', () => {
    expect(validateSoporteFile(file('a.pdf', SOPORTE_MAX_BYTES, 'application/pdf'), null).valid).toBeTrue();
    expect(validateSoporteFile(file('a.pdf', SOPORTE_MAX_BYTES + 1, 'application/pdf'), SOPORTE_MAX_BYTES * 2).code).toBe('TOO_LARGE');
    expect(validateSoporteFile(file('a.pdf', SOPORTE_MAX_BYTES + 1, 'application/pdf'), 0).message).toContain('5 MB');
  });

  it('describirTamano expresa el limite en MB, KB o bytes', () => {
    expect(describirTamano(5 * 1024 * 1024)).toBe('5 MB');
    expect(describirTamano(256 * 1024)).toBe('256 KB');
    expect(describirTamano(300001)).toBe('300001 bytes');
  });

  it('acepta PDF, PNG y JPEG con su content-type', () => {
    expect(validateSoporteFile(file('a.pdf', 10, 'application/pdf')).valid).toBeTrue();
    expect(validateSoporteFile(file('a.png', 10, 'image/png')).valid).toBeTrue();
    expect(validateSoporteFile(file('a.jpg', 10, 'image/jpeg')).valid).toBeTrue();
    expect(validateSoporteFile(file('A.JPEG', 10, 'image/jpeg')).valid).toBeTrue();
  });

  it('acepta exactamente 5 MiB y rechaza 5 MiB + 1 byte con un mensaje que cita el límite', () => {
    expect(validateSoporteFile(file('a.pdf', SOPORTE_MAX_BYTES, 'application/pdf')).valid).toBeTrue();
    const result = validateSoporteFile(file('a.pdf', SOPORTE_MAX_BYTES + 1, 'application/pdf'));
    expect(result.valid).toBeFalse();
    expect(result.code).toBe('TOO_LARGE');
    expect(result.message).toContain('5 MB');
  });

  it('rechaza archivos vacíos', () => {
    expect(validateSoporteFile(file('a.pdf', 0, 'application/pdf')).code).toBe('EMPTY');
  });

  it('rechaza tipos y extensiones no permitidos', () => {
    expect(validateSoporteFile(file('a.exe', 10, 'application/x-msdownload')).code).toBe('TYPE_NOT_ALLOWED');
    expect(validateSoporteFile(file('a.svg', 10, 'image/svg+xml')).code).toBe('TYPE_NOT_ALLOWED');
    expect(validateSoporteFile(file('a.html', 10, 'text/html')).code).toBe('TYPE_NOT_ALLOWED');
    expect(validateSoporteFile(file('sin-extension', 10, 'application/pdf')).code).toBe('TYPE_NOT_ALLOWED');
  });

  it('rechaza un content-type que no coincide con la extensión', () => {
    expect(validateSoporteFile(file('a.pdf', 10, 'image/png')).code).toBe('TYPE_NOT_ALLOWED');
    expect(validateSoporteFile(file('a.png', 10, '')).code).toBe('TYPE_NOT_ALLOWED');
  });

  it('rechaza nombres de más de 250 caracteres y acepta exactamente 250', () => {
    expect(validateSoporteFile(file('a'.repeat(247) + '.pdf', 10, 'application/pdf')).code).toBe('NAME_TOO_LONG');
    expect(validateSoporteFile(file('a'.repeat(246) + '.pdf', 10, 'application/pdf')).valid).toBeTrue();
  });
});
