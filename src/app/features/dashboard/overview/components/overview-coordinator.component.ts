import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevisionesPendientesKpiComponent } from '../../../../shared/components/revisiones-pendientes-kpi/revisiones-pendientes-kpi.component';
import { TablaDatosComponent } from '../../../../shared/components/tabla-datos/tabla-datos.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DocenteItem, PlanEstudioItem } from '../../../../core/models/role-management.model';
import { KpisCoordinador } from '../../../../core/models/coordinator-indicators.model';
import { EstadoIndicadores, textoCifra, textoPeriodo } from '../../../../core/utils/cifra-indicador';

@Component({
  selector: 'app-overview-coordinator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevisionesPendientesKpiComponent, RouterLink, TablaDatosComponent, BadgeComponent, ButtonComponent],
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="space-y-4">
      <!-- Revisiones de cancelación por inasistencia: conteo global con enlace directo (DEC-065) -->
      <div class="max-w-sm">
        <app-revisiones-pendientes-kpi rol="COORDINADOR" />
      </div>

      <!-- KPIs Coordinador -->
      <section class="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3" [attr.aria-busy]="estado() === 'cargando'">
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Planta Docente Activa</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="docentes">{{ texto(kpis()?.totalDocentes) }}</p>
          <span class="text-[11px] text-success-700 font-medium">Con vínculo activo en el programa</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Grupos en Curso</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="grupos">{{ texto(kpis()?.gruposActivos) }}</p>
          <span class="text-[11px] text-primary-700 font-medium" data-testid="periodo">{{ periodoTexto() }}</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Estudiantes Registrados</span>
          <p class="text-xl font-serif font-bold text-warm-900 mt-0.5" data-testid="estudiantes">{{ texto(kpis()?.estudiantesRegistrados) }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Padrón del programa</span>
        </div>
        <div class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full">
          <span class="rotulo-uco">Estudiantes en Riesgo</span>
          <p class="text-xl font-serif font-bold text-accent-700 mt-0.5" data-testid="estudiantes-riesgo">{{ texto(kpis()?.estudiantesRiesgo) }}</p>
          <span class="text-[11px] text-warm-500 font-medium">Indicador del programa</span>
        </div>
        <a
          routerLink="/app/coordinador/solicitudes-sesion"
          data-testid="solicitudes-sesion-pendientes"
          class="superficie px-3 py-2 sm:px-4 sm:py-3 flex flex-col justify-between h-full hover:bg-warm-50 transition-colors"
        >
          <span class="rotulo-uco">Solicitudes de sesión pendientes</span>
          <p class="text-xl font-serif font-bold text-warning-700 mt-0.5" data-testid="solicitudes-sesion-valor">{{ solicitudesSesionPendientes() === null ? 'Sin datos' : solicitudesSesionPendientes() }}</p>
          <span class="text-[11px] text-primary-700 font-medium">Revisar solicitudes →</span>
        </a>
      </section>

      <!-- Planes de Estudio del Programa -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-xl sm:text-2xl font-bold text-warm-900">Planes de Estudio del Programa</h2>
            <p class="text-xs text-warm-500">Plan de estudio, créditos aprobados y asignaturas de la carrera</p>
          </div>
          <a routerLink="/app/coordinador/planes-estudio">
            <app-button variant="secondary" size="sm">Ver Plan de Estudio Completo →</app-button>
          </a>
        </div>

        <app-tabla-datos
          etiqueta="Planes de estudio del programa"
          [columnas]="6"
          anchoMinimo="48rem"
          [vacio]="planesEstudio().length === 0"
          mensajeVacio="No hay planes de estudio registrados para este programa."
        >
          <thead>
            <tr>
              <th scope="col">Plan de estudio</th>
              <th scope="col">Vigencia</th>
              <th scope="col" class="text-right">Créditos</th>
              <th scope="col" class="text-right">Duración</th>
              <th scope="col">Estado</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (plan of planesEstudio(); track plan.id) {
              <tr data-testid="overview-plan-fila">
                <td>
                  <span class="block font-semibold text-warm-900">{{ plan.nombre }}</span>
                  <span class="block text-xs text-warm-500">{{ plan.codigo }}</span>
                  @if (plan.descripcion) {
                    <span class="block max-w-md text-[11px] italic text-warm-500 line-clamp-2">{{ plan.descripcion }}</span>
                  }
                </td>
                <td class="whitespace-nowrap">{{ plan.anioVigencia }}</td>
                <td class="text-right tabular-nums">{{ plan.totalCreditos }}</td>
                <td class="text-right whitespace-nowrap">{{ plan.totalSemestres }} Sem.</td>
                <td>
                  <app-badge [variant]="plan.estado === 'VIGENTE' ? 'success' : 'warning'" size="sm">{{ plan.estado }}</app-badge>
                </td>
                <td class="text-right whitespace-nowrap">
                  <a [routerLink]="['/app/coordinador/planes-estudio', plan.id, 'malla']">
                    <app-button variant="ghost" size="sm">Explorar Plan de Estudio</app-button>
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </app-tabla-datos>
      </section>

      <!-- Planta Docente Adscrita -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-xl sm:text-2xl font-bold text-warm-900">Planta Docente Adscrita</h2>
            <p class="text-xs text-warm-500">Profesores vinculados y asignación de grupos de la carrera</p>
          </div>
          <a routerLink="/app/coordinador/programa/docentes">
            <app-button variant="secondary" size="sm">Gestionar Planta Docente →</app-button>
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (docente of docentes().slice(0, 3); track docente.id) {
            <div class="superficie p-5 flex flex-col justify-between space-y-4">
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-warm-900 text-sm">{{ docente.nombres }} {{ docente.apellidos }}</span>
                  <app-badge variant="success">{{ docente.estado }}</app-badge>
                </div>
                <p class="text-xs text-primary-700 font-medium">{{ docente.especialidad }}</p>
                <p class="text-xs text-warm-500">{{ docente.correo }}</p>
                <p class="text-xs text-warm-600 bg-warm-50 px-2.5 py-1 rounded-md inline-block">
                  Grupos a cargo: <strong class="text-warm-900">{{ docente.totalGruposAsignados }}</strong>
                </p>
              </div>
              <a routerLink="/app/coordinador/programa/docentes" [queryParams]="{ busqueda: docente.numeroIdentificacion }" class="w-full">
                <app-button variant="ghost" size="sm" [fullWidth]="true">
                  Ver Perfil y Carga
                </app-button>
              </a>
            </div>
          } @empty {
            <div class="col-span-3 bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-3">
              <p class="text-xs text-warm-500">No hay docentes vinculados actualmente al programa.</p>
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class OverviewCoordinatorComponent {
  /** Docentes que se muestran abajo (los primeros tres): las cifras salen de `kpis`, no de la longitud de esta lista. */
  docentes = input<DocenteItem[]>([]);
  planesEstudio = input<PlanEstudioItem[]>([]);
  /** CIERRE-W3I: indicadores del programa calculados en la base (GET /coordinador/indicadores). */
  kpis = input<KpisCoordinador | null>(null);
  estado = input<EstadoIndicadores>('cargando');
  /** DEC-065 (2): solicitudes de sesión extraordinaria por aprobar; `null` = sin dato. */
  solicitudesSesionPendientes = input<number | null>(null);

  /** Período que resolvió el servidor para los indicadores (antes estaba escrito a mano). */
  periodoTexto = computed(() => textoPeriodo(this.estado(), this.kpis()?.nombrePeriodoAcademico));

  texto(valor: number | null | undefined, sufijo = ''): string {
    return textoCifra(valor, this.estado(), sufijo);
  }
}
