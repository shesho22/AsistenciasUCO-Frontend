import {
  parseDayToNumber,
  sanitizeDayName,
  parseTime,
  parseScheduleString,
  calcularProximaClaseDesdeItems,
  ClaseHorarioItem,
} from './proxima-clase.util';

describe('proxima-clase.util', () => {
  describe('parseDayToNumber', () => {
    it('retorna el número correcto para cada día', () => {
      expect(parseDayToNumber('Domingo')).toBe(0);
      expect(parseDayToNumber('dom')).toBe(0);
      expect(parseDayToNumber('Lunes')).toBe(1);
      expect(parseDayToNumber('lun')).toBe(1);
      expect(parseDayToNumber('Martes')).toBe(2);
      expect(parseDayToNumber('mar')).toBe(2);
      expect(parseDayToNumber('Miércoles')).toBe(3);
      expect(parseDayToNumber('miercoles')).toBe(3);
      expect(parseDayToNumber('mie')).toBe(3);
      expect(parseDayToNumber('Jueves')).toBe(4);
      expect(parseDayToNumber('jue')).toBe(4);
      expect(parseDayToNumber('Viernes')).toBe(5);
      expect(parseDayToNumber('vie')).toBe(5);
      expect(parseDayToNumber('Sábado')).toBe(6);
      expect(parseDayToNumber('sabado')).toBe(6);
      expect(parseDayToNumber('sab')).toBe(6);
    });

    it('retorna -1 para días inválidos o vacíos', () => {
      expect(parseDayToNumber('')).toBe(-1);
      expect(parseDayToNumber('desconocido')).toBe(-1);
    });
  });

  describe('sanitizeDayName', () => {
    it('capitaliza y normaliza nombres de días', () => {
      expect(sanitizeDayName('dom')).toBe('Domingo');
      expect(sanitizeDayName('LUNES')).toBe('Lunes');
      expect(sanitizeDayName('martes')).toBe('Martes');
      expect(sanitizeDayName('miercoles')).toBe('Miércoles');
      expect(sanitizeDayName('jueves')).toBe('Jueves');
      expect(sanitizeDayName('viernes')).toBe('Viernes');
      expect(sanitizeDayName('sabado')).toBe('Sábado');
      expect(sanitizeDayName('invalido')).toBe('invalido');
    });
  });

  describe('parseTime', () => {
    it('convierte cadenas de tiempo en objeto con horas y minutos', () => {
      expect(parseTime('08:30')).toEqual({ hours: 8, minutes: 30 });
      expect(parseTime('14:05:00')).toEqual({ hours: 14, minutes: 5 });
    });

    it('retorna null para formatos inválidos o nulos', () => {
      expect(parseTime('')).toBeNull();
      expect(parseTime('invalido')).toBeNull();
      expect(parseTime('xx:yy')).toBeNull();
    });
  });

  describe('parseScheduleString', () => {
    it('extrae días y horas desde cadenas complejas de horario', () => {
      const res = parseScheduleString('Lunes y Miércoles 08:00 - 10:00');
      expect(res.length).toBe(2);
      expect(res[0]).toEqual({ dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' });
      expect(res[1]).toEqual({ dia: 'Miércoles', horaInicio: '08:00', horaFin: '10:00' });
    });

    it('detecta todos los días de la semana en la cadena', () => {
      const res = parseScheduleString('Mar Jue Vie Sab Dom 14:00 - 16:00');
      expect(res.length).toBe(5);
    });

    it('retorna array vacío si el formato no contiene horas o es nulo', () => {
      expect(parseScheduleString('')).toEqual([]);
      expect(parseScheduleString('Solo texto sin horario')).toEqual([]);
    });
  });

  describe('calcularProximaClaseDesdeItems', () => {
    it('retorna null si la lista de items está vacía o no tiene horarios válidos', () => {
      expect(calcularProximaClaseDesdeItems([])).toBeNull();

      const itemsInvalidos: ClaseHorarioItem[] = [
        {
          codigoMateria: 'X',
          nombreMateria: 'Invalida',
          dia: 'dia-invalido',
          horaInicio: 'invalida',
          horaFin: 'invalida',
          subtitulo: 'Sub',
        },
      ];
      expect(calcularProximaClaseDesdeItems(itemsInvalidos)).toBeNull();
    });

    it('identifica y calcula la próxima clase futura o en curso', () => {
      const items: ClaseHorarioItem[] = [
        {
          codigoMateria: 'IS-401',
          nombreMateria: 'Arquitectura de Software',
          dia: 'Lunes',
          horaInicio: '06:00',
          horaFin: '08:00',
          aula: 'Aula 201',
          subtitulo: 'Grupo 1',
        },
        {
          codigoMateria: 'IS-402',
          nombreMateria: 'Bases de Datos II',
          dia: 'Miércoles',
          horaInicio: '10:00',
          horaFin: '12:00',
          aula: 'Lab 3',
          subtitulo: 'Grupo 2',
        },
        {
          codigoMateria: 'IS-403',
          nombreMateria: 'Sistemas Distribuidos',
          dia: 'Viernes',
          horaInicio: '14:00',
          horaFin: '16:00',
          subtitulo: 'Grupo 1',
        },
      ];

      const resultado = calcularProximaClaseDesdeItems(items);
      expect(resultado).toBeTruthy();
      expect(resultado?.materia).toBeDefined();
      expect(resultado?.codigo).toBeDefined();
      expect(resultado?.dia).toBeDefined();
      expect(resultado?.tiempoRestanteTexto).toBeDefined();
      expect(resultado?.tiempoDetalleBadge).toBeDefined();
    });
  });
});
