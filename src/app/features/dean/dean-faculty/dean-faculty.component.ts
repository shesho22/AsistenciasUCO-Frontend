import { CifraConBaseComponent } from '../../../shared/components/cifra-con-base/cifra-con-base.component';
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DeanIndicatorsService } from '../../../core/services/dean-indicators.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { DeanFacultadService, planesDeLaEstructura } from '../../../core/services/dean-facultad.service';
import { KpisDecano } from '../../../core/models/dean-indicators.model';
import { FacultadNodo } from '../../../core/models/facultad-decano.model';
import { PeriodoAcademicoItem, PlanEstudioItem } from '../../../core/models/role-management.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
    selector: 'app-dean-faculty',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [BadgeComponent, CifraConBaseComponent],
    template: `
    <div class="space-y-4">
      <!-- CULM-001: cabecera compacta de la facultad con tres cifras (grupos, planes, áreas) -->
      <div class="superficie p-4 sm:p-5 space-y-3" data-testid="cabecera-facultad">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-serif font-bold text-xl text-warm-900 tracking-tight">{{ nombreFacultad() }}</h2>
            <p class="text-xs text-warm-600 mt-0.5">
              Decano(a): <span class="font-semibold text-warm-900">{{ decanoResponsable() }}</span>
              · Período en curso: <span class="font-semibold text-primary-800">{{ periodoActualCodigo() }}</span>
            </p>
          </div>
          <app-badge [variant]="facultad()?.activa ? 'success' : 'neutral'" size="sm">{{ estadoFacultad() }}</app-badge>
        </div>

        @if (seccionesConError().length > 0) {
          <div class="rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-800" role="alert">
            <p class="font-semibold">No fue posible cargar: {{ seccionesConError().join(', ') }}.</p>
            <p class="mt-1">Las cifras afectadas muestran «—» en lugar de cero. Recargue la página o consulte con el administrador si persiste.</p>
          </div>
        }

        <ul class="flex flex-wrap gap-2" aria-label="Cifras de la facultad">
          <li class="px-3 py-1.5 rounded-xl bg-primary-50 border border-primary-200 text-xs text-primary-900" data-testid="chip-grupos">
            <span class="font-bold">{{ gruposTotal() }}</span> Grupos en curso
            @if (kpis(); as k) {
              <span class="text-primary-700">· <app-cifra-con-base [valor]="k.matriculadosActivos" [base]="k.cupoTotal" etiquetaValor="inscritos" etiquetaBase="cupos" /></span>
            }
          </li>
          <li class="px-3 py-1.5 rounded-xl bg-accent-100 border border-accent-200 text-xs text-accent-900" data-testid="chip-planes">
            <span class="font-bold">{{ planesTotal() }}</span> Planes de Estudio
          </li>
          <li class="px-3 py-1.5 rounded-xl bg-success-50 border border-success-200 text-xs text-success-800" data-testid="chip-areas">
            <span class="font-bold">{{ areasTotal() }}</span> Áreas de Conocimiento
          </li>
        </ul>
      </div>
    </div>
  `
})
export class DeanFacultyComponent implements OnInit {
  private readonly deanIndicators = inject(DeanIndicatorsService);
  private readonly adminService = inject(AdminManagementService);
  private readonly coordService = inject(CoordinatorManagementService);
  private readonly deanService = inject(DeanFacultadService);

  /**
   * CIERRE-W3I: grupos, inscritos y cupos de la facultad salen de GET /decano/indicadores (grupos habilitados del período vigente,
   * calculados en la base); antes se descargaban todas las páginas de grupos para sumarlas aquí.
   */
  kpis = signal<KpisDecano | null>(null);
  /** Áreas: lectura autorizada al DECANO (GET /admin/areas). */
  areas = this.adminService.areas;
  /** Facultad del decano autenticado (GET /decano/estructura); el ámbito lo fuerza el backend. */
  facultad = signal<FacultadNodo | null>(null);
  planes = signal<PlanEstudioItem[]>([]);
  periodos = signal<PeriodoAcademicoItem[]>([]);

  errorGrupos = signal(false);
  errorEstructura = signal(false);
  errorPeriodos = signal(false);
  errorAreas = signal(false);

  seccionesConError = computed(() => {
    const secciones: string[] = [];
    if (this.errorGrupos()) secciones.push('grupos');
    if (this.errorEstructura()) secciones.push('facultad y planes');
    if (this.errorPeriodos()) secciones.push('períodos');
    if (this.errorAreas()) secciones.push('áreas');
    return secciones;
  });

  gruposTotal = computed(() => {
    if (this.errorGrupos()) return '—';
    const k = this.kpis();
    return k === null ? 'Cargando…' : String(k.gruposActivos);
  });
  planesTotal = computed(() => (this.errorEstructura() ? '—' : String(this.planes().length)));
  periodosTotal = computed(() => (this.errorPeriodos() ? '—' : String(this.periodos().length)));
  areasTotal = computed(() => (this.errorAreas() ? '—' : String(this.areas().length)));

  nombreFacultad = computed(() => this.facultad()?.nombre ?? 'Mi Facultad');

  estadoFacultad = computed(() => {
    const facultad = this.facultad();
    return facultad ? (facultad.activa ? 'ACTIVA' : 'INACTIVA') : '—';
  });

  decanoResponsable = computed(() => this.facultad()?.nombreDecano ?? '—');

  periodoActualCodigo = computed(() => {
    const actual = this.periodos().find((p) => p.esActual || p.estado === 'ACTIVO');
    return actual ? actual.codigo : '—';
  });

  /**
   * Solo rutas de lectura autorizadas al DECANO. Espacios físicos, facultades, parámetros y auditoría son del
   * ADMINISTRADOR y los planes de /coordinador/** exigen alcance de programa: el decano obtiene sus planes de su
   * estructura de facultad.
   */
  ngOnInit(): void {
    this.deanIndicators.consultarKpis().subscribe({
      next: (res) => {
        this.kpis.set(res.datos ?? null);
        this.errorGrupos.set(res.datos === null || res.datos === undefined);
      },
      error: () => this.errorGrupos.set(true),
    });
    this.deanService.getEstructura().subscribe({
      next: (res) => {
        const estructura = res.datos || [];
        this.facultad.set(estructura[0] ?? null);
        this.planes.set(planesDeLaEstructura(estructura));
      },
      error: () => this.errorEstructura.set(true),
    });
    this.coordService.getPeriodosAcademicos().subscribe({
      next: (res) => this.periodos.set(res.datos || []),
      error: () => this.errorPeriodos.set(true),
    });
    this.adminService.cargarAreas().subscribe({ error: () => this.errorAreas.set(true) });
  }
}
