import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

import { FichaUnificadaEstudiante, MatriculaHistorial, ResumenAsistencia } from '../../../core/models/consultas-transversales.model';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';

interface GrupoPeriodo {
  clave: string;
  titulo: string;
  matriculas: MatriculaHistorial[];
  perdidas: number;
  riesgo: number;
}

const VARIANTE_PERMANENCIA: Record<string, BadgeVariant> = {
  REGULAR: 'success',
  RIESGO: 'warning',
  PERDIDA: 'danger',
};

/**
 * HU157: ficha unificada del estudiante con su historial completo: una sección por período (el más reciente abierto) con
 * una fila por matrícula y su resumen de asistencia. La usan la ficha del administrador y la del decano (limitada a su
 * facultad).
 *
 * Unidades (NB-2, CULM-001 B.2): asistencias, faltas y excusas cuentan TOMAS de asistencia, `sesionesEjecutadas` cuenta
 * sesiones y el porcentaje de inasistencia se calcula por HORAS. Por eso el resumen no se presenta como "asistencias de
 * sesiones": con más de una toma por sesión el cociente no tendría sentido.
 */
@Component({
    selector: 'app-historial-estudiante',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BadgeComponent],
    template: `
    @if (ficha(); as f) {
      <div class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <span class="block text-warm-500 font-semibold uppercase">Documento</span>
            <span class="font-mono text-warm-900">{{ f.tipoIdentificacion || '' }} {{ f.numeroIdentificacion || '—' }}</span>
          </div>
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <span class="block text-warm-500 font-semibold uppercase">Correo</span>
            <span class="text-warm-900 break-all">{{ f.correo || '—' }}</span>
          </div>
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <span class="block text-warm-500 font-semibold uppercase">Programas</span>
            <span class="text-warm-900">{{ programas() }}</span>
          </div>
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <span class="block text-warm-500 font-semibold uppercase">Estado</span>
            <app-badge [variant]="f.activo ? 'success' : 'neutral'">{{ f.activo ? 'Activo' : 'Inactivo' }}</app-badge>
          </div>
        </div>

        @if (f.matriculas.length === 0) {
          <p class="text-sm text-warm-500 text-center py-4">El estudiante no tiene matrículas registradas.</p>
        } @else {
          <!-- Una sección por período: el más reciente abierto y los anteriores plegados -->
          <div class="space-y-3" data-testid="periodos-historial">
            @for (g of periodos(); track g.clave; let i = $index) {
              <details class="rounded-xl border border-warm-200 bg-white" data-testid="periodo-historial">
                <summary class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 cursor-pointer text-sm font-semibold text-warm-900">
                  <span>{{ g.titulo }}</span>
                  <span class="flex items-center gap-2 text-xs font-normal text-warm-500">
                    {{ g.matriculas.length }} {{ g.matriculas.length === 1 ? 'matrícula' : 'matrículas' }}
                    @if (g.perdidas > 0) {
                      <app-badge variant="danger">{{ g.perdidas }} en pérdida</app-badge>
                    }
                    @if (g.riesgo > 0) {
                      <app-badge variant="warning">{{ g.riesgo }} en riesgo</app-badge>
                    }
                  </span>
                </summary>
                <div class="overflow-x-auto px-4 pb-3">
                  <table class="w-full text-sm" [attr.aria-label]="'Matrículas de ' + g.titulo">
                    <thead>
                      <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                        <th class="py-2 pr-3">Programa</th>
                        <th class="py-2 pr-3">Asignatura y grupo</th>
                        <th class="py-2 pr-3">Estado</th>
                        <th class="py-2 pr-3" title="Asistencias, faltas y excusas cuentan tomas de asistencia; el porcentaje de inasistencia se calcula por horas dictadas.">Asistencia</th>
                        <th class="py-2">Permanencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (m of g.matriculas; track $index) {
                        <tr class="border-b border-warm-50">
                          <td class="py-2 pr-3">
                            <span class="text-warm-900 block">{{ m.nombrePrograma }}</span>
                            <span class="text-xs text-warm-500">{{ m.nombreFacultad }} · Plan {{ m.inpPlanEstudio ?? '—' }}</span>
                          </td>
                          <td class="py-2 pr-3 text-warm-700">
                            @if (m.idGrupo) {
                              {{ m.nombreAsignatura }} · Grupo {{ m.codigoGrupo ?? '—' }}
                            } @else {
                              <span class="text-warm-500">Sin grupos</span>
                            }
                          </td>
                          <td class="py-2 pr-3 text-warm-700">{{ m.nombreEstadoEstudiante || '—' }}</td>
                          <td class="py-2 pr-3 text-warm-700">
                            @if (m.resumen; as r) {
                              <span data-testid="detalle-asistencia">{{ detalleAsistencia(r) }}</span>
                              <span class="block text-xs text-warm-500">{{ r.porcentajeInasistencia ?? 0 }} % de inasistencia (por horas)</span>
                            } @else {
                              —
                            }
                          </td>
                          <td class="py-2">
                            @if (m.resumen?.codigoPermanencia; as codigo) {
                              <app-badge [variant]="variante(codigo)">{{ codigo }}</app-badge>
                            } @else {
                              —
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </details>
            }
          </div>
        }
      </div>
    }
  `
})
export class HistorialEstudianteComponent {
  readonly ficha = input<FichaUnificadaEstudiante | null>(null);

  /** Programas distintos del historial, en el orden en que aparecen. */
  readonly programas = computed(() => {
    const nombres = (this.ficha()?.matriculas ?? []).map((m: MatriculaHistorial) => m.nombrePrograma);
    return [...new Set(nombres)].join(', ') || '—';
  });

  /** Matrículas agrupadas por período, en el orden del servidor (más reciente primero). */
  readonly periodos = computed<GrupoPeriodo[]>(() => {
    const grupos = new Map<string, GrupoPeriodo>();
    for (const m of this.ficha()?.matriculas ?? []) {
      const clave = m.idPeriodoAcademico ?? 'sin-periodo';
      let g = grupos.get(clave);
      if (!g) {
        g = { clave, titulo: m.nombrePeriodo || m.codigoPeriodo || 'Sin período', matriculas: [], perdidas: 0, riesgo: 0 };
        grupos.set(clave, g);
      }
      g.matriculas.push(m);
      const codigo = m.resumen?.codigoPermanencia?.toUpperCase();
      if (codigo === 'PERDIDA') g.perdidas++;
      else if (codigo === 'RIESGO') g.riesgo++;
    }
    return [...grupos.values()];
  });

  /**
   * Texto del resumen: con las tomas dictadas que entrega el backend, «A de T tomas»; sin ellas, solo los conteos, sin
   * compararlos con las sesiones.
   */
  detalleAsistencia(r: ResumenAsistencia): string {
    const tomas = r.tomasDictadas != null ? `${r.asistencias} de ${r.tomasDictadas} tomas` : `${r.asistencias} asistencias`;
    return `${tomas} · ${r.faltasSinJustaCausa} faltas · ${r.excusas} excusas`;
  }

  /** Color de la permanencia según el código de la DB (ufn_clasificar_permanencia: REGULAR, RIESGO o PERDIDA). */
  variante(codigo: string): BadgeVariant {
    return VARIANTE_PERMANENCIA[codigo.toUpperCase()] ?? 'neutral';
  }
}
