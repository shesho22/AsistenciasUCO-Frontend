import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { HorarioItem, DiaSemana } from '../../../core/models/role-management.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadErrorState, classifyLoadError } from '../../../core/api/errors/load-error.util';

@Component({
  selector: 'app-student-schedule',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CardComponent,
    ButtonComponent,
  ],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header Bento -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-800 border border-primary-200">
              Portal Estudiantil
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Horario semanal</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Mi Horario de Clases
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Consulta la distribución semanal de tus clases y docentes titulares según la información registrada.
          </p>
        </div>

      </div>

      <!-- Grilla Semanal Bento (Lunes a Viernes) -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          @for (d of [1, 2, 3, 4, 5]; track d) {
            <div class="h-80 bg-warm-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      } @else if (error()) {
        <div class="bg-white p-8 rounded-2xl border border-red-200 text-center space-y-3" role="alert" data-testid="horarios-error">
          <p class="text-sm font-bold text-red-800">{{ error()!.titulo }}</p>
          <p class="text-xs text-warm-600">{{ error()!.mensaje }}</p>
          <app-button variant="secondary" size="sm" (clicked)="cargarHorario()">Reintentar</app-button>
        </div>
      } @else {
        @if (horarios().length === 0) {
          <div class="bg-warm-50 p-4 rounded-2xl border border-warm-200 text-xs text-warm-600" data-testid="horarios-vacio">
            No hay clases registradas en tu horario. Si esperabas verlas, consulta con tu coordinación académica.
          </div>
        }
        <div [class]="diasVisibles().length === 6 ? 'grid grid-cols-1 md:grid-cols-6 gap-4' : 'grid grid-cols-1 md:grid-cols-5 gap-4'">
          @for (dia of diasVisibles(); track dia) {
            <div class="flex flex-col bg-white rounded-2xl border border-warm-200/80 shadow-warm-sm overflow-hidden">
              <!-- Encabezado del Día -->
              <div class="p-3.5 bg-warm-50 border-b border-warm-200 flex items-center justify-between">
                <span class="font-serif font-bold text-sm text-warm-900">{{ dia }}</span>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-warm-200 text-warm-600">
                  {{ clasesPorDia(dia).length }} clases
                </span>
              </div>

              <!-- Bloques de Clases -->
              <div class="p-3 flex-1 space-y-3 min-h-[280px]">
                @if (clasesPorDia(dia).length === 0) {
                  <div class="h-full flex flex-col items-center justify-center p-4 text-center text-warm-400">
                    <svg class="w-8 h-8 stroke-1 mb-1.5 text-warm-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-xs font-medium">Sin clases programadas</span>
                  </div>
                } @else {
                  @for (clase of clasesPorDia(dia); track clase.id) {
                    <div [class]="getClaseClasses(clase.colorCategory)">
                      <div class="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span class="font-mono">{{ clase.horaInicio }} - {{ clase.horaFin }}</span>
                        <span class="uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/70 text-[10px]">
                          {{ clase.grupo }}
                        </span>
                      </div>

                      <h4 class="font-bold text-xs text-warm-900 leading-snug">
                        {{ clase.nombreMateria }}
                      </h4>

                      <div class="mt-2 pt-2 border-t border-black/5 text-[11px] space-y-0.5">
                        <div class="flex items-center gap-1.5 font-medium">
                          <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span class="truncate">{{ clase.aula ?? 'Aula no informada' }}</span>
                        </div>
                        <div class="flex items-center gap-1.5 opacity-85">
                          <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span class="truncate">{{ clase.docente ?? 'Docente no informado' }}</span>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class StudentScheduleComponent implements OnInit {
  private studentService = inject(StudentManagementService);

  horarios = signal<HorarioItem[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<LoadErrorState | null>(null);

  diasSemana: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  /** Lunes a viernes siempre; el sabado solo aparece si el backend entrega clases ese dia. */
  diasVisibles = computed<DiaSemana[]>(() =>
    this.horarios().some((h) => h.dia === 'Sábado') ? [...this.diasSemana, 'Sábado'] : this.diasSemana
  );

  ngOnInit(): void {
    this.cargarHorario();
  }

  cargarHorario(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.studentService.getHorarios().subscribe({
      next: (res) => {
        this.horarios.set(res.datos || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.horarios.set([]);
        this.error.set(classifyLoadError(err));
        this.isLoading.set(false);
      },
    });
  }

  clasesPorDia(dia: DiaSemana): HorarioItem[] {
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const target = norm(dia);
    return this.horarios().filter((h) => norm(h.dia) === target);
  }

  getClaseClasses(color: 'emerald' | 'amber' | 'blue' | 'purple'): string {
    const base = 'p-3 rounded-xl border text-warm-800 transition-all shadow-xs';
    const colorStyles = {
      emerald: 'bg-emerald-50/80 border-emerald-200/90 hover:bg-emerald-100/70',
      amber: 'bg-amber-50/80 border-amber-200/90 hover:bg-amber-100/70',
      blue: 'bg-sky-50/80 border-sky-200/90 hover:bg-sky-100/70',
      purple: 'bg-purple-50/80 border-purple-200/90 hover:bg-purple-100/70',
    }[color];

    return `${base} ${colorStyles}`;
  }
}
