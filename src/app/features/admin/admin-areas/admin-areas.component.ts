import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import {
  CatalogoSoloConsultaComponent,
  FilaCatalogo,
} from '../../../shared/components/catalogo-solo-consulta/catalogo-solo-consulta.component';

/**
 * HU150: consulta del catálogo de áreas de conocimiento. Regla de John (2026-11-04): es un catálogo de solo consulta;
 * HU151 y HU152 (crear y modificar áreas) quedaron descartadas.
 */
@Component({
    selector: 'app-admin-areas',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CatalogoSoloConsultaComponent],
    template: `
    <app-catalogo-solo-consulta
      titulo="Áreas de Conocimiento"
      descripcion="Catálogo institucional de áreas de conocimiento asociadas a las asignaturas."
      vacio="No hay áreas de conocimiento registradas."
      [filas]="filas()"
      [cargando]="cargando()"
    />
  `
})
export class AdminAreasComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly toast = inject(ToastService);

  readonly cargando = signal(true);

  readonly filas = computed<FilaCatalogo[]>(() =>
    this.adminService.areas().map((a) => ({ id: a.id, codigo: a.codigo, nombre: a.nombre, activo: a.activa }))
  );

  ngOnInit(): void {
    this.adminService.cargarAreas().subscribe({
      next: () => this.cargando.set(false),
      error: (err) => {
        this.cargando.set(false);
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }
}
