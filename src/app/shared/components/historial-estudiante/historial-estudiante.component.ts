import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FichaUnificadaEstudiante, MatriculaHistorial } from '../../../core/models/consultas-transversales.model';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';

const VARIANTE_PERMANENCIA: Record<string, BadgeVariant> = {
  REGULAR: 'success',
  RIESGO: 'warning',
  PERDIDA: 'danger',
};

/**
 * HU157: ficha unificada del estudiante con su historial completo (una fila por matrícula, ordenadas por período, con
 * el resumen de asistencia). La usan la ficha del administrador y la del decano (limitada a su facultad).
 */
@Component({
  selector: 'app-historial-estudiante',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BadgeComponent],
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
          <div class="overflow-x-auto">
            <table class="w-full text-sm" aria-label="Historial de matrículas">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wider text-warm-500 border-b border-warm-100">
                  <th class="py-2 pr-3">Período</th>
                  <th class="py-2 pr-3">Programa</th>
                  <th class="py-2 pr-3">Asignatura y grupo</th>
                  <th class="py-2 pr-3">Estado</th>
                  <th class="py-2 pr-3">Asistencia</th>
                  <th class="py-2">Permanencia</th>
                </tr>
              </thead>
              <tbody>
                @for (m of f.matriculas; track $index) {
                  <tr class="border-b border-warm-50">
                    <td class="py-2 pr-3 text-warm-700">{{ m.nombrePeriodo || m.codigoPeriodo || '—' }}</td>
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
                        {{ r.asistencias }}/{{ r.sesionesEjecutadas }} sesiones ·
                        {{ r.faltasSinJustaCausa }} faltas · {{ r.excusas }} excusas
                        <span class="block text-xs text-warm-500">{{ r.porcentajeInasistencia ?? 0 }} % de inasistencia</span>
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
        }
      </div>
    }
  `,
})
export class HistorialEstudianteComponent {
  readonly ficha = input<FichaUnificadaEstudiante | null>(null);

  /** Programas distintos del historial, en el orden en que aparecen. */
  readonly programas = computed(() => {
    const nombres = (this.ficha()?.matriculas ?? []).map((m: MatriculaHistorial) => m.nombrePrograma);
    return [...new Set(nombres)].join(', ') || '—';
  });

  /** Color de la permanencia según el código de la DB (ufn_clasificar_permanencia: REGULAR, RIESGO o PERDIDA). */
  variante(codigo: string): BadgeVariant {
    return VARIANTE_PERMANENCIA[codigo.toUpperCase()] ?? 'neutral';
  }
}
