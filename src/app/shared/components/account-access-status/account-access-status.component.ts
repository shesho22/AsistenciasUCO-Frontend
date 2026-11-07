import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountAccess, AccountAccessState } from '../../../core/models/account-access.model';
import { AccountAccessService } from '../../../core/services/account-access.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import { ButtonComponent } from '../button/button.component';

const LABELS: Record<AccountAccessState, string> = {
  ACTIVA: 'ACTIVA',
  PENDIENTE_SINCRONIZACION: 'PENDIENTE DE SINCRONIZACIÓN',
  INACTIVA: 'INACTIVA',
  PROBLEMA: 'PROBLEMA CONTROLADO',
};

const VARIANTS: Record<AccountAccessState, BadgeVariant> = {
  ACTIVA: 'success',
  PENDIENTE_SINCRONIZACION: 'warning',
  INACTIVA: 'neutral',
  PROBLEMA: 'danger',
};

/**
 * Estado de acceso de la última cuenta registrada: ACTIVA, PENDIENTE DE SINCRONIZACIÓN, INACTIVA o PROBLEMA CONTROLADO.
 * La verificación y la reconciliación las ejecuta el backend (nunca el PDP desde la SPA); la reconciliación es
 * idempotente y se puede repetir. Una cuenta pendiente todavía no tiene acceso.
 */
@Component({
  selector: 'app-account-access-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, ButtonComponent],
  template: `
    @if (correo(); as mail) {
      <section
        class="rounded-xl border border-warm-200 bg-white px-4 py-3 flex flex-col gap-2"
        aria-live="polite"
        data-testid="account-access-status"
      >
        <div class="flex flex-wrap items-center gap-3">
          <p class="text-sm text-warm-800">Acceso de la cuenta <strong>{{ mail }}</strong></p>
          @if (loading()) {
            <app-badge variant="info">Verificando…</app-badge>
          } @else if (access()) {
            <app-badge [variant]="variant()">{{ label() }}</app-badge>
          } @else if (error()) {
            <app-badge variant="danger">No se pudo verificar</app-badge>
          } @else {
            <app-badge variant="info">Verificando…</app-badge>
          }
        </div>
        @if (!loading() && access(); as acceso) {
          @if (acceso.detalle) {
            <p class="text-xs text-warm-600">{{ acceso.detalle }}</p>
          }
          @if (acceso.estado === 'PENDIENTE_SINCRONIZACION' || acceso.estado === 'PROBLEMA') {
            <p class="text-xs text-warm-600">La persona aún no tiene acceso completo. Reintente la reconciliación; es idempotente.</p>
          }
        }
        @if (error(); as mensaje) {
          <p class="text-xs text-danger-700" role="alert">{{ mensaje }}</p>
        }
        @if (!loading() && (needsReconciliation() || error())) {
          <div>
            <app-button size="sm" variant="secondary" [loading]="reconciling()" (clicked)="reconcile()">
              {{ error() && !access() ? 'Reintentar verificación' : 'Reconciliar ahora' }}
            </app-button>
          </div>
        }
      </section>
    }
  `,
})
export class AccountAccessStatusComponent {
  /** Correo de la cuenta recién registrada; vacío oculta el panel. */
  readonly correo = input<string | null>(null);

  private readonly service = inject(AccountAccessService);
  private readonly destroyRef = inject(DestroyRef);

  readonly access = signal<AccountAccess | null>(null);
  readonly loading = signal(false);
  readonly reconciling = signal(false);
  readonly error = signal<string | null>(null);

  readonly label = computed(() => {
    const state = this.access()?.estado;
    return state ? LABELS[state] : '';
  });
  readonly variant = computed<BadgeVariant>(() => {
    const state = this.access()?.estado;
    return state ? VARIANTS[state] : 'neutral';
  });
  readonly needsReconciliation = computed(() => {
    const state = this.access()?.estado;
    return state === 'PENDIENTE_SINCRONIZACION' || state === 'PROBLEMA';
  });

  constructor() {
    effect(() => {
      const mail = this.correo();
      untracked(() => {
        this.access.set(null);
        this.error.set(null);
        if (mail) {
          this.refresh(mail);
        }
      });
    });
  }

  reconcile(): void {
    const mail = this.correo();
    if (!mail) {
      return;
    }
    if (!this.access()) {
      this.refresh(mail);
      return;
    }
    this.reconciling.set(true);
    this.error.set(null);
    this.service
      .reconcile(mail)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.access.set(res.datos);
          this.reconciling.set(false);
        },
        error: (err: unknown) => {
          this.error.set(getApiErrorMessage(err));
          this.reconciling.set(false);
        },
      });
  }

  private refresh(mail: string): void {
    this.loading.set(true);
    this.service
      .consult(mail)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.access.set(res.datos);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(getApiErrorMessage(err));
          this.loading.set(false);
        },
      });
  }
}
