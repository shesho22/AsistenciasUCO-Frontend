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

  it('APP05-MAP-01 conserva el UUID real del grupo del DTO', () => {
    const grupoId = '3f0c1d2e-0000-4000-8000-000000000001';
    const item = ClaimMapper.fromReclamoDocente({ ...base, grupoId }, formatter);
    expect(item.grupoId).toBe(grupoId);
  });

  it('CULM-001 D.2: mapea múltiples soportes y soporta categoría como objeto o string', () => {
    const conSoportes: ReclamoDocenteApi = {
      ...base,
      categoria: { codigo: 'MED', nombre: 'Médico / Salud' },
      soportes: [
        { fileId: 'f-1', nombre: 'formula.pdf', tipoContenido: 'application/pdf', tamanioBytes: 2048, fechaSubidaUtc: '2026-10-19T10:00:00Z', url: '/api/v1/archivos/f-1' },
        { fileId: 'f-2', nombre: 'receta.png', tipoContenido: 'image/png', tamanioBytes: 4096, fechaSubidaUtc: '2026-10-19T10:05:00Z', url: '/api/v1/archivos/f-2' },
      ],
    };
    const item = ClaimMapper.fromReclamoDocente(conSoportes, formatter);

    expect(item.soportes?.length).toBe(2);
    expect(item.soportes?.[0].fileId).toBe('f-1');
    expect(item.soportes?.[1].fileId).toBe('f-2');
    expect(item.soporteAdjunto?.fileId).toBe('f-1');
    expect(item.categoria).toEqual({ codigo: 'MED', nombre: 'Médico / Salud' });
  });

  it('EST-03 (S3923): la categoría como string se conserva tal cual y sin categoría se arma desde código y nombre', () => {
    expect(ClaimMapper.fromReclamoDocente({ ...base, categoria: 'MED' }, formatter).categoria).toBe('MED' as any);
    const desdeCodigo = ClaimMapper.fromReclamoDocente({ ...base, categoria: undefined, codigoCategoria: 'LAB', nombreCategoria: 'Laboral' } as any, formatter);
    expect(desdeCodigo.categoria).toEqual({ codigo: 'LAB', nombre: 'Laboral' });
  });
});

describe('ClaimMapper: reclamo por toma (puntos de control)', () => {
  const base: ReclamoDocenteApi = {
    id: 'rec-1', fechaSolicitud: '2026-10-19', estadoSolicitud: 'APROBADA', justificacionSolicitud: 'Cita', estudianteId: 'est-1',
    estudianteNombre: 'Ana Pérez', sesionId: 'ses-1', sesionNumero: 2, fechaSesionUtc: '2026-10-19T13:00:00Z', grupoCodigo: 7,
    materiaId: 'm-1', materiaCodigo: 'MAT1', materiaNombre: 'Matemáticas', soporteAdjunto: null,
    idToma: 'toma-2', numeroToma: 2, fechaPuntoControlUtc: '2026-10-19T13:40:00Z', resultadoAprobacion: 'PRESENTE',
  };
  const formatter = (instant: string) => instant.slice(0, 10);

  it('conserva la toma reclamada y el resultado de la aprobación', () => {
    const item = ClaimMapper.fromReclamoDocente(base, formatter);
    expect(item.idToma).toBe('toma-2');
    expect(item.numeroToma).toBe(2);
    expect(item.fechaPuntoControlUtc).toBe('2026-10-19T13:40:00Z');
    expect(item.resultadoAprobacion).toBe('PRESENTE');
  });

  it('un reclamo de sesión (sin toma) deja la toma y el resultado en null; un resultado desconocido no se acepta', () => {
    const item = ClaimMapper.fromReclamoDocente({ ...base, idToma: undefined, numeroToma: null, fechaPuntoControlUtc: null, resultadoAprobacion: 'RARO' }, formatter);
    expect(item.idToma).toBeNull();
    expect(item.numeroToma).toBeNull();
    expect(item.resultadoAprobacion).toBeNull();
  });

  it('el detalle del docente agrega el estado de la toma y los minutos de la sesión', () => {
    const item = ClaimMapper.fromDetalleReclamoDocente({ ...base, estadoToma: 'AUSENTE', minutosSesion: 120, minutosAsistidos: 40 }, formatter);
    expect(item.estadoToma).toBe('AUSENTE');
    expect(item.minutosSesion).toBe(120);
    expect(item.minutosAsistidos).toBe(40);
    const sinToma = ClaimMapper.fromDetalleReclamoDocente({ ...base, estadoToma: null }, formatter);
    expect(sinToma.estadoToma).toBeNull();
  });
});
