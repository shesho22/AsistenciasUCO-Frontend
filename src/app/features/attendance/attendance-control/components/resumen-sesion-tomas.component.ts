import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TomaAsistenciaService } from '../../../../core/services/toma-asistencia.service';
import { AsistenciaToma, TomaAsistencia } from '../../../../core/models/toma-asistencia.model';
import { getApiErrorMessage } from '../../../../core/api/errors/api-error.util';
import { TAMANO_PAGINA_TOMA, cargarTodasLasPaginas } from './toma-paginas.util';
import { ClaveEstadoToma, ETIQUETA_ESTADO_TOMA, claveEstadoToma } from './toma-estado';

interface FilaResumen {
  estudianteId: string;
  nombre: string;
  celdas: { tomaId: string; estado: ClaveEstadoToma }[];
  horasAsistidas: number;
}

const CLAVES: readonly ClaveEstadoToma[] = ['AN', 'SJC', 'EX', 'SIN'];

/**
 * Resumen de la sesión: matriz estudiante × toma con el estado de cada uno (Presente, Falta, Excusa, Sin registro)
 * y las horas asistidas. Refleja lo guardado en el backend (`GET /tomas/{id}/asistencias`); las horas de cada toma
 * (`horasToma`) y de la sesión (`horasSesion`) las entrega el backend.
 */
