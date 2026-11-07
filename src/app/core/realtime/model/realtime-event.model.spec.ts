import { REALTIME_EVENT_TYPE, SesionCanceladaRealtimePayload } from './realtime-event.model';

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
