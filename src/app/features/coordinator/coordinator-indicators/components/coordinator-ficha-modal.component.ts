import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CoordinatorIndicatorsService } from '../../../../core/services/coordinator-indicators.service';
import { BitacoraSesion, FichaEstudiante } from '../../../../core/models/coordinator-indicators.model';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { TAMANO_PAGINA_TABLA, TablaDatosComponent } from '../../../../shared/components/tabla-datos/tabla-datos.component';
import { SessionTimeZoneService } from '../../../../core/services/session-timezone.service';
import { CorreccionIdentidadService } from '../../../../core/services/correccion-identidad.service';
import { CorregirIdentidadPayload, IdentidadActual } from '../../../../core/models/correccion-identidad.model';
import { CorreccionIdentidadModalComponent } from '../../../../shared/components/correccion-identidad-modal/correccion-identidad-modal.component';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { mensajeUi } from '../../../../core/messages/mensajes-ui';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
    selector: 'app-coordinator-ficha-modal',
    imports: [ModalComponent, TablaDatosComponent, CorreccionIdentidadModalComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-modal [isOpen]="true" [title]="'Ficha de ' + nombre()" tamano="3xl" etiquetaCerrar="Cerrar" (closed)="cancelar()">
      @if (error()) {
        <p class="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{{ error() }}</p>
      }

      @if (ficha(); as f) {
        <section class="mb-6 grid grid-cols-1 gap-2 text-sm text-neutral-700 sm:grid-cols-2">
          <p><span class="font-medium">Nombre:</span> {{ f.nombreCompleto }}</p>
          <p><span class="font-medium">Identificación:</span> {{ f.tipoIdentificacion }} {{ f.numeroIdentificacion }}</p>
          <p><span class="font-medium">Correo:</span> {{ f.correo }}</p>
          <p><span class="font-medium">Programa:</span> {{ f.nombrePrograma }}</p>
        </section>
        <!-- HU159: el coordinador corrige los datos de identidad de un estudiante de su programa -->
        <div class="mb-6 -mt-3">
          <button type="button" data-accion="corregir-identidad" (click)="corrigiendo.set(true)"
            class="text-xs px-3 py-1.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100">Corregir datos</button>
        </div>
        @if (corrigiendo()) {
          <app-correccion-identidad-modal
            titulo="Corregir datos del estudiante"
            [actual]="identidadActual(f)"
            [guardando]="guardandoCorreccion()"
            [error]="errorCorreccion()"
            (guardar)="corregir($event)"
            (cancelar)="cerrarCorreccion()"
          />
        }

        <h3 class="mb-2 text-sm font-semibold text-neutral-900">Resumen por asignatura</h3>
        <div class="mb-6 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="text-xs uppercase text-neutral-500">
              <tr><th scope="col" class="py-2">Asignatura</th><th scope="col">Grupo</th><th scope="col">Sesiones</th><th scope="col">Asist.</th><th scope="col">Faltas</th><th scope="col">Excusas</th><th scope="col">Inasistencia</th><th scope="col">Estado</th></tr>
            </thead>
            <tbody>
              @for (r of f.resumenPorAsignatura; track r.idGrupo) {
                <tr class="border-t border-neutral-100">
                  <td class="py-2">{{ r.nombreAsignatura }}</td>
                  <td>{{ r.codigoGrupo }}</td>
                  <td>{{ r.sesionesEjecutadas }}</td>
                  <td>{{ r.asistencias }}</td>
                  <td>{{ r.faltasSinJustaCausa }}</td>
                  <td>{{ r.excusas }}</td>
                  <td>{{ porcentaje(r.porcentajeInasistencia) }}</td>
                  <td>{{ r.codigoPermanencia }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <h3 class="mb-2 text-sm font-semibold text-neutral-900">Bitácora de asistencia</h3>
      <p class="mb-2 text-xs text-neutral-500">Horas en {{ timeZone.zoneLabel() }}.</p>
      <app-tabla-datos
        etiqueta="Bitácora de asistencia"
        [columnas]="4"
        anchoMinimo="38rem"
        alturaMaxima="50vh"
        [cargando]="cargandoBitacora()"
        [filasEsqueleto]="4"
        [vacio]="bitacora().length === 0"
        mensajeVacio="No hay sesiones registradas en la bitácora."
        [paginada]="true"
        [totalItems]="totalBitacora()"
        [pagina]="pagina()"
        [tamanoPagina]="tamano()"
        (paginaChange)="onPageChange($event)"
        (tamanoPaginaChange)="cambiarTamano($event)"
      >
        <thead>
          <tr>
            <th scope="col">Fecha y hora</th>
            <th scope="col">Asignatura</th>
            <th scope="col">Sesión</th>
            <th scope="col">Asistencia</th>
          </tr>
        </thead>
        @if (!cargandoBitacora()) {
          <tbody>
            @for (s of bitacora(); track s.idSesion + s.idGrupo) {
              <tr data-testid="bitacora-fila">
                <td class="whitespace-nowrap text-xs text-warm-600 tabular-nums">{{ timeZone.formatTemporal(s.fechaHoraInicio) }}</td>
                <td class="font-medium text-warm-900">{{ s.nombreAsignatura }}</td>
                <td>{{ s.nombreSesion }}</td>
                <td>
                  {{ etiquetaAsistencia(s.asistio) }}@if (s.nombreRazonCausa) { · {{ s.nombreRazonCausa }} }
                </td>
              </tr>
            }
          </tbody>
        }
      </app-tabla-datos>
    </app-modal>
  `
})
export class CoordinatorFichaModalComponent implements OnInit {
  private readonly service = inject(CoordinatorIndicatorsService);
  private readonly correccion = inject(CorreccionIdentidadService);
  private readonly toast = inject(ToastService);
  readonly timeZone = inject(SessionTimeZoneService);

  readonly idEstudiante = input.required<string>();
  readonly nombre = input<string>('');
  readonly cerrar = output<void>();

  readonly tamano = signal(TAMANO_PAGINA_TABLA);
  readonly cargandoBitacora = signal(true);
  readonly ficha = signal<FichaEstudiante | null>(null);
  readonly bitacora = signal<BitacoraSesion[]>([]);
  readonly totalBitacora = signal(0);
  readonly pagina = signal(1);
  readonly error = signal<string | null>(null);
  readonly corrigiendo = signal(false);
  readonly guardandoCorreccion = signal(false);
  readonly errorCorreccion = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarFicha();
    this.cargarBitacora();
  }

  identidadActual(f: FichaEstudiante): IdentidadActual {
    return {
      primerNombre: f.primerNombre,
      segundoNombre: f.segundoNombre,
      primerApellido: f.primerApellido,
      segundoApellido: f.segundoApellido,
      numeroIdentificacion: f.numeroIdentificacion,
      codigoTipoIdentificacion: f.tipoIdentificacion,
    };
  }

  corregir(payload: CorregirIdentidadPayload): void {
    this.guardandoCorreccion.set(true);
    this.errorCorreccion.set(null);
    this.correccion.corregirEstudiante(this.idEstudiante(), payload).subscribe({
      next: (r) => {
        this.guardandoCorreccion.set(false);
        this.corrigiendo.set(false);
        if (r.datos?.sincronizacionIdentidad === 'PENDIENTE') {
          this.toast.warning(r.datos.mensajeUsuario ?? mensajeUi('UI_ADMIN_DECANOS_001'));
        } else {
          this.toast.success(mensajeUi('UI_ADMIN_ESTUDIANTES_001'));
        }
        this.cargarFicha();
      },
      error: (e) => {
        this.guardandoCorreccion.set(false);
        this.errorCorreccion.set(getApiErrorMessage(e));
      },
    });
  }

  cerrarCorreccion(): void {
    this.corrigiendo.set(false);
    this.errorCorreccion.set(null);
  }

  private cargarFicha(): void {
    this.service.consultarFicha(this.idEstudiante()).subscribe({
      next: (r) => this.ficha.set(r.datos),
      error: (e) => this.error.set(getApiErrorMessage(e)),
    });
  }

  onPageChange(pagina: number): void {
    this.pagina.set(pagina);
    this.cargarBitacora();
  }

  cambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
    this.cargarBitacora();
  }

  cancelar(): void {
    this.cerrar.emit();
  }

  etiquetaAsistencia(asistio: boolean | null): string {
    if (asistio === null) return 'Sin registro';
    return asistio ? 'Asistió' : 'No asistió';
  }

  porcentaje(valor: number | null): string {
    return valor === null ? 'Sin datos' : `${valor}%`;
  }

  private cargarBitacora(): void {
    this.cargandoBitacora.set(true);
    this.service.consultarBitacora(this.idEstudiante(), this.pagina(), this.tamano()).subscribe({
      next: (r) => {
        this.bitacora.set(r.datos ?? []);
        this.totalBitacora.set(r.total ?? 0);
        this.cargandoBitacora.set(false);
      },
      error: (e) => {
        this.error.set(getApiErrorMessage(e));
        this.cargandoBitacora.set(false);
      },
    });
  }
}
