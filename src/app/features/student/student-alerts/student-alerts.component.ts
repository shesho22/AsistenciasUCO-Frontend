import { SemaforoAsistenciaComponent } from '../../../shared/components/semaforo-asistencia/semaforo-asistencia.component';
import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertaInasistenciaService } from '../../../core/services/alerta-inasistencia.service';
import { AlertaInasistencia } from '../../../core/models/alerta-inasistencia.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-student-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, SemaforoAsistenciaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
            <span>Portal Estudiante</span>
            <span>/</span>
            <span class="text-primary-700">Seguimiento de Asistencia</span>
          </div>
          <h1 class="text-2xl font-serif font-bold text-warm-900">Mis Alertas de Asistencia</h1>
          <p class="text-sm text-warm-600 mt-0.5">
            Avisos institucionales sobre el porcentaje de inasistencias acumulado en tus asignaturas.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ totalElementos() }} {{ totalElementos() === 1 ? 'alerta' : 'alertas' }}
          </span>
        </div>
      </div>

      @if (cargando()) {
        <div class="bg-white p-12 rounded-2xl border border-warm-200 text-center text-sm text-warm-500">
          Cargando alertas…
        </div>
      } @else if (alertas().length === 0) {
        <div class="bg-white p-12 rounded-2xl border border-warm-200 text-center space-y-2">
          <div class="w-12 h-12 rounded-full bg-success-50 text-success-700 flex items-center justify-center mx-auto text-xl">
            ✓
          </div>
          <p class="text-base font-serif font-bold text-warm-900">¡Excelente! No tienes alertas vigentes</p>
          <p class="text-xs text-warm-500 max-w-md mx-auto">
            Tu asistencia académica se encuentra dentro de los límites institucionales en todas tus asignaturas.
          </p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (alerta of alertas(); track alerta.id) {
            <article
              [attr.data-testid]="'alerta-card-' + alerta.id"
              class="bg-white rounded-2xl border p-5 sm:p-6 shadow-warm-sm space-y-4 transition-all"
              [class.border-warning-300]="alerta.tipo === 'ADVERTENCIA' || alerta.tipo === 'RIESGO'"
              [class.border-danger-300]="alerta.tipo === 'PERDIDA'"
              [class.border-warm-200]="!alerta.tipo || (alerta.tipo !== 'ADVERTENCIA' && alerta.tipo !== 'RIESGO' && alerta.tipo !== 'PERDIDA')"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-100 pb-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <app-badge [variant]="alerta.tipo === 'PERDIDA' ? 'danger' : 'warning'">
                    {{ alerta.nombreTipo || (alerta.tipo === 'PERDIDA' ? 'Pérdida por inasistencia' : 'Riesgo de pérdida') }}
                  </app-badge>
                  <span class="text-xs font-bold text-warm-900">
                    {{ alerta.asignatura?.nombre || alerta.nombreAsignatura || 'Asignatura' }}
                  </span>
                  @if (alerta.grupo?.nombre || alerta.nombreGrupo) {
                    <span class="text-xs text-warm-500">
                      • {{ alerta.grupo?.nombre || alerta.nombreGrupo }}
                    </span>
                  }
                </div>

                <div class="text-xs font-bold" [class.text-danger-700]="alerta.tipo === 'PERDIDA'" [class.text-warning-800]="alerta.tipo !== 'PERDIDA'">
                  Inasistencia acumulada: {{ alerta.porcentajeActual ?? alerta.porcentajeCruce ?? 0 }}%
                  <app-semaforo-asistencia [porcentaje]="alerta.porcentajeActual ?? alerta.porcentajeCruce ?? 0" [umbralPerdida]="alerta.umbralPerdida" />
                </div>
              </div>

              <p class="text-sm text-warm-800 leading-relaxed">
                {{ alerta.mensaje }}
              </p>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span class="text-xs text-warm-400">
                  {{ alerta.fechaCruceUtc || alerta.fechaGeneracion | date: 'dd/MM/yyyy HH:mm' }}
                </span>

                <button
                  type="button"
                  [attr.data-testid]="'btn-ver-materia-' + alerta.id"
                  (click)="verMateria(alerta)"
                  class="min-h-[44px] px-4 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-900 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>Ver detalle de la materia</span>
                  <span>→</span>
                </button>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class StudentAlertsComponent implements OnInit {
  private readonly alertaService = inject(AlertaInasistenciaService);
  private readonly router = inject(Router);

  alertas = signal<AlertaInasistencia[]>([]);
  cargando = signal<boolean>(false);
  grupoFiltro = signal<string>('');
  totalElementos = signal<number>(0);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    const filtro: { soloVigentes: boolean; grupoId?: string; pagina: number; tamano: number } = {
      soloVigentes: true,
      pagina: 1,
      tamano: 20,
    };
    if (this.grupoFiltro()) {
      filtro.grupoId = this.grupoFiltro();
    }

    this.alertaService.consultar(filtro).subscribe({
      next: (res) => {
        this.alertas.set(res.elementos ?? []);
        this.totalElementos.set(Number(res.totalElementos ?? 0));
        this.cargando.set(false);
      },
      error: () => {
        this.alertas.set([]);
        this.totalElementos.set(0);
        this.cargando.set(false);
      },
    });
  }

  filtrarPorGrupo(grupoId: string): void {
    this.grupoFiltro.set(grupoId);
    this.cargar();
  }

  verMateria(alerta: AlertaInasistencia): void {
    const idAsig = alerta.asignatura?.id || alerta.idAsignatura;
    const idGrp = alerta.grupo?.id || alerta.idGrupo;
    if (idAsig) {
      const qp = idGrp ? { grupoId: idGrp } : undefined;
      void this.router.navigate(['/app/estudiante/materias', idAsig], { queryParams: qp });
    } else {
      void this.router.navigate(['/app/estudiante/materias']);
    }
  }
}
