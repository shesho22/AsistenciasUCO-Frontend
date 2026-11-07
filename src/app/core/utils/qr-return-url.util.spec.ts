import { consumirRetornoQr, esRutaAsistenciaQr, guardarRetornoQr, QR_RETORNO_STORAGE_KEY } from './qr-return-url.util';

describe('qr-return-url.util (CULM-001 B.2, NB-8)', () => {
  beforeEach(() => sessionStorage.removeItem(QR_RETORNO_STORAGE_KEY));
  afterEach(() => sessionStorage.removeItem(QR_RETORNO_STORAGE_KEY));

  it('B2-F-22 reconoce solo las rutas /app/asistencia/qr y /app/asistencia/pin', () => {
    expect(esRutaAsistenciaQr('/app/asistencia/qr?t=abc')).toBeTrue();
    expect(esRutaAsistenciaQr('/app/asistencia/qr')).toBeTrue();
    expect(esRutaAsistenciaQr('/app/asistencia/pin')).toBeTrue();
    expect(esRutaAsistenciaQr('/app/asistencia')).toBeFalse();
    expect(esRutaAsistenciaQr('/app/asistencia/qrx')).toBeFalse();
    expect(esRutaAsistenciaQr('/app/estudiante/materias')).toBeFalse();
  });

  it('B2-F-22 guarda la URL y la devuelve una sola vez (la clave se borra al leerla)', () => {
    guardarRetornoQr('/app/asistencia/qr?t=TOK');
    expect(consumirRetornoQr()).toBe('/app/asistencia/qr?t=TOK');
    expect(sessionStorage.getItem(QR_RETORNO_STORAGE_KEY)).toBeNull();
    expect(consumirRetornoQr()).toBeNull();
  });

  it('B2-F-22 vence: una URL guardada hace mas de la vida maxima no se devuelve', () => {
    guardarRetornoQr('/app/asistencia/qr?t=TOK', Date.now() - 60 * 60 * 1000);
    expect(consumirRetornoQr()).toBeNull();
  });

  it('B2-F-22 ignora valores corruptos o rutas externas', () => {
    sessionStorage.setItem(QR_RETORNO_STORAGE_KEY, 'no-es-json');
    expect(consumirRetornoQr()).toBeNull();
    sessionStorage.setItem(QR_RETORNO_STORAGE_KEY, JSON.stringify({ url: 'https://evil.example/x', guardadoEn: Date.now() }));
    expect(consumirRetornoQr()).toBeNull();
  });
});
