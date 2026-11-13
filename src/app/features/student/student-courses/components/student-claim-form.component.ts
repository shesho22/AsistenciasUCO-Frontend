import { Component, ChangeDetectionStrategy, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SOPORTE_ACCEPT, SOPORTE_MAX_BYTES, describirTamano } from '../../../../core/files/soporte-file.validator';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import {
  ConfiguracionReclamosDTO,
  MateriaEstudianteItem,
  SesionMateriaDetalle,
  CategoriaJustificacion,
  SoporteAdjuntoItem,
  TomaSesionEstudiante,
} from '../../../../core/models/role-management.model';
import { CategoriaJustificacionItem } from '../../../../core/models/consultas-transversales.model';

@Component({
    selector: 'app-student-claim-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ButtonComponent, FormFieldComponent],
    template: `
    @if (sesion() && materia()) {
      <div class="space-y-6">
        <!-- Barra Superior de Retorno -->
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
          <button
            type="button"
            (click)="back.emit()"
            class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a {{ materia()?.nombre }}
          </button>

          <span class="text-xs font-bold text-warning-800 bg-warning-50 border border-warning-200 px-3 py-1 rounded-full">
            Radicación de Novedad
          </span>
        </div>

        <div class="bg-white p-6 sm:p-8 rounded-2xl border border-warm-200 shadow-warm-sm max-w-3xl mx-auto space-y-6">
          <div>
            <h2 class="font-serif font-bold text-2xl text-warm-900">
              Solicitud de Revisión y Justificación de Asistencia
            </h2>
            <p class="text-sm text-warm-600 mt-1">
              Diligencia la categoría, justificación y soportes correspondientes a la inasistencia o retardo de la sesión indicada. Esta solicitud será enviada directamente al docente titular para su evaluación.
            </p>
          </div>

          <!-- Ficha de la Sesión Afectada -->
          <div class="p-4 rounded-xl bg-warning-50/70 border border-warning-200 text-xs space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-mono font-bold text-warning-900" data-testid="claim-sesion">
                Sesión #{{ sesion()?.numeroSesion }}@if (toma(); as t) {<span data-testid="claim-toma"> · Toma {{ t.numero }} ({{ t.horaPuntoControl }})</span>} — {{ sesion()?.fecha }} ({{ sesion()?.horario }})
              </span>
              @if (!toma()) {
                <span class="px-2 py-0.5 rounded-full font-bold bg-white text-danger-700 border border-danger-200">
                  Estado Actual: {{ sesion()?.estadoAsistencia }}
                </span>
              }
            </div>
            <p class="text-warning-950 font-medium">Tema: {{ sesion()?.tema }}</p>
            <p class="text-warning-800">Docente a cargo: {{ materia()?.docente ?? 'No informado' }}</p>
            @if (sesion()?.fechaLimiteJustificacionLocal; as limite) {
              <p class="text-warning-900 font-semibold" data-testid="claim-plazo">Puedes justificar hasta {{ limite }}</p>
            }
          </div>

          <!-- Formulario de Justificación -->
          <div class="space-y-4">
            <!-- Categoría de Inasistencia -->
            <app-form-field label="Categoría de Justificación" [required]="true">
              @if (requiereSoporte()) {
                <span class="inline-block mb-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-danger-50 text-danger-800 border border-danger-200" data-testid="soporte-obligatorio-badge">
                  Soporte obligatorio
                </span>
              }
              <select
                [ngModel]="categoria()"
                (ngModelChange)="categoria.set($event)"
                [disabled]="!categorias().length"
                data-testid="categoria-justificacion"
                class="w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                @for (cat of categorias(); track cat.id) {
                  <option [value]="cat.nombre">{{ cat.nombre }}</option>
                }
              </select>
              @if (categoriaSeleccionada()?.descripcion) {
                <p class="text-xs text-warm-600 mt-1.5" data-testid="descripcion-categoria">{{ categoriaSeleccionada()?.descripcion }}</p>
              }
              @if (!categorias().length) {
                <p class="text-xs font-medium text-danger-700 mt-1.5" role="alert">
                  No fue posible cargar los motivos de justificación. Vuelve a intentarlo más tarde.
                </p>
              }
            </app-form-field>

            <app-form-field label="Explicación detallada y justificación del reclamo" [required]="true">
              <textarea
                [ngModel]="justificacion()"
                (ngModelChange)="justificacion.set($event)"
                rows="5"
                placeholder="Escribe aquí con claridad los motivos de tu ausencia o retardo (ejemplo: cita médica con constancia, calamidad doméstica, representación institucional, retraso en transporte)..."
                class="w-full p-4 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 leading-relaxed"
              ></textarea>
            </app-form-field>

            <!-- Carga de Archivos Adjuntos / Soportes Documentales -->
            <div class="space-y-2">
              <label class="block text-xs font-semibold uppercase tracking-wider text-warm-700">
                Soportes Documentales (máx. <span data-testid="limite-maximo-soportes">{{ maximoSoportes() }}</span> archivos · {{ tiposPermitidosTexto() }} · Máx. {{ tamanioMaximoTexto() }} · límite <span data-testid="limite-por-minuto">{{ limiteSubidasPorMinuto() }}</span>/min)
              </label>

              @if (errorSoporte()) {
                <p class="text-xs font-medium text-danger-700" role="alert">{{ errorSoporte() }}</p>
              }

              <!-- Lista de archivos adjuntos -->
              @for (item of listaArchivos(); track (item.fileId || item.nombre); let idx = $index) {
                @if (item.estado === 'SUBIENDO') {
                  <div class="flex items-center gap-3 p-3.5 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-700" role="status">
                    <span class="inline-block w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                    <span>Subiendo y analizando el archivo {{ item.nombre }}…</span>
                    <button type="button" (click)="onRemover(idx)" class="ml-auto font-semibold text-danger-700 hover:underline">
                      Cancelar
                    </button>
                  </div>
                } @else if (item.estado === 'RECHAZADO') {
                  <div class="p-3.5 bg-danger-50/50 border border-danger-200 rounded-xl space-y-1">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 text-danger-800 text-xs font-bold">
                        <svg class="w-4 h-4 text-danger-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{{ item.nombre }}</span>
                      </div>
                      <button
                        type="button"
                        (click)="onRemover(idx)"
                        class="p-1.5 text-warm-400 hover:text-danger-600 rounded-lg hover:bg-danger-50 transition-colors"
                        title="Remover adjunto"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    @if (item.error) {
                      <p class="text-xs font-medium text-danger-700" role="alert">{{ item.error }}</p>
                    }
                  </div>
                } @else {
                  <div class="flex items-center justify-between p-3.5 bg-warm-50 border border-warm-200 rounded-xl">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-xs font-bold text-warm-900">{{ item.nombre }}</p>
                        <p class="text-xs text-warm-500">{{ item.tamanioKb }} KB • {{ item.tipo }}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="onRemover(idx)"
                      class="p-1.5 text-warm-400 hover:text-danger-600 rounded-lg hover:bg-danger-50 transition-colors"
                      title="Remover adjunto"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                }
              }

              <!-- Subida en curso global (fallback legacy) -->
              @if (subiendo() && listaArchivos().length === 0) {
                <div class="flex items-center gap-3 p-3.5 bg-warm-50 border border-warm-200 rounded-xl text-xs text-warm-700" role="status">
                  <span class="inline-block w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                  Subiendo y analizando el archivo…
                  <button type="button" (click)="removeFile.emit()" class="ml-auto font-semibold text-danger-700 hover:underline">
                    Cancelar
                  </button>
                </div>
              }

              <!-- Zona para adjuntar nuevo soporte -->
              @if (listaArchivos().length < maximoSoportes() && !haySubidaEnCurso()) {
                <label
                  class="border-2 border-dashed border-warm-200 hover:border-primary-400 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-warm-50/50 hover:bg-primary-50/20 transition-all text-center"
                >
                  <input
                    type="file"
                    class="hidden"
                    [attr.accept]="accept"
                    (change)="onFileChange($event)"
                  />
                  <div class="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <span class="text-xs font-semibold text-primary-700">Haz clic para adjuntar un documento</span>
                    <p class="text-xs text-warm-400 mt-0.5">Certificado médico, constancia laboral o justificación institucional</p>
                  </div>
                </label>
              }
            </div>

            <div class="p-3 bg-warm-50 rounded-xl border border-warm-200 text-xs text-warm-600 flex items-start gap-2.5">
              <svg class="w-4 h-4 text-warm-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Al enviar la solicitud, el docente evaluará los soportes radicados y, de considerarlo procedente, @if (toma()) { marcará que estuviste presente en esa toma o <strong>justificará tu ausencia</strong>. } @else { ajustará tu asistencia a <strong>"Asistencia Justificada"</strong>. }
              </span>
            </div>
          </div>

          @if (errorEnvio()) {
            <p class="text-xs font-medium text-danger-700 text-right" role="alert" data-testid="error-envio">{{ errorEnvio() }}</p>
          }

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-warm-100">
            <app-button variant="secondary" size="md" (clicked)="back.emit()">
              Cancelar
            </app-button>
            <app-button
              variant="primary"
              size="md"
              [disabled]="botonDesactivado()"
              [loading]="submitting()"
              (clicked)="onSubmit()"
            >
              <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Radicar Reclamo
            </app-button>
          </div>
        </div>
      </div>
    }
  `
})
export class StudentClaimFormComponent {
  materia = input<MateriaEstudianteItem | null>(null);
  sesion = input<SesionMateriaDetalle | null>(null);
  /** Toma que se reclama (`null` = reclamo de la sesión completa). */
  toma = input<TomaSesionEstudiante | null>(null);
  archivo = input<SoporteAdjuntoItem | null>(null);
  archivos = input<SoporteAdjuntoItem[]>([]);
  configuracion = input<ConfiguracionReclamosDTO | null>(null);
  submitting = input<boolean>(false);
  /** Hay una subida del soporte en curso: no se puede radicar hasta conocer el `fileId`. */
  subiendo = input<boolean>(false);
  errorSoporte = input<string | null>(null);
  /** CULM-001 D.1: mensaje del backend cuando la radicacion fue rechazada (p. ej. plazo vencido). */
  errorEnvio = input<string | null>(null);

