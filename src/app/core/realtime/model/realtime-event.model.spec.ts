import {
  AsistenciaQrRegistradaPayload,
  AsistenciaQrRotadoPayload,
  REALTIME_EVENT_TYPE,
  SesionCanceladaRealtimePayload,
  SesionManualCreadaRealtimePayload,
  AlertaInasistenciaRealtimePayload,
  RevisionCancelacionCreadaRealtimePayload,
  RevisionCancelacionDecididaRealtimePayload,
  RevisionCancelacionResueltaRealtimePayload,
  RevisionCancelacionReasignadaRealtimePayload,
  isValidRealtimeEvent,
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

describe('REALTIME_EVENT_TYPE (CULM-001 / DEC-064)', () => {
  it('declara SESION_MANUAL_CREADA con su payload tipado y SESION_CANCELADA admite tipo COORDINADOR', () => {
    const manual: SesionManualCreadaRealtimePayload = {
      grupo: 'grp-1',
      sesion: 'ses-9',
      fechaHoraInicio: '2026-11-10T13:00:00Z',
      docente: 'Ana Pérez',
    };
    const cancelada: SesionCanceladaRealtimePayload = {
      grupo: 'grp-1',
      sesion: 'ses-9',
      tipo: 'COORDINADOR',
      fechaHoraInicioUtc: null,
    };

    expect(REALTIME_EVENT_TYPE.SESION_MANUAL_CREADA).toBe('SESION_MANUAL_CREADA');
    expect(Object.keys(manual).sort()).toEqual(['docente', 'fechaHoraInicio', 'grupo', 'sesion']);
    expect(cancelada.tipo).toBe('COORDINADOR');
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

describe('REALTIME_EVENT_TYPE (CULM-001 C.1)', () => {
  it('C-F-16 declara los eventos de alertas y revisiones de cancelación', () => {
    expect(REALTIME_EVENT_TYPE.ALERTA_INASISTENCIA).toBe('ALERTA_INASISTENCIA');
    expect(REALTIME_EVENT_TYPE.REVISION_CANCELACION_CREADA).toBe('REVISION_CANCELACION_CREADA');
    expect(REALTIME_EVENT_TYPE.REVISION_CANCELACION_DECIDIDA).toBe('REVISION_CANCELACION_DECIDIDA');
    expect(REALTIME_EVENT_TYPE.REVISION_CANCELACION_RESUELTA).toBe('REVISION_CANCELACION_RESUELTA');
    expect(REALTIME_EVENT_TYPE.REVISION_CANCELACION_REASIGNADA).toBe('REVISION_CANCELACION_REASIGNADA');

    const alertaPayload: AlertaInasistenciaRealtimePayload = {
      grupo: 'grp-1',
      alerta: 'alt-1',
      estudianteGrupo: 'eg-1',
      tipo: 'ADVERTENCIA',
      porcentajeInasistencia: 16,
      umbral: 15,
    };
    expect(alertaPayload.grupo).toBe('grp-1');

    const revisionCreada: RevisionCancelacionCreadaRealtimePayload = {
      grupo: 'grp-1',
      revision: 'rev-1',
      estudianteGrupo: 'eg-1',
      estado: 'PENDIENTE_DOCENTE',
    };
    expect(revisionCreada.estado).toBe('PENDIENTE_DOCENTE');

    const revisionDecidida: RevisionCancelacionDecididaRealtimePayload = {
      grupo: 'grp-1',
      revision: 'rev-1',
      estudianteGrupo: 'eg-1',
      decision: 'PROPONER',
      estado: 'PROPUESTA',
      perfilResolutor: 'COORDINADOR',
    };
    expect(revisionDecidida.perfilResolutor).toBe('COORDINADOR');

    const revisionResuelta: RevisionCancelacionResueltaRealtimePayload = {
      grupo: 'grp-1',
      revision: 'rev-1',
      estudianteGrupo: 'eg-1',
      decision: 'APROBAR',
      estado: 'APROBADA',
      cambioMatricula: true,
    };
    expect(revisionResuelta.cambioMatricula).toBeTrue();

    const revisionReasignada: RevisionCancelacionReasignadaRealtimePayload = {
      grupo: 'grp-1',
      revision: 'rev-1',
      estudianteGrupo: 'eg-1',
      perfilResolutor: 'DECANO',
    };
    expect(revisionReasignada.perfilResolutor).toBe('DECANO');
  });

  it('C-F-17 isValidRealtimeEvent valida la estructura del evento', () => {
    expect(isValidRealtimeEvent(null)).toBeFalse();
    expect(isValidRealtimeEvent({})).toBeFalse();
    expect(
      isValidRealtimeEvent({
        eventId: 'evt-1',
        type: 'ALERTA_INASISTENCIA',
        occurredAt: '2026-11-08T10:00:00Z',
        correlationId: null,
        payload: { grupo: 'grp-1' },
      })
    ).toBeTrue();
  });
});
