import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-public-layout',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterOutlet],
    template: `
    <div class="min-h-dvh flex flex-col md:flex-row bg-warm-50">
      <!-- Left Panel: Branding & Aurora Graphic Banner (Desktop Only) -->
      <div class="hidden lg:flex lg:w-5/12 bg-primary-950 p-12 flex-col justify-between relative overflow-hidden text-white">
        <!-- Ambient Radial Light -->
        <div class="absolute -top-32 -left-32 w-96 h-96 bg-primary-600/30 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 right-0 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl"></div>

        <div class="relative z-10">
          <div class="flex items-center gap-3">
            <img src="logo.svg" alt="Gestió Asistencia Logo" class="w-10 h-10 object-contain shrink-0 shadow-warm-sm rounded-xl" />
            <span class="font-serif text-2xl font-bold tracking-tight text-white">Gestió Asistencia</span>
          </div>
        </div>

        <div class="relative z-10 my-auto">
          <h1 class="font-serif text-4xl lg:text-5xl font-semibold leading-tight text-white tracking-tight">
            Control de asistencia transparente y eficiente.
          </h1>
        </div>

        <div class="relative z-10 text-xs text-warm-400 border-t border-white/10 pt-6 flex items-center justify-between">
          <span>© 2026</span>
        </div>
      </div>

      <!-- Right Panel: Auth Container (Responsive Mobile & Desktop) -->
      <div class="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-16 bg-warm-50 min-h-dvh">
        <!-- Mobile Header (Mobile Only) -->
        <div class="lg:hidden flex items-center gap-2.5 mb-6 sm:mb-8">
          <img src="logo.svg" alt="Logo" class="w-10 h-10 object-contain shrink-0 rounded-xl" />
          <span class="font-serif text-2xl font-bold text-warm-900">Gestió Asistencia</span>
        </div>

        <div class="w-full max-w-md">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `
})
export class PublicLayoutComponent {}
