import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, input } from '@angular/core';

import { RouterLink } from '@angular/router';
import { DeanFacultadService } from '../../../core/services/dean-facultad.service';
import { FacultadNodo } from '../../../core/models/facultad-decano.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';

/**
 * HU109 (organigrama de la facultad) y HU119 (árbol Facultad → Programa → Plan de estudio). Solo lectura; cada
 * programa se puede plegar para ver sus planes.
 */
@Component({
    selector: 'app-dean-estructura',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block w-full' },
    imports: [RouterLink, BadgeComponent],
    template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        @if (!embebido()) {
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-900 border border-primary-200">Decanatura</span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Organigrama</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">Estructura de la Facultad</h1>
          <p class="text-sm text-warm-600 mt-1">Facultad, programas académicos y planes de estudio vigentes.</p>
        </div>
        }
        <span class="px-3.5 py-2 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
          {{ totalProgramas() }} Programas · {{ totalPlanes() }} Planes
        </span>
      </div>

      @if (facultades().length === 0 && !cargando()) {
        <div class="bg-white rounded-2xl border border-warm-200 p-10 text-center text-sm text-warm-500">No hay una facultad asociada a tu usuario.</div>
      }

      @for (f of facultades(); track f.id) {
        <section class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm space-y-4">
          @if (!embebido()) {
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-serif font-bold text-xl text-warm-900">{{ f.nombre }}</h2>
              <p class="text-xs text-warm-500">Decano(a): {{ f.nombreDecano || 'Sin asignar' }}</p>
            </div>
            <app-badge [variant]="f.activa ? 'success' : 'neutral'">{{ f.activa ? 'Activa' : 'Inactiva' }}</app-badge>
          </div>
          }

          @if (f.programas.length === 0) {
            <p class="text-sm text-warm-500">La facultad aún no tiene programas académicos.</p>
          }
          <ul class="space-y-3 border-l-2 border-warm-100 pl-4">
            @for (p of f.programas; track p.id) {
              <li class="space-y-2">
                <button type="button" class="w-full text-left flex items-center justify-between gap-3" (click)="alternar(p.id)">
                  <span>
                    <span class="font-semibold text-warm-900">{{ abiertos().has(p.id) ? '▾' : '▸' }} {{ p.nombre }}</span>
                    <span class="text-xs text-warm-500 block">
                      {{ p.nombreTipoPrograma || '—' }} · {{ p.nombreModalidad || '—' }} · {{ p.nombreJornada || '—' }} · Coordinador(a): {{ p.nombreCoordinador || 'Sin asignar' }}
                    </span>
                  </span>
                  <app-badge [variant]="p.activo ? 'success' : 'neutral'">{{ p.activo ? 'Activo' : 'Inactivo' }}</app-badge>
                </button>
                @if (abiertos().has(p.id)) {
                  @if (p.planes.length === 0) {
                    <p class="text-xs text-warm-500 pl-4">Sin planes de estudio.</p>
                  } @else {
                    <ul class="pl-4 space-y-1 border-l border-warm-100">
                      @for (pl of p.planes; track pl.id) {
                        <li class="flex items-center justify-between text-sm pl-3">
                          <span class="text-warm-800">Plan {{ pl.inp ?? '—' }} · {{ pl.totalSemestres ?? 0 }} semestres</span>
                          <span class="flex items-center gap-3">
                            <a
                              [routerLink]="['/app/decano/programas', pl.id]"
                              class="text-xs font-semibold text-primary-700 hover:underline"
                              [attr.aria-label]="'Ver la malla del plan ' + (pl.inp ?? '')"
                            >Ver malla →</a>
                            <app-badge [variant]="pl.activo ? 'success' : 'neutral'">{{ pl.activo ? 'Vigente' : 'Inactivo' }}</app-badge>
                          </span>
                        </li>
                      }
                    </ul>
                  }
                }
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `
})
export class DeanEstructuraComponent implements OnInit {
  /** CULM-001: dentro de una pestaña, el título lo pone el cascarón. */
  readonly embebido = input(false);
  private readonly service = inject(DeanFacultadService);
  private readonly toast = inject(ToastService);

  facultades = signal<FacultadNodo[]>([]);
  cargando = signal(false);
  abiertos = signal<Set<string>>(new Set());

  totalProgramas = computed(() => this.facultades().reduce((n, f) => n + f.programas.length, 0));
  totalPlanes = computed(() =>
    this.facultades().reduce((n, f) => n + f.programas.reduce((m, p) => m + p.planes.length, 0), 0)
  );

  ngOnInit(): void {
    this.cargando.set(true);
    this.service.getEstructura().subscribe({
      next: (res) => {
        const facultades = res.datos ?? [];
        this.facultades.set(facultades);
        this.abiertos.set(new Set(facultades.flatMap((f) => f.programas.map((p) => p.id))));
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.facultades.set([]);
        this.cargando.set(false);
        this.toast.error(getApiErrorMessage(error));
      },
    });
  }

  alternar(idPrograma: string): void {
    const abiertos = new Set(this.abiertos());
    if (abiertos.has(idPrograma)) {
      abiertos.delete(idPrograma);
    } else {
      abiertos.add(idPrograma);
    }
    this.abiertos.set(abiertos);
  }
}
