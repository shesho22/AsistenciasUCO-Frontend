import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { HorarioSemanalComponent } from '../../../shared/components/horario-semanal/horario-semanal.component';

/** ATA D7: «Mi Horario» del docente, semana con fechas construida con el calendario de sesiones. */
@Component({
  selector: 'app-teacher-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, HorarioSemanalComponent],
  template: `
    <div class="space-y-4 animate-fade-in">
      <app-page-header
        [enTarjeta]="true"
        etiqueta="Carga Docente"
        contexto="Horario semanal"
        titulo="Mi Horario Académico"
        descripcion="Tus sesiones de la semana con su fecha, incluidas las extraordinarias y las canceladas."
      />
      <app-horario-semanal rol="DOCENTE" />
    </div>
  `,
})
export class TeacherScheduleComponent {}
