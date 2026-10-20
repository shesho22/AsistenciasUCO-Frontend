import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User, UserRole } from '../../core/models/user.model';
import { CardComponent } from '../../shared/components/card/card.component';
import { BadgeComponent, BadgeVariant } from '../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormFieldComponent } from '../../shared/components/form-field/form-field.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { ToastService } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    FormFieldComponent,
    AvatarComponent,
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
          @if (!isEditing()) {
            <app-button variant="accent" size="sm" [disabled]="!canEditProfile()" (click)="enableEditing()">
              <svg class="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar Información
            </app-button>
          }
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
              <h2 class="font-serif font-bold text-xl text-warm-900 leading-tight">
                {{ computedFullName() }}
              </h2>
              <p class="text-xs text-primary-800 font-semibold mt-0.5">
                {{ user()?.email }}
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
                <span class="font-mono font-semibold text-warm-800">{{ user()?.numeroIdentificacion || 'Sin registrar' }}</span>
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
          <form (ngSubmit)="saveProfile()" class="space-y-6">
            <!-- Bloque 1: Datos Personales (Modo Consulta vs Modo Edición) -->
            <div class="bg-white p-6 sm:p-7 rounded-2xl border border-warm-200 shadow-warm-sm space-y-5">
              <div class="border-b border-warm-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 class="font-serif font-bold text-lg text-warm-900">
                    Información Personal y de Contacto
                  </h3>
                  <p class="text-xs text-warm-500">
                    @if (isEditing()) {
                      Modifica los campos habilitados y pulsa "Guardar Cambios" para confirmar.
                    } @else {
                      Datos personales registrados actualmente en tu expediente institucional.
                    }
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  @if (isEditing()) {
                    <span class="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      Modo Edición
                    </span>
                    <app-button variant="ghost" size="sm" type="button" (click)="cancelEditing()">
                      Cancelar
                    </app-button>
                  } @else {
                    <span class="text-[11px] font-semibold text-warm-600 bg-warm-100 px-2.5 py-1 rounded-full border border-warm-200">
                      Modo Consulta
                    </span>
                    <app-button variant="accent" size="sm" type="button" [disabled]="!canEditProfile()" (click)="enableEditing()">
                      <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Editar
                    </app-button>
                  }
                </div>
              </div>

              <!-- Vista cuando NO está en modo edición (Modo Consulta) -->
              @if (!isEditing()) {
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

                <div class="bg-warm-50 p-4 rounded-xl border border-warm-200 text-xs text-warm-600 flex items-center justify-between gap-3">
                  <span class="text-[11px]">
                    Para modificar tus nombres o apellidos, presiona el botón <strong>"Editar"</strong>.
                  </span>
                  <app-button variant="accent" size="sm" type="button" [disabled]="!canEditProfile()" (click)="enableEditing()">
                    Editar Datos
                  </app-button>
                </div>
              } @else {
                <!-- Vista cuando SÍ está en modo edición -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  <!-- Primer Nombre -->
                  <app-form-field label="Primer Nombre" [required]="true">
                    <input
                      type="text"
                      name="primerNombre"
                      [(ngModel)]="formModel.primerNombre"
                      required
                      class="w-full text-xs py-2 px-3 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="Ej. Carlos"
                    />
                  </app-form-field>

                  <!-- Segundo Nombre -->
                  <app-form-field label="Segundo Nombre">
                    <input
                      type="text"
                      name="segundoNombre"
                      [(ngModel)]="formModel.segundoNombre"
                      class="w-full text-xs py-2 px-3 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="Ej. Alberto"
                    />
                  </app-form-field>

                  <!-- Primer Apellido -->
                  <app-form-field label="Primer Apellido" [required]="true">
                    <input
                      type="text"
                      name="primerApellido"
                      [(ngModel)]="formModel.primerApellido"
                      required
                      class="w-full text-xs py-2 px-3 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="Ej. Restrepo"
                    />
                  </app-form-field>

                  <!-- Segundo Apellido -->
                  <app-form-field label="Segundo Apellido">
                    <input
                      type="text"
                      name="segundoApellido"
                      [(ngModel)]="formModel.segundoApellido"
                      class="w-full text-xs py-2 px-3 bg-white border border-warm-300 rounded-xl text-warm-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="Ej. Cardona"
                    />
                  </app-form-field>
                </div>
              }
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
                  <span class="font-semibold text-warm-900 font-mono text-xs">{{ user()?.email }}</span>
                </div>

                <div class="bg-warm-50 p-3 rounded-xl border border-warm-200/70">
                  <span class="text-warm-500 block text-[10px] uppercase font-bold">Número de Identificación</span>
                  <span class="font-semibold text-warm-900 font-mono text-xs">{{ user()?.numeroIdentificacion }}</span>
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

            <!-- Botones de Acción del Formulario -->
            <div class="flex flex-wrap items-center justify-end gap-3 pt-2">
              @if (isEditing()) {
                <app-button variant="ghost" size="md" type="button" (click)="resetForm()">
                  Restablecer
                </app-button>
                <app-button variant="secondary" size="md" type="button" (click)="cancelEditing()">
                  Cancelar
                </app-button>
                <app-button variant="primary" size="md" type="submit" [disabled]="isSaving()">
                  <svg class="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ isSaving() ? 'Guardando Cambios...' : 'Guardar Cambios' }}
                </app-button>
              } @else {
                <app-button variant="secondary" size="md" type="button" (click)="goBack()">
                  Volver al Panel
                </app-button>
                <app-button variant="primary" size="md" type="button" [disabled]="!canEditProfile()" (click)="enableEditing()">
                  <svg class="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar Información
                </app-button>
              }
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private location = inject(Location);
  private router = inject(Router);

  user = this.authService.currentUser;
  canEditProfile = this.authService.isMockMode;
  isSaving = signal<boolean>(false);
  isEditing = signal<boolean>(false);

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

  computedFullName = computed(() => {
    const fn = [
      this.formModel.primerNombre,
      this.formModel.segundoNombre,
      this.formModel.primerApellido,
      this.formModel.segundoApellido,
    ].filter(Boolean).join(' ');
    return fn.trim() || this.user()?.name || 'Usuario';
  });

  ngOnInit(): void {
    this.resetForm();
    void this.authService
      .fetchProfileFromBackend()
      .then(() => {
        this.resetForm();
      })
      .catch(() => {});
  }

  enableEditing(): void {
    if (!this.canEditProfile()) {
      this.toastService.show('La edición de perfil está pendiente del contrato backend.', 'info');
      return;
    }
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.resetForm();
    this.isEditing.set(false);
  }

  resetForm(): void {
    const current = this.user();
    if (current) {
      this.formModel = {
        primerNombre: current.primerNombre || '',
        segundoNombre: current.segundoNombre || '',
        primerApellido: current.primerApellido || '',
        segundoApellido: current.segundoApellido || '',
      };
    }
  }

  saveProfile(): void {
    if (!this.canEditProfile()) {
      this.toastService.show('La edición de perfil está pendiente del contrato backend.', 'info');
      return;
    }
    if (!this.formModel.primerNombre.trim()) {
      this.toastService.show('El campo Primer Nombre es obligatorio.', 'warning');
      return;
    }
    if (!this.formModel.primerApellido.trim()) {
      this.toastService.show('El campo Primer Apellido es obligatorio.', 'warning');
      return;
    }

    this.isSaving.set(true);

    this.authService.updateUserProfile({
      primerNombre: this.formModel.primerNombre.trim(),
      segundoNombre: this.formModel.segundoNombre.trim(),
      primerApellido: this.formModel.primerApellido.trim(),
      segundoApellido: this.formModel.segundoApellido.trim(),
    }).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res.exitoso) {
          this.toastService.show('¡Perfil actualizado con éxito!', 'success');
          this.isEditing.set(false);
        } else {
          this.toastService.show(res.mensajeUsuario || 'Error al actualizar el perfil.', 'error');
        }
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.show('Ocurrió un error al intentar guardar los cambios.', 'error');
      },
    });
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
