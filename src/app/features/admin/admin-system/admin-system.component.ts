import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import {
  ParametroInstitucionalItem,
  RegistroAuditoriaItem,
  CierrePeriodoReporte,
} from '../../../core/models/role-management.model';

type TabAdminSystem = 'PARAMETROS' | 'AUDITORIA' | 'CIERRE_MASIVO';

@Component({
  selector: 'app-admin-system',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- ================= HEADER & BREADCRUMB ================= -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1">
            <span>Gobierno de TI & Auditoría</span>
            <span>/</span>
            <span class="text-primary-700">Parámetros, Trazabilidad y Cierre Semestral</span>
          </div>
          <h1 class="text-2xl font-serif font-bold text-warm-900">Sistema, Auditoría y Consolidación</h1>
          <p class="text-sm text-warm-600">
            Ajuste de reglas de inasistencia, logs de auditoría y cierre masivo de asistencia por período.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="tabActiva.set('CIERRE_MASIVO')"
            class="px-4 py-2 bg-primary-700 text-white rounded-xl text-xs font-bold hover:bg-primary-800 shadow-sm transition-all flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <span>Simulador Cierre Masivo</span>
          </button>
        </div>
      </div>

      <!-- ================= TABS SELECTOR ================= -->
      <div class="flex border-b border-warm-200 gap-2">
        <button
          (click)="tabActiva.set('PARAMETROS')"
          [class]="tabActiva() === 'PARAMETROS' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
          class="px-4 py-3 text-sm flex items-center gap-2 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>Parámetros Globales ({{ parametros().length }})</span>
        </button>

        <button
          (click)="tabActiva.set('AUDITORIA')"
          [class]="tabActiva() === 'AUDITORIA' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
          class="px-4 py-3 text-sm flex items-center gap-2 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
          <span>Trazabilidad y Auditoría ({{ auditoria().length }})</span>
        </button>

        <button
          (click)="tabActiva.set('CIERRE_MASIVO')"
          [class]="tabActiva() === 'CIERRE_MASIVO' ? 'border-primary-700 text-primary-800 font-bold border-b-2' : 'text-warm-500 hover:text-warm-700'"
          class="px-4 py-3 text-sm flex items-center gap-2 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Cierre Masivo de Asistencia</span>
        </button>
      </div>

      <!-- ================= TAB 1: PARÁMETROS DEL SISTEMA ================= -->
      @if (tabActiva() === 'PARAMETROS') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          @for (p of parametros(); track p.id) {
            <div class="bg-white border border-warm-200 rounded-2xl p-5 shadow-warm-sm flex flex-col justify-between h-full">
              <div>
                <div class="flex items-center justify-between gap-3 mb-2">
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-warm-100 text-warm-700">
                    {{ p.clave }}
                  </span>
                  <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-800 border border-primary-100">
                    {{ p.categoria }}
                  </span>
                </div>

                <h3 class="font-bold text-warm-900 text-sm mb-1.5">{{ p.nombre }}</h3>
                <p class="text-xs text-warm-600 mb-4 leading-relaxed">{{ p.descripcion }}</p>

                <div class="bg-warm-50 p-3.5 rounded-xl border border-warm-100 mb-4">
                  <label class="block text-[10px] font-bold text-warm-500 uppercase mb-1.5">Valor Configurado Actual</label>
                  
                  @if (p.tipo === 'BOOLEANO') {
                    <div class="flex items-center gap-3">
                      <button
                        (click)="actualizarValorParam(p, 'true')"
                        [class]="p.valor === 'true' ? 'bg-primary-700 text-white font-bold' : 'bg-white text-warm-700 border border-warm-200'"
                        class="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      >
                        Habilitado (true)
                      </button>
                      <button
                        (click)="actualizarValorParam(p, 'false')"
                        [class]="p.valor === 'false' ? 'bg-red-700 text-white font-bold' : 'bg-white text-warm-700 border border-warm-200'"
                        class="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      >
                        Deshabilitado (false)
                      </button>
                    </div>
                  } @else {
                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        [value]="p.valor"
                        #inputVal
                        class="flex-1 px-3 py-1.5 bg-white border border-warm-200 rounded-lg text-xs font-bold text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
                      />
                      <button
                        (click)="actualizarValorParam(p, inputVal.value)"
                        class="px-3.5 py-1.5 bg-warm-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Guardar
                      </button>
                    </div>
                  }
                </div>
              </div>

              <div class="text-[10px] text-warm-400 flex items-center justify-between pt-2 border-t border-warm-100">
                <span>Tipo: {{ p.tipo }}</span>
                <span>Último cambio: {{ p.ultimaModificacion || 'Por defecto' }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- ================= TAB 2: AUDITORÍA Y TRAZABILIDAD ================= -->
      @if (tabActiva() === 'AUDITORIA') {
        <div class="space-y-4">
          <!-- Filtros de Auditoría -->
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="flex-1 relative">
              <input
                type="text"
                [(ngModel)]="filtroAuditoria"
                placeholder="Filtrar por usuario, acción, módulo o descripción..."
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 bg-white"
              />
              <svg class="w-4 h-4 text-warm-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <select
              [(ngModel)]="moduloAuditoriaFiltro"
              class="px-4 py-2.5 rounded-xl border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 bg-white"
            >
              <option value="TODOS">Todos los Módulos</option>
              <option value="ASISTENCIA">Asistencia</option>
              <option value="MATRICULA">Matrícula</option>
              <option value="PLANES_ESTUDIO">Planes de Estudio</option>
              <option value="SISTEMA">Sistema y Parámetros</option>
            </select>
          </div>

          <div class="bg-white border border-warm-200 rounded-2xl overflow-hidden shadow-warm-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
                  <tr>
                    <th class="px-5 py-3.5">Timestamp</th>
                    <th class="px-5 py-3.5">Usuario & Rol</th>
                    <th class="px-5 py-3.5">Módulo / Acción</th>
                    <th class="px-5 py-3.5">Detalle del Evento</th>
                    <th class="px-5 py-3.5">IP</th>
                    <th class="px-5 py-3.5 text-center">Nivel</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-warm-100">
                  @for (log of auditoriaFiltrada(); track log.id) {
                    <tr class="hover:bg-warm-50/70 transition-colors">
                      <td class="px-5 py-4 font-mono text-xs text-warm-500 whitespace-nowrap">
                        {{ log.timestamp }}
                      </td>
                      <td class="px-5 py-4">
                        <div class="font-bold text-warm-900 text-xs">{{ log.usuarioNombre }}</div>
                        <div class="text-[10px] text-warm-500 font-semibold uppercase">{{ log.rol }}</div>
                      </td>
                      <td class="px-5 py-4">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded bg-warm-100 text-warm-800">
                          {{ log.modulo }}
                        </span>
                        <div class="text-[10px] text-warm-600 font-mono mt-0.5">{{ log.accion }}</div>
                      </td>
                      <td class="px-5 py-4 text-xs text-warm-800 max-w-md">
                        {{ log.descripcion }}
                      </td>
                      <td class="px-5 py-4 font-mono text-xs text-warm-400">
                        {{ log.direccionIp }}
                      </td>
                      <td class="px-5 py-4 text-center">
                        <span
                          class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          [class]="
                            log.nivel === 'CRITICO'
                              ? 'bg-red-100 text-red-800'
                              : log.nivel === 'WARNING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          "
                        >
                          {{ log.nivel }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ================= TAB 3: CIERRE MASIVO DE ASISTENCIA ================= -->
      @if (tabActiva() === 'CIERRE_MASIVO') {
        <div class="space-y-6">
          <div class="bg-gradient-to-r from-primary-900 to-primary-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="space-y-2">
              <span class="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-primary-800 text-primary-200 inline-block">
                Consolidación Semestral Definitiva
              </span>
              <h2 class="text-xl font-serif font-bold text-white">Simulador de Cierre Masivo de Asistencia</h2>
              <p class="text-xs text-warm-200 max-w-xl">
                Al ejecutar el cierre, el sistema congela todas las sesiones del período seleccionado, computa el porcentaje final de inasistencias de cada estudiante matriculado y emite las actas oficiales de aprobación y reprobación por fallas.
              </p>
            </div>

            <div class="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-xl flex flex-col items-center gap-3 shrink-0">
              <label class="text-xs font-bold text-white uppercase">Período para Cierre</label>
              <select
                [(ngModel)]="periodoSeleccionadoCierre"
                class="px-4 py-2 rounded-lg bg-white text-warm-900 text-xs font-bold focus:outline-none"
              >
                @for (p of periodos(); track p.id) {
                  <option [value]="p.codigo">{{ p.nombre }} ({{ p.codigo }})</option>
                }
              </select>

              <button
                (click)="iniciarCierreSemestral()"
                [disabled]="isProcesandoCierre()"
                class="w-full px-5 py-2.5 bg-accent-500 hover:bg-accent-600 disabled:bg-warm-400 text-warm-900 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                @if (isProcesandoCierre()) {
                  <svg class="animate-spin h-4 w-4 text-warm-900" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Procesando...</span>
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span>Ejecutar Cierre Masivo</span>
                }
              </button>
            </div>
          </div>

          <!-- Historial de Reportes de Cierre -->
          <div>
            <h3 class="text-base font-bold text-warm-900 mb-3">Historial de Cierres Masivos Realizados</h3>
            
            <div class="bg-white border border-warm-200 rounded-2xl overflow-hidden shadow-warm-sm">
              <table class="w-full text-left text-sm">
                <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
                  <tr>
                    <th class="px-5 py-3.5">ID Reporte</th>
                    <th class="px-5 py-3.5">Período</th>
                    <th class="px-5 py-3.5">Fecha y Hora Ejecución</th>
                    <th class="px-5 py-3.5 text-center">Estudiantes Procesados</th>
                    <th class="px-5 py-3.5 text-center">Materias Consolidadas</th>
                    <th class="px-5 py-3.5 text-center">Aprobados Asistencia</th>
                    <th class="px-5 py-3.5 text-center">Reprobados por Fallas</th>
                    <th class="px-5 py-3.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-warm-100">
                  @for (rep of reportesCierre(); track rep.id) {
                    <tr class="hover:bg-warm-50/70 transition-colors">
                      <td class="px-5 py-4 font-mono text-xs font-bold text-primary-800">{{ rep.id }}</td>
                      <td class="px-5 py-4 font-bold text-warm-900">{{ rep.periodoCodigo }}</td>
                      <td class="px-5 py-4 text-xs text-warm-600">{{ rep.fechaEjecucion }}</td>
                      <td class="px-5 py-4 text-center font-bold text-warm-900">{{ rep.totalEstudiantesProcesados }}</td>
                      <td class="px-5 py-4 text-center text-warm-700">{{ rep.totalMateriasAfectadas }}</td>
                      <td class="px-5 py-4 text-center font-bold text-emerald-700">
                        {{ rep.totalAprobadosAsistencia }} ({{ ((rep.totalAprobadosAsistencia / rep.totalEstudiantesProcesados) * 100).toFixed(1) }}%)
                      </td>
                      <td class="px-5 py-4 text-center font-bold text-red-600">
                        {{ rep.totalReprobadosFallas }} ({{ ((rep.totalReprobadosFallas / rep.totalEstudiantesProcesados) * 100).toFixed(1) }}%)
                      </td>
                      <td class="px-5 py-4 text-center">
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {{ rep.estado }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminSystemComponent implements OnInit {
  private adminService = inject(AdminManagementService);
  private coordService = inject(CoordinatorManagementService);
  private toast = inject(ToastService);

  tabActiva = signal<TabAdminSystem>('PARAMETROS');
  filtroAuditoria = '';
  moduloAuditoriaFiltro = 'TODOS';
  periodoSeleccionadoCierre = '2026-2';
  isProcesandoCierre = signal<boolean>(false);

  parametros = this.adminService.parametros;
  auditoria = this.adminService.auditoria;
  reportesCierre = this.adminService.reportesCierre;
  periodos = this.coordService.periodos;

  ngOnInit(): void {
    this.coordService.cargarDatosAcademicosBase();
    this.adminService.cargarParametros().subscribe();
    this.adminService.cargarAuditoria().subscribe();
  }

  auditoriaFiltrada = computed(() => {
    let logs = this.auditoria();
    const mod = this.moduloAuditoriaFiltro;
    if (mod !== 'TODOS') {
      logs = logs.filter((l) => l.modulo === mod);
    }
    const q = this.filtroAuditoria.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.usuarioNombre.toLowerCase().includes(q) ||
        l.accion.toLowerCase().includes(q) ||
        l.descripcion.toLowerCase().includes(q) ||
        l.modulo.toLowerCase().includes(q)
    );
  });

  actualizarValorParam(p: ParametroInstitucionalItem, nuevoValor: string): void {
    this.adminService.actualizarParametro(p.id, nuevoValor);
    this.toast.success(`Parámetro "${p.nombre}" actualizado a "${nuevoValor}"`);
  }

  private destroyRef = inject(DestroyRef);

  iniciarCierreSemestral(): void {
    if (!confirm(`¿Confirma ejecutar el CIERRE MASIVO DEFINITIVO de asistencia para el período ${this.periodoSeleccionadoCierre}? Esta acción consolidará los registros de inasistencia de todos los estudiantes.`)) {
      return;
    }

    // Resolver ID de período si existe en la lista de períodos, o usar el código como fallback
    const periodoObj = this.periodos().find((p) => p.codigo === this.periodoSeleccionadoCierre);
    const idPeriodo = periodoObj ? periodoObj.id : this.periodoSeleccionadoCierre;

    this.isProcesandoCierre.set(true);
    this.adminService
      .ejecutarCierreMasivo(idPeriodo, this.periodoSeleccionadoCierre)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isProcesandoCierre.set(false);
          const mensajeExito = res?.mensajeUsuario || `Cierre masivo del período ${this.periodoSeleccionadoCierre} solicitado correctamente.`;
          this.toast.success(mensajeExito);
        },
        error: (err: unknown) => {
          this.isProcesandoCierre.set(false);
          this.toast.error(getApiErrorMessage(err));
        },
      });
  }
}
