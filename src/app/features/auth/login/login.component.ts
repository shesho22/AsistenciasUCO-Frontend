import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CardComponent } from '../../../shared/components/card/card.component';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
  ],
  template: `
    <div class="w-full max-w-md mx-auto animate-fade-in space-y-4">
      <app-card [glass]="true" padding="lg">
        <!-- Encabezado Institucional -->
        <div class="mb-6 text-center space-y-2">
          <div class="inline-flex p-3.5 rounded-2xl bg-warm-100/90 border border-warm-200/80 mb-1 shadow-warm-sm">
            <img src="logo.svg" alt="Gestió Asistencia Logo" class="w-11 h-11 object-contain shrink-0" />
          </div>
          <h2 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Gestió Asistencia UCO
          </h2>
          <p class="text-xs text-warm-600 max-w-sm mx-auto leading-relaxed">
            Ingresa con tus credenciales institucionales para acceder a la gestión de asistencia académica.
          </p>
        </div>

        <!-- Mensaje de Error si las credenciales fallan -->
        @if (errorMessage()) {
          <div class="mb-4 p-3 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-fade-in shadow-sm">
            <svg class="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">{{ errorMessage() }}</span>
          </div>
        }

        <!-- Formulario de Inicio de Sesión Institucional -->
        <form (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Campo Correo Institucional -->
            <div class="space-y-1.5 text-left">
              <label for="usernameInput" class="block text-xs font-bold uppercase tracking-wider text-warm-700">
                Correo Institucional
              </label>
              <div class="relative flex items-center">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="usernameInput"
                  name="username"
                  type="email"
                  [(ngModel)]="username"
                  placeholder="ej. usuario@uco.edu.co"
                  required
                  autocomplete="email"
                  class="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-warm-300 rounded-xl text-xs sm:text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all"
                />
              </div>
            </div>

            <!-- Campo Contraseña -->
            <div class="space-y-1.5 text-left">
              <label for="passwordInput" class="block text-xs font-bold uppercase tracking-wider text-warm-700">
                Contraseña
              </label>
              <div class="relative flex items-center">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-warm-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="passwordInput"
                  name="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  placeholder="••••••••"
                  required
                  autocomplete="current-password"
                  class="w-full pl-10 pr-11 py-2.5 bg-white/80 border border-warm-300 rounded-xl text-xs sm:text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all"
                />
                <button
                  type="button"
                  (click)="toggleShowPassword()"
                  tabindex="-1"
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-warm-400 hover:text-warm-700 transition-colors"
                  [title]="showPassword() ? 'Ocultar contraseña' : 'Ver contraseña'"
                >
                  @if (showPassword()) {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                </button>
              </div>
            </div>

            <!-- Botón de Envío y SSO -->
            <div class="pt-2 space-y-3">
              <button
                type="button"
                (click)="onInstitutionalLogin()"
                class="w-full py-2.5 px-4 rounded-xl bg-primary-700 hover:bg-primary-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Iniciar sesión con Plataforma de Seguridad (SSO)
              </button>

              <div class="relative flex py-1 items-center">
                <div class="grow border-t border-warm-200"></div>
                <span class="shrink mx-3 text-warm-400 text-[11px] uppercase tracking-wider">o ingresar directamente</span>
                <div class="grow border-t border-warm-200"></div>
              </div>

              <app-button
                variant="secondary"
                type="submit"
                [fullWidth]="true"
                [loading]="isLoading()"
                size="lg"
              >
                Ingresar con Credenciales Locales
              </app-button>
            </div>
          </form>
      </app-card>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  async ngOnInit(): Promise<void> {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/app/dashboard']);
      return;
    }
    const hasPdpSession = await this.authService.checkPdpSession();
    if (hasPdpSession) {
      this.router.navigate(['/app/dashboard']);
    }
  }

  onInstitutionalLogin(): void {
    this.authService.loginWithSecurityPlatform();
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set('');

    const trimmedUsername = this.username.trim();
    const trimmedPassword = this.password.trim();

    if (!trimmedUsername && !trimmedPassword) {
      this.errorMessage.set('Los campos Correo Institucional y Contraseña son obligatorios.');
      return;
    }
    if (!trimmedUsername) {
      this.errorMessage.set('El campo Correo Institucional es obligatorio.');
      return;
    }
    if (!trimmedPassword) {
      this.errorMessage.set('El campo Contraseña es obligatorio.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedUsername)) {
      this.errorMessage.set('El campo Correo Institucional debe tener un formato de correo válido (ej. usuario@uco.edu.co).');
      return;
    }

    this.isLoading.set(true);
    try {
      await this.authService.loginWithCredentials(trimmedUsername, trimmedPassword);
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      this.errorMessage.set(
        error?.message || 'Error al autenticar. Verifica tu usuario y contraseña.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
