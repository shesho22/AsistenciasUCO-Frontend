import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
      [cargando]="cargando()"
    />
  `,
})
export class AdminCatalogsComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly toast = inject(ToastService);

  readonly tipos = this.adminService.tiposPrograma;
  readonly cargando = signal(true);

  ngOnInit(): void {
    this.adminService.cargarTiposPrograma().subscribe({
      next: () => this.cargando.set(false),
      error: (err) => {
        this.cargando.set(false);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }
}
