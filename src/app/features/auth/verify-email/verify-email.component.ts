import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmailVerificationService } from '../../../core/services/email-verification.service';
import { getApiErrorCode, getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { getPasswordValidationError } from '../../../core/validation/request-form-validation.util';

export type VerifyEmailState = 'VERIFICANDO' | 'DEFINIR_CONTRASENA' | 'EXITO' | 'ERROR';

/** IDENT-002: el backend pide la contrasena de una cuenta que aun no la tiene (el token no se consume). */
const CODIGO_REQUIERE_CONTRASENA = 'VCE_009';
/** Prefijo de los codigos de la politica de contrasena (el formulario sigue abierto para corregirla). */
const PREFIJO_POLITICA_CONTRASENA = 'ERR_PASSWORD_';

/**
 * IDENT-001 / IDENT-002: pagina publica del enlace del correo. Con `/verificar-correo#token=` confirma el correo; con
 * `/activar-cuenta#token=` (cuenta registrada por otra persona, sin contrasena) pide primero la contrasena y activa la
 * cuenta con ella. El token vive en el fragmento para no viajar en la peticion HTTP de la pagina ni en `Referer`: se lee
 * una sola vez, se borra de la URL, se conserva solo en memoria y se envia en el cuerpo de un POST. Todo texto de
 * resultado proviene del backend; la SPA solo evalua codigos canonicos estables.
 */
@Component({
    selector: 'app-verify-email',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, FormsModule],
    template: `
    <section class="superficie w-full max-w-md mx-auto p-6 space-y-4 text-center">
      <h1 class="text-lg font-bold text-warm-900">{{ activacion() ? 'Activación de cuenta' : 'Verificación de correo' }}</h1>

      @switch (state()) {
        @case ('VERIFICANDO') {
          <div role="status" aria-live="polite" class="flex flex-col items-center gap-3 py-4" data-testid="verify-loading">
            <span class="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
            <p class="text-sm text-warm-600">{{ activacion() ? 'Activando su cuenta…' : 'Verificando su correo…' }}</p>
          </div>
        }
        @case ('DEFINIR_CONTRASENA') {
          <form class="space-y-3 text-left" data-testid="verify-password-form" (ngSubmit)="activar()">
            <p class="text-sm text-warm-700">Defina la contraseña con la que ingresará a la plataforma.</p>
            <label class="block text-xs font-semibold text-warm-700">Contraseña
              <input type="password" name="password" autocomplete="new-password" maxlength="255" [ngModel]="password()"
                (ngModelChange)="password.set($event); formError.set('')"
                class="mt-1 w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </label>
            <label class="block text-xs font-semibold text-warm-700">Confirmar contraseña
              <input type="password" name="confirmPassword" autocomplete="new-password" maxlength="255" [ngModel]="confirmPassword()"
                (ngModelChange)="confirmPassword.set($event); formError.set('')"
                class="mt-1 w-full px-3.5 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </label>
            <p class="text-xs text-warm-500">Mínimo 8 caracteres, con mayúscula, minúscula, número y un carácter especial; distinta de su número de documento.</p>
            @if (formError(); as error) {
              <p class="text-xs text-danger-700" role="alert" data-testid="verify-password-error">{{ error }}</p>
            }
            <button type="submit" [disabled]="enviando()"
              class="w-full px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
              {{ enviando() ? 'Activando…' : 'Activar cuenta' }}
            </button>
          </form>
        }
        @case ('EXITO') {
          <div role="status" aria-live="polite" class="space-y-4" data-testid="verify-success">
            <p class="text-sm text-success-800 bg-success-50 border border-success-200 rounded-xl p-3">{{ message() }}</p>
            <a routerLink="/login" class="inline-block text-sm font-semibold text-primary-600 hover:underline">Ir a iniciar sesión</a>
          </div>
        }
        @case ('ERROR') {
          <div role="alert" class="space-y-4" data-testid="verify-error">
            <p class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3">{{ message() }}</p>
            <p class="text-xs text-warm-500">Solicite a quien registró su cuenta que le reenvíe el enlace.</p>
            <a routerLink="/login" class="inline-block text-sm font-semibold text-primary-600 hover:underline">Ir a iniciar sesión</a>
          </div>
        }
      }
    </section>
  `
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly emailVerification = inject(EmailVerificationService);

  /** Token del enlace, solo en memoria (ya no esta en la URL). */
  private token = '';

  readonly activacion = signal(false);
  readonly state = signal<VerifyEmailState>('VERIFICANDO');
  readonly message = signal<string>('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly formError = signal('');
  readonly enviando = signal(false);

  ngOnInit(): void {
    this.token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token') ?? '';
    this.activacion.set(this.route.snapshot.data?.['modo'] === 'ACTIVACION');
    // El token ya se capturo: se elimina de la URL visible y del historial.
    void this.router.navigate([], { relativeTo: this.route, fragment: undefined, replaceUrl: true });

    if (this.activacion() && this.token) {
      // IDENT-002: el enlace de activacion siempre corresponde a una cuenta sin contrasena; se pide antes de enviar.
      this.state.set('DEFINIR_CONTRASENA');
      return;
    }
    this.enviar(undefined);
  }

  activar(): void {
    if (this.enviando()) {
      return;
    }
    const password = this.password();
    const problema = getPasswordValidationError(password, '');
    if (problema) {
      this.formError.set(problema);
      return;
    }
    if (password !== this.confirmPassword()) {
      this.formError.set('Las contraseñas no coinciden.');
      return;
    }
    this.enviar(password);
  }

  private enviar(password: string | undefined): void {
    this.enviando.set(true);
    this.emailVerification.verifyEmail(this.token, password).subscribe({
      next: (mensaje) => {
        this.enviando.set(false);
        this.password.set('');
        this.confirmPassword.set('');
        this.message.set(mensaje);
        this.state.set('EXITO');
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        const codigo = getApiErrorCode(error) ?? '';
        if (codigo === CODIGO_REQUIERE_CONTRASENA || (password !== undefined && codigo.startsWith(PREFIJO_POLITICA_CONTRASENA))) {
          // La cuenta necesita contrasena (o la enviada no cumple la politica): el token sigue vigente.
          this.activacion.set(true);
          this.formError.set(password === undefined ? '' : getApiErrorMessage(error));
          this.state.set('DEFINIR_CONTRASENA');
          return;
        }
        this.password.set('');
        this.confirmPassword.set('');
        this.message.set(getApiErrorMessage(error));
        this.state.set('ERROR');
      },
    });
  }
}
