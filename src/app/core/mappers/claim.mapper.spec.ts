import { ClaimMapper, ReclamoDocenteApi } from './claim.mapper';

describe('ClaimMapper.fromReclamoDocente (LB-004D)', () => {
  const base: ReclamoDocenteApi = {
    id: 'rec-1',
    fechaSolicitud: '2026-10-19',
    estadoSolicitud: 'APROBADA',
    justificacionSolicitud: 'Cita',
    justificacionRespuesta: 'Aceptada',
    estudianteId: 'est-1',
    estudianteNombre: 'Ana Pérez',
    sesionId: 'ses-1',
    sesionNumero: 2,
    fechaSesionUtc: '2026-10-19T03:30:00.0000000Z',
    procedenciaTemporalSesion: 'UTC_V2',
    grupoCodigo: 7,
    grupoNombre: null,
    materiaId: 'm-1',
    materiaCodigo: 'MAT1',
    materiaNombre: 'Matemáticas',
    soporteAdjunto: null,
  };
  const formatter = (instant: string) => `fecha(${instant})`;

  it('usa el código del grupo cuando no hay nombre y conserva el instante UTC original', () => {
    const item = ClaimMapper.fromReclamoDocente(base, formatter);

    expect(item.grupo).toBe('7');
    expect(item.fechaSesionUtc).toBe('2026-10-19T03:30:00.0000000Z');
    expect(item.fechaSesion).toBe('fecha(2026-10-19T03:30:00.0000000Z)');
    expect(item.justificacionRespuesta).toBe('Aceptada');
    expect(item.estadoOriginal).toBeUndefined();
  });

  it('sin instante verificable no presenta fecha de sesión ni inventa el instante', () => {
    const item = ClaimMapper.fromReclamoDocente({ ...base, fechaSesionUtc: null }, formatter);
    expect(item.fechaSesion).toBe('');
    expect(item.fechaSesionUtc).toBeUndefined();
  });

  it('mapea el soporte con su tamaño exacto y redondea KB hacia arriba como mínimo 1', () => {
    const item = ClaimMapper.fromReclamoDocente({
      ...base,
      soporteAdjunto: { fileId: 'f-1', nombre: 'a.png', tipo: 'image/png', tamanioBytes: 10, fechaSubidaUtc: null, url: null },
    }, formatter);

    expect(item.soporteAdjunto?.tamanioBytes).toBe(10);
    expect(item.soporteAdjunto?.tamanioKb).toBe(1);
    expect(item.soporteAdjunto?.fechaSubida).toBe('');
    expect(item.soporteAdjunto?.urlSimulada).toBeUndefined();
  });

  it('toDTO tolera estadoOriginal ausente', () => {
    const dto = ClaimMapper.toDTO(ClaimMapper.fromReclamoDocente(base, formatter));
    expect(dto.estado_original).toBe('');
  });
});
