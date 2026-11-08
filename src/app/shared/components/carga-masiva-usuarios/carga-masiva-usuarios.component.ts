import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DestinoCargaMasiva } from '../../../core/models/carga-masiva.model';

@Component({
  selector: 'app-carga-masiva-usuarios',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>Stub Carga Masiva</div>`,
})
export class CargaMasivaUsuariosComponent {
  destino = input.required<DestinoCargaMasiva>();
  cargaCompletada = output<void>();
  cancelar = output<void>();
}
