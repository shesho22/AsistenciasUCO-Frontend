import { Component, ElementRef, OnInit, inject, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { EstudianteFacultadItem, FichaEstudianteFacultad } from '../../../core/models/facultad-decano.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { FichaUnificadaEstudiante } from '../../../core/models/consultas-transversales.model';
import { HistorialEstudianteComponent } from '../../../shared/components/historial-estudiante/historial-estudiante.component';

type FiltroEstado = 'TODOS' | 'ACTIVO' | 'INACTIVO';

/**
 * HU104 (directorio consolidado de estudiantes de la facultad) y HU105 (búsqueda por nombre o documento y ficha
 * con las matrículas del estudiante). HU157: la ficha incluye el historial completo (períodos, grupos y asistencia),
 * limitado a la facultad del decano. Solo lectura.
 */
@Component({
  selector: 'app-dean-estudiantes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule, FormsModule, BadgeComponent, PaginationComponent, HistorialEstudianteComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">Decanatura</span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Directorio Estudiantil</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Estudiantes de la Facultad</h1>
          <p class="text-sm text-warm-600 mt-1">Directorio consolidado de los estudiantes matriculados en los programas de tu facultad.</p>
        </div>
        <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">{{ total() }} Estudiantes</span>
      </div>

      <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            aria-label="Buscar estudiante"
            [ngModel]="busqueda()"
            (ngModelChange)="busqueda.set($event)"
            (keyup.enter)="buscar()"
            placeholder="Buscar por nombre o documento y presiona Enter..."
            class="sm:col-span-2 px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-900"
          />
          <select
            aria-label="Estado"
            [ngModel]="estado()"
            (ngModelChange)="onEstadoChange($event)"
            class="px-3.5 py-2.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
        </div>

        @if (estudiantes().length === 0 && !cargando()) {
          <p class="text-sm text-warm-500 text-center py-6">No hay estudiantes que coincidan con la búsqueda.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Estudiante</th>
                  <th scope="col" class="py-2 pr-3">Documento</th>
                  <th scope="col" class="py-2 pr-3">Programas</th>
                  <th scope="col" class="py-2 pr-3">Grupos</th>
                  <th scope="col" class="py-2 pr-3">Estado</th>
                  <th scope="col" class="py-2"></th>
                </tr>
              </thead>
              <tbody>
                @for (e of estudiantes(); track e.idEstudiante) {
                  <tr class="border-b border-warm-50" [class.bg-primary-50]="ficha()?.idEstudiante === e.idEstudiante">
                    <td class="py-2 pr-3">
                      <span class="font-semibold text-warm-900 block">{{ e.nombreCompleto }}</span>
                      <span class="text-xs text-warm-500">{{ e.correo || '—' }}</span>
                    </td>
                    <td class="py-2 pr-3 font-mono text-xs text-warm-600">{{ e.numeroIdentificacion || '—' }}</td>
                    <td class="py-2 pr-3 text-warm-700">{{ e.programas || '—' }}</td>
                    <td class="py-2 pr-3 text-warm-700">{{ e.totalGrupos ?? 0 }}</td>
                    <td class="py-2 pr-3">
                      <app-badge [variant]="e.activo ? 'success' : 'neutral'">{{ e.activo ? 'Activo' : 'Inactivo' }}</app-badge>
                    </td>
                    <td class="py-2 text-right">
                      <button type="button" class="text-xs font-semibold text-primary-700 hover:underline" (click)="verFicha(e)">Ver ficha</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <app-pagination
          [totalItems]="total()"
          [totalPages]="totalPaginas()"
          [pageSize]="tamano()"
          [currentPage]="pagina()"
          (pageChange)="onPagina($event)"
          (pageSizeChange)="onTamano($event)"
        ></app-pagination>
      </section>

      @if (ficha(); as f) {
        <section
          #fichaPanel
          tabindex="-1"
          role="region"
          aria-label="Ficha del estudiante"
          class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4 outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-serif font-bold text-lg text-warm-900">{{ f.nombreCompleto }}</h2>
              <p class="text-xs text-warm-500">Documento {{ f.numeroIdentificacion || '—' }} · {{ f.matriculas.length }} matrículas</p>
            </div>
            <button type="button" class="text-xs font-semibold text-warm-600 hover:underline" (click)="cerrarFicha()">Cerrar</button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th scope="col" class="py-2 pr-3">Programa</th>
                  <th scope="col" class="py-2 pr-3">Plan</th>
                  <th scope="col" class="py-2 pr-3">Asignatura</th>
                  <th scope="col" class="py-2">Grupo</th>
                </tr>
              </thead>
              <tbody>
                @for (m of f.matriculas; track m.idGrupo) {
                  <tr class="border-b border-warm-50">
                    <td class="py-2 pr-3 text-warm-900">{{ m.nombrePrograma }}</td>
                    <td class="py-2 pr-3 font-mono text-xs text-warm-600">{{ m.inpPlanEstudio ?? '—' }}</td>
                    <td class="py-2 pr-3 text-warm-700">{{ m.nombreAsignatura }}</td>
                    <td class="py-2 text-warm-700">{{ m.nombreGrupo }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (historial(); as h) {
            <div class="pt-4 border-t border-warm-100 space-y-3">
              <h3 class="font-serif font-bold text-base text-warm-900">Historial completo</h3>
              <app-historial-estudiante [ficha]="h" />
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class DeanEstudiantesComponent implements OnInit {
  private readonly service = inject(DeanFacultadService);
  private readonly toast = inject(ToastService);
  private readonly consultas = inject(ConsultasTransversalesService);

  estudiantes = signal<EstudianteFacultadItem[]>([]);
  total = signal(0);
  totalPaginas = signal(0);
  pagina = signal(1);
  tamano = signal(10);
  cargando = signal(false);
  busqueda = signal('');
  estado = signal<FiltroEstado>('TODOS');
  ficha = signal<FichaEstudianteFacultad | null>(null);
  historial = signal<FichaUnificadaEstudiante | null>(null);
  private readonly fichaPanel = viewChild<ElementRef<HTMLElement>>('fichaPanel');

  ngOnInit(): void {
    this.cargar();
  }

  buscar(): void {
    this.pagina.set(1);
    this.cargar();
  }

  onEstadoChange(estado: FiltroEstado): void {
    this.estado.set(estado);
    this.buscar();
  }

  onPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.cargar();
  }

  onTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.buscar();
  }

  verFicha(estudiante: EstudianteFacultadItem): void {
    this.service.getFichaEstudiante(estudiante.idEstudiante).subscribe({
      next: (res) => {
        this.ficha.set(res.datos ?? null);
        this.enfocarFicha();
        this.cargarHistorial(estudiante.idEstudiante);
      },
      error: (error: unknown) => {
        this.ficha.set(null);
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }

  /** UX-11: la ficha se abre bajo la tabla; se desplaza hasta ella y se enfoca para lectores de pantalla. */
  private enfocarFicha(): void {
    setTimeout(() => {
      const panel = this.fichaPanel()?.nativeElement;
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        panel.focus({ preventScroll: true });
      }
    });
  }

  /** HU157: el historial es complementario; si falla, la ficha sigue visible y se informa el error. */
  private cargarHistorial(idEstudiante: string): void {
    this.historial.set(null);
    this.consultas.getHistorialEstudiante(idEstudiante).subscribe({
      next: (res) => this.historial.set(res.datos ?? null),
      error: (error: unknown) => this.toast.error(getApiErrorMessage(error)),
    });
  }

  cerrarFicha(): void {
    this.ficha.set(null);
    this.historial.set(null);
  }

  private cargar(): void {
    const estado = this.estado();
    this.cargando.set(true);
    this.service
      .getEstudiantes({
        busqueda: this.busqueda(),
        estaActivo: estado === 'TODOS' ? null : estado === 'ACTIVO',
        pagina: this.pagina(),
        tamano: this.tamano(),
      })
      .subscribe({
        next: (res) => {
          this.estudiantes.set(res.elementos ?? (res as any).datos ?? []);
          this.total.set(Number(res.totalElementos ?? (res as any).total ?? 0));
          this.totalPaginas.set(res.totalPaginas ?? Math.max(1, Math.ceil(this.total() / this.tamano())));
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.estudiantes.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.cargando.set(false);
          this.toast.error(getApiErrorMessage(error));
        },
      });
  }
}
