import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TipoPlantillaAdminDto,
  VistaPreviaPlantillaResponse,
} from '../../../core/services/admin-email-notification.service';
import { etiquetaPlantilla, formatearFechaCorreo } from './admin-email-formato.util';

export type DestinoMarcador = 'cuerpo' | 'asunto';

/** Editor de una plantilla de correo: marcadores, asunto y cuerpo, vista previa e historial de versiones. */
@Component({
  selector: 'app-admin-email-plantilla-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    @let tpl = plantilla();
    <div class="space-y-5">
      <!-- Header Card -->
      <div class="superficie p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-100">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 font-mono">{{ tpl.tipo }}</span>
            </div>
            <h2 class="text-lg font-serif font-bold text-warm-900 mt-1">
              {{ etiqueta() }}
            </h2>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs text-warm-500">Versión activa:</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-success-100 text-success-800 border border-success-200">
              v{{ tpl.versionActiva }} Activa
            </span>
          </div>
        </div>

        <!-- Marcadores Disponibles -->
        <div class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-warm-600">Marcadores Dinámicos Disponibles</span>
            <span class="text-[11px] text-warm-400">Haz clic en un marcador para insertarlo</span>
          </div>

          <div class="flex flex-wrap gap-2">
            @for (m of tpl.marcadores; track m.marcador) {
              <div class="inline-flex items-center border border-warm-200 rounded-lg bg-warm-50/70 p-1 text-xs">
                <button
                  type="button"
                  (click)="marcadorInsertado.emit({ marcador: m.marcador, destino: 'cuerpo' })"
                  title="Insertar en el cuerpo: {{ m.descripcion }} (Ej: {{ m.ejemplo }})"
                  class="font-mono font-bold text-primary-800 hover:text-primary-900 px-1.5 py-0.5 rounded hover:bg-primary-100/60 transition-colors"
                >
                  {{ '{' + m.marcador + '}' }}
                </button>
                <span
                  [class]="m.obligatorio ? 'bg-warning-100 text-warning-800' : 'bg-warm-200 text-warm-700'"
                  class="text-[9px] font-bold px-1.5 py-0.5 rounded ml-1"
                >
                  {{ m.obligatorio ? 'Obligatorio' : 'Opcional' }}
                </span>
                <button
                  type="button"
                  (click)="marcadorInsertado.emit({ marcador: m.marcador, destino: 'asunto' })"
                  title="Insertar en asunto"
                  class="text-[9px] font-semibold text-warm-400 hover:text-primary-700 ml-1 px-1 py-0.5 rounded hover:bg-warm-200 transition-colors"
                >
                  + Asunto
                </button>
              </div>
            }
          </div>

          <!-- Client Validation Warning / Success Indicator -->
          <div class="mt-3">
            @if (faltantes().length > 0) {
              <div class="flex items-center gap-2 p-2.5 rounded-xl bg-warning-50 border border-warning-200 text-warning-900 text-xs">
                <svg class="w-4 h-4 text-warning-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span>
                  Faltan marcadores obligatorios en el texto:
                  <strong>{{ textoFaltantes() }}</strong>. Deben estar presentes en el asunto o cuerpo.
                </span>
              </div>
            } @else {
              <div class="flex items-center gap-2 p-2 rounded-xl bg-success-50 border border-success-200 text-success-800 text-xs">
                <svg class="w-4 h-4 text-success-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Todos los marcadores obligatorios están presentes en la plantilla.</span>
              </div>
            }
          </div>
        </div>

        <!-- Editor Form -->
        <div class="mt-5 space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="correo-asunto" class="text-xs font-bold text-warm-700">Asunto del Correo Electrónico</label>
              <span class="text-[11px] text-warm-400 font-mono">{{ asunto().length }} / 200</span>
            </div>
            <input
              id="correo-asunto"
              type="text"
              [ngModel]="asunto()"
              (ngModelChange)="asunto.set($event)"
              maxlength="200"
              class="w-full text-sm font-semibold p-2.5 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Asunto institucional..."
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="correo-cuerpo" class="text-xs font-bold text-warm-700">Cuerpo del Mensaje (Texto con Marcadores)</label>
              <span class="text-[11px] text-warm-400 font-mono">{{ cuerpo().length }} / 4000</span>
            </div>
            <textarea
              id="correo-cuerpo"
              rows="7"
              [ngModel]="cuerpo()"
              (ngModelChange)="cuerpo.set($event)"
              maxlength="4000"
              class="w-full text-xs font-mono p-3 bg-white border border-warm-300 rounded-xl text-warm-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Redacta el cuerpo de la plantilla..."
            ></textarea>
          </div>

          <!-- Actions Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="vistaPreviaSolicitada.emit()"
                [disabled]="generandoPreview()"
                class="px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <svg class="w-4 h-4 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>{{ generandoPreview() ? 'Generando...' : 'Vista Previa Institucional' }}</span>
              </button>

              <button
                type="button"
                (click)="restaurarSolicitado.emit()"
                class="px-3 py-2 text-warm-500 hover:text-warm-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Restaurar Texto Activo
              </button>
            </div>

            <button
              type="button"
              (click)="guardarSolicitado.emit()"
              [disabled]="guardando() || !puedeGuardar()"
              class="px-5 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>{{ guardando() ? 'Guardando versión...' : 'Guardar y Activar Nueva Versión' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Preview Box -->
      @if (vistaPrevia(); as vp) {
        <div class="superficie p-5 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-warm-100">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wider text-warm-700">Renderizado de Vista Previa</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-100 text-accent-800 font-mono">
                Origen: {{ vp.origen }}
              </span>
            </div>
            <span class="text-[11px] text-warm-400">Diseño Aurora UCO</span>
          </div>

          <div class="p-3 bg-warm-50 rounded-xl border border-warm-200 text-xs">
            <span class="font-bold text-warm-600 uppercase text-[10px] block mb-1">Asunto Renderizado:</span>
            <p class="font-bold text-warm-900 text-sm">{{ vp.asunto }}</p>
          </div>

          <!-- Email Client Layout Mockup -->
          <div class="border border-warm-200 rounded-xl overflow-hidden shadow-xs bg-white">
            <!-- Email Header Mockup -->
            <div class="bg-primary-800 text-white px-5 py-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-serif font-bold text-sm tracking-wide">Universidad Católica de Oriente</span>
                <span class="text-primary-200 text-xs">· Asistencias UCO</span>
              </div>
              <span class="text-[10px] font-mono text-primary-200">notificaciones&#64;uco.edu.co</span>
            </div>

            <!-- Email Body -->
            <div class="p-5" [innerHTML]="vp.html"></div>

            <!-- Email Footer Mockup -->
            <div class="bg-warm-50 border-t border-warm-200 px-5 py-3 text-[11px] text-warm-500 flex items-center justify-between">
              <span>Gestión de Asistencia Académica UCO · Sistema Central</span>
              <span>Mensaje transaccional automático</span>
            </div>
          </div>
        </div>
      }

      <!-- Version History Table -->
      <div class="superficie p-5">
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-warm-100">
          <h3 class="text-xs font-bold uppercase tracking-wider text-warm-700">Historial de Versiones de la Plantilla</h3>
          <span class="text-xs text-warm-400">{{ tpl.versiones.length }} versión(es)</span>
        </div>

        <div class="tabla-scroll">
          <table class="w-full text-left text-xs">
            <thead class="bg-warm-50 text-warm-600 uppercase text-[10px] font-bold">
              <tr>
                <th scope="col" class="py-2.5 px-3">Versión</th>
                <th scope="col" class="py-2.5 px-3">Fecha</th>
                <th scope="col" class="py-2.5 px-3">Asunto</th>
                <th scope="col" class="py-2.5 px-3">Estado</th>
                <th scope="col" class="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-warm-100 text-warm-800">
              @for (v of tpl.versiones; track v.id) {
                <tr class="hover:bg-warm-50/60 transition-colors">
                  <td class="py-2.5 px-3 font-mono font-bold">v{{ v.version }}</td>
                  <td class="py-2.5 px-3 text-warm-500 whitespace-nowrap">{{ formatearFecha(v.creadoEn) }}</td>
                  <td class="py-2.5 px-3 max-w-[260px] truncate font-medium" [title]="v.asunto">{{ v.asunto }}</td>
                  <td class="py-2.5 px-3">
                    @if (v.activa) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-100 text-success-800 border border-success-200">
                        Activa
                      </span>
                    } @else {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warm-100 text-warm-600">
                        Histórica
                      </span>
                    }
                  </td>
                  <td class="py-2.5 px-3 text-right">
                    @if (!v.activa) {
                      <button
                        type="button"
                        (click)="versionActivada.emit({ tipo: tpl.tipo, version: v.version })"
                        class="px-2.5 py-1 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Activar
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class AdminEmailPlantillaEditorComponent {
  readonly plantilla = input.required<TipoPlantillaAdminDto>();
  readonly asunto = model<string>('');
  readonly cuerpo = model<string>('');
  readonly faltantes = input<readonly string[]>([]);
  readonly puedeGuardar = input<boolean>(false);
  readonly guardando = input<boolean>(false);
  readonly generandoPreview = input<boolean>(false);
  readonly vistaPrevia = input<VistaPreviaPlantillaResponse | null>(null);

  readonly marcadorInsertado = output<{ marcador: string; destino: DestinoMarcador }>();
  readonly vistaPreviaSolicitada = output<void>();
  readonly restaurarSolicitado = output<void>();
  readonly guardarSolicitado = output<void>();
  readonly versionActivada = output<{ tipo: string; version: number }>();

  readonly etiqueta = computed(() => etiquetaPlantilla(this.plantilla()));
  readonly textoFaltantes = computed(() => this.faltantes().map((m) => `{${m}}`).join(', '));
  readonly formatearFecha = formatearFechaCorreo;
}
