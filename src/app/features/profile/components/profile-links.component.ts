import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RolVinculo } from '../../../core/services/perfil.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { PerfilInstitucionalStore } from '../perfil-institucional.store';

const ETIQUETA_ROL: Record<RolVinculo, string> = {
  ESTUDIANTE: 'Estudiante en',
  DOCENTE: 'Docente en',
  COORDINADOR: 'Coordina',
  DECANO: 'Decano de',
  ADMINISTRADOR: 'Administra',
};

/**
 * HU006: datos del expediente institucional (DB) y vinculos del usuario autenticado: programas como estudiante o
 * docente, programa que coordina, facultad que dirige e institucion que administra. Solo lectura.
 * APP-06: lee el `PerfilInstitucionalStore` que provee `ProfileComponent`, el mismo que alimenta el resumen.
 */
@Component({
  selector: 'app-profile-links',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    <div class="bg-white p-6 sm:p-7 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4" data-testid="perfil-institucional">
      <div class="border-b border-warm-100 pb-3">
        <h3 class="font-serif font-bold text-lg text-warm-900">Expediente y vínculos institucionales</h3>
        <p class="text-xs text-warm-500">Información registrada en el sistema académico (solo lectura).</p>
      </div>

      @if (cargando()) {
        <div class="h-20 bg-warm-100 rounded-2xl animate-pulse"></div>
      } @else if (error()) {
        <div role="alert" class="flex items-center justify-between gap-3 text-xs font-medium text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2">
          <span>{{ error() }}</span>
          <button type="button" class="font-semibold underline shrink-0" (click)="reintentar()">Reintentar</button>
        </div>
      } @else if (estado().tipo === 'SIN_DATOS') {
        <p class="text-xs text-warm-600 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2" data-testid="perfil-expediente-sin-datos">
          El servidor no devolvió información del perfil institucional.
        </p>
      } @else {
        @if (perfil(); as p) {
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <dt class="text-warm-500">Documento</dt>
            <dd class="font-mono font-semibold text-warm-900" data-testid="perfil-expediente-documento">{{ identificacion().documento }}</dd>
          </div>
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <dt class="text-warm-500">Correo institucional</dt>
            <dd class="font-semibold text-warm-900 break-all">
              {{ p.correo || 'Sin registrar' }}
              @if (!p.correoConfirmado) {
                <span class="ml-1 text-warning-700">(sin confirmar)</span>
              }
            </dd>
          </div>
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <dt class="text-warm-500">Nombre registrado</dt>
            <dd class="font-semibold text-warm-900">{{ p.nombreCompleto || 'Sin registrar' }}</dd>
          </div>
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <dt class="text-warm-500">Estado de la cuenta</dt>
            <dd><app-badge [variant]="p.estaActivo ? 'success' : 'neutral'">{{ p.estaActivo ? 'ACTIVA' : 'INACTIVA' }}</app-badge></dd>
          </div>
        </dl>

        <h4 class="font-semibold text-sm text-warm-900 pt-2">Mis vínculos</h4>
        @if (p.vinculos.length === 0) {
          <p class="text-xs text-warm-500">No tienes vínculos académicos registrados.</p>
        } @else {
          <ul class="space-y-2">
            @for (v of p.vinculos; track v.rol + v.idEntidad) {
              <li class="flex items-start justify-between gap-3 p-3 rounded-xl border border-warm-200" data-testid="vinculo">
                <div class="min-w-0">
                  <p class="text-xs text-warm-500">{{ etiqueta(v.rol) }}</p>
                  <p class="font-semibold text-sm text-warm-900">{{ v.nombreEntidad }}</p>
                  @if (v.detalle) {
                    <p class="text-xs text-warm-600">{{ v.detalle }}</p>
                  }
                </div>
                <app-badge [variant]="v.estaActivo ? 'success' : 'neutral'">{{ v.estaActivo ? 'Activo' : 'Inactivo' }}</app-badge>
              </li>
            }
          </ul>
        }
        }
      }
    </div>
  `,
})
export class ProfileLinksComponent implements OnInit {
  private readonly store = inject(PerfilInstitucionalStore);

  readonly estado = this.store.estado;
  readonly perfil = this.store.perfil;
  readonly error = this.store.error;
  readonly identificacion = this.store.identificacion;
  readonly cargando = computed(() => this.estado().tipo === 'CARGANDO' || this.estado().tipo === 'INACTIVO');

  ngOnInit(): void {
    this.store.cargar();
  }

  reintentar(): void {
    this.store.cargar();
  }

  etiqueta(rol: RolVinculo): string {
    return ETIQUETA_ROL[rol] ?? rol;
  }
}
