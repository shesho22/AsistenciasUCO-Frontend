import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NotificacionSalienteAdminDto } from '../../../core/services/admin-email-notification.service';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { formatearFechaCorreo } from './admin-email-formato.util';
import { claseDistintivoEstado, clasePuntoEstado, puedeReintentarEstado } from './admin-email-estado.util';

/** Tabla de la cola de correos: encabezado fijo en escritorio y tarjetas apiladas en pantallas angostas. */
@Component({
  selector: 'app-admin-email-cola-tabla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabla-scroll" role="region" tabindex="0" aria-label="Cola de correos">
      <table class="tabla-tarjetas w-full text-left text-xs" data-testid="cola-tabla">
        <thead class="text-warm-600 uppercase text-[10px] font-bold">
          <tr>
            <th scope="col" class="py-3 px-4">Tipo / Evento</th>
            <th scope="col" class="py-3 px-4">{{ mensaje('UI_ADMIN_EMAIL_MANAGEMENT_018') }}</th>
            <th scope="col" class="py-3 px-4">Asunto</th>
            <th scope="col" class="py-3 px-4">Destinatarios</th>
            <th scope="col" class="py-3 px-4">Estado</th>
            <th scope="col" class="py-3 px-4">Intentos</th>
            <th scope="col" class="py-3 px-4">Fecha Creación</th>
            <th scope="col" class="py-3 px-4">Error / Detalle</th>
            <th scope="col" class="py-3 px-4 text-right">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-warm-100 text-warm-800">
          @for (item of items(); track item.id) {
            <tr class="hover:bg-warm-50/60 transition-colors">
              <td class="py-3 px-4" data-label="Tipo / Evento">
                <span class="font-mono font-bold text-[11px] text-warm-900 block">{{ item.tipo }}</span>
                <span class="text-[10px] text-warm-400 font-mono">ID: {{ item.id.substring(0, 8) }}...</span>
              </td>
              <td class="py-3 px-4" [attr.data-label]="mensaje('UI_ADMIN_EMAIL_MANAGEMENT_018')" data-testid="cola-aplicacion">
                @if (item.aplicacion) {
                  <span class="font-medium text-warm-900">{{ item.aplicacion }}</span>
                } @else {
                  <span class="text-warm-400">—</span>
                }
              </td>
              <td class="py-3 px-4 max-w-[280px]" data-label="Asunto">
                <span class="font-medium text-warm-900 block truncate" [title]="item.asunto">{{ item.asunto }}</span>
                <span class="text-[10px] text-warm-400 font-mono">Corr: {{ item.idCorrelacion }}</span>
              </td>
              <td class="py-3 px-4 font-mono font-semibold" data-label="Destinatarios">
                {{ item.cantidadDestinatarios }} dest.
              </td>
              <td class="py-3 px-4" data-label="Estado">
                <span
                  [class]="claseDistintivo(item.codigoEstado)"
                  class="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1"
                >
                  <span class="w-1.5 h-1.5 rounded-full" [class]="clasePunto(item.codigoEstado)"></span>
                  {{ item.nombreEstado || item.codigoEstado }}
                </span>
              </td>
              <td class="py-3 px-4 font-mono font-bold" data-label="Intentos">{{ item.intentos }}</td>
              <td class="py-3 px-4 text-warm-500 whitespace-nowrap" data-label="Fecha Creación">
                <div>{{ formatearFecha(item.creadoEn) }}</div>
                @if (item.entregadoEn) {
                  <div class="text-[10px] text-success-700">Entregado: {{ formatearFecha(item.entregadoEn) }}</div>
                }
              </td>
              <td class="py-3 px-4 max-w-[220px]" data-label="Error / Detalle">
                @if (item.detalleError) {
                  <div class="text-[11px] text-danger-700 bg-danger-50 border border-danger-100 p-1.5 rounded-lg font-mono truncate" [title]="item.detalleError">
                    {{ item.codigoError ? item.codigoError + ': ' : '' }}{{ item.detalleError }}
                  </div>
                } @else {
                  <span class="text-warm-300">—</span>
                }
              </td>
              <td class="py-3 px-4 text-right" data-label="Acción">
                @if (puedeReintentar(item.codigoEstado)) {
                  <button
                    type="button"
                    (click)="reintentar.emit(item.id)"
                    [disabled]="reintentandoId() === item.id"
                    class="min-h-10 px-3 py-1 bg-warning-100 hover:bg-warning-200 text-warning-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    {{ reintentandoId() === item.id ? 'Reintentando...' : 'Reintentar' }}
                  </button>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="9" class="py-8 text-center text-warm-500 text-xs">
                No se encontraron notificaciones en la cola para los filtros seleccionados.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class AdminEmailColaTablaComponent {
  readonly items = input.required<readonly NotificacionSalienteAdminDto[]>();
  readonly reintentandoId = input<string | null>(null);
  readonly reintentar = output<string>();

  readonly mensaje = mensajeUi;
  readonly formatearFecha = formatearFechaCorreo;
  readonly claseDistintivo = claseDistintivoEstado;
  readonly clasePunto = clasePuntoEstado;
  readonly puedeReintentar = puedeReintentarEstado;
}
