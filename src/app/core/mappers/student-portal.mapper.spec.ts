import {
  HorarioEstudianteApiDto,
  MateriaEstudianteApiDto,
  SesionMateriaEstudianteApiDto,
} from '../api/models/estudiante-portal-api-dto.model';
import {
  NO_INFORMADO,
  StudentPortalMapper,
  normalizeDia,
  normalizeLocalTime,
} from './student-portal.mapper';

const ASIGNATURA = 'e2f3a4b5-0000-0000-0000-000000000001';
const GRUPO = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
const GRUPO_2 = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e';

describe('StudentPortalMapper', () => {
  describe('materias (MateriaEstudianteDTO real)', () => {
    const dto: MateriaEstudianteApiDto = {
      idAsignatura: ASIGNATURA,
      nombreAsignatura: 'Arquitectura de Software',
      idGrupo: GRUPO,
      nombreGrupo: 'Grupo 001 - Arq Software',
    };

    it('mapea idAsignatura -> id, nombreAsignatura -> nombre, y conserva idGrupo/nombreGrupo por separado', () => {
      const materia = StudentPortalMapper.toMateria(dto)!;
      expect(materia.id).toBe(ASIGNATURA);
      expect(materia.nombre).toBe('Arquitectura de Software');
      expect(materia.idGrupo).toBe(GRUPO);
      expect(materia.grupo).toBe('Grupo 001 - Arq Software');
      expect(materia.claveGrupo).toBe(`${ASIGNATURA}:${GRUPO}`);
    });

    it('no inventa codigo, docente, aula, horario, creditos ni indicadores de asistencia', () => {
      const materia = StudentPortalMapper.toMateria(dto)!;
      expect(materia.codigo).toBeNull();
      expect(materia.docente).toBeNull();
      expect(materia.aula).toBeNull();
      expect(materia.horario).toBeNull();
      expect(materia.creditos).toBeNull();
      expect(materia.indicadores).toBeNull();
      expect(materia.estado).toBeNull();
      expect(JSON.stringify(materia)).not.toContain('NaN');
    });

    it('varios grupos de una misma asignatura producen identidades compuestas distintas', () => {
      const materias = StudentPortalMapper.toMaterias([
        dto,
        { ...dto, idGrupo: GRUPO_2, nombreGrupo: 'Grupo 002' },
      ]);
      expect(materias.length).toBe(2);
      expect(materias[0].id).toBe(materias[1].id);
      expect(new Set(materias.map((m) => m.claveGrupo)).size).toBe(2);
    });

    it('descarta filas sin UUID valido para que ninguna ruta se arme con undefined', () => {
      const materias = StudentPortalMapper.toMaterias([
        { ...dto, idAsignatura: undefined as unknown as string },
        { ...dto, idAsignatura: 'undefined' },
        { ...dto, idGrupo: '' },
        dto,
      ]);
      expect(materias.length).toBe(1);
      expect(materias[0].id).toBe(ASIGNATURA);
    });

    it('usa un texto honesto cuando falta el nombre', () => {
      const materia = StudentPortalMapper.toMateria({ ...dto, nombreAsignatura: '  ', nombreGrupo: '' })!;
      expect(materia.nombre).toBe(NO_INFORMADO);
      expect(materia.grupo).toBe(NO_INFORMADO);
    });

    it('tolera una respuesta sin datos', () => {
      expect(StudentPortalMapper.toMaterias(undefined)).toEqual([]);
      expect(StudentPortalMapper.toMaterias(null)).toEqual([]);
    });
  });

  describe('horarios (HorarioEstudianteDTO real)', () => {
    const dto: HorarioEstudianteApiDto = {
      id: 'b1b2b3b4-0000-4000-8000-000000000001',
      idEstudiante: 'c1c2c3c4-0000-4000-8000-000000000001',
      idGrupo: GRUPO,
      codigoMateria: 'ARQ-01',
      nombreMateria: 'Arquitectura de Software',
      grupo: 'G1',
      dia: 'MIERCOLES',
      horaInicio: '08:00:00',
      horaFin: '10:00:00',
      docente: 'Ana Gómez',
    };

    it('normaliza dia (con o sin tilde, cualquier capitalizacion) y horas a HH:mm', () => {
      const h = StudentPortalMapper.toHorario(dto)!;
      expect(h.dia).toBe('Miércoles');
      expect(h.horaInicio).toBe('08:00');
      expect(h.horaFin).toBe('10:00');
      expect(h.docente).toBe('Ana Gómez');
      expect(h.aula).toBeNull();
    });

    it('reconoce el sabado y las demas variantes de dia', () => {
      expect(normalizeDia('SABADO')).toBe('Sábado');
      expect(normalizeDia('Sábado')).toBe('Sábado');
      expect(normalizeDia('lunes')).toBe('Lunes');
      expect(normalizeDia('DOMINGO')).toBeNull();
      expect(normalizeDia(undefined)).toBeNull();
    });

    it('acepta LocalTime como texto con o sin segundos y como arreglo [h, m]', () => {
      expect(normalizeLocalTime('08:00')).toBe('08:00');
      expect(normalizeLocalTime('14:30:00')).toBe('14:30');
      expect(normalizeLocalTime([7, 5])).toBe('07:05');
      expect(normalizeLocalTime('25:00')).toBeNull();
      expect(normalizeLocalTime('abc')).toBeNull();
      expect(normalizeLocalTime(null)).toBeNull();
    });

    it('descarta filas con dia u hora irreconocibles en vez de inventarlos', () => {
      const horarios = StudentPortalMapper.toHorarios([
        dto,
        { ...dto, id: 'b1b2b3b4-0000-4000-8000-000000000002', dia: 'DOMINGO' },
        { ...dto, id: 'b1b2b3b4-0000-4000-8000-000000000003', horaInicio: 'x' },
      ]);
      expect(horarios.length).toBe(1);
    });

    it('mapea las sesiones de lunes a sabado en el formato real del backend, sin NaN ni undefined', () => {
      const dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
      const horarios = StudentPortalMapper.toHorarios(
        dias.map((dia, i) => ({ ...dto, id: `b1b2b3b4-0000-4000-8000-00000000010${i}`, dia, horaInicio: '07:00:00', horaFin: '09:30:00' }))
      );

      expect(horarios.map((h) => h.dia)).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']);
      horarios.forEach((h) => {
        expect(h.horaInicio).toBe('07:00');
        expect(h.horaFin).toBe('09:30');
        expect(JSON.stringify(h)).not.toMatch(/NaN|undefined/);
      });
    });

    it('sin filas devuelve una lista vacia y no inventa horarios', () => {
      expect(StudentPortalMapper.toHorarios([])).toEqual([]);
    });

    it('un docente vacio queda null (no se inventa)', () => {
      expect(StudentPortalMapper.toHorario({ ...dto, docente: ' ' })!.docente).toBeNull();
    });
  });

  describe('sesiones (SesionMateriaEstudianteDTO real)', () => {
    const formato = (utc: string) => ({ date: utc.slice(0, 10), time: utc.slice(11, 16) });
    const dto: SesionMateriaEstudianteApiDto = {
      id: 'd1d2d3d4-0000-4000-8000-000000000001',
      nombre: 'Introducción',
      numero: 1,
      codigo: 'SES-01',
      numeroSemana: 1,
      idGrupo: GRUPO,
      codigoGrupo: 'G1',
      nombreGrupo: 'Grupo 001',
      fechaHoraInicio: '2026-10-19T13:00:00Z',
      fechaHoraFin: '2026-10-19T15:00:00Z',
    };

    it('con instante UTC explicito lo presenta con el formateador de zona y conserva el instante', () => {
      const s = StudentPortalMapper.toSesion(dto, ASIGNATURA, formato)!;
      expect(s.temporalidad).toBe('UTC');
      expect(s.fechaHoraInicioUtc).toBe('2026-10-19T13:00:00Z');
      expect(s.fecha).toBe('2026-10-19');
      expect(s.horario).toBe('13:00 - 15:00');
      expect(s.materiaId).toBe(ASIGNATURA);
      expect(s.grupoId).toBe(GRUPO);
      expect(s.tema).toBe('Introducción');
      expect(s.numeroSesion).toBe(1);
    });

    it('convierte un offset a UTC antes de formatear', () => {
      const s = StudentPortalMapper.toSesion(
        { ...dto, fechaHoraInicio: '2026-10-19T08:00:00-05:00', fechaHoraFin: '2026-10-19T10:00:00-05:00' },
        ASIGNATURA,
        formato
      )!;
      expect(s.fechaHoraInicioUtc).toBe('2026-10-19T13:00:00Z');
      expect(s.horario).toBe('13:00 - 15:00');
    });

    it('una hora sin zona (LocalDateTime actual) NO se reinterpreta: se muestra tal cual y se marca SIN_ZONA', () => {
      const s = StudentPortalMapper.toSesion(
        { ...dto, fechaHoraInicio: '2026-10-19T13:00:00', fechaHoraFin: '2026-10-19T15:00:00' },
        ASIGNATURA,
        () => {
          throw new Error('no debe formatear instantes sin zona');
        }
      )!;
      expect(s.temporalidad).toBe('SIN_ZONA');
      expect(s.fechaHoraInicioUtc).toBeUndefined();
      expect(s.fecha).toBe('2026-10-19');
      expect(s.horario).toBe('13:00 - 15:00');
    });

    it('sin fecha valida muestra "No informado" y no revienta', () => {
      const s = StudentPortalMapper.toSesion({ ...dto, fechaHoraInicio: 'basura', fechaHoraFin: '' }, ASIGNATURA, formato)!;
      expect(s.fecha).toBe(NO_INFORMADO);
      expect(s.horario).toBe(NO_INFORMADO);
    });

    it('un DTO sin campos de asistencia (backend anterior) queda NO_DISPONIBLE y jamas se asume AUSENTE ni reclamable', () => {
      const s = StudentPortalMapper.toSesion(dto, ASIGNATURA, formato)!;
      expect(s.estadoAsistencia).toBe('NO_DISPONIBLE');
      expect(s.solicitudRevision).toBeNull();
      expect(s.reclamable).toBeFalse();
    });

    it('solo acepta un estado de asistencia explicito y conocido; lo demas es NO_DISPONIBLE', () => {
      const estado = (valor: string | null | undefined) =>
        StudentPortalMapper.toSesion({ ...dto, estadoAsistencia: valor }, ASIGNATURA, formato)!.estadoAsistencia;
      expect(estado('PRESENTE')).toBe('PRESENTE');
      expect(estado('AUSENTE')).toBe('AUSENTE');
      expect(estado('JUSTIFICADA')).toBe('JUSTIFICADA');
      expect(estado('RETARDO')).toBe('RETARDO');
      expect(estado('NO_DISPONIBLE')).toBe('NO_DISPONIBLE');
      expect(estado('ausente')).toBe('NO_DISPONIBLE');
      expect(estado('XYZ')).toBe('NO_DISPONIBLE');
      expect(estado(null)).toBe('NO_DISPONIBLE');
    });

    it('NO_DISPONIBLE no es AUSENTE aunque el backend marque reclamable', () => {
      const s = StudentPortalMapper.toSesion(
        { ...dto, estadoAsistencia: 'NO_DISPONIBLE', reclamable: true }, ASIGNATURA, formato)!;
      expect(s.estadoAsistencia).toBe('NO_DISPONIBLE');
      expect(s.reclamable).toBeFalse();
    });

    it('reclamable exige la pista del backend, un estado AUSENTE/RETARDO y ninguna solicitud previa', () => {
      const sesion = (parcial: Partial<SesionMateriaEstudianteApiDto>) =>
        StudentPortalMapper.toSesion({ ...dto, ...parcial }, ASIGNATURA, formato)!;
      expect(sesion({ estadoAsistencia: 'AUSENTE', reclamable: true }).reclamable).toBeTrue();
      expect(sesion({ estadoAsistencia: 'RETARDO', reclamable: true }).reclamable).toBeTrue();
      expect(sesion({ estadoAsistencia: 'AUSENTE', reclamable: false }).reclamable).toBeFalse();
      expect(sesion({ estadoAsistencia: 'AUSENTE' }).reclamable).toBeFalse();
      expect(sesion({ estadoAsistencia: 'PRESENTE', reclamable: true }).reclamable).toBeFalse();
      expect(sesion({ estadoAsistencia: 'JUSTIFICADA', reclamable: true }).reclamable).toBeFalse();
      expect(sesion({ estadoAsistencia: 'AUSENTE', reclamable: true, estadoSolicitudRevision: 'pendiente' }).reclamable)
        .toBeFalse();
    });

    it('traduce el estado de solicitud del catalogo y no oculta uno desconocido', () => {
      const solicitud = (valor: string | null | undefined) =>
        StudentPortalMapper.toSesion({ ...dto, estadoSolicitudRevision: valor }, ASIGNATURA, formato)!.solicitudRevision;
      expect(solicitud('pendiente')).toBe('PENDIENTE');
      expect(solicitud('Aceptada')).toBe('APROBADA');
      expect(solicitud('rechazada')).toBe('RECHAZADA');
      expect(solicitud('DESCONOCIDO')).toBe('DESCONOCIDA');
      expect(solicitud(null)).toBeNull();
      expect(solicitud('   ')).toBeNull();
    });

    it('el aviso de filas descartadas no registra valores de las filas', () => {
      const warn = spyOn(console, 'warn');
      StudentPortalMapper.toSesiones([{ ...dto, id: 'undefined', nombre: 'DATO PRIVADO' }, dto], ASIGNATURA, formato);
      expect(warn).toHaveBeenCalledTimes(1);
      const serializado = JSON.stringify(warn.calls.mostRecent().args);
      expect(serializado).toContain('1 de 2 sesiones');
      expect(serializado).toContain('nombre');
      expect(serializado).not.toContain('DATO PRIVADO');
    });

    it('descarta sesiones sin UUID valido', () => {
      expect(StudentPortalMapper.toSesiones([{ ...dto, id: 'undefined' }, dto], ASIGNATURA, formato).length).toBe(1);
    });
  });
});
