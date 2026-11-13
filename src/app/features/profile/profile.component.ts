import { Component, OnInit, inject, signal, computed, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User, UserRole } from '../../core/models/user.model';
import { CardComponent } from '../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { ProfileLinksComponent } from './components/profile-links.component';
import { PerfilInstitucionalStore, TEXTO_SIN_REGISTRAR } from './perfil-institucional.store';

@Component({
    selector: 'app-profile',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // APP-06: un solo estado de perfil institucional por pantalla, compartido con <app-profile-links>.
    providers: [PerfilInstitucionalStore],
    imports: [
        CommonModule,
        RouterLink,
        CardComponent,
        BadgeComponent,
        ButtonComponent,
        AvatarComponent,
        ProfileLinksComponent,
    ],
    template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Barra Superior de Navegación "Atrás" -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-warm-200 shadow-warm-sm">
        <div class="flex items-center gap-3">
          <app-button variant="secondary" size="sm" (click)="goBack()">
            <svg class="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </app-button>
          <div>
            <h1 class="font-serif font-bold text-xl sm:text-2xl text-warm-900 leading-tight">
              Mi Perfil Institucional
            </h1>
            <p class="text-xs text-warm-500">
              Administra tu información personal, datos de contacto y revisa tus credenciales académicas.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto">
          <app-badge [variant]="getRoleBadgeVariant(currentRole())" size="md">
            {{ currentRole() }}
          </app-badge>
        </div>
      </div>

      <!-- Layout Bento del Perfil -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Columna 1: Tarjeta de Resumen Visual e Identidad -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm text-center space-y-4">
            <!-- Icono con la Letra del Nombre (Reactivo en tiempo real) -->
            <div class="flex justify-center pt-2">
              <app-avatar [name]="computedFullName()" size="xl"></app-avatar>
            </div>

            <div>
              <h2 class="font-serif font-bold text-xl text-warm-900 leading-tight" data-testid="perfil-resumen-nombre">
                {{ computedFullName() }}
              </h2>
              <p class="text-xs text-primary-800 font-semibold mt-0.5" data-testid="perfil-resumen-correo">
                {{ correoVisible() }}
              </p>
              <p class="text-[11px] text-warm-500 mt-1">
                {{ user()?.department }}
              </p>
            </div>

            <div class="p-3 bg-warm-50 rounded-xl border border-warm-200/80 text-left space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-warm-500">Institución:</span>
                <span class="font-bold text-warm-900">{{ user()?.institutionName || 'UCO' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-warm-500">Documento:</span>
                <span class="font-mono font-semibold text-warm-800" data-testid="perfil-resumen-documento">{{ identificacion().documento }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-warm-500">Rol:</span>
                <span class="font-semibold text-warm-900">{{ currentRole() }}</span>
              </div>
            </div>

            <div class="p-3 bg-primary-50/60 rounded-xl border border-primary-100 text-left">
              <div class="flex items-start gap-2 text-xs text-primary-900">
                <svg class="w-4 h-4 text-primary-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-[11px] leading-relaxed text-primary-800">
                  Tu avatar se genera automáticamente con la letra inicial de tu nombre y el color de identidad institucional.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Columna 2: Información Personal e Institucional -->
        <div class="lg:col-span-2 space-y-6">
          <form class="space-y-6">
            <!-- Bloque 1: Datos Personales (Modo Consulta) -->
            <div class="bg-white p-6 sm:p-7 rounded-2xl border border-warm-200 shadow-warm-sm space-y-5">
              <div class="border-b border-warm-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 class="font-serif font-bold text-lg text-warm-900">
                    Información Personal y de Contacto
                  </h3>
                  <p class="text-xs text-warm-500">
                    Datos personales registrados actualmente en tu expediente institucional.
                  </p>
                </div>

                <span class="text-[11px] font-semibold text-warm-600 bg-warm-100 px-2.5 py-1 rounded-full border border-warm-200">
                  Modo Consulta
                </span>
              </div>

              <!-- Modo Consulta: HU006 es solo lectura -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="bg-warm-50/70 p-3.5 rounded-xl border border-warm-200/80">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold tracking-wider">Primer Nombre</span>
                  <span class="font-bold text-warm-900 text-sm mt-0.5 block">{{ formModel.primerNombre || '—' }}</span>
                </div>

                <div class="bg-warm-50/70 p-3.5 rounded-xl border border-warm-200/80">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold tracking-wider">Segundo Nombre</span>
                  <span class="font-semibold text-warm-900 text-sm mt-0.5 block">{{ formModel.segundoNombre || '—' }}</span>
                </div>

                <div class="bg-warm-50/70 p-3.5 rounded-xl border border-warm-200/80">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold tracking-wider">Primer Apellido</span>
                  <span class="font-bold text-warm-900 text-sm mt-0.5 block">{{ formModel.primerApellido || '—' }}</span>
                </div>

                <div class="bg-warm-50/70 p-3.5 rounded-xl border border-warm-200/80">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold tracking-wider">Segundo Apellido</span>
                  <span class="font-semibold text-warm-900 text-sm mt-0.5 block">{{ formModel.segundoApellido || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Bloque 2: Información Institucional (Solo Lectura) -->
            <div class="bg-white p-6 sm:p-7 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
              <div class="border-b border-warm-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 class="font-serif font-bold text-lg text-warm-900">
                    Datos Institucionales y de Acceso
                  </h3>
                  <p class="text-xs text-warm-500">
                    Información asignada por la Dirección de Admisiones y Registro Académico.
                  </p>
                </div>
                <span class="text-[11px] font-semibold text-warm-500 bg-warm-100 px-2.5 py-1 rounded-full border border-warm-200">
                  Solo Lectura
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="bg-warm-50 p-3 rounded-xl border border-warm-200/70">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold">Correo Institucional</span>
                  <span class="font-semibold text-warm-900 font-mono text-xs" data-testid="perfil-correo-institucional">{{ correoVisible() }}</span>
                </div>

                <div class="bg-warm-50 p-3 rounded-xl border border-warm-200/70">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold">Tipo de Identificación</span>
                  <span class="font-semibold text-warm-900 text-xs" data-testid="perfil-tipo-identificacion">{{ identificacion().tipo }}</span>
                </div>

                <div class="bg-warm-50 p-3 rounded-xl border border-warm-200/70">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold">Número de Identificación</span>
                  <span class="font-semibold text-warm-900 font-mono text-xs" data-testid="perfil-numero-identificacion">{{ identificacion().numero }}</span>
                </div>

                <div class="bg-warm-50 p-3 rounded-xl border border-warm-200/70">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold">Dependencia / Departamento</span>
                  <span class="font-semibold text-warm-900 text-xs">{{ user()?.department }}</span>
                </div>

                <div class="bg-warm-50 p-3 rounded-xl border border-warm-200/70">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold">Rol en el Sistema</span>
                  <span class="font-bold text-primary-800 text-xs">{{ currentRole() }}</span>
                </div>
              </div>
            </div>

            <!-- Acción del Formulario -->
            <div class="flex flex-wrap items-center justify-end gap-3 pt-2">
              <app-button variant="secondary" size="md" type="button" (click)="goBack()">
                Volver al Panel
              </app-button>
            </div>
          </form>

          <!-- HU006: expediente y vinculos institucionales leidos de la DB (GET /usuarios/perfil) -->
          <app-profile-links />
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private location = inject(Location);
  private router = inject(Router);
  private perfilStore = inject(PerfilInstitucionalStore);

  user = this.authService.currentUser;
  /** APP-06: documento leido solo del GET institucional; nunca del token. */
  identificacion = this.perfilStore.identificacion;

  currentRole = computed<UserRole>(() => {
    const role = this.user()?.role;
    if (role === 'ADMIN') return 'ADMINISTRADOR';
    return (role || 'DOCENTE') as UserRole;
  });

  formModel = {
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
  };

  /** Nombres vigentes en pantalla: los del perfil institucional, o los de la sesión mientras este no llega. */
  private nombresVisibles = signal({ ...this.formModel });

  computedFullName = computed(() => {
    const n = this.nombresVisibles();
    const fn = [n.primerNombre, n.segundoNombre, n.primerApellido, n.segundoApellido].filter(Boolean).join(' ');
    return fn.trim() || this.perfilStore.perfil()?.nombreCompleto || this.user()?.name || 'Usuario';
  });

  correoVisible = computed(() => {
    const perfil = this.perfilStore.perfil();
    return perfil ? perfil.correo || TEXTO_SIN_REGISTRAR : this.user()?.email;
  });

  constructor() {
    // Al llegar el perfil institucional, el formulario de consulta toma sus nombres (salvo edición en curso).
    effect(() => {
      if (this.perfilStore.perfil()) {
        untracked(() => this.resetForm());
      }
    });
  }

  ngOnInit(): void {
    this.resetForm();
    // El GET se hace aquí, con PerfilService, no con AuthService.fetchProfileFromBackend (bandera obsoleta).
    this.perfilStore.cargar();
  }

  resetForm(): void {
    const current = this.perfilStore.perfil() ?? this.user();
    if (current) {
      this.formModel = {
        primerNombre: current.primerNombre || '',
        segundoNombre: current.segundoNombre || '',
        primerApellido: current.primerApellido || '',
        segundoApellido: current.segundoApellido || '',
      };
      this.nombresVisibles.set({ ...this.formModel });
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/app/dashboard']);
    }
  }

  getRoleBadgeVariant(role: UserRole): BadgeVariant {
    switch (role) {
      case 'ADMINISTRADOR':
      case 'ADMIN':
        return 'danger';
      case 'DECANO':
        return 'info';
      case 'COORDINADOR':
        return 'warning';
      case 'DOCENTE':
        return 'info';
      case 'ESTUDIANTE':
        return 'success';
      default:
        return 'neutral';
    }
  }
}
