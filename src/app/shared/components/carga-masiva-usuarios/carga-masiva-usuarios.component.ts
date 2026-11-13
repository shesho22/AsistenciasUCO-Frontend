import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { CargaMasivaService } from '../../../core/services/carga-masiva.service';
import {
  DestinoCargaMasiva,
  EstadoFilaCarga,
  EstadoFilaValidacion,
  FilaResultadoCargaDTO,
  FilaValidacionCargaDTO,
  ResultadoCargaDTO,
  ResultadoValidacionCargaDTO,
} from '../../../core/models/carga-masiva.model';

export type PasoCargaMasiva =
  | 'SELECCION'
  | 'VALIDANDO'
  | 'VALIDADO'
  | 'CARGANDO'
  | 'RESULTADO';

@Component({
    selector: 'app-carga-masiva-usuarios',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div role="dialog" aria-labelledby="carga-masiva-titulo" class="bg-white rounded-2xl border border-warm-200/80 shadow-warm-sm p-4 sm:p-6 space-y-6 animate-fade-in">
      <!-- Encabezado con título y botón de cancelar/cerrar -->
      <div class="flex items-center justify-between pb-4 border-b border-warm-100">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">
              Carga Masiva CSV
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-600">{{ etiquetaDestino() }}</span>
          </div>
          <h2 id="carga-masiva-titulo" class="font-serif font-bold text-xl sm:text-2xl text-warm-900 tracking-tight mt-1">
            Carga Masiva de {{ etiquetaDestino() }}
          </h2>
          <p class="text-xs sm:text-sm text-warm-600 mt-1">
            Importa cuentas mediante un archivo CSV con validación previa de datos y reglas de negocio.
          </p>
        </div>

        <button
          type="button"
          (click)="onCerrar()"
          class="text-warm-400 hover:text-warm-700 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-warm-100 transition-colors"
          aria-label="Cerrar módulo de carga masiva"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Aviso visible de seguridad sobre contraseñas iniciales -->
      <div
        data-testid="aviso-seguridad-contrasenas"
        class="p-4 rounded-xl bg-warning-50 border border-warning-200 text-warning-900 text-xs sm:text-sm flex items-start gap-3"
      >
        <svg class="w-5 h-5 text-warning-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p class="font-semibold">Recomendación importante de seguridad:</p>
          <p class="mt-0.5 text-warning-800">
            Borra y elimina el archivo CSV de tu equipo una vez completada la carga, ya que contiene contraseñas iniciales confidenciales de los usuarios.
          </p>
        </div>
      </div>

      <!-- PASO 1: Selección de archivo y descarga de plantilla -->
      @if (paso() === 'SELECCION' || paso() === 'VALIDANDO') {
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-warm-50/60 rounded-xl border border-warm-200">
            <div>
              <p class="text-sm font-semibold text-warm-900">¿No tienes la plantilla oficial?</p>
              <p class="text-xs text-warm-600">Descarga la estructura CSV con los encabezados requeridos para {{ etiquetaDestino() }}.</p>
            </div>
            <button
              type="button"
              data-testid="btn-descargar-plantilla"
              (click)="descargarPlantilla()"
              class="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-primary-800 border border-primary-300 hover:bg-primary-50 transition-colors shadow-warm-xs min-h-[44px] flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar plantilla CSV
            </button>
          </div>

          <!-- Selector de archivo -->
          <div class="border-2 border-dashed border-warm-300 rounded-2xl p-6 text-center hover:border-primary-400 transition-colors bg-warm-50/30">
            <input
              #fileInput
              type="file"
              accept=".csv,text/csv"
              aria-label="Seleccionar archivo CSV para carga masiva"
              (change)="onArchivoSeleccionado($event)"
              class="hidden"
              id="input-carga-csv"
            />
            <label
              for="input-carga-csv"
              class="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <svg class="w-10 h-10 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span class="text-sm font-semibold text-primary-800 hover:underline">
                {{ archivoSeleccionado() ? 'Cambiar archivo seleccionado' : 'Selecciona un archivo CSV desde tu equipo' }}
              </span>
              <span class="text-xs text-warm-500">Solo archivos .csv codificados en UTF-8 (máximo 100 filas, 1 MB)</span>
            </label>

            @if (archivoSeleccionado(); as arch) {
              <div class="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warm-100 text-warm-800 text-xs font-medium">
                <svg class="w-4 h-4 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{{ arch.name }} ({{ tamanioArchivo() }})</span>
              </div>
            }
          </div>

          <!-- Mensaje de error en validación previa -->
          @if (errorValidacion(); as err) {
            <div
              data-testid="mensaje-error-validacion"
              class="p-4 rounded-xl bg-danger-50 border border-danger-200 text-danger-900 text-xs sm:text-sm flex items-start gap-2"
            >
              <svg class="w-5 h-5 text-danger-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ err }}</span>
            </div>
          }

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              (click)="onCerrar()"
              class="px-4 py-2 text-xs font-semibold rounded-xl bg-warm-100 text-warm-800 hover:bg-warm-200 transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              data-testid="btn-validar-archivo"
              [disabled]="!archivoSeleccionado() || paso() === 'VALIDANDO'"
              (click)="validarArchivo()"
              class="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center gap-2"
            >
              @if (paso() === 'VALIDANDO') {
                <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Validando...</span>
              } @else {
                <span>Validar archivo</span>
              }
            </button>
          </div>
        </div>
      }

      <!-- PASO 2 y 3: Resultados de Validación y Confirmación de Carga -->
      @if ((paso() === 'VALIDADO' || paso() === 'CARGANDO') && resultadoValidacion(); as val) {
        <div class="space-y-6">
          <!-- Conteos de validación -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="conteos-validacion">
            <div class="p-4 rounded-xl bg-warm-50 border border-warm-200">
              <p class="text-xs font-semibold text-warm-500 uppercase">Total filas</p>
              <p class="text-2xl font-bold text-warm-900 mt-1">{{ val.totalFilas }}</p>
            </div>
            <div class="p-4 rounded-xl bg-success-50 border border-success-200">
              <p class="text-xs font-semibold text-success-700 uppercase">Válidas para crear</p>
              <p class="text-2xl font-bold text-success-800 mt-1">{{ val.filasValidas }}</p>
            </div>
            <div class="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <p class="text-xs font-semibold text-neutral-600 uppercase">Ya existentes</p>
              <p class="text-2xl font-bold text-neutral-800 mt-1">{{ val.filasYaExistentes }}</p>
            </div>
            <div class="p-4 rounded-xl bg-danger-50 border border-danger-200">
              <p class="text-xs font-semibold text-danger-700 uppercase">Con error</p>
              <p class="text-2xl font-bold text-danger-800 mt-1">{{ val.filasConError }}</p>
            </div>
          </div>

          <!-- Mensaje de error si la ejecución de carga falló -->
          @if (errorCarga(); as errCarga) {
            <div
              data-testid="mensaje-error-carga"
              class="p-4 rounded-xl bg-danger-50 border border-danger-200 text-danger-900 text-xs sm:text-sm flex items-start gap-2"
            >
              <svg class="w-5 h-5 text-danger-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ errCarga }}</span>
            </div>
          }

          <!-- Vista de filas (Escritorio en tabla / Móvil 375px en tarjetas) -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-warm-900">Detalle de validación por fila</h3>

            <!-- Escritorio -->
            <div class="hidden sm:block overflow-x-auto rounded-xl border border-warm-200">
              <table class="w-full text-left text-xs text-warm-800 divide-y divide-warm-200">
                <thead class="bg-warm-50 text-warm-600 font-semibold">
                  <tr>
                    <th scope="col" class="px-4 py-3">Fila</th>
                    <th scope="col" class="px-4 py-3">Documento</th>
                    <th scope="col" class="px-4 py-3">Correo</th>
                    <th scope="col" class="px-4 py-3">Estado</th>
                    <th scope="col" class="px-4 py-3">Detalle / Errores</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-warm-100 bg-white">
                  @for (f of val.filas; track f.numeroFila) {
                    <tr data-testid="fila-validacion" class="hover:bg-warm-50/50">
                      <td class="px-4 py-3 font-semibold text-warm-700">{{ f.numeroFila }}</td>
                      <td class="px-4 py-3">{{ f.documento || '—' }}</td>
                      <td class="px-4 py-3 font-mono text-xs">{{ f.correo || '—' }}</td>
                      <td class="px-4 py-3">
                        <span [class]="claseEstadoValidacion(f.estado)">
                          {{ etiquetaEstadoValidacion(f.estado) }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-warm-600">
                        @if (f.errores && f.errores.length > 0) {
                          <ul class="list-disc list-inside text-danger-700 space-y-0.5">
                            @for (e of f.errores; track e.codigo) {
                              <li>{{ e.mensaje }}</li>
                            }
                          </ul>
                        } @else {
                          <span class="text-warm-400">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Móvil (375px) -->
            <div class="block sm:hidden space-y-3">
              @for (f of val.filas; track f.numeroFila) {
                <div data-testid="fila-validacion" class="p-3.5 rounded-xl border border-warm-200 bg-white space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-warm-900">Fila {{ f.numeroFila }}</span>
                    <span [class]="claseEstadoValidacion(f.estado)">
                      {{ etiquetaEstadoValidacion(f.estado) }}
                    </span>
                  </div>
                  <div class="text-xs text-warm-700 space-y-1">
                    <p><span class="font-medium text-warm-500">Documento:</span> {{ f.documento || '—' }}</p>
                    <p class="font-mono text-warm-800 break-all"><span class="font-medium text-warm-500 font-sans">Correo:</span> {{ f.correo || '—' }}</p>
                  </div>
                  @if (f.errores && f.errores.length > 0) {
                    <div class="pt-1 text-xs text-danger-700 border-t border-warm-100">
                      @for (e of f.errores; track e.codigo) {
                        <p class="text-xs">• {{ e.mensaje }}</p>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- PASO 3: Confirmación explícita -->
          <div
            data-testid="texto-confirmacion"
            class="p-4 rounded-xl bg-primary-50 border border-primary-200 text-primary-950 text-sm font-medium flex items-center justify-between"
          >
            <span>Se crearán {{ val.filasValidas }}, se omitirán {{ val.totalFilas - val.filasValidas }}.</span>
          </div>

          <div class="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              data-testid="btn-cancelar-validacion"
              (click)="volverASeleccion()"
              class="px-4 py-2 text-xs font-semibold rounded-xl bg-warm-100 text-warm-800 hover:bg-warm-200 transition-colors min-h-[44px]"
            >
              Seleccionar otro archivo
            </button>
            <button
              type="button"
              data-testid="btn-ejecutar-carga"
              [disabled]="val.filasValidas === 0 || paso() === 'CARGANDO'"
              (click)="ejecutarCarga()"
              class="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center justify-center gap-2"
            >
              @if (paso() === 'CARGANDO') {
                <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Creando cuentas...</span>
              } @else {
                <span>Confirmar y ejecutar carga</span>
              }
            </button>
          </div>
        </div>
      }

      <!-- PASO 4: Resultados finales de la Carga -->
      @if (paso() === 'RESULTADO' && resultadoCarga(); as res) {
        <div class="space-y-6">
          <div class="p-4 rounded-xl bg-success-50 border border-success-200 text-success-900 text-sm">
            <p class="font-bold text-base">Carga completada</p>
            <p class="text-xs sm:text-sm mt-0.5 text-success-800">{{ res.mensaje || 'Las cuentas han sido procesadas correctamente.' }}</p>
          </div>

          <!-- Conteos finales -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="conteos-carga">
            <div class="p-3.5 rounded-xl bg-warm-50 border border-warm-200">
              <p class="text-xs font-semibold text-warm-500 uppercase">Total</p>
              <p class="text-xl font-bold text-warm-900 mt-1">{{ res.totalFilas }}</p>
            </div>
            <div class="p-3.5 rounded-xl bg-success-50 border border-success-200">
              <p class="text-xs font-semibold text-success-700 uppercase">Creadas</p>
              <p class="text-xl font-bold text-success-800 mt-1">{{ res.creadas }}</p>
            </div>
            <div class="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
              <p class="text-xs font-semibold text-neutral-600 uppercase">Ya existentes</p>
              <p class="text-xl font-bold text-neutral-800 mt-1">{{ res.yaExistentes }}</p>
            </div>
            <div class="p-3.5 rounded-xl bg-danger-50 border border-danger-200">
              <p class="text-xs font-semibold text-danger-700 uppercase">Con error</p>
              <p class="text-xl font-bold text-danger-800 mt-1">{{ res.conError }}</p>
            </div>
            <div class="p-3.5 rounded-xl bg-warning-50 border border-warning-200 col-span-2 sm:col-span-1">
              <p class="text-xs font-semibold text-warning-700 uppercase">Pendientes</p>
              <p class="text-xl font-bold text-warning-800 mt-1">{{ res.cuentasPendientes }}</p>
            </div>
          </div>

          <!-- Tabla de filas creadas / omitidas -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-warm-900">Resultado por fila procesada</h3>

            <!-- Escritorio -->
            <div class="hidden sm:block overflow-x-auto rounded-xl border border-warm-200">
              <table class="w-full text-left text-xs text-warm-800 divide-y divide-warm-200">
                <thead class="bg-warm-50 text-warm-600 font-semibold">
                  <tr>
                    <th scope="col" class="px-4 py-3">Fila</th>
                    <th scope="col" class="px-4 py-3">Documento</th>
                    <th scope="col" class="px-4 py-3">Correo</th>
                    <th scope="col" class="px-4 py-3">Estado</th>
                    <th scope="col" class="px-4 py-3">Detalles</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-warm-100 bg-white">
                  @for (f of res.filas; track f.numeroFila) {
                    <tr class="hover:bg-warm-50/50">
                      <td class="px-4 py-3 font-semibold text-warm-700">{{ f.numeroFila }}</td>
                      <td class="px-4 py-3">{{ f.documento || '—' }}</td>
                      <td class="px-4 py-3 font-mono text-xs">{{ f.correo || '—' }}</td>
                      <td class="px-4 py-3">
                        <span [class]="claseEstadoCarga(f.estado)">
                          {{ etiquetaEstadoCarga(f.estado) }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-warm-600">
                        @if (f.errores && f.errores.length > 0) {
                          <ul class="list-disc list-inside text-danger-700 space-y-0.5">
                            @for (e of f.errores; track e.codigo) {
                              <li>{{ e.mensaje }}</li>
                            }
                          </ul>
                        } @else {
                          <span class="text-warm-400">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Móvil (375px) -->
            <div class="block sm:hidden space-y-3">
              @for (f of res.filas; track f.numeroFila) {
                <div class="p-3.5 rounded-xl border border-warm-200 bg-white space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-warm-900">Fila {{ f.numeroFila }}</span>
                    <span [class]="claseEstadoCarga(f.estado)">
                      {{ etiquetaEstadoCarga(f.estado) }}
                    </span>
                  </div>
                  <div class="text-xs text-warm-700 space-y-1">
                    <p><span class="font-medium text-warm-500">Documento:</span> {{ f.documento || '—' }}</p>
                    <p class="font-mono text-warm-800 break-all"><span class="font-medium text-warm-500 font-sans">Correo:</span> {{ f.correo || '—' }}</p>
                  </div>
                  @if (f.errores && f.errores.length > 0) {
                    <div class="pt-1 text-xs text-danger-700 border-t border-warm-100">
                      @for (e of f.errores; track e.codigo) {
                        <p class="text-xs">• {{ e.mensaje }}</p>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2 border-t border-warm-100">
            <button
              type="button"
              data-testid="btn-descargar-resultado"
              (click)="descargarResultadoCsv()"
              class="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-primary-800 border border-primary-300 hover:bg-primary-50 transition-colors shadow-warm-xs min-h-[44px] flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar resultado
            </button>

            <button
              type="button"
              (click)="onCerrar()"
              class="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-700 text-white hover:bg-primary-800 transition-colors min-h-[44px]"
            >
              Finalizar
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class CargaMasivaUsuariosComponent {
  destino = input.required<DestinoCargaMasiva>();
  cargaCompletada = output<void>();
  cancelar = output<void>();

  private readonly service = inject(CargaMasivaService);

  readonly paso = signal<PasoCargaMasiva>('SELECCION');
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly resultadoValidacion = signal<ResultadoValidacionCargaDTO | null>(null);
  readonly resultadoCarga = signal<ResultadoCargaDTO | null>(null);

  readonly errorValidacion = signal<string | null>(null);
  readonly errorCarga = signal<string | null>(null);

  readonly etiquetaDestino = computed(() => {
    switch (this.destino()) {
      case 'DOCENTE':
        return 'Docentes';
      case 'COORDINADOR':
        return 'Coordinadores';
      case 'DECANO':
        return 'Decanos';
    }
  });

  readonly tamanioArchivo = computed(() => {
    const bytes = this.archivoSeleccionado()?.size;
    if (!bytes) return '';
    return `${(bytes / 1024).toFixed(1)} KB`;
  });

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoSeleccionado.set(input.files[0]);
      this.errorValidacion.set(null);
    }
  }

  descargarPlantilla(): void {
    this.service.descargarPlantilla(this.destino()).subscribe({
      next: (blob) => {
        const nombre = `plantilla-carga-${this.destino().toLowerCase()}s.csv`;
        this.dispararDescarga(blob, nombre);
      },
      error: () => {
        this.errorValidacion.set('No fue posible descargar la plantilla CSV.');
      },
    });
  }

  validarArchivo(): void {
    const archivo = this.archivoSeleccionado();
    if (!archivo) return;

    this.paso.set('VALIDANDO');
    this.errorValidacion.set(null);

    this.service.validarArchivo(this.destino(), archivo).subscribe({
      next: (res) => {
        this.resultadoValidacion.set(res.datos);
        this.paso.set('VALIDADO');
      },
      error: (err: unknown) => {
        this.paso.set('SELECCION');
        this.errorValidacion.set(this.obtenerMensajeError(err, 'validación'));
      },
    });
  }

  ejecutarCarga(): void {
    const archivo = this.archivoSeleccionado();
    const val = this.resultadoValidacion();
    if (!archivo || !val) return;

    this.paso.set('CARGANDO');
    this.errorCarga.set(null);

    this.service.ejecutarCarga(this.destino(), archivo, val.huella).subscribe({
      next: (res) => {
        this.resultadoCarga.set(res.datos);
        this.paso.set('RESULTADO');
        this.cargaCompletada.emit();
      },
      error: (err: unknown) => {
        this.paso.set('VALIDADO');
        this.errorCarga.set(this.obtenerMensajeError(err, 'carga'));
      },
    });
  }

  volverASeleccion(): void {
    this.paso.set('SELECCION');
    this.resultadoValidacion.set(null);
    this.errorValidacion.set(null);
    this.errorCarga.set(null);
  }

  onCerrar(): void {
    this.cancelar.emit();
  }

  descargarResultadoCsv(): void {
    const res = this.resultadoCarga();
    if (!res) return;

    // Generar CSV en memoria: solo número de fila, estado y mensajes
    let csv = 'numero_fila,estado,mensajes\r\n';
    for (const f of res.filas) {
      const msgs = (f.errores || []).map((e) => e.mensaje.replace(/"/g, '""')).join('; ');
      csv += `${f.numeroFila},${f.estado},"${msgs}"\r\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const nombre = `resultado-carga-${this.destino().toLowerCase()}s.csv`;
    this.dispararDescarga(blob, nombre);
  }

  private dispararDescarga(blob: Blob, nombre: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private obtenerMensajeError(err: unknown, ambito: 'validación' | 'carga'): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 429 || err.error?.codigo === 'CMA_014') {
        return 'Has superado el número de cargas por minuto. Espera un momento antes de volver a intentarlo.';
      }
      if (err.status === 409 || err.error?.codigo === 'CMA_003') {
        return 'El archivo cambió desde la validación. Valídalo de nuevo.';
      }
      if (err.error?.mensajeUsuario) {
        return err.error.mensajeUsuario;
      }
      if (err.error?.mensaje) {
        return err.error.mensaje;
      }
      if (err.error?.message) {
        return err.error.message;
      }
    }
    return `Error en la ${ambito} del archivo CSV.`;
  }

  etiquetaEstadoValidacion(estado: EstadoFilaValidacion): string {
    switch (estado) {
      case 'VALIDA':
        return 'Válida';
      case 'YA_EXISTE':
        return 'Ya existe';
      case 'ERROR':
        return 'Error';
    }
  }

  claseEstadoValidacion(estado: EstadoFilaValidacion): string {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ';
    switch (estado) {
      case 'VALIDA':
        return base + 'bg-success-100 text-success-800 border-success-200';
      case 'YA_EXISTE':
        return base + 'bg-neutral-100 text-neutral-800 border-neutral-200';
      case 'ERROR':
        return base + 'bg-danger-100 text-danger-800 border-danger-200';
    }
  }

  etiquetaEstadoCarga(estado: EstadoFilaCarga): string {
    switch (estado) {
      case 'CREADA':
        return 'Creada';
      case 'CREADA_CUENTA_PENDIENTE':
        return 'Creada (cuenta pendiente)';
      case 'YA_EXISTE':
        return 'Ya existía';
      case 'YA_EXISTE_CUENTA_REPARADA':
        return 'Reparada';
      case 'ERROR':
        return 'Error';
    }
  }

  claseEstadoCarga(estado: EstadoFilaCarga): string {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ';
    switch (estado) {
      case 'CREADA':
      case 'YA_EXISTE_CUENTA_REPARADA':
        return base + 'bg-success-100 text-success-800 border-success-200';
      case 'CREADA_CUENTA_PENDIENTE':
        return base + 'bg-warning-100 text-warning-800 border-warning-200';
      case 'YA_EXISTE':
        return base + 'bg-neutral-100 text-neutral-800 border-neutral-200';
      case 'ERROR':
        return base + 'bg-danger-100 text-danger-800 border-danger-200';
    }
  }
}
