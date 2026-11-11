import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PasswordRecoveryService } from '../../../core/services/password-recovery.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

export type ResetPasswordState = 'FORMULARIO' | 'GUARDANDO' | 'EXITO';

/** Caracteres especiales que acepta la política institucional de contraseñas del backend. */
const ESPECIALES = '!@#$%^&*()_+-=%';

/**
 * HU177: página pública a la que llega el usuario desde el enlace del correo (`/restablecer-clave#token=<token>`). El
 * token vive en el fragmento para no viajar en la petición HTTP de la página ni en `Referer`: se lee una sola vez, se
 * borra de la URL y se envía en el cuerpo del POST junto con la contraseña nueva. Ninguno de los dos se guarda en un
 * almacén del navegador. La política se valida aquí para avisar pronto, pero quien decide es el backend.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="w-full max-w-md mx-auto bg-white border border-warm-200 rounded-2xl shadow-warm-sm p-6 space-y-4">
      <h1 class="text-lg font-bold text-warm-900 text-center">Definir contraseña nueva</h1>

      @if (state() === 'EXITO') {
        <div role="status" aria-live="polite" class="space-y-4 text-center" data-testid="reset-success">
          <p class="text-sm text-success-800 bg-success-50 border border-success-200 rounded-xl p-3">{{ message() }}</p>
          <a routerLink="/login" class="inline-block text-sm font-semibold text-primary-600 hover:underline">Ir a iniciar sesión</a>
        </div>
      } @else {
        <form class="space-y-4" (ngSubmit)="onSubmit()" novalidate>
          <div>
            <label for="reset-clave" class="block text-xs font-semibold text-warm-700 mb-1">Contraseña nueva</label>
            <input
              id="reset-clave"
              name="clave"
              [type]="mostrar() ? 'text' : 'password'"
              autocomplete="new-password"
              maxlength="255"
              [ngModel]="clave()"
              (ngModelChange)="clave.set($event)"
              [disabled]="state() === 'GUARDANDO'"
              aria-describedby="reset-requisitos"
              class="w-full rounded-xl border border-warm-300 px-3 py-2 text-sm text-warm-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              data-testid="reset-clave"
            />
          </div>
          <div>
            <label for="reset-confirmacion" class="block text-xs font-semibold text-warm-700 mb-1">Repita la contraseña</label>
            <input
              id="reset-confirmacion"
              name="confirmacion"
              [type]="mostrar() ? 'text' : 'password'"
              autocomplete="new-password"
              maxlength="255"
              [ngModel]="confirmacion()"
              (ngModelChange)="confirmacion.set($event)"
              [disabled]="state() === 'GUARDANDO'"
              class="w-full rounded-xl border border-warm-300 px-3 py-2 text-sm text-warm-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              data-testid="reset-confirmacion"
            />
          </div>

          <label class="flex items-center gap-2 text-xs text-warm-700">
            <input type="checkbox" [ngModel]="mostrar()" (ngModelChange)="mostrar.set($event)" name="mostrar" data-testid="reset-mostrar" />
            Mostrar contraseñas
          </label>

          <ul id="reset-requisitos" class="text-xs space-y-1" data-testid="reset-requisitos">
            @for (requisito of requisitos(); track requisito.texto) {
              <li [class.text-success-700]="requisito.cumple" [class.text-warm-500]="!requisito.cumple">
                <span aria-hidden="true">{{ requisito.cumple ? '✓' : '•' }}</span>
                {{ requisito.texto }}
                <span class="sr-only">{{ requisito.cumple ? '(cumplido)' : '(pendiente)' }}</span>
              </li>
            }
          </ul>

          @if (errorMessage()) {
            <div role="alert" class="space-y-2" data-testid="reset-error">
              <p class="text-sm text-danger-800 bg-danger-50 border border-danger-200 rounded-xl p-3">{{ errorMessage() }}</p>
              <a routerLink="/recuperar-clave" class="inline-block text-sm font-semibold text-primary-600 hover:underline">Pedir un enlace nuevo</a>
            </div>
          }

          <button
            type="submit"
            [disabled]="!puedeGuardar()"
            class="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            data-testid="reset-submit"
          >
            {{ state() === 'GUARDANDO' ? 'Guardando…' : 'Guardar contraseña' }}
          </button>
        </form>
        <p class="text-center">
          <a routerLink="/login" class="text-sm font-semibold text-primary-600 hover:underline">Volver a iniciar sesión</a>
        </p>
      }
    </section>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recovery = inject(PasswordRecoveryService);

  /** El token solo vive en memoria mientras la página está abierta. */
  private token = '';

  readonly state = signal<ResetPasswordState>('FORMULARIO');
  readonly clave = signal<string>('');
  readonly confirmacion = signal<string>('');
  readonly mostrar = signal<boolean>(false);
  readonly message = signal<string>('');
  readonly errorMessage = signal<string>('');

  readonly requisitos = computed(() => {
    const clave = this.clave();
    return [
      { texto: 'Entre 8 y 255 caracteres, sin espacios', cumple: clave.length >= 8 && clave.length <= 255 && !/\s/.test(clave) },
      { texto: 'Una letra mayúscula', cumple: /\p{Lu}/u.test(clave) },
      { texto: 'Una letra minúscula', cumple: /\p{Ll}/u.test(clave) },
      { texto: 'Un número', cumple: /\p{Nd}/u.test(clave) },
      { texto: `Un carácter especial (${ESPECIALES})`, cumple: [...clave].some((caracter) => ESPECIALES.includes(caracter)) },
      { texto: 'Las dos contraseñas coinciden', cumple: clave.length > 0 && clave === this.confirmacion() },
    ];
  });

  readonly puedeGuardar = computed(
    () => this.state() === 'FORMULARIO' && this.requisitos().every((requisito) => requisito.cumple)
  );

  ngOnInit(): void {
    this.token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token') ?? '';
    // El token ya se capturó: se elimina de la URL visible y del historial.
    void this.router.navigate([], { relativeTo: this.route, fragment: undefined, replaceUrl: true });
  }

  onSubmit(): void {
    if (!this.puedeGuardar()) {
      return;
    }
    this.errorMessage.set('');
    this.state.set('GUARDANDO');
    this.recovery.resetPassword(this.token, this.clave()).subscribe({
      next: (mensaje) => {
        this.clave.set('');
        this.confirmacion.set('');
        this.token = '';
        this.message.set(mensaje);
        this.state.set('EXITO');
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.state.set('FORMULARIO');
      },
    });
  }
}
