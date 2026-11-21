import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { AdminCatalogosService } from '../../../core/services/admin-catalogos.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { EstadoSistemaItem } from '../../../core/models/consultas-transversales.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

/** Identificadores estables de los catálogos; se usan en el parámetro `?catalogo=` de la URL. */
export type CatalogoSistemaId =
  | 'tipos-programa'
  | 'tipos-identificacion'
  | 'categorias-justificacion'
  | 'motivos-cancelacion'
  | 'estados-reclamo'
  | 'estados-estudiante-grupo';

/** Fila común de la tabla; las columnas opcionales solo existen en los catálogos que las tienen. */
export interface FilaCatalogoSistema {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  requiereSoporte?: boolean;
  orden?: number;
  activo?: boolean;
}

interface DefinicionCatalogo {
  id: CatalogoSistemaId;
  etiqueta: string;
  vacio: string;
  descripcion?: boolean;
  requiereSoporte?: boolean;
  orden?: boolean;
  estado?: boolean;
}

/** Catálogos predefinidos del sistema, en el orden en que se ofrecen en el selector. */
export const CATALOGOS_SISTEMA: readonly DefinicionCatalogo[] = [
  { id: 'tipos-programa', etiqueta: 'Tipos de programa', vacio: 'No hay tipos de programa registrados.', estado: true },
  { id: 'tipos-identificacion', etiqueta: 'Tipos de identificación', vacio: 'No hay tipos de identificación registrados.' },
  {
    id: 'categorias-justificacion',
    etiqueta: 'Categorías de justificación',
    vacio: 'No hay categorías de justificación registradas.',
    descripcion: true,
    requiereSoporte: true,
  },
  { id: 'motivos-cancelacion', etiqueta: 'Motivos de cancelación', vacio: 'No hay motivos de cancelación registrados.', orden: true, estado: true },
  { id: 'estados-reclamo', etiqueta: 'Estados de reclamos', vacio: 'No hay estados de solicitud registrados.' },
  { id: 'estados-estudiante-grupo', etiqueta: 'Estados del estudiante en el grupo', vacio: 'No hay estados de estudiante registrados.' },
];

const CATALOGO_POR_DEFECTO: CatalogoSistemaId = 'tipos-programa';

interface EstadoCarga {
  filas: FilaCatalogoSistema[];
  cargando: boolean;
  error: boolean;
}

/**
 * Vista única «Catálogos del sistema» de la configuración del administrador. Reúne, en una sola tarjeta y una sola
 * tabla, todos los catálogos predefinidos (solo consulta): el sistema los define y el administrador no los modifica.
 * El catálogo elegido viaja en `?catalogo=` para sobrevivir a la recarga.
 */
