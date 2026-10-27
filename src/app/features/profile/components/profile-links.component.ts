import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PerfilService, PerfilUsuario, RolVinculo } from '../../../core/services/perfil.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

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
        <p role="alert" class="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{{ error() }}</p>
      } @else {
        @if (perfil(); as p) {
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <dt class="text-warm-500">Documento</dt>
            <dd class="font-mono font-semibold text-warm-900">{{ p.codigoTipoIdentificacion }} {{ p.numeroIdentificacion }}</dd>
          </div>
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <dt class="text-warm-500">Correo institucional</dt>
            <dd class="font-semibold text-warm-900 break-all">
              {{ p.correo }}
              @if (!p.correoConfirmado) {
                <span class="ml-1 text-amber-700">(sin confirmar)</span>
              }
            </dd>
          </div>
          <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
            <dt class="text-warm-500">Nombre registrado</dt>
            <dd class="font-semibold text-warm-900">{{ p.nombreCompleto }}</dd>
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
  private readonly perfilService = inject(PerfilService);
  private readonly destroyRef = inject(DestroyRef);

  readonly perfil = signal<PerfilUsuario | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.perfilService
      .consultar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.perfil.set(res.datos ?? null);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.error.set(getApiErrorMessage(error));
          this.cargando.set(false);
        },
      });
  }

  etiqueta(rol: RolVinculo): string {
    return ETIQUETA_ROL[rol] ?? rol;
  }
}
