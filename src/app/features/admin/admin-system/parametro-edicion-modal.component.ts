import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParametroAdminDto } from '../../../core/models/role-management.model';

@Component({
  selector: 'app-parametro-edicion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: ``,
})
export class ParametroEdicionModalComponent {
  parametro = input<ParametroAdminDto | null>(null);
  isOpen = input<boolean>(false);

  guardado = output<void>();
  recargarRequerido = output<void>();
  cerrar = output<void>();

  nuevoValor = signal<string>('');
  motivo = signal<string>('');

  guardar(): void {}
}
