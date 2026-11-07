import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { CorreccionIdentidadService } from '../../../core/services/correccion-identidad.service';
import { TipoIdentificacionApiDto } from '../../../core/api/models/tipo-identificacion-api-dto.model';
import { EstadoCorreccionDocumento } from '../../../core/models/correccion-identidad.model';

const MAX_MOTIVO = 500;
const CLASE_CONTROL =
  'w-full bg-white text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500';

/**
 * HU159: bloque común de documento y motivo para corregir la identidad de un usuario. Si la corrección del documento
 * está apagada (IDENTIDAD.PERMITIR_CORREGIR_DOCUMENTO) muestra el documento de solo lectura. El motivo es obligatorio
 * cuando el documento cambia o cuando `motivoSiempre` lo pide. Emite su estado en cada cambio.
 */
@Component({
  selector: 'app-correccion-documento',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="space-y-3" data-testid="correccion-documento">
      @if (permitir()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block text-xs font-semibold text-warm-700">
            Tipo de documento
            <select name="tipoDocumento" [ngModel]="tipo()" (ngModelChange)="tipo.set($event)" [class]="claseControl" data-testid="tipo-documento">
              @for (t of tipos(); track t.id) {
                <option [value]="t.id">{{ t.tipoIdentificacion }} · {{ t.nombre }}</option>
              }
            </select>
          </label>
          <label class="block text-xs font-semibold text-warm-700">
            Número de documento
            <input type="text" inputmode="numeric" name="numeroDocumento" maxlength="10" [ngModel]="numero()"
              (ngModelChange)="numero.set($event)" [class]="claseControl" data-testid="numero-documento" />
          </label>
        </div>
        @if (numeroInvalido()) {
          <p class="text-xs text-danger-600" role="alert">El número de documento debe tener solo dígitos.</p>
        }
        @if (cambiaDocumento()) {
          <p class="text-xs text-warning-800 bg-warning-50 border border-warning-200 rounded-xl px-3 py-2" data-testid="aviso-usuario">
            El documento es el usuario con el que la persona inicia sesión: después de guardar entrará con el nuevo
            documento (o con su correo). La contraseña no cambia.
          </p>
        }
      } @else {
        <p class="text-xs text-warm-600" data-testid="documento-solo-lectura">
          Documento: <span class="font-mono font-semibold text-warm-800">{{ codigoTipoActual() }} {{ numeroActual() }}</span>
          (no se puede modificar).
        </p>
      }

      @if (requiereMotivo()) {
        <label class="block text-xs font-semibold text-warm-700">
          Motivo de la corrección <span class="text-danger-600">*</span>
          <textarea name="motivo" rows="2" maxlength="500" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)"
            [class]="claseControl" data-testid="motivo-correccion"
            placeholder="Ej.: error de digitación al registrar el documento"></textarea>
        </label>
      }
    </div>
  `,
})
export class CorreccionDocumentoComponent implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly correccion = inject(CorreccionIdentidadService);

  readonly numeroActual = input<string | number | null>(null);
  readonly codigoTipoActual = input<string | null>(null);
  readonly idTipoActual = input<string | null>(null);
  /** Estudiante y decano: el motivo es obligatorio aunque solo cambien los nombres. */
  readonly motivoSiempre = input(false);
  readonly estadoCambio = output<EstadoCorreccionDocumento>();

  readonly claseControl = CLASE_CONTROL;
  /** Solo se corrige el documento si el parametro lo permite y el catalogo de tipos cargo. */
  private readonly permitidoPorParametro = signal(false);
  private readonly tiposCargados = signal(false);
  readonly permitir = computed(() => this.permitidoPorParametro() && this.tiposCargados());
  readonly tipos = signal<TipoIdentificacionApiDto[]>([]);
  readonly tipo = signal('');
  readonly numero = signal('');
  readonly motivo = signal('');
  private readonly tipoInicial = signal('');

  readonly numeroInvalido = computed(() => this.permitir() && !/^\d{1,10}$/.test(this.numero().trim()));
  readonly cambiaDocumento = computed(
    () =>
      this.permitir() &&
      (this.tipo() !== this.tipoInicial() || this.numero().trim() !== String(this.numeroActual() ?? '').trim()),
  );
  readonly requiereMotivo = computed(() => this.motivoSiempre() || this.cambiaDocumento());
  readonly estado = computed<EstadoCorreccionDocumento>(() => {
    const motivo = this.motivo().trim();
    const motivoValido = !this.requiereMotivo() || (motivo.length > 0 && motivo.length <= MAX_MOTIVO);
    const documento =
      this.cambiaDocumento() && !this.numeroInvalido() && this.tipo()
        ? { idTipoIdentificacion: this.tipo(), numeroIdentificacion: Number(this.numero().trim()) }
        : null;
    return {
      valido: motivoValido && !(this.cambiaDocumento() && (this.numeroInvalido() || !this.tipo())),
      documento,
      motivo,
    };
  });

  constructor() {
    effect(() => this.estadoCambio.emit(this.estado()));
  }

  ngOnInit(): void {
    this.numero.set(String(this.numeroActual() ?? ''));
    this.correccion.permiteCorregirDocumento().subscribe((permitido) => this.permitidoPorParametro.set(permitido));
    this.catalog.getTiposIdentificacion().subscribe({
      next: (res) => {
        const tipos = Array.isArray(res.datos) ? res.datos : [];
        this.tipos.set(tipos);
        const actual =
          tipos.find((t) => t.id === this.idTipoActual()) ?? tipos.find((t) => t.tipoIdentificacion === this.codigoTipoActual());
        this.tipoInicial.set(actual?.id ?? '');
        this.tipo.set(actual?.id ?? '');
        this.tiposCargados.set(tipos.length > 0);
      },
      // Sin catálogo no se puede elegir otro tipo: el documento queda de solo lectura.
      error: () => this.tiposCargados.set(false),
    });
  }
}
