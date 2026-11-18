import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ParametrosAdministrationComponent } from '../../parametros/parametros-administration/parametros-administration.component';

/**
 * Pestaña "Parámetros" de Configuración (`/app/admin/configuracion/parametros`): monta el micro frontend del Catálogo de
 * Parámetros (la lista y el modal propios que editaban `dbo.CatalogoParametro` se retiraron de la UI: INT-002, decisión
 * del 2026-11-12; ver TECHNICAL_DEBT). La auditoría y el cierre masivo ya no viven aquí: tienen vistas propias en
 * `/app/admin/sistema/auditoria` y `/app/admin/sistema/cierre-masivo`.
 */
@Component({
  selector: 'app-admin-system',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ParametrosAdministrationComponent],
  template: `
    <div id="panel-parametros">
      <app-parametros-administration />
    </div>
  `,
})
export class AdminSystemComponent {}
