import {
  AsistenciaQrRegistradaPayload,
  AsistenciaQrRotadoPayload,
  REALTIME_EVENT_TYPE,
  SesionCanceladaRealtimePayload,
} from './realtime-event.model';

describe('REALTIME_EVENT_TYPE (CULM-001 B.1)', () => {
  it('B1-F-05 declara SESION_CANCELADA con su payload tipado sin motivo', () => {
    const payload: SesionCanceladaRealtimePayload = {
      grupo: 'grp-1',
      sesion: 'ses-1',
      tipo: 'DOCENTE',
      fechaHoraInicioUtc: '2026-11-10T13:00:00Z',
    };

    expect(REALTIME_EVENT_TYPE.SESION_CANCELADA).toBe('SESION_CANCELADA');
    expect(Object.keys(payload)).not.toContain('motivo');
  });
});

describe('REALTIME_EVENT_TYPE (CULM-001 B.2)', () => {
  it('B2-F-03 declara los eventos de tomas y QR con sus payloads tipados', () => {
    expect(REALTIME_EVENT_TYPE.TOMA_ABIERTA).toBe('TOMA_ABIERTA');
    expect(REALTIME_EVENT_TYPE.TOMA_CERRADA).toBe('TOMA_CERRADA');
    expect(REALTIME_EVENT_TYPE.ASISTENCIA_QR_ROTADO).toBe('ASISTENCIA_QR_ROTADO');
    expect(REALTIME_EVENT_TYPE.ASISTENCIA_QR_REGISTRADA).toBe('ASISTENCIA_QR_REGISTRADA');
    expect(REALTIME_EVENT_TYPE.ASISTENCIAS_TOMA_ACTUALIZADAS).toBe('ASISTENCIAS_TOMA_ACTUALIZADAS');

    const rotado: AsistenciaQrRotadoPayload = {
      grupo: 'g',
      sesion: 's',
      toma: 't',
      pin: '482913',
      urlAsistencia: 'https://x/app/asistencia/qr?t=a',
      qrPngBase64: 'iVBOR',
      fechaRotacionUtc: '2026-11-10T13:01:00Z',
      fechaExpiracionUtc: '2026-11-10T13:01:10Z',
      rotacionSegundos: 60,
    };
    const registrada: AsistenciaQrRegistradaPayload = { grupo: 'g', sesion: 's', toma: 't', estudiante: 'e', totalPresentes: 3 };
    expect(rotado.pin).toBe('482913');
    expect(registrada.totalPresentes).toBe(3);
  });
});