@Component({
  selector: 'app-resumen-sesion-tomas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <section class="space-y-4" aria-label="Resumen de la sesión por toma" data-testid="resumen-sesion">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 class="font-serif font-bold text-lg text-warm-900">Resumen de la sesión</h3>
          <p class="text-xs text-warm-600">En qué tomas estuvo cada estudiante. Refleja lo ya guardado.</p>
        </div>
        <input
          type="search"
          data-testid="buscar-resumen"
          aria-label="Buscar estudiante en el resumen"
          placeholder="Buscar por nombre…"
          [value]="busqueda()"
          (input)="busqueda.set(valorDe($event))"
          class="w-full md:w-72 bg-warm-50 text-warm-900 border border-warm-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-700" data-testid="leyenda" aria-label="Leyenda">
        @for (clave of claves; track clave) {
          <li class="inline-flex items-center gap-1.5">
            <span [class]="clasesIcono(clave)" aria-hidden="true">{{ simbolo(clave) }}</span>
            {{ etiqueta(clave) }}
          </li>
        }
      </ul>

      @if (error()) {
        <p class="rounded-xl bg-danger-100 text-danger-900 px-4 py-2 text-sm font-medium" role="alert" data-testid="resumen-error">
          {{ error() }}
        </p>
      }

      @if (cargando() && filas().length === 0) {
        <div class="h-24 rounded-xl bg-warm-100 animate-pulse"></div>
      } @else {
        <div class="overflow-x-auto rounded-2xl border border-warm-200 bg-white" data-testid="matriz-scroll">
          <table class="w-full text-left text-xs text-warm-700">
            <thead class="bg-warm-100/70 border-b border-warm-200 text-[11px] font-bold text-warm-600">
              <tr>
                <th scope="col" class="py-3 px-3 sticky left-0 bg-warm-100 z-10 min-w-[8rem]">Estudiante</th>
                @for (t of tomas(); track t.idToma) {
                  <th scope="col" class="py-3 px-3 text-center whitespace-nowrap" [attr.data-testid]="'columna-' + t.idToma">
                    Toma {{ t.numero }}
                    <span class="block font-normal text-warm-600">{{ t.modo === 'QR' ? 'QR' : 'Manual' }} · {{ t.horasToma | number: '1.0-2' }} h</span>
                  </th>
                }
                <th scope="col" class="py-3 px-3 text-center whitespace-nowrap">Horas asistidas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-warm-100">
              @for (f of filasVisibles(); track f.estudianteId) {
                <tr [attr.data-testid]="'fila-resumen-' + f.estudianteId">
                  <th scope="row" class="py-2.5 px-3 font-semibold text-warm-900 sticky left-0 bg-white z-10">{{ f.nombre }}</th>
                  @for (c of f.celdas; track c.tomaId) {
                    <td
                      class="py-2.5 px-3 text-center"
                      [attr.data-testid]="'celda-' + f.estudianteId + '-' + c.tomaId"
                      [attr.data-estado]="c.estado"
                    >
                      <span [class]="clasesIcono(c.estado)" aria-hidden="true">{{ simbolo(c.estado) }}</span>
                      <span class="sr-only">{{ etiqueta(c.estado) }}</span>
                    </td>
                  }
                  <td class="py-2.5 px-3 text-center font-semibold whitespace-nowrap" [attr.data-testid]="'horas-' + f.estudianteId">
                    {{ f.horasAsistidas | number: '1.0-2' }} de {{ horasSesion() | number: '1.0-2' }} h
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class ResumenSesionTomasComponent {
  private readonly service = inject(TomaAsistenciaService);

  readonly tomas = input.required<TomaAsistencia[]>();
  readonly horasSesion = input<number>(0);

  protected readonly claves = CLAVES;
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly porToma = signal<ReadonlyMap<string, AsistenciaToma[]>>(new Map());

  protected readonly filas = computed<FilaResumen[]>(() => {
    const tomas = this.tomas();
    const datos = this.porToma();
    const nombres = new Map<string, string>();
    for (const t of tomas) {
      for (const r of datos.get(t.idToma) ?? []) nombres.set(r.estudianteId, r.nombreCompleto);
    }
    return [...nombres]
      .sort((a, b) => a[1].localeCompare(b[1], 'es'))
      .map(([estudianteId, nombre]) => {
        const celdas = tomas.map((t) => {
          const registro = datos.get(t.idToma)?.find((r) => r.estudianteId === estudianteId);
          return { tomaId: t.idToma, estado: claveEstadoToma(registro?.estado ?? null) };
        });
        const horasAsistidas = tomas.reduce(
          (suma, t, i) => (celdas[i].estado === 'AN' ? suma + t.horasToma : suma),
          0
        );
        return { estudianteId, nombre, celdas, horasAsistidas };
      });
  });

  protected readonly filasVisibles = computed(() => {
    const consulta = this.busqueda().trim().toLowerCase();
    return consulta === '' ? this.filas() : this.filas().filter((f) => f.nombre.toLowerCase().includes(consulta));
  });

  constructor() {
    effect((onCleanup) => {
      const tomas = this.tomas();
      if (tomas.length === 0) {
        this.porToma.set(new Map());
        return;
      }
      this.cargando.set(true);
      const sub = forkJoin(
        tomas.map((t) => cargarTodasLasPaginas((pagina) => this.service.consultarAsistencias(t.idToma, pagina, TAMANO_PAGINA_TOMA)))
      ).subscribe({
        next: (listas) => {
          this.error.set(null);
          this.porToma.set(new Map(tomas.map((t, i) => [t.idToma, listas[i]] as const)));
          this.cargando.set(false);
        },
        error: (err: unknown) => {
          this.error.set(getApiErrorMessage(err));
          this.cargando.set(false);
        },
      });
      onCleanup(() => sub.unsubscribe());
    }, { allowSignalWrites: true });
  }

  protected valorDe(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected etiqueta(clave: ClaveEstadoToma): string {
    return ETIQUETA_ESTADO_TOMA[clave];
  }

  protected simbolo(clave: ClaveEstadoToma): string {
    return { AN: '✓', SJC: '✕', EX: 'E', SIN: '–' }[clave];
  }

  protected clasesIcono(clave: ClaveEstadoToma): string {
    const base = 'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ';
    return (
      base +
      {
        AN: 'bg-attendance-present-soft text-attendance-present',
        SJC: 'bg-attendance-absent-soft text-attendance-absent',
        EX: 'bg-info-100 text-info-700',
        SIN: 'bg-warm-100 text-warm-600',
      }[clave]
    );
  }
}
