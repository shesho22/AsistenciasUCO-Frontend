import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { CatalogoSoloConsultaComponent } from '../../../shared/components/catalogo-solo-consulta/catalogo-solo-consulta.component';

/** HU154: consulta del catálogo de tipos de programa. Regla de John (2026-11-04): catálogo de solo consulta. */
@Component({
  selector: 'app-admin-catalogs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CatalogoSoloConsultaComponent],
  template: `
    <app-catalogo-solo-consulta
      titulo="Tipos de Programa"
      descripcion="Modalidades formativas disponibles para los programas académicos."
      vacio="No hay tipos de programa registrados."
      [filas]="tipos()"
    />
  `,
})
export class AdminCatalogsComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly toast = inject(ToastService);

  readonly tipos = this.adminService.tiposPrograma;

  ngOnInit(): void {
    this.adminService.cargarTiposPrograma().subscribe({ error: (err) => this.toast.error(getApiErrorMessage(err)) });
  }
}
