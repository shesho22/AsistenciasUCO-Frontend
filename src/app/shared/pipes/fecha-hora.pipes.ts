import { Pipe, PipeTransform } from '@angular/core';
import {
  ValorTemporal,
  formatearFechaCorta,
  formatearFechaHoraCorta,
  formatearHoraCorta,
  formatearRangoHorario,
} from './fecha-hora.util';

/** `mié 12 nov`. Zona local del navegador salvo que se indique otra (pruebas). */
@Pipe({ name: 'fechaCorta', standalone: true })
export class FechaCortaPipe implements PipeTransform {
  transform(valor: ValorTemporal, timeZone?: string): string {
    return formatearFechaCorta(valor, timeZone);
  }
}

/** `08:00`, sin segundos; acepta instantes ISO o `LocalTime` (`08:00:00`). */
@Pipe({ name: 'horaCorta', standalone: true })
export class HoraCortaPipe implements PipeTransform {
  transform(valor: ValorTemporal, timeZone?: string): string {
    return formatearHoraCorta(valor, timeZone);
  }
}

/** `08:00–10:00`. Uso: `inicio | rangoHorario: fin`. */
@Pipe({ name: 'rangoHorario', standalone: true })
export class RangoHorarioPipe implements PipeTransform {
  transform(inicio: ValorTemporal, fin: ValorTemporal, timeZone?: string): string {
    return formatearRangoHorario(inicio, fin, timeZone);
  }
}

/** `mié 12 nov, 08:00`. */
@Pipe({ name: 'fechaHoraCorta', standalone: true })
export class FechaHoraCortaPipe implements PipeTransform {
  transform(valor: ValorTemporal, timeZone?: string): string {
    return formatearFechaHoraCorta(valor, timeZone);
  }
}
