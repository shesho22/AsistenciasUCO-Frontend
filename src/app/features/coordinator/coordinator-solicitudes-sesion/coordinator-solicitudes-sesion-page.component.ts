import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SolicitudesSesionMenuService } from '../../../core/services/solicitudes-sesion-menu.service';
import { CoordinatorSolicitudesSesionComponent } from './coordinator-solicitudes-sesion.component';

/**
 * ATA D6: página propia de «Solicitudes de sesión» del coordinador (antes vivía dentro de «Asistencia»). Al aprobar o
 * rechazar, el contador del menú se recarga.
 */
@Component({
  selector: 'app-coordinator-solicitudes-sesion-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [PageHeaderComponent, CoordinatorSolicitudesSesionComponent],
  template: `
    <div class="space-y-5 min-w-0">
      <app-page-header
        titulo="Solicitudes de sesión"
        descripcion="Aprueba o rechaza las sesiones extraordinarias que los docentes piden para tu programa."
      />
      <app-coordinator-solicitudes-sesion (resuelta)="menu.recargar()" />
    </div>
  `,
})
export class CoordinatorSolicitudesSesionPageComponent {
  protected readonly menu = inject(SolicitudesSesionMenuService);
}
