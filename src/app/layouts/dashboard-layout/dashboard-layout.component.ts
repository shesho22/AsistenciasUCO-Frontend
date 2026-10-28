import { Component, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole, effectiveRoles } from '../../core/models/user.model';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ToastComponent, ToastService } from '../../shared/components/toast/toast.component';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

interface NavItem {
  label: string;
  route: string;
  roles: UserRole[];
  icon: IconName;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent, BadgeComponent, ToastComponent, IconComponent],
  template: `
    <app-toast
      [visible]="toastState().visible"
      [message]="toastState().message"
      [type]="toastState().type"
      (dismissed)="toastService.dismiss()"
    ></app-toast>
    <div class="h-dvh max-h-dvh w-full bg-warm-50 flex flex-col md:flex-row overflow-hidden">
      <!-- Mobile Top Navbar -->
      <header class="md:hidden bg-white border-b border-warm-200 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-warm-sm">
        <div class="flex items-center gap-2.5">
          <img src="logo.svg" alt="Gestió Asistencia Logo" class="w-8 h-8 object-contain shrink-0" />
          <span class="font-serif font-bold text-warm-900 text-lg">Gestió Asistencia</span>
        </div>
        <button
          type="button"
          (click)="toggleMobileMenu()"
          class="p-2 text-warm-600 hover:text-warm-900 rounded-lg hover:bg-warm-100"
          aria-label="Menú principal"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            @if (isMobileMenuOpen()) {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            } @else {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </header>

      <!-- Sidebar Overlay for Mobile -->
      @if (isMobileMenuOpen()) {
        <div
          class="md:hidden fixed inset-0 bg-warm-950/50 backdrop-blur-xs z-40"
          (click)="isMobileMenuOpen.set(false)"
        ></div>
      }

      <!-- Sidebar Container -->
      <aside [class]="sidebarClasses()">
        <!-- Brand Header -->
        <div class="p-5 flex items-center justify-between border-b border-warm-200/80 shrink-0">
          <div class="flex items-center gap-3">
            <img src="logo.svg" alt="Gestió Asistencia Logo" class="w-9 h-9 object-contain shrink-0" />
            @if (!isCollapsed()) {
              <div>
                <h1 class="font-serif font-bold text-warm-900 text-base leading-tight tracking-tight">Gestió Asistencia</h1>
                <p class="text-[10px] uppercase font-bold text-primary-700 tracking-wider">Universidad Católica de Oriente</p>
              </div>
            }
          </div>
          <!-- Desktop Collapse Toggle -->
          <button
            type="button"
            (click)="toggleCollapsed()"
            class="hidden md:flex p-1.5 rounded-lg text-warm-400 hover:text-warm-700 hover:bg-warm-100 transition-colors"
            [title]="isCollapsed() ? 'Expandir menú' : 'Colapsar menú'"
          >
            <svg class="w-5 h-5 transform transition-transform" [class.rotate-180]="isCollapsed()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <!-- Navigation Links Filtrados por Rol -->
        <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto">
          @if (!isCollapsed()) {
            <div class="px-3 pb-2 text-[10px] font-bold tracking-wider text-warm-400 uppercase">
              Módulos para {{ currentRole() }}
            </div>
          }

          @for (item of filteredNavItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-primary-50 text-primary-800 font-semibold shadow-xs"
              (click)="isMobileMenuOpen.set(false)"
              class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-warm-700 hover:bg-warm-100 hover:text-warm-900 transition-all duration-150 group"
              [title]="isCollapsed() ? item.label : ''"
            >
              <app-icon [name]="item.icon" cssClass="w-5 h-5 text-warm-500 group-hover:text-primary-700 shrink-0 transition-colors"></app-icon>
              @if (!isCollapsed()) {
                <span class="truncate">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <!-- Mock Role Switcher (Visible en modo Mock) -->
        @if (isMockMode() && !isCollapsed()) {
          <div class="px-4 py-3 mx-3 mb-2 rounded-xl bg-warm-100/70 border border-warm-200/80 shrink-0">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-warm-600">Simulador de Rol</span>
              <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary-100 text-primary-800">Mock</span>
            </div>
            <select
              [value]="currentRole()"
              (change)="onRoleChange($event)"
              class="w-full text-xs font-semibold py-1.5 px-2 bg-white border border-warm-300 rounded-lg text-warm-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="DECANO">Decano</option>
              <option value="COORDINADOR">Coordinador</option>
              <option value="DOCENTE">Docente</option>
              <option value="ESTUDIANTE">Estudiante</option>
            </select>
          </div>
        }

        <!-- User Profile Card Footer -->
        <div class="p-4 border-t border-warm-200/80 bg-warm-50/50 shrink-0">
          <div class="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-warm-200 shadow-warm-sm hover:border-primary-300 transition-colors">
            <!-- Clickable User Profile Area -->
            <a
              routerLink="/app/perfil"
              class="flex items-center gap-2.5 flex-1 min-w-0 p-1 rounded-lg hover:bg-warm-50 group cursor-pointer transition-colors"
              title="Ver y editar mi perfil institucional"
            >
              <app-avatar [name]="user()?.name || 'Usuario'" size="md"></app-avatar>
              @if (!isCollapsed()) {
                <div class="flex-1 min-w-0 text-left">
                  <p class="text-xs font-bold text-warm-900 truncate group-hover:text-primary-800 transition-colors">
                    {{ user()?.name }}
                  </p>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <app-badge [variant]="getRoleBadgeVariant(currentRole())" size="sm">
                      {{ currentRole() }}
                    </app-badge>
                    <span class="text-[10px] text-warm-400 group-hover:text-primary-600 transition-colors">
                      • Editar
                    </span>
                  </div>
                </div>
              }
            </a>

            @if (!isCollapsed()) {
              <button
                type="button"
                (click)="logout()"
                class="p-2 text-warm-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                title="Cerrar sesión"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            }
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <!-- Top Desktop Bar -->
        <div class="hidden md:flex items-center justify-between bg-white border-b border-warm-200 px-8 py-3.5 shadow-warm-sm shrink-0 sticky top-0 z-20">
          <div class="flex items-center gap-3">
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-100 text-accent-800 border border-accent-200">
              {{ user()?.institutionName || 'UCO' }}
            </span>
            <span class="text-warm-300">/</span>
            <span class="text-xs text-warm-600 font-medium">{{ user()?.department }}</span>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs text-warm-500">Sesión activa como:</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-warm-100 text-warm-800 border border-warm-200">
              {{ currentRole() }}
            </span>
          </div>
        </div>

        <!-- Page View Container -->
        <div class="p-4 sm:p-6 lg:p-8 flex-1">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
})
export class DashboardLayoutComponent {
  private authService = inject(AuthService);
  toastService = inject(ToastService);
  toastState = this.toastService.currentToast;

  user = this.authService.currentUser;
  isMockMode = this.authService.isMockMode;
  isCollapsed = signal<boolean>(false);
  isMobileMenuOpen = signal<boolean>(false);

  currentRole = computed<UserRole>(() => {
    const role = this.user()?.role;
    if (role === 'ADMIN') return 'ADMINISTRADOR';
    return (role || 'DOCENTE') as UserRole;
  });

  private allNavItems: NavItem[] = [
    {
      label: 'Panel Principal',
      route: '/app/dashboard',
      roles: ['ADMINISTRADOR', 'DECANO', 'COORDINADOR', 'DOCENTE', 'ESTUDIANTE', 'ADMIN'],
      icon: 'dashboard',
    },
    {
      label: 'Gestión de Facultades',
      route: '/app/admin/facultades',
      roles: ['ADMINISTRADOR', 'ADMIN'],
      icon: 'facultad',
    },
    {
      label: 'Indicadores',
      route: '/app/admin/indicadores',
      roles: ['ADMINISTRADOR', 'ADMIN'],
      icon: 'estudiantes',
    },
    {
      label: 'Gestión de Decanos',
      route: '/app/admin/decanos',
      roles: ['ADMINISTRADOR', 'ADMIN'],
      icon: 'decanos',
    },
    {
      label: 'Sedes Institucionales',
      route: '/app/admin/sedes',
      roles: ['ADMINISTRADOR', 'ADMIN'],
      icon: 'catalogos',
    },
    {
      label: 'Áreas de Conocimiento',
      route: '/app/admin/areas',
      roles: ['ADMINISTRADOR', 'ADMIN'],
      icon: 'materias',
    },
    {
      label: 'Períodos Académicos',
      route: '/app/admin/periodos',
      roles: ['ADMINISTRADOR', 'ADMIN'],
      icon: 'horarios',
    },
    {
      label: 'Sistema & Auditoría',
      route: '/app/admin/sistema',
      roles: ['ADMINISTRADOR', 'ADMIN'],
      icon: 'sistema',
    },
    {
      label: 'Indicadores',
      route: '/app/decano/indicadores',
      roles: ['DECANO'],
      icon: 'estudiantes',
    },
    {
      label: 'Mi Facultad',
      route: '/app/decano/facultad',
      roles: ['DECANO'],
      icon: 'facultad',
    },
    {
      label: 'Grupos de la Facultad',
      route: '/app/decano/grupos',
      roles: ['DECANO'],
      icon: 'grupos',
    },
    {
      label: 'Programas y Planes',
      route: '/app/decano/programas',
      roles: ['DECANO'],
      icon: 'planes-estudio',
    },
    {
      label: 'Períodos Académicos',
      route: '/app/decano/periodos',
      roles: ['DECANO'],
      icon: 'horarios',
    },
    {
      label: 'Áreas y Sedes',
      route: '/app/decano/infraestructura',
      roles: ['DECANO'],
      icon: 'catalogos',
    },
    {
      label: 'Gestión de Coordinadores',
      route: '/app/decano/coordinadores',
      roles: ['DECANO'],
      icon: 'coordinadores',
    },
    {
      label: 'Estudiantes de la Facultad',
      route: '/app/decano/estudiantes',
      roles: ['DECANO'],
      icon: 'estudiantes',
    },
    {
      label: 'Estructura de la Facultad',
      route: '/app/decano/estructura',
      roles: ['DECANO'],
      icon: 'facultad',
    },
    {
      label: 'Cronograma de Sesiones',
      route: '/app/decano/cronograma',
      roles: ['DECANO'],
      icon: 'horarios',
    },
    {
      label: 'Gestión de Docentes',
      route: '/app/coordinador/docentes',
      roles: ['COORDINADOR'],
      icon: 'docentes',
    },
    {
      label: 'Planes de Estudio',
      route: '/app/coordinador/planes-estudio',
      roles: ['COORDINADOR'],
      icon: 'planes-estudio',
    },
    {
      label: 'Períodos Académicos',
      route: '/app/coordinador/periodos',
      roles: ['COORDINADOR'],
      icon: 'horarios',
    },
    {
      label: 'Indicadores',
      route: '/app/coordinador/indicadores',
      roles: ['COORDINADOR'],
      icon: 'estudiantes',
    },
    {
      label: 'Estudiantes del Programa',
      route: '/app/coordinador/estudiantes',
      roles: ['COORDINADOR'],
      icon: 'estudiantes',
    },
    {
      label: 'Materias del Programa',
      route: '/app/coordinador/materias',
      roles: ['COORDINADOR'],
      icon: 'materias',
    },
    {
      label: 'Asistencias del Programa',
      route: '/app/coordinador/asistencias',
      roles: ['COORDINADOR'],
      icon: 'grupos',
    },
    {
      label: 'Mis Grupos',
      route: '/app/docente/grupos',
      roles: ['DOCENTE'],
      icon: 'grupos',
    },
    {
      label: 'Mis Horarios',
      route: '/app/docente/horarios',
      roles: ['DOCENTE'],
      icon: 'horarios',
    },
    {
      label: 'Mis Horarios',
      route: '/app/estudiante/horarios',
      roles: ['ESTUDIANTE'],
      icon: 'horarios',
    },
    {
      label: 'Mis Materias',
      route: '/app/estudiante/materias',
      roles: ['ESTUDIANTE'],
      icon: 'materias',
    },
    {
      label: 'Mis Reclamos',
      route: '/app/estudiante/reclamos',
      roles: ['ESTUDIANTE'],
      icon: 'reclamos',
    },
    {
      label: 'Oferta de Grupos',
      route: '/app/estudiante/oferta',
      roles: ['ESTUDIANTE'],
      icon: 'grupos',
    },
    {
      label: 'Solicitudes de Ingreso',
      route: '/app/estudiante/solicitudes',
      roles: ['ESTUDIANTE'],
      icon: 'grupos',
    },
  ];

  filteredNavItems = computed<NavItem[]>(() => {
    const user = this.user();
    const roles = user ? effectiveRoles(user) : [this.currentRole()];
    return this.allNavItems.filter((item) => item.roles.some((role) => roles.includes(role)));
  });

  toggleCollapsed(): void {
    this.isCollapsed.update((val) => !val);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((val) => !val);
  }

  onRoleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newRole = target.value as UserRole;
    this.authService.loginAsMockUser(newRole, true);
  }

  logout(): void {
    void this.authService.logout();
  }

  sidebarClasses(): string {
    const collapsedWidth = this.isCollapsed() ? 'w-20' : 'w-64';
    const mobileVisibility = this.isMobileMenuOpen()
      ? 'translate-x-0'
      : '-translate-x-full md:translate-x-0';

    return `fixed md:static inset-y-0 left-0 z-50 h-dvh max-h-dvh bg-white border-r border-warm-200/80 flex flex-col justify-between transition-all duration-300 ease-in-out shadow-warm-md md:shadow-none ${collapsedWidth} ${mobileVisibility}`;
  }

  getRoleBadgeVariant(role: UserRole): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    switch (role) {
      case 'ADMINISTRADOR':
      case 'ADMIN':
        return 'danger';
      case 'DECANO':
        return 'warning';
      case 'COORDINADOR':
        return 'info';
      case 'DOCENTE':
        return 'success';
      case 'ESTUDIANTE':
        return 'neutral';
      default:
        return 'neutral';
    }
  }
}
