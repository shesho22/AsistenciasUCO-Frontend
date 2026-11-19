import { Pipe, PipeTransform } from '@angular/core';
import { formatearHorasMinutos } from './horas-minutos.util';

/** `3.48 | horasMinutos` → `3 h 29 min`. Ver `formatearHorasMinutos`. */
@Pipe({ name: 'horasMinutos', standalone: true })
export class HorasMinutosPipe implements PipeTransform {
  transform(horas: number | null | undefined): string {
    return formatearHorasMinutos(horas);
  }
}