@Component({
  selector: 'app-admin-catalogos-sistema',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-white rounded-2xl border border-warm-200 overflow-hidden animate-fade-in" aria-labelledby="catalogos-sistema-titulo">
      <div class="px-4 pt-4 pb-3 space-y-3">
        <h2 id="catalogos-sistema-titulo" class="text-base font-bold font-serif text-warm-900">
          Catálogos predefinidos del sistema (solo consulta)
        </h2>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Catálogo a consultar" data-testid="selector-catalogos">
          @for (c of catalogos; track c.id) {
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              [class]="c.id === seleccionado().id
                ? 'bg-primary-700 border-primary-700 text-white'
                : 'bg-white border-warm-300 text-warm-800 hover:bg-warm-50'"
              [attr.aria-pressed]="c.id === seleccionado().id"
              [attr.data-catalogo]="c.id"
              (click)="seleccionar(c.id)"
            >
              <span>{{ c.etiqueta }}</span>
              <span
                class="rounded-full px-1.5 text-[11px] font-bold"
                [class]="c.id === seleccionado().id ? 'bg-white/20 text-white' : 'bg-warm-100 text-warm-700'"
                [attr.aria-label]="cantidadEtiqueta(c.id)"
              >{{ cantidad(c.id) }}</span>
            </button>
          }
        </div>
      </div>

      <div class="border-t border-warm-100 tabla-scroll" data-testid="catalogo-contenido">
        <table class="tabla-tarjetas w-full text-sm">
          <caption class="sr-only">{{ seleccionado().etiqueta }}</caption>
          <thead class="bg-warm-50 text-xs uppercase text-warm-600">
            <tr>
              <th scope="col" class="text-left px-4 py-3">Código</th>
              <th scope="col" class="text-left px-4 py-3">Nombre</th>
              @if (seleccionado().descripcion) {
                <th scope="col" class="text-left px-4 py-3">Descripción</th>
              }
              @if (seleccionado().requiereSoporte) {
                <th scope="col" class="text-left px-4 py-3">Requiere soporte</th>
              }
              @if (seleccionado().orden) {
                <th scope="col" class="text-left px-4 py-3">Orden</th>
              }
              @if (seleccionado().estado) {
                <th scope="col" class="text-left px-4 py-3">Estado</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (fila of filas(); track fila.id) {
              <tr class="border-t border-warm-100">
                <td data-label="Código" class="px-4 py-2.5 font-mono font-bold">{{ fila.codigo }}</td>
                <td data-label="Nombre" class="px-4 py-2.5">{{ fila.nombre }}</td>
                @if (seleccionado().descripcion) {
                  <td data-label="Descripción" class="px-4 py-2.5 text-warm-700">{{ fila.descripcion || '—' }}</td>
                }
                @if (seleccionado().requiereSoporte) {
                  <td data-label="Requiere soporte" class="px-4 py-2.5">{{ fila.requiereSoporte ? 'Sí' : 'No' }}</td>
                }
                @if (seleccionado().orden) {
                  <td data-label="Orden" class="px-4 py-2.5">{{ fila.orden }}</td>
                }
                @if (seleccionado().estado) {
                  <td data-label="Estado" class="px-4 py-2.5">
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-bold"
                      [class]="fila.activo ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'"
                    >
                      {{ fila.activo ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="columnas()" class="px-4 py-8 text-center text-warm-500">
                  {{ mensajeVacio() }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class AdminCatalogosSistemaComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly catalogosService = inject(AdminCatalogosService);
  private readonly catalogService = inject(CatalogService);
  private readonly consultas = inject(ConsultasTransversalesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly catalogos = CATALOGOS_SISTEMA;

  private readonly datos = signal<Record<CatalogoSistemaId, EstadoCarga>>({
    'tipos-programa': { filas: [], cargando: true, error: false },
    'tipos-identificacion': { filas: [], cargando: true, error: false },
    'categorias-justificacion': { filas: [], cargando: true, error: false },
    'motivos-cancelacion': { filas: [], cargando: true, error: false },
    'estados-reclamo': { filas: [], cargando: true, error: false },
    'estados-estudiante-grupo': { filas: [], cargando: true, error: false },
  });

  private readonly parametro = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('catalogo'))), {
    initialValue: this.route.snapshot.queryParamMap.get('catalogo'),
  });

  /** Catálogo elegido: el de `?catalogo=` si es conocido; si no, el primero. */
  readonly seleccionado = computed(
    () => this.catalogos.find((c) => c.id === this.parametro()) ?? this.catalogos.find((c) => c.id === CATALOGO_POR_DEFECTO)!
  );

  readonly filas = computed(() => this.datos()[this.seleccionado().id].filas);
  readonly columnas = computed(() => {
    const c = this.seleccionado();
    return 2 + [c.descripcion, c.requiereSoporte, c.orden, c.estado].filter(Boolean).length;
  });
  readonly mensajeVacio = computed(() => {
    const e = this.datos()[this.seleccionado().id];
    if (e.cargando) return 'Cargando…';
    return e.error ? 'No se pudo cargar el catálogo.' : this.seleccionado().vacio;
  });

  ngOnInit(): void {
    this.adminService.cargarTiposPrograma().subscribe({
      next: () =>
        this.fijar(
          'tipos-programa',
          this.adminService.tiposPrograma().map((t) => ({ id: t.id, codigo: t.codigo, nombre: t.nombre, activo: t.activo }))
        ),
      error: (err) => this.fallar('tipos-programa', err),
    });
    this.catalogService.getIdentityDocumentTypes().subscribe({
      next: (tipos) => this.fijar('tipos-identificacion', tipos.map((t) => ({ id: t.id, codigo: t.tipoIdentificacion, nombre: t.nombre }))),
      error: (err) => this.fallar('tipos-identificacion', err),
    });
    this.catalogosService.listarCategorias().subscribe({
      next: (res) =>
        this.fijar(
          'categorias-justificacion',
          (res.datos ?? []).map((c) => ({
            id: c.id,
            codigo: c.codigo,
            nombre: c.nombre,
            descripcion: c.descripcion,
            requiereSoporte: c.requiereSoporte,
          }))
        ),
      error: (err) => this.fallar('categorias-justificacion', err),
    });
    this.catalogosService.listarMotivos().subscribe({
      next: (res) =>
        this.fijar(
          'motivos-cancelacion',
          (res.datos ?? []).map((m) => ({ id: m.id, codigo: m.codigo, nombre: m.nombre, orden: m.orden, activo: m.estaActivo }))
        ),
      error: (err) => this.fallar('motivos-cancelacion', err),
    });
    this.consultas.getEstadosSistema().subscribe({
      next: (res) => {
        const estados = res.datos ?? [];
        this.fijar('estados-reclamo', filasDeEstados(estados, 'SOLICITUD'));
        this.fijar('estados-estudiante-grupo', filasDeEstados(estados, 'ESTUDIANTE_GRUPO'));
      },
      error: (err) => {
        this.fallar('estados-reclamo', err);
        this.fallar('estados-estudiante-grupo', err, false);
      },
    });
  }

  seleccionar(id: CatalogoSistemaId): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { catalogo: id }, replaceUrl: true });
  }

  /** Cantidad de registros del catálogo; vacía mientras llega la primera respuesta. */
  cantidad(id: CatalogoSistemaId): string {
    const e = this.datos()[id];
    return e.cargando || e.error ? '…' : String(e.filas.length);
  }

  cantidadEtiqueta(id: CatalogoSistemaId): string {
    const e = this.datos()[id];
    return e.cargando || e.error ? 'Cantidad no disponible' : `${e.filas.length} registros`;
  }

  private fijar(id: CatalogoSistemaId, filas: FilaCatalogoSistema[]): void {
    this.datos.update((d) => ({ ...d, [id]: { filas, cargando: false, error: false } }));
  }

  private fallar(id: CatalogoSistemaId, err: unknown, avisar = true): void {
    this.datos.update((d) => ({ ...d, [id]: { filas: [], cargando: false, error: true } }));
    if (avisar) this.toast.error(getApiErrorMessage(err));
  }
}

/** Filas de un catálogo de estados del sistema (no traen estado activo/inactivo). */
export function filasDeEstados(estados: EstadoSistemaItem[], catalogo: EstadoSistemaItem['catalogo']): FilaCatalogoSistema[] {
  return estados.filter((e) => e.catalogo === catalogo).map((e) => ({ id: e.id, codigo: e.codigo, nombre: e.nombre }));
}
