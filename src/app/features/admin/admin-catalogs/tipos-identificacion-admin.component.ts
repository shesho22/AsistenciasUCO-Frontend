import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CatalogService } from '../../../core/services/catalog.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import {
  CatalogoSoloConsultaComponent,
  FilaCatalogo,
} from '../../../shared/components/catalogo-solo-consulta/catalogo-solo-consulta.component';

/**
 * Consulta del catálogo de tipos de identificación (GET /tipos-identificacion), de solo lectura. El endpoint no
 * entrega estado activo/inactivo, por eso la tabla no muestra la columna Estado.
 */
@Component({
  selector: 'app-tipos-identificacion-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CatalogoSoloConsultaComponent],
  template: `
    <app-catalogo-solo-consulta
      titulo="Tipos de identificación"
      descripcion="Documentos de identidad aceptados para registrar a las personas."
      vacio="No hay tipos de identificación registrados."
      [conEstado]="false"
      [filas]="filas()"
      [cargando]="cargando()"
    />
  `,
})
export class TiposIdentificacionAdminComponent implements OnInit {
  private readonly catalogo = inject(CatalogService);
  private readonly toast = inject(ToastService);

  readonly filas = signal<FilaCatalogo[]>([]);
  readonly cargando = signal(true);

  ngOnInit(): void {
    this.catalogo.getIdentityDocumentTypes().subscribe({
      next: (tipos) => {
        this.filas.set(tipos.map((t) => ({ id: t.id, codigo: t.tipoIdentificacion, nombre: t.nombre })));
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }
}
