import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmailVerificationService } from '../../../core/services/email-verification.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

export type VerifyEmailState = 'VERIFICANDO' | 'EXITO' | 'ERROR';

/**
 * IDENT-001: pagina publica a la que llega el estudiante desde el enlace del correo
 * (`/verificar-correo#token=<token>`). El token vive en el fragmento para no viajar en la peticion HTTP de la pagina ni en
 * `Referer`: se lee una sola vez, se borra de la URL y se envia en el cuerpo de un POST. No se guarda en ningun almacen.
 * Todo texto mostrado proviene del backend (catalogo de mensajes), por lo que un token ausente, vencido o usado se
 * resuelve preguntando al backend, que responde igual para cualquier token invalido.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="w-full max-w-md mx-auto bg-white border border-warm-200 rounded-2xl shadow-warm-sm p-6 space-y-4 text-center">
      <h1 class="text-lg font-bold text-warm-900">Verificación de correo</h1>

      @switch (state()) {
        @case ('VERIFICANDO') {
          <div role="status" aria-live="polite" class="flex flex-col items-center gap-3 py-4" data-testid="verify-loading">
            <span class="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
            <p class="text-sm text-warm-600">Verificando su correo…</p>
          </div>
        }
        @case ('EXITO') {
          <div role="status" aria-live="polite" class="space-y-4" data-testid="verify-success">
            <p class="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{{ message() }}</p>
            <a routerLink="/login" class="inline-block text-sm font-semibold text-primary-600 hover:underline">Ir a iniciar sesión</a>
          </div>
        }
        @case ('ERROR') {
          <div role="alert" class="space-y-4" data-testid="verify-error">
            <p class="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3">{{ message() }}</p>
            <p class="text-xs text-warm-500">Solicite a su docente que le reenvíe el enlace de verificación.</p>
            <a routerLink="/login" class="inline-block text-sm font-semibold text-primary-600 hover:underline">Ir a iniciar sesión</a>
          </div>
        }
      }
    </section>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly emailVerification = inject(EmailVerificationService);

  readonly state = signal<VerifyEmailState>('VERIFICANDO');
  readonly message = signal<string>('');

  ngOnInit(): void {
    const token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token') ?? '';
    // El token ya se capturo: se elimina de la URL visible y del historial.
    void this.router.navigate([], { relativeTo: this.route, fragment: undefined, replaceUrl: true });

    this.emailVerification.verifyEmail(token).subscribe({
      next: (mensaje) => {
        this.message.set(mensaje);
        this.state.set('EXITO');
      },
      error: (error: unknown) => {
        this.message.set(getApiErrorMessage(error));
        this.state.set('ERROR');
      },
    });
  }
}
