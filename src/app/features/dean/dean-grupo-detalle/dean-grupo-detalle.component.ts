import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { SessionService } from '../../../core/services/session.service';
import { SessionTimeZoneService } from '../../../core/services/session-timezone.service';
import { Course } from '../../../core/models/course.model';
import { ClassSession } from '../../../core/models/attendance.model';

@Component({
  selector: 'app-dean-grupo-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Barra de Retorno -->
      <div class="flex items-center justify-between bg-white p-4 rounded-2xl border border-warm-200 shadow-warm-sm">
        <button
          type="button"
          (click)="volverAGrupos()"
          class="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-warm-700 hover:text-warm-950 bg-warm-50 hover:bg-warm-100 border border-warm-200 px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Grupos de la Facultad
        </button>

        @if (selectedCourse(); as curso) {
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-warm-100 text-warm-800">
            {{ curso.code }} • {{ curso.section }}
          </span>
        }
      </div>

      @if (selectedCourse(); as curso) {
        <!-- Ficha Resumen del Grupo -->
        <div class="bg-white p-6 rounded-2xl border border-warm-200 shadow-warm-sm grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="md:col-span-3 space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-50 text-primary-800 border border-primary-200">
                {{ curso.code }}
              </span>
              <span class="text-xs font-bold text-warm-600">{{ curso.section }}</span>
            </div>
            <h1 class="font-serif font-bold text-2xl text-warm-900">{{ curso.name }}</h1>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-warm-600 pt-2 border-t border-warm-100">
              <div>
                <span class="text-warm-400 block text-[11px]">Horario Regular</span>
                <strong class="text-warm-800">{{ curso.schedule }}</strong>
              </div>
              <div>
                <span class="text-warm-400 block text-[11px]">Aula Asignada</span>
                <strong class="text-warm-800">{{ curso.room || 'Aula Central' }}</strong>
              </div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-warm-50 border border-warm-100 flex flex-col justify-between text-center">
            <div>
              <span class="text-xs text-warm-500 font-medium">Aforo Ocupado</span>
              <p class="text-3xl font-serif font-bold text-primary-800 my-1">
                {{ curso.enrolledStudentsCount }} / {{ curso.cupoMaximo || 30 }}
              </p>
            </div>
            <div class="text-[11px] text-warm-500 pt-2 border-t border-warm-200/80">
              <span>Cupo Ofertado Facultad</span>
            </div>
          </div>
        </div>
      }

      <!-- Cronograma de Sesiones del Grupo -->
      <div class="bg-white rounded-2xl border border-warm-200 shadow-warm-sm overflow-hidden">
        <div class="p-5 border-b border-warm-100 flex items-center justify-between">
          <div>
            <h2 class="font-serif font-bold text-lg text-warm-900">Sesiones de Clase Registradas</h2>
            <p class="text-xs text-warm-500">Cronograma de clases del grupo, asistencias consolidadas y aulas utilizadas.</p>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-warm-100 text-warm-700">
            {{ sessions().length }} sesiones
          </span>
        </div>

        @if (sessions().length === 0) {
          <div class="p-10 text-center text-sm text-warm-500">
            No hay sesiones registradas para este grupo.
          </div>
        } @else {
          <div class="divide-y divide-warm-100">
            @for (s of sessions(); track s.id) {
              <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-warm-50/50 transition-colors">
                <div class="space-y-1 flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-warm-100 text-warm-800">#{{ s.sessionNumber }}</span>
                    @if (s.estadoTemporal === 'INDETERMINADA') {
                      <span class="text-xs font-semibold text-amber-800">Horario no confirmado</span>
                    } @else {
                      <span class="text-xs font-medium text-warm-600">
                        {{ timeZone.displaySessionDate(s) }}{{ timeZone.displaySessionEndDate(s) !== timeZone.displaySessionDate(s) ? ' – ' + timeZone.displaySessionEndDate(s) : '' }}
                      </span>
                      <span class="text-warm-300">•</span>
                      <span class="text-xs font-mono font-bold text-warm-800">
                        {{ timeZone.displaySessionStartTime(s) }} - {{ timeZone.displaySessionEndTime(s) }}
                      </span>
                    }
                    <span class="text-warm-300">•</span>
                    <span class="text-xs text-warm-600 bg-warm-100/60 px-2 py-0.5 rounded-md">
                      Aula: {{ selectedCourse()?.room || 'Por definir' }}
                    </span>
                  </div>
                  <h3 class="font-bold text-sm text-warm-900">{{ s.title }}</h3>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DeanGrupoDetalleComponent implements OnInit {
  private courseService = inject(CourseService);
  private sessionService = inject(SessionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly timeZone = inject(SessionTimeZoneService);

  grupoId = input<string>();

  courses = signal<Course[]>([]);
  sessions = signal<ClassSession[]>([]);

  effectiveGrupoId = computed(() => {
    return this.grupoId() || this.route.snapshot.paramMap.get('grupoId') || '';
  });

  selectedCourse = computed<Course | null>(() => {
    const id = this.effectiveGrupoId();
    if (!id) return null;
    return this.courses().find((c) => c.id === id) || null;
  });

  ngOnInit(): void {
    const id = this.effectiveGrupoId();
    this.courseService.getTeacherCourses().subscribe({
      next: (res) => this.courses.set(res.datos || []),
    });
    if (id) {
      this.sessionService.getSessionsByGroup(id).subscribe({
        next: (res) => this.sessions.set(res.datos || []),
      });
    }
  }

  volverAGrupos(): void {
    this.router.navigate(['/app/decano/grupos']);
  }
}
