import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ParametroAdminDto } from '../../../core/models/role-management.model';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

@Component({
    selector: 'app-parametro-edicion-modal',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule],
    template: `
    @if (isOpen() && parametro()) {
      <div
        class="fixed inset-0 z-50 overflow-y-auto bg-warm-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="parametro-modal-title"
      >
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-warm-xl border border-warm-200 relative animate-fade-in">
          <!-- Header -->
          <div class="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-warm-100">
            <div>
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-50 text-primary-800 border border-primary-100 inline-block mb-1">
                {{ parametro()?.grupo }}
              </span>
              <h2 id="parametro-modal-title" class="text-lg font-serif font-bold text-warm-900">
                {{ parametro()?.etiqueta || parametro()?.clave }}
              </h2>
              <p class="text-xs text-warm-600 mt-1">
                {{ parametro()?.descripcion || 'Edición de parámetro del sistema.' }}
              </p>
            </div>
            <button
              type="button"
              (click)="cerrarModal()"
              aria-label="Cerrar modal"
              class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-warm-400 hover:text-warm-700 hover:bg-warm-100 transition-colors"
            >
              <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Mensajes de Error -->
          @if (errorMensaje()) {
            <div role="alert" class="p-3 mb-4 rounded-xl bg-danger-50 border border-danger-200 text-xs text-danger-800 flex items-start gap-2">
              <svg aria-hidden="true" class="w-4 h-4 text-danger-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{{ errorMensaje() }}</span>
            </div>
          }

          <!-- Formulario -->
          <div class="space-y-4">
            <!-- Clave técnica (solo lectura de referencia) -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-wider text-warm-500 mb-1">
                Clave de Configuración
              </label>
              <p class="text-xs font-mono font-bold text-warm-800 bg-warm-50 px-3 py-2 rounded-xl border border-warm-200">
                {{ parametro()?.clave }}
              </p>
            </div>

            <!-- Control Dinámico de Valor -->
            <div>
              <label for="input-nuevo-valor" class="block text-xs font-bold text-warm-700 mb-1">
                Valor del Parámetro
                @if (parametro()?.unidad) {
                  <span class="text-warm-500 font-normal">({{ parametro()?.unidad }})</span>
                }
              </label>

              @if (esBoolean()) {
                <select
                  id="input-nuevo-valor"
                  data-testid="input-valor-boolean"
                  aria-label="Valor booleano del parámetro"
                  [value]="valorEfectivo()"
                  (change)="nuevoValor.set($any($event.target).value)"
                  class="w-full min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm font-semibold text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <option value="true">Verdadero (Habilitado)</option>
                  <option value="false">Falso (Deshabilitado)</option>
                </select>
              } @else if (opcionesPermitidas().length > 0) {
                <select
                  id="input-nuevo-valor"
                  data-testid="input-valor-select"
                  aria-label="Seleccionar valor permitido"
                  [value]="valorEfectivo()"
                  (change)="nuevoValor.set($any($event.target).value)"
                  class="w-full min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm font-semibold text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  @for (opc of opcionesPermitidas(); track opc) {
                    <option [value]="opc">{{ opc }}</option>
                  }
                </select>
              } @else if (esNumerico()) {
                <input
                  id="input-nuevo-valor"
                  type="number"
                  aria-label="Valor numérico del parámetro"
                  [min]="parametro()?.valorMinimo ?? ''"
                  [max]="parametro()?.valorMaximo ?? ''"
                  [step]="parametro()?.tipoDato === 'DECIMAL' ? '0.01' : '1'"
                  [value]="valorEfectivo()"
                  (input)="nuevoValor.set($any($event.target).value)"
                  class="w-full min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm font-semibold text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              } @else {
                <input
                  id="input-nuevo-valor"
                  type="text"
                  aria-label="Valor textual del parámetro"
                  [value]="valorEfectivo()"
                  (input)="nuevoValor.set($any($event.target).value)"
                  class="w-full min-h-[44px] px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm font-semibold text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              }

              <!-- Indicador de rango permitido si aplica -->
              @if (rangoTexto()) {
                <p class="text-[11px] text-warm-500 mt-1">
                  Rango permitido: {{ rangoTexto() }}
                </p>
              }
            </div>

            <!-- Campo Motivo (Obligatorio, 10–500 caracteres) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="textarea-motivo" class="block text-xs font-bold text-warm-700">
                  Motivo de la Modificación <span class="text-danger-600">*</span>
                </label>
                <span
                  class="text-[10px] font-mono font-bold"
                  [class]="motivo().trim().length >= 10 && motivo().trim().length <= 500 ? 'text-warm-500' : 'text-danger-600'"
                >
                  {{ motivo().trim().length }}/500 caracteres (mínimo 10)
                </span>
              </div>
              <textarea
                id="textarea-motivo"
                rows="3"
                aria-label="Motivo obligatorio de la modificación"
                placeholder="Explique la justificación técnica o reglamentaria de este cambio..."
                [value]="motivo()"
                (input)="motivo.set($any($event.target).value)"
                class="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-xs text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-600 placeholder:text-warm-400 resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Footer con Acciones -->
          <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-warm-100">
            <button
              type="button"
              (click)="cerrarModal()"
              [disabled]="isGuardando()"
              class="min-h-[44px] px-4 py-2 border border-warm-300 rounded-xl text-xs font-bold text-warm-700 hover:bg-warm-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              data-testid="btn-guardar-parametro"
              (click)="guardar()"
              [disabled]="!isFormValido() || isGuardando()"
              class="min-h-[44px] px-5 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-warm-300 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
              @if (isGuardando()) {
                <svg aria-hidden="true" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Guardando...</span>
              } @else {
                <span>Guardar cambios</span>
              }
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ParametroEdicionModalComponent {
  private adminService = inject(AdminManagementService);
  private toast = inject(ToastService);

  parametro = input<ParametroAdminDto | null>(null);
  isOpen = input<boolean>(false);

  guardado = output<void>();
  recargarRequerido = output<void>();
  cerrar = output<void>();

  nuevoValor = signal<string | null>(null);
  motivo = signal<string>('');
  isGuardando = signal<boolean>(false);
  errorMensaje = signal<string | null>(null);

  protected String = String;

  valorEfectivo = computed(() => {
    const nv = this.nuevoValor();
    if (nv !== null && nv !== undefined) return nv;
    return this.parametro()?.valor ?? '';
  });

  esBoolean = computed(() => {
    return this.parametro()?.tipoDato?.toUpperCase() === 'BOOLEAN';
  });

  esNumerico = computed(() => {
    const t = this.parametro()?.tipoDato?.toUpperCase();
    return t === 'INT' || t === 'DECIMAL' || t === 'NUMERO';
  });

  opcionesPermitidas = computed(() => {
    const p = this.parametro();
    if (!p?.valoresPermitidos) return [];
    if (Array.isArray(p.valoresPermitidos)) return p.valoresPermitidos;
    if (typeof p.valoresPermitidos === 'string') {
      return p.valoresPermitidos.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    }
    return [];
  });

  rangoTexto = computed(() => {
    const p = this.parametro();
    if (!p) return null;
    if (p.valorMinimo != null && p.valorMaximo != null) {
      return `Entre ${p.valorMinimo} y ${p.valorMaximo} ${p.unidad || ''}`.trim();
    }
    if (this.opcionesPermitidas().length > 0) {
      return `Opciones: ${this.opcionesPermitidas().join(', ')}`;
    }
    return null;
  });

  isFormValido = computed(() => {
    const m = this.motivo().trim();
    const v = this.valorEfectivo().trim();
    if (m.length < 10 || m.length > 500) return false;
    if (v.length === 0) return false;
    return true;
  });

  cerrarModal(): void {
    if (!this.isGuardando()) {
      this.cerrar.emit();
    }
  }

  guardar(): void {
    const p = this.parametro();
    if (!p) return;

    const fechaMod = p.fechaModificacion || p.fechaUltimoCambioUtc || '';
    const payload = {
      valor: this.valorEfectivo().trim(),
      fechaModificacionEsperada: fechaMod,
      motivo: this.motivo().trim(),
    };

    this.isGuardando.set(true);
    this.errorMensaje.set(null);

    this.adminService.actualizarParametro(p.id, payload).subscribe({
      next: (res) => {
        this.isGuardando.set(false);
        this.toast.success(res?.mensajeUsuario || 'Parámetro actualizado exitosamente.');
        this.guardado.emit();
        this.cerrar.emit();
      },
      error: (err: any) => {
        this.isGuardando.set(false);
        const errorMsg =
          err?.error?.mensajeUsuario ||
          err?.error?.message ||
          getApiErrorMessage(err);
        this.errorMensaje.set(errorMsg);

        // Si es conflicto 409 PRM_008 (concurrencia optimista)
        const codigo = err?.error?.codigo || err?.error?.codigoResultado || '';
        if (err?.status === 409 || codigo === 'PRM_008') {
          this.recargarRequerido.emit();
        }
      },
    });
  }
}
