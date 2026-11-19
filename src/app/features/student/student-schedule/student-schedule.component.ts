import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { HorarioSemanalComponent } from '../../../shared/components/horario-semanal/horario-semanal.component';

/** ATA D7: «Mi Horario» del estudiante, semana con fechas construida con el calendario de sesiones. */
@Component({
  selector: 'app-student-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, HorarioSemanalComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <app-page-header
        [enTarjeta]="true"
        etiqueta="Portal Estudiantil"
        contexto="Horario semanal"
        titulo="Mi Horario de Clases"
        descripcion="Consulta tus sesiones de la semana con su fecha, docente y si son extraordinarias o están canceladas."
      />
      <app-horario-semanal rol="ESTUDIANTE" />
    </div>
  `,
})
export class StudentScheduleComponent {}
