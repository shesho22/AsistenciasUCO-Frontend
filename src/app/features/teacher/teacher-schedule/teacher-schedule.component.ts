import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { HorarioDocenteItem, DiaSemana } from '../../../core/models/role-management.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ToastService } from '../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-teacher-schedule',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header Bento -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-200/80 shadow-warm-sm">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-800 border border-primary-200">
              Carga Docente
            </span>
            <span class="text-xs text-warm-400">•</span>
            <span class="text-xs font-medium text-warm-500">Semestre 2026-2</span>
          </div>
          <h1 class="font-serif font-bold text-2xl sm:text-3xl text-warm-900 tracking-tight">
            Mi Horario Académico
          </h1>
          <p class="text-sm text-warm-600 mt-1">
            Distribución semanal de tus clases presenciales y estudiantes por grupo.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="px-3 py-1.5 rounded-xl bg-warm-100 text-xs font-bold text-warm-800 border border-warm-200">
            {{ totalHorasSemanales() }} Horas / Semana
          </span>
        </div>
      </div>

      <!-- Grilla Semanal Bento (Lunes a Viernes) -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          @for (d of [1, 2, 3, 4, 5]; track d) {
            <div class="h-80 bg-warm-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          @for (dia of diasSemana; track dia) {
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
                    <span class="text-xs font-medium">Sin grupos este día</span>
                  </div>
                } @else {
                  @for (clase of clasesPorDia(dia); track clase.id) {
                    <div [class]="getClaseClasses(clase.colorCategory)">
                      <div class="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span class="font-mono">{{ clase.horaInicio }} - {{ clase.horaFin }}</span>
                        <span class="uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/80 text-[10px] font-bold">
                          {{ clase.codigoMateria }}
                        </span>
                      </div>

                      <h4 class="font-bold text-xs text-warm-900 leading-snug">
                        {{ clase.nombreMateria }}
                      </h4>
                      <p class="text-[10px] text-warm-500 mt-0.5">{{ clase.seccion }}</p>

                      <div class="mt-2 pt-2 border-t border-black/5 text-[11px] space-y-0.5">
                        <div class="flex items-center gap-1.5 opacity-85">
                          <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span>{{ clase.totalEstudiantes }} estudiantes</span>
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
export class TeacherScheduleComponent implements OnInit {
  private claimService = inject(AttendanceClaimService);
  private toast = inject(ToastService);

  horarios = signal<HorarioDocenteItem[]>([]);
  isLoading = signal<boolean>(true);

  diasSemana: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  totalHorasSemanales = () => {
    return this.horarios().length * 2;
  };

  ngOnInit(): void {
    this.cargarHorario();
  }

  cargarHorario(): void {
    this.isLoading.set(true);
    this.claimService.getHorarioDocente().subscribe({
      next: (res) => {
        this.horarios.set(res.datos || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error al cargar horario del docente.');
      },
    });
  }

  clasesPorDia(dia: DiaSemana): HorarioDocenteItem[] {
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const target = norm(dia);
    return this.horarios().filter((h) => norm(h.dia) === target);
  }

  getClaseClasses(color: 'emerald' | 'amber' | 'blue' | 'purple'): string {
    const base = 'p-3 rounded-xl border text-warm-800 transition-all shadow-xs';
    const colorStyles = {
      emerald: 'bg-success-50/80 border-success-200/90 hover:bg-success-100/70',
      amber: 'bg-warning-50/80 border-warning-200/90 hover:bg-warning-100/70',
      blue: 'bg-info-50/80 border-info-200/90 hover:bg-info-100/70',
      purple: 'bg-category-50/80 border-category-200/90 hover:bg-category-100/70',
    }[color];

    return `${base} ${colorStyles}`;
  }
}
