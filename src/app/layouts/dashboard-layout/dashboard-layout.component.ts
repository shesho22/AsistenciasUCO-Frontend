import { Component, signal, inject, computed, effect, ChangeDetectionStrategy, ElementRef, viewChild, DestroyRef, untracked } from '@angular/core';

import { filter, skip } from 'rxjs';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole, effectiveRoles } from '../../core/models/user.model';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ToastComponent, ToastService } from '../../shared/components/toast/toast.component';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { AlertaInasistenciaService } from '../../core/services/alerta-inasistencia.service';
import { FaltaReclamableService } from '../../core/services/falta-reclamable.service';
import { REALTIME_EVENT_TYPE } from '../../core/realtime/model/realtime-event.model';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../core/realtime/model/realtime-connection-state.model';
import { RevisionCancelacionService } from '../../core/services/revision-cancelacion.service';
import { SolicitudesSesionMenuService } from '../../core/services/solicitudes-sesion-menu.service';
import { ComponentesExternosService, ComponenteExterno } from '../../core/services/componentes-externos.service';
import { environment } from '../../../environments/environment';

interface NavItem {
  label: string;
  route: string;
  roles: UserRole[];
  icon: IconName;
  /** Entrada que depende de un componente externo: solo se muestra si esta disponible. */
  externo?: ComponenteExterno;
}

