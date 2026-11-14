import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { AdminManagementService } from '../../../core/services/admin-management.service';
import { InstitucionItem } from '../../../core/models/role-management.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';
import { ErrorCargaComponent } from '../../../shared/components/error-carga/error-carga.component';

/**
 * F-ADM-009: Pantalla de solo lectura de instituciones registradas.
 * Los datos institucionales son un catálogo canónico gestionado por el sistema.
 */
@Component({
    selector: 'app-admin-instituciones',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CardComponent, BadgeComponent, ErrorCargaComponent],
    template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-1 block">
            Configuración Institucional
          </span>
          <h2 class="text-2xl font-serif font-bold text-warm-950">Instituciones de Educación Superior</h2>
          <p class="text-xs text-warm-600 mt-1">
            Catálogo canónico de entidades institucionales habilitadas en el sistema (modo solo consulta).
          </p>
        </div>
      </div>

      <!-- Contenido Principal -->
      <app-card padding="none">
        @if (cargando()) {
          <div class="p-8 text-center text-sm text-warm-500" role="status">
            Cargando instituciones...
          </div>
        } @else if (error(); as fallo) {
          <div class="p-6">
            <app-error-carga [error]="fallo" (reintentar)="cargar()" />
          </div>
        } @else if (instituciones().length === 0) {
          <div class="p-12 text-center text-warm-600">
            <p class="text-base font-semibold text-warm-800">No hay instituciones registradas</p>
            <p class="text-xs text-warm-500 mt-1">Actualmente no existen registros institucionales configurados en el sistema.</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-warm-50 border-b border-warm-200 text-xs font-bold text-warm-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" class="px-5 py-3">Código</th>
                  <th scope="col" class="px-5 py-3">Nombre Institucional</th>
                  <th scope="col" class="px-5 py-3">NIT</th>
                  <th scope="col" class="px-5 py-3">Contacto & Dirección</th>
                  <th scope="col" class="px-5 py-3">Rectoría</th>
                  <th scope="col" class="px-5 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-warm-100">
                @for (inst of instituciones(); track inst.id) {
                  <tr class="hover:bg-warm-50/70 transition-colors">
                    <td class="px-5 py-4 font-mono font-bold text-xs text-warm-700 whitespace-nowrap">
                      {{ inst.codigo || '—' }}
                    </td>
                    <td class="px-5 py-4">
                      <span class="font-bold text-warm-950 block">{{ inst.nombre }}</span>
                      @if (inst.totalFacultades !== undefined) {
                        <span class="text-xs text-warm-500">{{ inst.totalFacultades }} facultades vinculadas</span>
                      }
                    </td>
                    <td class="px-5 py-4 font-mono text-xs text-warm-700 whitespace-nowrap">
                      {{ inst.nit || '—' }}
                    </td>
                    <td class="px-5 py-4 text-xs text-warm-700">
                      <div>{{ inst.direccion || '—' }}</div>
                      <div class="text-warm-500 mt-0.5">
                        {{ inst.telefono || '' }}{{ inst.telefono && (inst.correoContacto || inst.correo) ? ' · ' : '' }}{{ inst.correoContacto || inst.correo || '' }}
                      </div>
                    </td>
                    <td class="px-5 py-4 text-xs text-warm-800">
                      {{ inst.rector || '—' }}
                    </td>
                    <td class="px-5 py-4 text-center">
                      <app-badge [variant]="inst.activa !== false ? 'success' : 'neutral'">
                        {{ inst.activa !== false ? 'Activa' : 'Inactiva' }}
                      </app-badge>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </app-card>
    </div>
  `
})
export class AdminInstitucionesComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);
  private readonly toast = inject(ToastService);

  readonly instituciones = signal<any[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<LoadErrorState | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.adminService.getInstituciones().subscribe({
      next: (res) => {
        this.instituciones.set(res.datos ?? []);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.instituciones.set([]);
        this.cargando.set(false);
        this.error.set(classifyLoadError(err));
        this.toast.error(getApiErrorMessage(err));
      },
    });
  }
}