  readonly accept = SOPORTE_ACCEPT;

  /** HU005: motivos del catálogo de solo consulta; se envía el nombre (contrato vigente de la radicación). */
  categorias = input<CategoriaJustificacionItem[]>([]);

  categoria = signal<CategoriaJustificacion>('');
  justificacion = signal<string>('');

  readonly maximoSoportes = computed(() => this.configuracion()?.maximoSoportes ?? 3);
  /** PAR-05: limite del parametro ARCHIVO/TAMANIO_MAXIMO_BYTES (respaldo 5 MB), en MB, KB o bytes sin redondear. */
  readonly tamanioMaximoTexto = computed(() => describirTamano(this.configuracion()?.tamanioMaximoBytes || SOPORTE_MAX_BYTES));
  readonly limiteSubidasPorMinuto = computed(() => this.configuracion()?.limiteSubidasPorMinuto ?? 10);
  readonly tiposPermitidos = computed(() => this.configuracion()?.tiposPermitidos ?? ['application/pdf', 'image/jpeg', 'image/png']);
  readonly tiposPermitidosTexto = computed(() => {
    const tipos = this.tiposPermitidos();
    return tipos.map((ext) => (ext.includes('/') ? ext.split('/')[1].toUpperCase() : ext.toUpperCase())).join(', ');
  });

