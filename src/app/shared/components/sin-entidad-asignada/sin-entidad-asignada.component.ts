import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { CodigoMensajeUi, mensajeUi } from '../../../core/messages/mensajes-ui';
import { RolSinAmbito } from '../../../core/api/errors/sin-ambito.util';

/** HU178: textos y marca de prueba del aviso de cada rol. */
const AVISO_POR_ROL: Readonly<
  Record<RolSinAmbito, { titulo: CodigoMensajeUi; descripcion: CodigoMensajeUi; testId: string }>
> = {
  DECANO: {
    titulo: 'UI_DEAN_SIN_FACULTAD_001',
    descripcion: 'UI_DEAN_SIN_FACULTAD_002',
    testId: 'decano-sin-facultad',
  },
  COORDINADOR: {
    titulo: 'UI_COORDINATOR_SIN_PROGRAMA_001',
    descripcion: 'UI_COORDINATOR_SIN_PROGRAMA_002',
    testId: 'coordinador-sin-programa',
  },
  ADMINISTRADOR: {
    titulo: 'UI_ADMIN_SIN_INSTITUCION_001',
    descripcion: 'UI_ADMIN_SIN_INSTITUCION_002',
    testId: 'administrador-sin-institucion',
  },
};

/**
 * HU178: aviso único para el decano sin facultad, el coordinador sin programa o el administrador sin institución. Es un estado informativo, no un error:
 * la regla de ámbito no cambia (sin esa entidad no ve datos) y la asignación la hace el administrador (facultad) o el
 * decano (programa). Se muestra en `/app/decano/sin-facultad` y `/app/coordinador/sin-programa` (destinos de los guards
 * de entidad asignada; el rol llega por `data.rol` de la ruta), en el panel principal y, como respaldo, donde el backend
 * responde con el código canónico de rol sin ámbito (`KPI_001`, `KPI_003`, `KPI_004`).
 */
@Component({
  selector: 'app-sin-entidad-asignada',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [EmptyStateComponent],
  template: `
    <div class="animate-fade-in" [attr.data-testid]="aviso().testId">
      <app-empty-state variant="info" [title]="titulo()" [description]="descripcion()" />
    </div>
  `,
})
export class SinEntidadAsignadaComponent {
  readonly rol = input.required<RolSinAmbito>();

  protected readonly aviso = computed(() => AVISO_POR_ROL[this.rol()]);
  // Funciones (no constantes): el texto se actualiza cuando llega el catálogo de MessageUcoLab.
  protected readonly titulo = () => mensajeUi(this.aviso().titulo);
  protected readonly descripcion = () => mensajeUi(this.aviso().descripcion);
}
