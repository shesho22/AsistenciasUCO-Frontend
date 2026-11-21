import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AdminCatalogsComponent } from './admin-catalogs.component';
import { CategoriasJustificacionAdminComponent } from './categorias-justificacion-admin.component';
import { MotivosCancelacionAdminComponent } from './motivos-cancelacion-admin.component';
import { TiposIdentificacionAdminComponent } from './tipos-identificacion-admin.component';

/**
 * Pestaña «Catálogos» de la configuración del administrador: tipos de programa y de identificación (solo consulta) y los catálogos
 * administrables de categorías de justificación y motivos de cancelación de sesión.
 */
@Component({
  selector: 'app-admin-catalogos-gestion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminCatalogsComponent, CategoriasJustificacionAdminComponent, MotivosCancelacionAdminComponent, TiposIdentificacionAdminComponent],
  template: `
    <div class="space-y-8">
      <app-admin-catalogs />
      <app-tipos-identificacion-admin />
      <app-categorias-justificacion-admin />
      <app-motivos-cancelacion-admin />
    </div>
  `,
})
export class AdminCatalogosGestionComponent {}