  readonly listaArchivos = computed<SoporteAdjuntoItem[]>(() => {
    const arr = this.archivos();
    if (arr && arr.length > 0) return arr;
    const a = this.archivo();
    return a ? [a] : [];
  });

  readonly categoriaSeleccionada = computed(() => {
    const actual = this.categoria();
    const texto = typeof actual === 'object' && actual ? (actual.nombre || actual.codigo) : actual;
    return this.categorias().find((c) => c.nombre === texto || c.codigo === texto) ?? null;
  });

  readonly requiereSoporte = computed(() => this.categoriaSeleccionada()?.requiereSoporte === true);

  readonly haySubidaEnCurso = computed(() => this.subiendo() || this.listaArchivos().some((a) => a.estado === 'SUBIENDO'));

  readonly soportesListos = computed(() => this.listaArchivos().filter((a) => !a.estado || a.estado === 'LISTO'));

  readonly superaMaximoSoportes = computed(() => this.listaArchivos().length > this.maximoSoportes());

  readonly faltaSoporteObligatorio = computed(() => this.requiereSoporte() && this.soportesListos().length === 0);

  readonly botonDesactivado = computed(() => {
    if (!this.categoria() || !this.justificacion().trim()) return true;
    if (this.submitting() || this.haySubidaEnCurso()) return true;
    if (this.superaMaximoSoportes()) return true;
    if (this.faltaSoporteObligatorio()) return true;
    return false;
  });

  constructor() {
    // Primera categoría por defecto cuando llega el catálogo (o si la elegida ya no está en él).
    effect(() => {
      const categorias = this.categorias();
      if (categorias.length && !categorias.some((c) => c.nombre === this.categoria())) {
        this.categoria.set(categorias[0].nombre);
      }
    }, { allowSignalWrites: true });
  }

  back = output<void>();
  fileSelected = output<Event>();
  adjuntar = output<File>();
  removeFile = output<void>();
  quitar = output<number>();
  submitted = output<{
    categoria: CategoriaJustificacion;
    justificacion: string;
  }>();

  onRemover(idx: number): void {
    this.quitar.emit(idx);
    this.removeFile.emit();
  }

  onFileChange(event: Event): void {
    this.fileSelected.emit(event);
    const inputEl = event.target as HTMLInputElement | null;
    const files = inputEl?.files;
    if (files && files.length > 0) {
      this.adjuntar.emit(files[0]);
    }
  }

  onSubmit(): void {
    if (this.botonDesactivado()) return;
    this.submitted.emit({
      categoria: this.categoria(),
      justificacion: this.justificacion().trim(),
    });
  }
}
