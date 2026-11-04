import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { EstadoSistemaItem } from '../../../core/models/consultas-transversales.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import {
  CatalogoSoloConsultaComponent,
  FilaCatalogo,
} from '../../../shared/components/catalogo-solo-consulta/catalogo-solo-consulta.component';

/** Filas de un catálogo de estados para la tabla compartida (sin columna Activo/Inactivo). */
export function filasDe(estados: EstadoSistemaItem[], catalogo: EstadoSistemaItem['catalogo']): FilaCatalogo[] {
  return estados.filter((e) => e.catalogo === catalogo).map((e) => ({ id: e.id, codigo: e.codigo, nombre: e.nombre }));
}

/**
 * HU155 / HU167: consulta de los estados que usa el sistema. Regla de John (2026-11-04): catálogos base de solo
 * consulta; se muestran los estados de las solicitudes y los del estudiante en el grupo (no los técnicos de envío).
 */
@Component({
  selector: 'app-admin-estados',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CatalogoSoloConsultaComponent],
  template: `
    <div class="space-y-8 animate-fade-in">
      <div>
        <div class="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">Administración Institucional</div>
        <h1 class="text-2xl font-bold font-serif text-warm-900">Estados del Sistema</h1>
        <p class="text-sm text-warm-600">Estados que usa la aplicación. Catálogo de solo consulta: se cargan con la base de datos.</p>
      </div>
      <app-catalogo-solo-consulta
        [seccion]="true"
        [conEstado]="false"
        titulo="Estados de solicitudes"
        descripcion="Reclamos de asistencia y solicitudes de ingreso a grupo."
        vacio="No hay estados de solicitud registrados."
        [filas]="solicitudes()"
      />
      <app-catalogo-solo-consulta
        [seccion]="true"
        [conEstado]="false"
        titulo="Estados del estudiante en el grupo"
        descripcion="Situación de cada estudiante en los grupos en que está inscrito."
        vacio="No hay estados de estudiante registrados."
        [filas]="estudianteGrupo()"
      />
    </div>
  `,
})
export class AdminEstadosComponent implements OnInit {
  private readonly service = inject(ConsultasTransversalesService);
  private readonly toast = inject(ToastService);

  readonly estados = signal<EstadoSistemaItem[]>([]);
  readonly solicitudes = computed(() => filasDe(this.estados(), 'SOLICITUD'));
  readonly estudianteGrupo = computed(() => filasDe(this.estados(), 'ESTUDIANTE_GRUPO'));

  ngOnInit(): void {
    this.service.getEstadosSistema().subscribe({
      next: (res) => this.estados.set(res.datos ?? []),
      error: (err) => this.toast.error(getApiErrorMessage(err)),
    });
  }
}
