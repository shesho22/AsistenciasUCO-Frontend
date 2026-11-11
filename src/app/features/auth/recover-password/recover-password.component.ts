import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PasswordRecoveryService } from '../../../core/services/password-recovery.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

export type RecoverPasswordState = 'FORMULARIO' | 'ENVIANDO' | 'ENVIADO';

/**
 * HU177: página pública donde el usuario pide el enlace para definir una contraseña nueva. La respuesta del backend es
 * siempre la misma, exista o no una cuenta con ese correo, así que la pantalla no puede (ni debe) decir si el correo
 * está registrado.
 */
@Component({
  selector: 'app-recover-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="w-full max-w-md mx-auto bg-white border border-warm-200 rounded-2xl shadow-warm-sm p-6 space-y-4">
      <h1 class="text-lg font-bold text-warm-900 text-center">Recuperar contraseña</h1>

      @if (state() === 'ENVIADO') {
        <div role="status" aria-live="polite" class="space-y-4 text-center" data-testid="recover-sent">
          <p class="text-sm text-success-800 bg-success-50 border border-success-200 rounded-xl p-3">{{ message() }}</p>
          <p class="text-xs text-warm-500">Revise también la carpeta de correo no deseado. El enlace vence pronto y sirve una sola vez.</p>
          <a routerLink="/login" class="inline-block text-sm font-semibold text-primary-600 hover:underline">Volver a iniciar sesión</a>
        </div>
      } @else {
        <p class="text-sm text-warm-600">
          Escriba el correo de su cuenta. Si está registrado, le enviaremos un enlace para definir una contraseña nueva.
        </p>
        <form class="space-y-4" (ngSubmit)="onSubmit()" novalidate>
          <div>
            <label for="recover-correo" class="block text-xs font-semibold text-warm-700 mb-1">Correo institucional</label>
            <input
              id="recover-correo"
              name="correo"
              type="email"
              autocomplete="email"
              maxlength="100"
              [ngModel]="correo()"
              (ngModelChange)="correo.set($event)"
              [disabled]="state() === 'ENVIANDO'"
              placeholder="ejemplo@uco.edu.co"
              class="w-full rounded-xl border border-warm-300 px-3 py-2 text-sm text-warm-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              data-testid="recover-correo"
            />
          </div>

          @if (errorMessage()) {
            <p role="alert" class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3" data-testid="recover-error">
              {{ errorMessage() }}
            </p>
          }

          <button
            type="submit"
            [disabled]="!puedeEnviar()"
            class="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            data-testid="recover-submit"
          >
            {{ state() === 'ENVIANDO' ? 'Enviando…' : 'Enviar enlace' }}
          </button>
        </form>
        <p class="text-center">
          <a routerLink="/login" class="text-sm font-semibold text-primary-600 hover:underline">Volver a iniciar sesión</a>
        </p>
      }
    </section>
  `,
})
export class RecoverPasswordComponent {
  private readonly recovery = inject(PasswordRecoveryService);

  readonly state = signal<RecoverPasswordState>('FORMULARIO');
  readonly correo = signal<string>('');
  readonly message = signal<string>('');
  readonly errorMessage = signal<string>('');

  readonly puedeEnviar = computed(() => this.state() === 'FORMULARIO' && this.correo().trim().length > 0);

  onSubmit(): void {
    if (!this.puedeEnviar()) {
      return;
    }
    this.errorMessage.set('');
    this.state.set('ENVIANDO');
    this.recovery.requestLink(this.correo().trim()).subscribe({
      next: (mensaje) => {
        this.message.set(mensaje);
        this.state.set('ENVIADO');
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.state.set('FORMULARIO');
      },
    });
  }
}