@Component({
    selector: 'app-dashboard-layout',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '(document:keydown.escape)': 'cerrarMenuConEscape()' },
    imports: [RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent, BadgeComponent, ToastComponent, IconComponent],
    template: `
    <app-toast
      [visible]="toastState().visible"
      [message]="toastState().message"
      [type]="toastState().type"
      [reference]="toastState().reference"
      [duration]="toastState().reference ? 8000 : 3500"
      [secuencia]="toastState().secuencia"
      (dismissed)="toastService.dismiss()"
    ></app-toast>
    @if (cerrandoSesion()) {
      <div
        data-testid="overlay-cerrando-sesion"
        class="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-warm-50"
        role="status"
        aria-live="polite"
      >
        <img src="logo.svg" alt="" class="w-12 h-12 object-contain" />
        <p class="text-sm font-medium text-warm-700">Cerrando sesión…</p>
      </div>
    }
    <a
      href="#contenido-principal"
      (click)="irAlContenido($event)"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary-700 focus:text-white focus:font-semibold"
    >Saltar al contenido principal</a>
    <div class="h-dvh max-h-dvh w-full bg-warm-50 flex flex-col md:flex-row overflow-hidden">
      <!-- Mobile Top Navbar -->
      <header class="md:hidden bg-white border-b border-warm-200 px-4 py-3 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-warm-sm">
        <div class="flex items-center gap-2.5">
          <img src="logo.svg" alt="Gestión Asistencia Logo" class="w-8 h-8 object-contain shrink-0" />
          <div class="leading-tight">
            <span class="block font-serif font-bold text-warm-900 text-base">Gestión Asistencia</span>
            <span class="block text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-800">Universidad Católica de Oriente</span>
          </div>
        </div>
        <button
          #botonMenu
          type="button"
          (click)="toggleMobileMenu()"
          class="p-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-warm-600 hover:text-warm-900 rounded-lg hover:bg-warm-100 focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Menú principal"
          aria-controls="menu-lateral"
          [attr.aria-expanded]="isMobileMenuOpen()"
        >
          <svg class="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <!-- Fondo del menu movil: boton sin tabulacion (Escape ya lo cierra desde el teclado, ver host). -->
        <button
          type="button"
          tabindex="-1"
          aria-label="Cerrar menú de navegación"
          class="md:hidden fixed inset-0 bg-warm-950/50 backdrop-blur-xs z-40 cursor-default"
          (click)="isMobileMenuOpen.set(false)"
        ></button>
      }

      <!-- Sidebar Container -->
      <aside id="menu-lateral" [class]="sidebarClasses()" [attr.inert]="menuInerte() ? '' : null">
        <!-- Brand Header -->
        <div class="relative border-b border-white/10 shrink-0" [class]="isCollapsed() ? 'px-2 py-4' : 'p-5'">
          <!-- Logo institucional en version blanca sobre verde (como la referencia): emblema, sigla UCO, nombre y vigilancia.
               El emblema reutiliza las formas de public/logo.svg; se reemplaza por el SVG oficial cuando se entregue. -->
          <div class="flex flex-col items-center" [class.pr-5]="!isCollapsed()">
            <div class="flex items-center gap-1">
              <!-- Emblema: cuadro blanco redondeado; detras, un sol verde de 12 puntas (tres entre cada punta de la estrella);
                   delante, la estrella blanca de 4 puntas que toca los bordes del cuadro, con un filo verde fino. -->
              <svg class="w-14 h-14 shrink-0" viewBox="0 0 512 512" role="img" aria-label="Logo Universidad Católica de Oriente">
                <rect width="512" height="512" rx="110" class="fill-white" />
                <circle cx="256" cy="256" r="98" class="fill-primary-800" />
                                <polygon class="fill-primary-800" points="350,268 446,318 339,302 336,308 415,415 308,336 302,339 318,446 268,350 244,350 194,446 210,339 204,336 97,415 176,308 173,302 66,318 162,268 162,244 66,194 173,210 176,204 97,97 204,176 210,173 194,66 244,162 268,162 318,66 302,173 308,176 415,97 336,204 339,210 446,194 350,244" />
                <polygon class="fill-white stroke-primary-200" stroke-width="3" stroke-linejoin="round" points="256,10 286,226 502,256 286,286 256,502 226,286 10,256 226,226" />
              </svg>
              @if (!isCollapsed()) {
                <p class="font-sans text-[4rem] font-bold leading-[0.8] tracking-tighter text-white">UCO</p>
              }
            </div>
            @if (!isCollapsed()) {
              <p class="mt-1 text-center text-[11px] font-bold leading-tight tracking-[0.05em] whitespace-nowrap text-white">Universidad Católica de Oriente</p>
              <p class="text-center text-[11px] leading-tight text-white/90">Vigilada Mineducación</p>
            }
          </div>
          <!-- Desktop Collapse Toggle -->
          <button
            type="button"
            (click)="toggleCollapsed()"
            [class]="isCollapsed() ? 'mx-auto mt-2' : 'absolute top-3 right-2'"
            class="hidden md:flex p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            [title]="isCollapsed() ? 'Expandir menú' : 'Colapsar menú'"
          >
            <svg class="w-5 h-5 transform transition-transform" [class.rotate-180]="isCollapsed()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          @if (!isCollapsed()) {
            <div class="mt-5 flex items-start gap-3">
              <span class="mt-2 h-0.5 w-6 shrink-0 rounded-full bg-accent-500" aria-hidden="true"></span>
              <h1 class="min-w-0 font-serif text-sm font-extrabold uppercase leading-tight tracking-[0.12em] text-white">Gestión Asistencia</h1>
            </div>
          }
        </div>

        <!-- Navigation Links Filtrados por Rol -->
        <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
          <!-- Secciones del menú como en la referencia UCO: «Inicio» (Panel Principal) y luego los módulos del rol. -->
          @for (item of filteredNavItems(); track item.route; let primero = $first, indice = $index) {
            @if (!isCollapsed() && currentRole()) {
              @if (primero) {
                <div class="menu-uco-seccion">Inicio</div>
              } @else if (indice === 1) {
                <div class="menu-uco-seccion pt-4">Módulos para {{ currentRole() }}</div>
              }
            }
            <a
              [routerLink]="item.route"
              routerLinkActive="menu-uco-activo"
              ariaCurrentWhenActive="page"
              (click)="isMobileMenuOpen.set(false)"
              class="menu-uco-item"
              [title]="isCollapsed() ? item.label : ''"
            >
              <span class="menu-uco-icono" aria-hidden="true">
                <app-icon [name]="item.icon" cssClass="w-4 h-4 shrink-0"></app-icon>
              </span>
              @if (!isCollapsed()) {
                <span class="truncate">{{ item.label }}</span>
              }
              @if (contadorDe(item); as pendientes) {
                <span
                  data-testid="menu-contador"
                  class="ml-auto min-w-[1.25rem] rounded-full bg-accent-500 px-1.5 py-0.5 text-center text-[11px] font-bold text-warm-950"
                  [attr.aria-label]="pendientes + (pendientes === 1 ? ' pendiente' : ' pendientes')"
                >{{ pendientes }}</span>
              }
            </a>
          }
        </nav>

        <!-- User Profile Card Footer -->
        <!-- El pie se ajusta al ancho de la barra. Encogida (80 px) reduce su relleno y centra el avatar, que con el relleno
             amplio se salia de la tarjeta. Extendida (256 px) deja 125 px para el nombre y el rol: la insignia del rol mas
             largo (ADMINISTRADOR) mide 121 px sin el punto, asi que no lleva punto ni texto adicional a su lado; antes
             media 131 px, mas el texto Editar, y se montaba sobre el boton de cerrar sesion. -->
        <div data-testid="pie-usuario" [class]="isCollapsed() ? 'p-2' : 'p-3'" class="border-t border-white/10 bg-primary-950/40 shrink-0">
          <div class="flex items-center gap-1 p-1.5 rounded-xl bg-white border border-warm-200 shadow-warm-sm hover:border-primary-300 transition-colors">
            <!-- Clickable User Profile Area -->
            <a
              routerLink="/app/perfil"
              data-testid="pie-usuario-perfil"
              [class.justify-center]="isCollapsed()"
              class="flex items-center gap-2 flex-1 min-w-0 p-1 rounded-lg hover:bg-warm-50 group cursor-pointer transition-colors"
              title="Ver y editar mi perfil institucional"
            >
              <app-avatar [name]="user()?.name || 'Usuario'" size="md"></app-avatar>
              @if (!isCollapsed()) {
                <div class="flex-1 min-w-0 text-left">
                  <p class="text-xs font-bold text-warm-900 truncate group-hover:text-primary-800 transition-colors">
                    {{ user()?.name }}
                  </p>
                  <!-- overflow-hidden: un rol mas largo de lo previsto se recorta dentro de la tarjeta en vez de salirse. -->
                  <div data-testid="pie-usuario-rol" class="flex items-center min-w-0 overflow-hidden mt-0.5">
                    @if (currentRole(); as rol) {
                      <app-badge [variant]="getRoleBadgeVariant(rol)" size="sm" [dot]="false">
                        {{ rol }}
                      </app-badge>
                    }
                  </div>
                </div>
              }
            </a>

            @if (!isCollapsed()) {
              <button
                type="button"
                (click)="logout()"
                class="p-2 text-warm-400 hover:text-danger-600 rounded-lg hover:bg-danger-50 transition-colors shrink-0"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            }
          </div>
          @if (!isCollapsed()) {
            <div data-testid="lema-uco" class="mt-3 text-center">
              <p class="font-serif text-xs font-bold text-white">A la Verdad, por la Fe y la Ciencia</p>
              <p class="mt-0.5 text-[11px] text-white/75">UCO · {{ anioActual }}</p>
            </div>
          }
        </div>
      </aside>

      <!-- Main Content Area -->
      <main id="contenido-principal" tabindex="-1" class="flex-1 flex flex-col min-w-0 h-full overflow-y-auto focus:outline-none">
        <!-- Top Desktop Bar -->
        <div class="hidden md:flex items-center justify-between bg-white border-b border-warm-200 px-8 py-2.5 shadow-warm-sm shrink-0 sticky top-0 z-20">
          <div class="min-w-0">
            <p class="font-serif text-sm font-bold uppercase tracking-[0.12em] text-primary-900">Universidad Católica de Oriente</p>
            <div class="flex items-center gap-2 text-xs">
              <span class="font-semibold text-accent-700">{{ user()?.institutionName || 'UCO' }}</span>
              <span class="text-warm-300" aria-hidden="true">/</span>
              <span class="truncate font-medium text-warm-600">{{ user()?.department }}</span>
            </div>
          </div>

          @if (currentRole(); as rol) {
            <div class="flex items-center gap-3">
              <span class="text-xs text-warm-500">Sesión activa como:</span>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-900 border border-primary-200">
                {{ rol }}
              </span>
            </div>
          }
        </div>

        <!-- Page View Container -->
        <div class="p-3 sm:p-4 lg:p-6 flex-1">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class DashboardLayoutComponent {
  private readonly authService = inject(AuthService);
  toastService = inject(ToastService);
  toastState = this.toastService.currentToast;

  user = this.authService.currentUser;
  /** Año que acompaña el lema institucional al pie del menú. */
  readonly anioActual = new Date().getFullYear();
  isCollapsed = signal<boolean>(false);
  isMobileMenuOpen = signal<boolean>(false);
  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');
  /** true desde el breakpoint `md` (768 px): el menú lateral es fijo y siempre visible. */
  private readonly esEscritorio = signal<boolean>(true);
  /** WCAG 2.4.3 / 4.1.2: en móvil con el menú cerrado el panel está fuera de pantalla; no recibe foco ni se lee. */
  readonly menuInerte = computed(() => !this.esEscritorio() && !this.isMobileMenuOpen());

  /** Overlay de cierre de sesión: tapa la interfaz mientras el navegador sale hacia el logout del PDP. */
  readonly cerrandoSesion = this.authService.cerrandoSesion;

  /** Sin usuario no hay rol: nunca se inventa uno (antes caía en DOCENTE y se pintaba su menú al cerrar sesión). */
  currentRole = computed<UserRole | null>(() => this.user()?.role ?? null);
  /** Id de la persona en sesión: el canal del usuario se reabre si cambia, aunque el rol sea el mismo. */
  private readonly usuarioId = computed<string | null>(() => this.user()?.id ?? null);
  /** Último estado conocido del canal del usuario. */
  private readonly estadoCanalUsuario = signal<RealtimeConnectionState>('DISCONNECTED');

  private readonly alertaService = inject(AlertaInasistenciaService, { optional: true });
  private readonly revisionService = inject(RevisionCancelacionService, { optional: true });
  private readonly externos = inject(ComponentesExternosService);
  private readonly solicitudesMenu = inject(SolicitudesSesionMenuService);
  private readonly faltaService = inject(FaltaReclamableService, { optional: true });
  private readonly realtime = inject(RealtimeService, { optional: true });
  alertasVigentesCount = signal<number>(0);
  /** ATA D10: tomas en falta que el estudiante aún puede reclamar; se suman al número de «Mis alertas». */
  faltasReclamablesCount = signal<number>(0);
  revisionesPendientesCount = signal<number>(0);

  constructor() {
    if (typeof window.matchMedia === 'function') {
      const consulta = window.matchMedia('(min-width: 768px)');
      this.esEscritorio.set(consulta.matches);
      const alCambiar = (evento: MediaQueryListEvent): void => this.esEscritorio.set(evento.matches);
      consulta.addEventListener('change', alCambiar);
      inject(DestroyRef).onDestroy(() => consulta.removeEventListener('change', alCambiar));
    }

    // REDIS-001 (TD-084): canal SSE del usuario mientras haya sesión, para que los contadores del menú se actualicen
    // en cualquier pantalla y no solo dentro de un grupo. Se cierra al salir del layout (cierre de sesión) y se reabre
    // si cambia la persona, aunque conserve el rol. Al volver a conectar se recuentan los contadores, porque los avisos
    // emitidos mientras estuvo caído no se reenvían.
    effect((onCleanup) => {
      const usuarioId = this.usuarioId();
      const role = this.currentRole();
      if (usuarioId === null || role === null || !this.realtime) {
        return;
      }
      const realtime = this.realtime;
      untracked(() => {
        realtime.startForUser();
        const estados = realtime.userConnectionState$?.subscribe((estado) => this.estadoCanalUsuario.set(estado));
        const reconexiones = realtime.userConnectionState$
          ?.pipe(
            filter((estado) => estado === 'CONNECTED'),
            skip(1)
          )
          .subscribe(() => this.recontarMenuTrasReconexion());
        onCleanup(() => {
          estados?.unsubscribe();
          reconexiones?.unsubscribe();
          realtime.stopUser();
          this.estadoCanalUsuario.set('DISCONNECTED');
        });
      });
    });

    // Si el canal del usuario terminó (token no renovable o respuesta 403/404), se reintenta cuando la sesión obtiene
    // un token nuevo, en lugar de dejar el menú sin tiempo real el resto de la sesión.
    effect(() => {
      // `token` puede faltar en los dobles de AuthService de las pruebas del layout.
      const token = this.authService.token?.();
      if (!token || this.usuarioId() === null) {
        return;
      }
      const estado = untracked(() => this.estadoCanalUsuario());
      if (estado === 'UNAUTHORIZED' || estado === 'ERROR') {
        untracked(() => this.realtime?.startForUser());
      }
    });

    // ATA D6: el contador de «Solicitudes de sesión» se recarga al fijar el rol y con los eventos SSE de solicitudes.
    effect(() => {
      const role = this.currentRole();
      untracked(() => this.solicitudesMenu.iniciar(role));
    });

    // ATA D10: el contador de faltas reclamables se recarga al fijar el rol de estudiante y con los eventos SSE (sin polling).
    effect((onCleanup) => {
      const role = this.currentRole();
      if (role !== 'ESTUDIANTE' || !environment.features?.cancelacionInasistenciaEnabled) {
        untracked(() => this.faltasReclamablesCount.set(0));
        return;
      }
      untracked(() => {
        this.recargarFaltasReclamables();
        const suscripcion = this.realtime?.allEvents().subscribe((evento) => {
          if (evento?.type === REALTIME_EVENT_TYPE.FALTA_SESION_AVISADA || evento?.type === REALTIME_EVENT_TYPE.ASISTENCIAS_TOMA_ACTUALIZADAS) {
            this.recargarFaltasReclamables();
          }
        });
        onCleanup(() => suscripcion?.unsubscribe());
      });
    });

    effect(() => {
      const role = this.currentRole();
      const cancelacionEnabled = Boolean(environment.features?.cancelacionInasistenciaEnabled);

      if (!cancelacionEnabled || role === null) {
        return;
      }

      if (role === 'ESTUDIANTE') {
        this.alertaService?.contarVigentes().subscribe({
          next: (count) => this.alertasVigentesCount.set(count),
          error: () => this.alertasVigentesCount.set(0),
        });
      } else if (role === 'DOCENTE') {
        this.revisionService?.contarPendientes('DOCENTE').subscribe({
          next: (count) => this.revisionesPendientesCount.set(count),
          error: () => this.revisionesPendientesCount.set(0),
        });
      } else if (role === 'COORDINADOR') {
        this.revisionService?.contarPendientes('COORDINADOR').subscribe({
          next: (count) => this.revisionesPendientesCount.set(count),
          error: () => this.revisionesPendientesCount.set(0),
        });
      }
    }, { allowSignalWrites: true });
  }

  /** Recuenta los contadores del menú que dependen del canal en vivo tras una reconexión del canal del usuario. */
  private recontarMenuTrasReconexion(): void {
    this.solicitudesMenu.recargar();
    if (this.currentRole() === 'ESTUDIANTE' && environment.features?.cancelacionInasistenciaEnabled) {
      this.recargarFaltasReclamables();
    }
  }

  private recargarFaltasReclamables(): void {
    this.faltaService?.contar().subscribe({
      next: (total) => this.faltasReclamablesCount.set(total),
      error: () => this.faltasReclamablesCount.set(0),
    });
  }

  private readonly allNavItems: NavItem[] = [
    {
      label: 'Panel Principal',
      route: '/app/dashboard',
      roles: ['ADMINISTRADOR', 'DECANO', 'COORDINADOR', 'DOCENTE', 'ESTUDIANTE'],
      icon: 'dashboard',
    },
    {
      label: 'Personas',
      route: '/app/admin/personas',
      roles: ['ADMINISTRADOR'],
      icon: 'estudiantes',
    },
    {
      label: 'Organigrama',
      route: '/app/admin/estructura',
      roles: ['ADMINISTRADOR'],
      icon: 'facultad',
    },
    {
      label: 'Configuración',
      route: '/app/admin/configuracion',
      roles: ['ADMINISTRADOR'],
      icon: 'catalogos',
    },
    {
      label: 'Auditoría',
      route: '/app/admin/sistema/auditoria',
      roles: ['ADMINISTRADOR'],
      icon: 'sistema',
    },
    {
      label: 'Cierre masivo',
      route: '/app/admin/sistema/cierre-masivo',
      roles: ['ADMINISTRADOR'],
      icon: 'asistencia',
    },
    {
      label: 'Indicadores',
      route: '/app/admin/indicadores',
      roles: ['ADMINISTRADOR'],
      icon: 'estudiantes',
    },
    {
      // Depende del componente externo de seguridad: se oculta si no esta disponible (F3-ADM-07).
      label: 'Seguridad UCO',
      route: '/app/admin/seguridad',
      roles: ['ADMINISTRADOR'],
      icon: 'sistema',
      externo: 'seguridad',
    },
    {
      // Depende del micro frontend de MessageUcoLab: se oculta si no esta disponible (F3-ADM-07).
      label: 'Mensajes',
      route: '/app/admin/mensajes',
      roles: ['ADMINISTRADOR'],
      icon: 'catalogos',
      externo: 'mensajes',
    },
    {
      label: 'Mi Facultad',
      route: '/app/decano/mi-facultad',
      roles: ['DECANO'],
      icon: 'facultad',
    },
    {
      label: 'Seguimiento',
      route: '/app/decano/seguimiento',
      roles: ['DECANO'],
      icon: 'asistencia',
    },
    {
      label: 'Directorio',
      route: '/app/decano/directorio',
      roles: ['DECANO'],
      icon: 'estudiantes',
    },
    {
      label: 'Períodos Académicos',
      route: '/app/decano/periodos',
      roles: ['DECANO'],
      icon: 'horarios',
    },
    {
      label: 'Revisiones de Cancelación',
      route: '/app/decano/revisiones-cancelacion',
      roles: ['DECANO'],
      icon: 'asistencia',
    },
    {
      label: 'Asistencia',
      route: '/app/coordinador/asistencia',
      roles: ['COORDINADOR'],
      icon: 'asistencia',
    },
    {
      label: 'Indicadores',
      route: '/app/coordinador/indicadores',
      roles: ['COORDINADOR'],
      icon: 'dashboard',
    },
    {
      label: 'Solicitudes de sesión',
      route: '/app/coordinador/solicitudes-sesion',
      roles: ['COORDINADOR'],
      icon: 'horarios',
    },
    {
      label: 'Programa',
      route: '/app/coordinador/programa',
      roles: ['COORDINADOR'],
      icon: 'grupos',
    },
    {
      label: 'Planes de Estudio',
      route: '/app/coordinador/planes-estudio',
      roles: ['COORDINADOR'],
      icon: 'planes-estudio',
    },
    {
      label: 'Estudiantes del Programa',
      route: '/app/coordinador/estudiantes',
      roles: ['COORDINADOR'],
      icon: 'estudiantes',
    },
    {
      label: 'Revisiones de Cancelación',
      route: '/app/coordinador/revisiones-cancelacion',
      roles: ['COORDINADOR'],
      icon: 'asistencia',
    },
    {
      label: 'Mis Grupos',
      route: '/app/docente/grupos',
      roles: ['DOCENTE'],
      icon: 'grupos',
    },
    {
      label: 'Tomar Asistencia',
      route: '/app/asistencia',
      roles: ['DOCENTE'],
      icon: 'asistencia',
    },
    {
      label: 'Solicitudes de sesión',
      route: '/app/docente/solicitudes-sesion',
      roles: ['DOCENTE'],
      icon: 'horarios',
    },
    {
      label: 'Justificaciones',
      route: '/app/docente/reclamos',
      roles: ['DOCENTE'],
      icon: 'reclamos',
    },
    {
      label: 'Mis Horarios',
      route: '/app/docente/horarios',
      roles: ['DOCENTE'],
      icon: 'horarios',
    },
    {
      label: 'Mis Materias',
      route: '/app/estudiante/mis-materias',
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
      label: 'Mis Alertas',
      route: '/app/estudiante/alertas',
      roles: ['ESTUDIANTE'],
      icon: 'asistencia',
    },
  ];

  filteredNavItems = computed<NavItem[]>(() => {
    const user = this.user();
    if (!user) {
      return [];
    }
    const roles = effectiveRoles(user);
    const cancelacionEnabled = Boolean(environment.features?.cancelacionInasistenciaEnabled);

    return this.allNavItems
      .filter((item) => {
        if (!cancelacionEnabled) {
          if (
            item.route === '/app/estudiante/alertas' ||
            item.route === '/app/coordinador/revisiones-cancelacion' ||
            item.route === '/app/decano/revisiones-cancelacion'
          ) {
            return false;
          }
        }
        return true;
      })
      .filter((item) => !item.externo || this.externos.habilitado(item.externo))
      .filter((item) => item.roles.some((role) => roles.includes(role)));
  });

  /** Pendientes que se anuncian junto a la entrada del menú (alertas del estudiante, revisiones del docente y del coordinador). */
  contadorDe(item: NavItem): number {
    switch (item.route) {
      case '/app/estudiante/alertas':
        return this.alertasVigentesCount() + this.faltasReclamablesCount();
      case '/app/coordinador/solicitudes-sesion':
      case '/app/docente/solicitudes-sesion':
        return this.solicitudesMenu.pendientes();
      case '/app/docente/grupos':
      case '/app/coordinador/revisiones-cancelacion':
        return this.revisionesPendientesCount();
      default:
        return 0;
    }
  }

  toggleCollapsed(): void {
    this.isCollapsed.update((val) => !val);
  }

  irAlContenido(event: Event): void {
    event.preventDefault();
    document.getElementById('contenido-principal')?.focus();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((val) => !val);
  }

  /** WCAG 2.1.2/2.4.3: Escape cierra el menú móvil y devuelve el foco a la hamburguesa que lo abrió. */
  cerrarMenuConEscape(): void {
    if (!this.isMobileMenuOpen()) return;
    this.isMobileMenuOpen.set(false);
    this.botonMenu()?.nativeElement.focus();
  }

  logout(): void {
    void this.authService.logout();
  }

  sidebarClasses(): string {
    const collapsedWidth = this.isCollapsed() ? 'w-20' : 'w-64';
    const mobileVisibility = this.isMobileMenuOpen()
      ? 'translate-x-0'
      : '-translate-x-full md:translate-x-0';

    return `fixed md:static inset-y-0 left-0 z-50 h-dvh max-h-dvh menu-uco flex flex-col justify-between transition-all duration-300 ease-in-out shadow-warm-md md:shadow-none ${collapsedWidth} ${mobileVisibility}`;
  }

  getRoleBadgeVariant(role: UserRole | null): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    switch (role) {
      case 'ADMINISTRADOR':
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
