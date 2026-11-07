import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TipoIdentificacionItem } from '../../../../core/services/catalog.service';
import {
  DocenteCandidato,
  TipoVinculacionItem,
  VincularDocenteExistentePayload,
  VincularDocenteNuevoPayload,
} from '../../../../core/models/docente-programa.model';

type ModoVinculacion = 'NUEVO' | 'EXISTENTE';

const CLASE_CONTROL =
  'w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20';

/**
 * Modal de vinculacion de docentes (HU091): alta de persona nueva (con contrasena inicial asignada por el
 * coordinador) o vinculo de un docente ya registrado en la institucion elegido entre los candidatos del servidor.
 * No valida reglas de negocio: el backend es la autoridad y sus mensajes se muestran tal cual.
 */
@Component({
  selector: 'app-coordinator-docente-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-3xl shadow-warm-2xl border border-warm-200/80 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div class="px-6 py-5 border-b border-warm-100 flex items-start justify-between bg-warm-50/50">
          <div>
            <h2 class="text-xl font-serif font-bold text-warm-900">Vincular docente al programa</h2>
            <p class="text-xs text-warm-500 mt-0.5">Registra a una persona nueva o vincula a un docente ya registrado en la institución.</p>
          </div>
          <button type="button" (click)="solicitarCierre()" aria-label="Cerrar" class="text-warm-400 hover:text-warm-700 p-2 rounded-xl hover:bg-warm-100">✕</button>
        </div>

        <div class="px-6 pt-4 flex gap-2" role="tablist">
          <button type="button" role="tab" [attr.aria-selected]="modo() === 'NUEVO'" (click)="cambiarModo('NUEVO')"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-semibold border"
                  [class]="modo() === 'NUEVO' ? 'bg-primary-100 border-primary-300 text-primary-900' : 'bg-white border-warm-200 text-warm-700'">
            Docente nuevo
          </button>
          <button type="button" role="tab" [attr.aria-selected]="modo() === 'EXISTENTE'" (click)="cambiarModo('EXISTENTE')"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-semibold border"
                  [class]="modo() === 'EXISTENTE' ? 'bg-primary-100 border-primary-300 text-primary-900' : 'bg-white border-warm-200 text-warm-700'">
            Docente existente
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4">
          @if (error()) {
            <p role="alert" class="text-xs font-medium text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2">{{ error() }}</p>
          }

          @if (modo() === 'NUEVO') {
            <form (ngSubmit)="enviarNuevo()" class="space-y-4" autocomplete="off">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label class="block text-xs font-semibold text-warm-700">Primer nombre
                  <input type="text" name="primerNombre" [(ngModel)]="form.primerNombre" maxlength="50" [class]="clase" />
                </label>
                <label class="block text-xs font-semibold text-warm-700">Segundo nombre (opcional)
                  <input type="text" name="segundoNombre" [(ngModel)]="form.segundoNombre" maxlength="50" [class]="clase" />
                </label>
                <label class="block text-xs font-semibold text-warm-700">Primer apellido
                  <input type="text" name="primerApellido" [(ngModel)]="form.primerApellido" maxlength="50" [class]="clase" />
                </label>
                <label class="block text-xs font-semibold text-warm-700">Segundo apellido (opcional)
                  <input type="text" name="segundoApellido" [(ngModel)]="form.segundoApellido" maxlength="50" [class]="clase" />
                </label>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label class="block text-xs font-semibold text-warm-700">Tipo de documento
                  <select name="tipoIdentificacionId" [ngModel]="tipoIdentificacionEfectivo()" (ngModelChange)="form.tipoIdentificacionId = $event" [class]="clase">
                    @for (tipo of tiposIdentificacion(); track tipo.id) {
                      <option [value]="tipo.id">{{ tipo.tipoIdentificacion }} - {{ tipo.nombre }}</option>
                    }
                  </select>
                </label>
                <label class="block text-xs font-semibold text-warm-700 sm:col-span-2">Número de documento
                  <input type="text" name="numeroIdentificacion" inputmode="numeric" maxlength="10" [(ngModel)]="form.numeroIdentificacion" (input)="onNumeroInput($event)" [class]="clase" />
                </label>
              </div>
              <label class="block text-xs font-semibold text-warm-700">Correo institucional
                <input type="email" name="correo" [(ngModel)]="form.correo" maxlength="100" placeholder="nombre.apellido&#64;uco.edu.co" [class]="clase" />
              </label>
              <label class="block text-xs font-semibold text-warm-700">Contraseña inicial
                <input type="password" name="password" autocomplete="new-password" [(ngModel)]="form.password" [class]="clase" />
                <span class="font-normal text-warm-500">Se la entrega usted al docente; no hay flujo de recuperación en esta etapa.</span>
              </label>
              <label class="block text-xs font-semibold text-warm-700">Tipo de vinculación
                <select name="idTipoVinculacion" [(ngModel)]="form.idTipoVinculacion" [class]="clase">
                  <option value="">Seleccione…</option>
                  @for (tipo of tiposVinculacion(); track tipo.id) {
                    <option [value]="tipo.id">{{ tipo.nombre }}</option>
                  }
                </select>
              </label>
              <div class="flex justify-end gap-3 pt-3 border-t border-warm-100">
                <button type="button" (click)="solicitarCierre()" class="px-4 py-2 rounded-xl text-sm font-semibold bg-warm-100 text-warm-800 hover:bg-warm-200">Cancelar</button>
                <button type="submit" class="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-700 text-white hover:bg-primary-800">Registrar y vincular</button>
              </div>
            </form>
          } @else {
            <div class="space-y-4">
              <label class="block text-xs font-semibold text-warm-700">Buscar por documento o nombre (mínimo 3 caracteres)
                <input type="text" name="busquedaCandidato" [ngModel]="busquedaCandidato()" (ngModelChange)="onBusquedaCandidato($event)" [class]="clase" />
              </label>
              <ul class="divide-y divide-warm-100 border border-warm-200 rounded-xl max-h-56 overflow-y-auto">
                @for (c of candidatos(); track c.idDocente) {
                  <li>
                    <button type="button" (click)="seleccionarCandidato(c)"
                            class="w-full text-left px-3.5 py-2.5 text-sm hover:bg-warm-50"
                            [class]="candidatoSeleccionado()?.idDocente === c.idDocente ? 'bg-primary-50' : ''">
                      <span class="font-semibold text-warm-900">{{ c.nombreCompleto }}</span>
                      <span class="block text-xs text-warm-500">{{ c.codigoTipoIdentificacion }} {{ c.numeroIdentificacion }}</span>
                    </button>
                  </li>
                } @empty {
                  <li class="px-3.5 py-3 text-xs text-warm-500">Sin resultados. Escribe al menos 3 caracteres para buscar.</li>
                }
              </ul>
              <label class="block text-xs font-semibold text-warm-700">Tipo de vinculación
                <select name="idTipoVinculacionExistente" [(ngModel)]="form.idTipoVinculacion" [class]="clase">
                  <option value="">Seleccione…</option>
                  @for (tipo of tiposVinculacion(); track tipo.id) {
                    <option [value]="tipo.id">{{ tipo.nombre }}</option>
                  }
                </select>
              </label>
              <div class="flex justify-end gap-3 pt-3 border-t border-warm-100">
                <button type="button" (click)="solicitarCierre()" class="px-4 py-2 rounded-xl text-sm font-semibold bg-warm-100 text-warm-800 hover:bg-warm-200">Cancelar</button>
                <button type="button" (click)="enviarExistente()" class="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-700 text-white hover:bg-primary-800">Vincular al programa</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class CoordinatorDocenteFormModalComponent {
  readonly tiposIdentificacion = input.required<TipoIdentificacionItem[]>();
  readonly tiposVinculacion = input.required<TipoVinculacionItem[]>();
  readonly candidatos = input<DocenteCandidato[]>([]);

  readonly guardarNuevo = output<VincularDocenteNuevoPayload>();
  readonly guardarExistente = output<VincularDocenteExistentePayload>();
  readonly buscarCandidatos = output<string>();
  readonly cerrar = output<void>();

  readonly clase = CLASE_CONTROL;
  readonly modo = signal<ModoVinculacion>('NUEVO');
  readonly error = signal<string | null>(null);
  readonly busquedaCandidato = signal('');
  readonly candidatoSeleccionado = signal<DocenteCandidato | null>(null);

  form = {
    tipoIdentificacionId: '',
    numeroIdentificacion: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    correo: '',
    password: '',
    idTipoVinculacion: '',
  };

  /** Tipo de documento elegido o, por defecto, el primero del catalogo (nunca un identificador fijo en el cliente). */
  readonly tipoIdentificacionEfectivo = computed(() => this.form.tipoIdentificacionId || this.tiposIdentificacion()[0]?.id || '');

  cambiarModo(modo: ModoVinculacion): void {
    this.modo.set(modo);
    this.error.set(null);
    this.candidatoSeleccionado.set(null);
  }

  onNumeroInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    this.form.numeroIdentificacion = input.value;
  }

  enviarNuevo(): void {
    const f = this.form;
    const tipoId = this.form.tipoIdentificacionId || this.tipoIdentificacionEfectivo();
    const faltantes = !tipoId || !f.numeroIdentificacion.trim() || !f.primerNombre.trim() || !f.primerApellido.trim()
      || !f.correo.trim() || !f.password || !f.idTipoVinculacion;
    if (faltantes) {
      this.error.set('Complete todos los campos obligatorios: documento, nombre, apellido, correo, contraseña y tipo de vinculación.');
      return;
    }
    this.error.set(null);
    const payload: VincularDocenteNuevoPayload = {
      idTipoIdentificacion: tipoId,
      numeroIdentificacion: f.numeroIdentificacion.trim(),
      primerNombre: f.primerNombre.trim(),
      primerApellido: f.primerApellido.trim(),
      correo: f.correo.trim(),
      password: f.password,
      idTipoVinculacion: f.idTipoVinculacion,
    };
    if (f.segundoNombre.trim()) {
      payload.segundoNombre = f.segundoNombre.trim();
    }
    if (f.segundoApellido.trim()) {
      payload.segundoApellido = f.segundoApellido.trim();
    }
    this.guardarNuevo.emit(payload);
  }

  onBusquedaCandidato(texto: string): void {
    this.busquedaCandidato.set(texto);
    this.buscarCandidatos.emit(texto);
  }

  seleccionarCandidato(candidato: DocenteCandidato): void {
    this.candidatoSeleccionado.set(candidato);
    this.error.set(null);
  }

  enviarExistente(): void {
    const candidato = this.candidatoSeleccionado();
    if (!candidato || !this.form.idTipoVinculacion) {
      this.error.set('Seleccione un docente de la lista y un tipo de vinculación.');
      return;
    }
    this.error.set(null);
    this.guardarExistente.emit({ idDocente: candidato.idDocente, idTipoVinculacion: this.form.idTipoVinculacion });
  }

  solicitarCierre(): void {
    this.cerrar.emit();
  }
}
