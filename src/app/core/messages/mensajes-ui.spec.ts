import { CodigoMensajeUi, MENSAJES_UI, esCodigoMensajeUi, mensajeUi } from './mensajes-ui';

describe('mensajes-ui (VAL-oleada3 MSG-06)', () => {
  it('devuelve el texto del catálogo por código', () => {
    expect(mensajeUi('UI_ADMIN_FACULTADES_001')).toBe('Facultad actualizada correctamente.');
    expect(mensajeUi('AUTH_GENERIC_ERROR')).toBe('Usuario o contraseña incorrectos.');
  });

  it('llena los marcadores con los parámetros', () => {
    expect(mensajeUi('UI_ADMIN_FACULTADES_008', { decano: 'Ana Pérez', facultad: 'Ingeniería' }))
      .toBe('Decano(a) Ana Pérez asignado(a) exitosamente a Ingeniería.');
    expect(mensajeUi('UI_TEACHER_GRUPOS_011', { notificados: 3 }))
      .toBe('Sesión cancelada. Estudiantes notificados: 3.');
  });

  it('deja el marcador cuando falta el parámetro y no reinterpreta el valor', () => {
    expect(mensajeUi('UI_ADMIN_PERIODOS_002')).toBe('Período {codigo} eliminado.');
    expect(mensajeUi('UI_ADMIN_PERIODOS_002', { codigo: '$& {otro}' })).toBe('Período $& {otro} eliminado.');
  });

  it('reconoce solo los códigos del catálogo', () => {
    expect(esCodigoMensajeUi('AUTH_FORBIDDEN')).toBeTrue();
    expect(esCodigoMensajeUi('AUTH_NO_EXISTE')).toBeFalse();
    expect(esCodigoMensajeUi('toString')).toBeFalse();
  });

  it('ningún texto del catálogo está vacío', () => {
    for (const codigo of Object.keys(MENSAJES_UI) as CodigoMensajeUi[]) {
      expect(MENSAJES_UI[codigo].trim().length).withContext(codigo).toBeGreaterThan(3);
    }
  });
});
