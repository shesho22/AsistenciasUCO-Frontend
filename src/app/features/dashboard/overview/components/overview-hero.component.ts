import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { UserRole } from '../../../../core/models/user.model';

@Component({
    selector: 'app-overview-hero',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterLink, ButtonComponent],
    host: {
        class: 'block w-full',
    },
    template: `
    <section class="bg-gradient-to-r from-primary-950 via-primary-900 to-primary-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-warm-md border border-primary-800">
      <div class="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent-400/20 via-transparent to-transparent pointer-events-none"></div>

      <div class="relative z-10 max-w-3xl space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-accent-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
            <span class="w-2 h-2 rounded-full bg-accent-400 animate-pulse"></span>
            Semestre Académico 2026-II
          </span>
          <span class="text-xs text-warm-300 font-medium">| {{ institutionName() }}</span>
          <span class="text-xs bg-primary-800/80 text-primary-200 px-2.5 py-0.5 rounded-md font-semibold border border-primary-700/50">
            Rol: {{ userRole() }}
          </span>
        </div>

        <h1 class="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
          Bienvenido(a), {{ userName() }}
        </h1>

        <p class="text-warm-200 text-xs sm:text-sm max-w-xl leading-relaxed font-sans">
          @switch (userRole()) {
            @case ('ADMINISTRADOR') {
              Panel de Control Institucional. Supervisa la estructura académica, decanaturas y auditoría del campus universitario.
            }
            @case ('ADMIN') {
              Panel de Control Institucional. Supervisa la estructura académica, decanaturas y auditoría del campus universitario.
            }
            @case ('DECANO') {
              Decanatura — {{ department() }}. Gestiona los programas académicos, coordinadores asignados y el seguimiento de facultad.
            }
            @case ('COORDINADOR') {
              Coordinación Académica — {{ department() }}. Administra la planta docente adscrita y consulta los planes de estudio del programa.
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
            @case ('ADMIN') {
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
              <a routerLink="/app/decano/mi-facultad/coordinadores">
                <app-button variant="accent" size="md">
                  <svg class="w-4 h-4 mr-1.5 text-warm-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Gestionar Coordinadores
                </app-button>
              </a>
            }
            @case ('COORDINADOR') {
              <a routerLink="/app/coordinador/programa/docentes">
                <app-button variant="accent" size="md">
                  <svg class="w-4 h-4 mr-1.5 text-warm-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Gestionar Docentes
                </app-button>
              </a>
              <a routerLink="/app/coordinador/planes-estudio">
                <app-button variant="secondary" size="md">
                  <svg class="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Planes de Estudio y Malla
                </app-button>
              </a>
            }
            @case ('DOCENTE') {
              <a routerLink="/app/asistencia">
                <app-button variant="accent" size="md">
                  <svg class="w-4 h-4 mr-1.5 text-warm-950 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Tomar Asistencia Ahora
                </app-button>
              </a>
              <a routerLink="/app/docente/reclamos">
                <app-button variant="secondary" size="md">
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
                <app-button variant="secondary" size="md">
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
}
