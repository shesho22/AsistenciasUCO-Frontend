import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatriculaQrService } from '../../../core/services/matricula-qr.service';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import {
  CredencialMatricula,
  CursoMatriculaQr,
  RegistroMatriculaQrPayload,
} from '../../../core/models/matricula-qr.model';

export type MatriculaQrEstado = 'PIN' | 'VALIDANDO' | 'CURSO' | 'REGISTRO' | 'ENVIANDO' | 'EXITO' | 'ERROR';

const PIN_SEIS_DIGITOS = /^[0-9]{6}$/;

/**
 * HU176B: pagina PUBLICA de matricula por QR/PIN. El estudiante llega desde el QR (`/matricula/qr?t=<token>`) o escribe el
 * PIN en `/matricula/pin`. El token se lee una sola vez, se borra de la URL (no queda en el historial) y vive solo en
 * memoria; se descarta al terminar. Todo texto de error proviene del backend (catalogo de mensajes), incluido el rechazo
 * por red fuera del campus y el codigo vencido. Con cuenta existente se inicia sesion y se matricula con el PIN.
 */
@Component({
  selector: 'app-matricula-qr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="w-full max-w-md mx-auto bg-white border border-warm-200 rounded-2xl shadow-warm-sm p-6 space-y-5">
      <h1 class="text-lg font-bold text-warm-900 text-center">Matrícula en el grupo</h1>

      @switch (estado()) {
        @case ('PIN') {
          <form class="space-y-3" (ngSubmit)="validarPin()" data-testid="matricula-pin-form">
            <label for="pin" class="block text-xs font-bold uppercase tracking-wider text-warm-700">PIN que proyecta tu docente</label>
            <input
              id="pin"
              name="pin"
              inputmode="numeric"
              maxlength="6"
              autocomplete="off"
              [ngModel]="pin()"
              (ngModelChange)="pin.set($event)"
              class="w-full text-center font-mono font-bold text-2xl tracking-widest py-3 bg-warm-50 border-2 border-warm-300 rounded-2xl focus:outline-none focus:border-primary-600"
            />
            @if (mensaje()) {
              <p class="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3" role="alert" data-testid="matricula-mensaje">{{ mensaje() }}</p>
            }
            <button type="submit" [disabled]="!pinValido()" class="w-full py-2.5 text-sm font-bold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 rounded-xl">
              Continuar
            </button>
          </form>
        }
        @case ('VALIDANDO') {
          <p role="status" class="text-sm text-warm-600 text-center" data-testid="matricula-validando">Validando el código…</p>
        }
        @case ('CURSO') {
          @if (curso(); as c) {
            <div class="space-y-4" data-testid="matricula-curso">
              <div class="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 space-y-1">
                <p class="font-bold">{{ c.nombreAsignatura }} — {{ c.nombreGrupo }}</p>
                <p>Docente: {{ c.nombreDocente }}</p>
                <p>Cupos disponibles: {{ c.cupoDisponible }}</p>
              </div>
              <button type="button" data-testid="matricula-crear" (click)="mostrarRegistro()" class="w-full py-2.5 text-sm font-bold text-white bg-primary-700 hover:bg-primary-800 rounded-xl">
                Crear cuenta y matricularme
              </button>
              <button type="button" data-testid="matricula-ya-tengo-cuenta" (click)="yaTengoCuenta()" class="w-full py-2.5 text-sm font-semibold text-primary-700 border border-primary-300 hover:bg-primary-50 rounded-xl">
                Ya tengo cuenta
              </button>
            </div>
          }
        }
        @case ('REGISTRO') {
          <form class="space-y-3" (ngSubmit)="registrar()" data-testid="matricula-registro-form">
            <p class="text-xs text-warm-600">Usa tu correo institucional. Elige una contraseña: no hay una contraseña por defecto.</p>
            <select name="tipo" [ngModel]="tipoId()" (ngModelChange)="tipoId.set($event)" class="w-full px-3 py-2 border border-warm-300 rounded-xl text-sm" aria-label="Tipo de documento">
              @for (t of curso()?.tiposIdentificacion ?? []; track t.id) {
                <option [value]="t.id">{{ t.nombre }}</option>
              }
            </select>
            <input name="numero" inputmode="numeric" placeholder="Número de documento" [ngModel]="numero()" (ngModelChange)="numero.set($event)" class="w-full px-3 py-2 border border-warm-300 rounded-xl text-sm" />
            <div class="grid grid-cols-2 gap-2">
              <input name="primerNombre" placeholder="Primer nombre" [ngModel]="primerNombre()" (ngModelChange)="primerNombre.set($event)" class="px-3 py-2 border border-warm-300 rounded-xl text-sm" />
              <input name="segundoNombre" placeholder="Segundo nombre" [ngModel]="segundoNombre()" (ngModelChange)="segundoNombre.set($event)" class="px-3 py-2 border border-warm-300 rounded-xl text-sm" />
              <input name="primerApellido" placeholder="Primer apellido" [ngModel]="primerApellido()" (ngModelChange)="primerApellido.set($event)" class="px-3 py-2 border border-warm-300 rounded-xl text-sm" />
              <input name="segundoApellido" placeholder="Segundo apellido" [ngModel]="segundoApellido()" (ngModelChange)="segundoApellido.set($event)" class="px-3 py-2 border border-warm-300 rounded-xl text-sm" />
            </div>
            <input name="correo" type="email" placeholder="Correo institucional" autocomplete="email" [ngModel]="correo()" (ngModelChange)="correo.set($event)" class="w-full px-3 py-2 border border-warm-300 rounded-xl text-sm" />
            <input name="password" type="password" placeholder="Contraseña (mínimo 8 caracteres)" autocomplete="new-password" [ngModel]="password()" (ngModelChange)="password.set($event)" class="w-full px-3 py-2 border border-warm-300 rounded-xl text-sm" />
            @if (password() !== '' && !passwordLongitudValida()) {
              <p class="text-xs text-red-700" role="alert" data-testid="matricula-password-corta">La contraseña debe tener al menos 8 caracteres.</p>
            }
            <input name="confirmarPassword" type="password" placeholder="Confirmar contraseña" autocomplete="new-password" aria-label="Confirmar contraseña" [ngModel]="confirmarPassword()" (ngModelChange)="confirmarPassword.set($event)" class="w-full px-3 py-2 border border-warm-300 rounded-xl text-sm" />
            @if (confirmarPassword() !== '' && !passwordsCoinciden()) {
              <p class="text-xs text-red-700" role="alert" data-testid="matricula-password-no-coincide">Las contraseñas no coinciden.</p>
            }
            @if (mensaje()) {
              <p class="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3" role="alert" data-testid="matricula-mensaje">{{ mensaje() }}</p>
              <button type="button" (click)="yaTengoCuenta()" class="text-xs font-semibold text-primary-700 hover:underline">Ya tengo cuenta</button>
            }
            <button type="submit" [disabled]="!formularioCompleto()" data-testid="matricula-enviar" class="w-full py-2.5 text-sm font-bold text-white bg-primary-700 hover:bg-primary-800 disabled:opacity-50 rounded-xl">
              Crear cuenta y matricularme
            </button>
          </form>
        }
        @case ('ENVIANDO') {
          <p role="status" class="text-sm text-warm-600 text-center">Creando tu cuenta y tu matrícula…</p>
        }
        @case ('EXITO') {
          <div class="space-y-3 text-center" data-testid="matricula-exito">
            <p class="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              Quedaste matriculado en el grupo. Inicia sesión con tu número de documento <strong>{{ usuario() }}</strong>.
            </p>
            <p class="text-xs text-warm-500">Revisa tu correo institucional para verificar tu cuenta.</p>
            <a routerLink="/login" class="inline-block text-sm font-semibold text-primary-600 hover:underline">Ir a iniciar sesión</a>
          </div>
        }
        @case ('ERROR') {
          <div class="space-y-3 text-center" role="alert" data-testid="matricula-error">
            <p class="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-3">{{ mensaje() }}</p>
            <a routerLink="/matricula/pin" (click)="reiniciar()" class="inline-block text-sm font-semibold text-primary-600 hover:underline">Escribir el PIN</a>
          </div>
        }
      }
    </section>
  `,
})
export class MatriculaQrComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly matriculaQr = inject(MatriculaQrService);

  readonly estado = signal<MatriculaQrEstado>('PIN');
  readonly mensaje = signal<string>('');
  readonly curso = signal<CursoMatriculaQr | null>(null);
  readonly usuario = signal<string>('');

  readonly pin = signal<string>('');
  readonly tipoId = signal<string>('');
  readonly numero = signal<string>('');
  readonly primerNombre = signal<string>('');
  readonly segundoNombre = signal<string>('');
  readonly primerApellido = signal<string>('');
  readonly segundoApellido = signal<string>('');
  readonly correo = signal<string>('');
  readonly password = signal<string>('');
  readonly confirmarPassword = signal<string>('');

  /** Credencial en memoria; se descarta al terminar. Nunca se guarda en storage ni se vuelve a poner en la URL. */
  private credencial: CredencialMatricula | null = null;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('t');
    if (token) {
      // El token ya se capturo: se borra de la URL visible y del historial.
      void this.router.navigate([], { relativeTo: this.route, queryParams: { t: null }, queryParamsHandling: 'merge', replaceUrl: true });
      this.validar({ token });
    }
  }

  pinValido(): boolean {
    return PIN_SEIS_DIGITOS.test(this.pin().trim());
  }

  validarPin(): void {
    if (this.pinValido()) {
      this.validar({ pin: this.pin().trim() });
    }
  }

  mostrarRegistro(): void {
    this.mensaje.set('');
    this.estado.set('REGISTRO');
  }

  passwordLongitudValida(): boolean {
    return this.password().length >= 8;
  }

  passwordsCoinciden(): boolean {
    return this.password() === this.confirmarPassword();
  }

  formularioCompleto(): boolean {
    return (
      this.tipoId() !== '' &&
      /^[0-9]{6,10}$/.test(this.numero().trim()) &&
      this.primerNombre().trim() !== '' &&
      this.primerApellido().trim() !== '' &&
      this.correo().trim() !== '' &&
      this.passwordLongitudValida() &&
      this.passwordsCoinciden()
    );
  }

  registrar(): void {
    if (!this.credencial || !this.formularioCompleto()) {
      return;
    }
    const payload: RegistroMatriculaQrPayload = {
      ...this.credencial,
      idTipoIdentificacion: this.tipoId(),
      numeroIdentificacion: Number(this.numero().trim()),
      primerNombre: this.primerNombre().trim(),
      segundoNombre: this.segundoNombre().trim() || undefined,
      primerApellido: this.primerApellido().trim(),
      segundoApellido: this.segundoApellido().trim() || undefined,
      correo: this.correo().trim(),
      password: this.password(),
    };
    this.mensaje.set('');
    this.estado.set('ENVIANDO');
    this.matriculaQr.registrar(payload).subscribe({
      next: (resultado) => {
        this.usuario.set(resultado.usuario);
        this.descartarDatos();
        this.estado.set('EXITO');
      },
      error: (error: unknown) => {
        this.mensaje.set(getApiErrorMessage(error));
        this.estado.set('REGISTRO');
      },
    });
  }

  /** Con cuenta existente: inicia sesion y se matricula con el PIN en el portal; nunca se pasa el token por la URL. */
  yaTengoCuenta(): void {
    const pin = this.credencial?.pin ?? '1';
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: `/app/estudiante/materias?matricula=${encodeURIComponent(pin)}` },
    });
  }

  reiniciar(): void {
    this.credencial = null;
    this.mensaje.set('');
    this.pin.set('');
    this.estado.set('PIN');
  }

  private validar(credencial: CredencialMatricula): void {
    this.credencial = credencial;
    this.mensaje.set('');
    this.estado.set('VALIDANDO');
    this.matriculaQr.validar(credencial).subscribe({
      next: (curso) => {
        this.curso.set(curso);
        this.tipoId.set(curso.tiposIdentificacion[0]?.id ?? '');
        this.estado.set('CURSO');
      },
      error: (error: unknown) => {
        this.credencial = null;
        this.mensaje.set(getApiErrorMessage(error));
        this.estado.set(credencial.token ? 'ERROR' : 'PIN');
      },
    });
  }

  private descartarDatos(): void {
    this.credencial = null;
    this.password.set('');
    this.confirmarPassword.set('');
    this.pin.set('');
  }
}
