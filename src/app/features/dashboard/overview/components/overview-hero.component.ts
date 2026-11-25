import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { UserRole } from '../../../../core/models/user.model';

@Component({
    selector: 'app-overview-hero',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, ButtonComponent],
    host: {
        class: 'block w-full',
    },
    template: `
    <section class="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-warm-md">
      <!-- Lineas decorativas de la referencia UCO: rombo de trazo fino amarillo en el costado derecho. -->
      <svg class="absolute right-0 top-0 h-full w-1/2 max-w-md text-accent-500/40 pointer-events-none" viewBox="0 0 300 240" preserveAspectRatio="xMaxYMid slice" fill="none" aria-hidden="true">
        <path d="M210 40 L300 130 L210 220 L120 130 Z" stroke="currentColor" stroke-width="1" />
        <path d="M40 0 L160 120" stroke="currentColor" stroke-width="0.75" />
      </svg>

      <div class="relative z-10 max-w-3xl space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-accent-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
            <span class="w-2 h-2 rounded-full bg-accent-400 animate-pulse"></span>
            Semestre Académico 2026-II
          </span>
          <span class="text-xs text-white font-medium">| {{ institutionName() }}</span>
          <span class="text-xs bg-primary-900/60 text-primary-100 px-2.5 py-0.5 rounded-md font-semibold border border-primary-700/50">
            Rol: {{ userRole() }}
          </span>
        </div>

        <h1 class="font-serif text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
          Bienvenido(a), {{ userName() }}
        </h1>
        <span class="block h-1 w-16 rounded-full bg-accent-500" aria-hidden="true"></span>

        <p class="text-white text-xs sm:text-sm max-w-xl leading-relaxed font-sans">
          @switch (userRole()) {
            @case ('ADMINISTRADOR') {
              Panel de Control Institucional. Supervisa la estructura académica, decanaturas y auditoría del campus universitario.
            }
            @case ('DECANO') {
              @if (sinEntidadAsignada()) {
                Decanatura — {{ department() }}.
              } @else {
                Decanatura — {{ department() }}. Gestiona los programas académicos, coordinadores asignados y el seguimiento de facultad.
              }
            }
            @case ('COORDINADOR') {
              @if (sinEntidadAsignada()) {
                Coordinación Académica — {{ department() }}.
              } @else {
                Coordinación Académica — {{ department() }}. Administra la planta docente adscrita y consulta los planes de estudio del programa.
              }
            }
            @case ('DOCENTE') {
              Panel Docente. Gestiona tus asignaturas asignadas, realiza el control de asistencia en tiempo real y revisa las justificaciones de estudiantes.
            }
            @case ('ESTUDIANTE') {
              Portal del Estudiante. Revisa tu porcentaje de asistencia en cada materia, consulta tus horarios de clase y realiza el seguimiento de tus solicitudes.
            }
          }
        </p>

        <!-- Acciones Rápidas del Banner según Rol -->
        <div class="pt-2 flex flex-wrap items-center gap-3">
          @switch (userRole()) {
            @case ('ADMINISTRADOR') {
              <a routerLink="/app/admin/decanos">
                <app-button variant="accent" size="md">
                  <svg class="w-4 h-4 mr-1.5 text-warm-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Gestionar Decanaturas
                </app-button>
              </a>
            }
            @case ('DECANO') {
              <!-- HU178: sin facultad, «Gestionar Coordinadores» solo llevaría al aviso; el aviso del panel lo explica. -->
              @if (!sinEntidadAsignada()) {
                <a routerLink="/app/decano/mi-facultad/coordinadores" data-testid="hero-accion-decano-coordinadores">
                  <app-button variant="accent" size="md">
                    <svg class="w-4 h-4 mr-1.5 text-warm-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Gestionar Coordinadores
                  </app-button>
                </a>
              }
            }
            @case ('COORDINADOR') {
              <!-- HU178: sin programa, estas acciones solo llevarían al aviso; el aviso del panel lo explica. -->
              @if (!sinEntidadAsignada()) {
                <a routerLink="/app/coordinador/programa/docentes" data-testid="hero-accion-coordinador-docentes">
                  <app-button variant="accent" size="md">
                    <svg class="w-4 h-4 mr-1.5 text-warm-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Gestionar Docentes
                  </app-button>
                </a>
                <a routerLink="/app/coordinador/planes-estudio" data-testid="hero-accion-coordinador-planes">
                  <app-button variant="accent-contorno" size="md">
                    <svg class="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Planes de Estudio
                  </app-button>
                </a>
              }
            }
            @case ('DOCENTE') {
              <a routerLink="/app/asistencia" [queryParams]="paramsTomarAsistencia()">
                <app-button variant="accent" size="md">
                  <svg class="w-4 h-4 mr-1.5 text-warm-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Tomar Asistencia Ahora
                </app-button>
              </a>
              <a routerLink="/app/docente/reclamos" [queryParams]="paramsReclamos()">
                <app-button variant="accent-contorno" size="md">
                  <svg class="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Revisar Reclamos
                  @if ((pendingClaimsCount() ?? 0) > 0) {
                    <span class="ml-1 px-1.5 py-0.5 rounded-full bg-accent-400 text-warm-950 font-bold text-[10px]">
                      {{ pendingClaimsCount() }}
                    </span>
                  }
                </app-button>
              </a>
            }
            @case ('ESTUDIANTE') {
              <a routerLink="/app/estudiante/materias">
                <app-button variant="accent" size="md">
                  <svg class="w-4 h-4 mr-1.5 text-warm-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Mis Materias y Asistencias
                </app-button>
              </a>
              <a routerLink="/app/estudiante/horarios">
                <app-button variant="accent-contorno" size="md">
                  <svg class="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Mi Horario Semanal
                </app-button>
              </a>
            }
          }
        </div>
      </div>
    </section>
  `
})
export class OverviewHeroComponent {
  userRole = input.required<UserRole>();
  userName = input.required<string>();
  institutionName = input<string>('Universidad Católica de Oriente');
  department = input<string | undefined>('');
  pendingClaimsCount = input<number | null>(0);
  /**
   * HU178: el rol activo (decano o coordinador) no tiene su facultad o programa. Oculta las acciones rápidas que solo
   * llevarían al aviso y recorta la frase descriptiva para no prometer gestiones que no puede hacer.
   */
  sinEntidadAsignada = input<boolean>(false);
  /** Grupo de la clase en curso o la más próxima del docente; "Tomar Asistencia Ahora" abre directamente ese grupo. */
  grupoProximaClase = input<string | null>(null);

  /** Sin clase próxima conocida no se inventa un grupo: el destino abre su vista general. */
  readonly paramsTomarAsistencia = computed(() => {
    const grupo = this.grupoProximaClase();
    return grupo ? { courseId: grupo } : null;
  });

  /** Con solicitudes pendientes, la bandeja abre ya filtrada por pendientes. */
  readonly paramsReclamos = computed(() => ((this.pendingClaimsCount() ?? 0) > 0 ? { estado: 'P' } : null));
}
