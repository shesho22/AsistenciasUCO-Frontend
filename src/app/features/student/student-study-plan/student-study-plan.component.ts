import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import {
  PlanEstudioEstudiante,
  PlanEstudioEstudianteService,
  SemestrePlanEstudiante,
} from '../../../core/services/plan-estudio-estudiante.service';
import { CardComponent } from '../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { getApiErrorMessage } from '../../../core/api/errors/api-error.util';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

const TIPOS_ASIGNATURA: Record<string, string> = {
  ESPECIFICA: 'Específica',
  BASICA: 'Básica',
  INSTITUCIONAL: 'Institucional',
  ELECTIVA: 'Electiva',
};

/**
 * Plan de estudios del estudiante: la estructura curricular de sus programas por semestres, con los créditos y el
 * carácter de cada asignatura y la marca de las que cursa hoy. Es solo consulta: los planes, los totales y la marca
 * "Cursando" los entrega el backend, que resuelve al estudiante desde su sesión.
 */
@Component({
    selector: 'app-student-study-plan',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageHeaderComponent, CardComponent, BadgeComponent, ButtonComponent],
    template: `
    <div class="space-y-4 animate-fade-in">
      <app-page-header
        titulo="Materias matriculadas"
        descripcion="La estructura de tu programa por semestres, con los créditos de cada asignatura y las que cursas hoy."
      />

      @if (cargando()) {
        <div class="space-y-3" aria-busy="true" data-testid="plan-cargando">
          <p class="text-sm text-warm-600">Cargando tus materias matriculadas...</p>
          @for (n of [1, 2, 3]; track n) {
            <div class="h-16 bg-warm-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      } @else if (error()) {
        <div class="bg-white p-8 rounded-2xl border border-danger-200 text-center space-y-3" role="alert" data-testid="plan-error">
          <p class="text-sm font-bold text-danger-800">No pudimos cargar tus materias matriculadas</p>
          <p class="text-xs text-warm-600">{{ error() }}</p>
          <app-button variant="secondary" size="sm" (clicked)="cargar()">Reintentar</app-button>
        </div>
      } @else if (planes().length === 0) {
        <app-card>
          <p class="text-sm text-warm-600 text-center py-6" data-testid="plan-vacio">
            Aún no tienes materias matriculadas activas. Si crees que es un error, consulta con la coordinación de tu programa.
          </p>
        </app-card>
      } @else {
        @for (plan of planes(); track plan.idPlanEstudio) {
          <section class="space-y-3" [attr.aria-labelledby]="'plan-' + plan.idPlanEstudio" data-testid="plan-estudio">
            <div class="superficie p-5 space-y-4">
              <div>
                <h2 class="font-serif font-bold text-xl text-warm-900" [id]="'plan-' + plan.idPlanEstudio">{{ plan.nombrePrograma }}</h2>
                @if (plan.inp !== null) {
                  <p class="text-xs text-warm-500">Versión {{ plan.inp }}</p>
                }
              </div>
              <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
                  <dt class="text-xs text-warm-500 font-medium">Semestres</dt>
                  <dd class="text-xl font-serif font-bold text-warm-900">{{ plan.totalSemestres }}</dd>
                </div>
                <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
                  <dt class="text-xs text-warm-500 font-medium">Asignaturas</dt>
                  <dd class="text-xl font-serif font-bold text-warm-900">{{ plan.totalAsignaturas }}</dd>
                </div>
                <div class="p-3 rounded-xl bg-warm-50 border border-warm-100">
                  <dt class="text-xs text-warm-500 font-medium">Créditos del plan</dt>
                  <dd class="text-xl font-serif font-bold text-warm-900">{{ plan.totalCreditos }}</dd>
                </div>
                <div class="p-3 rounded-xl bg-primary-50 border border-primary-200" data-testid="resumen-cursando">
                  <dt class="text-xs text-primary-800 font-medium">Cursas hoy</dt>
                  <dd class="text-sm font-bold text-primary-900">
                    {{ plural(plan.asignaturasCursando, 'asignatura', 'asignaturas') }} ·
                    {{ plural(plan.creditosCursando, 'crédito', 'créditos') }}
                  </dd>
                </div>
              </dl>
            </div>

            @for (semestre of plan.semestres; track semestre.idSemestrePlanEstudio) {
              <details
                class="superficie group"
                [open]="abierto(plan, semestre)"
                data-testid="semestre-plan"
              >
                <summary
                  class="cursor-pointer list-none p-4 min-h-[44px] flex items-center justify-between gap-3"
                  (click)="alternarSemestre(plan, semestre, $event)"
                >
                  <div>
                    <h3 class="font-serif font-bold text-lg text-warm-900">Semestre {{ semestre.numeroSemestre }}</h3>
                    <p class="text-xs text-warm-500">
                      {{ plural(semestre.totalAsignaturas, 'asignatura', 'asignaturas') }} ·
                      {{ plural(semestre.totalCreditos, 'crédito', 'créditos') }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    @if (cursandoEn(semestre) > 0) {
                      <app-badge variant="success" size="sm">Cursas {{ cursandoEn(semestre) }}</app-badge>
                    }
                    <span class="text-xs font-semibold text-primary-700 group-open:hidden">Ver asignaturas</span>
                    <span class="text-xs font-semibold text-primary-700 hidden group-open:inline">Ocultar</span>
                  </div>
                </summary>

                @if (abierto(plan, semestre) || semestre.asignaturas.length === 0) {
                  @if (semestre.asignaturas.length === 0) {
                    <p class="px-4 pb-4 text-sm text-warm-600" data-testid="semestre-vacio">
                      Este semestre aún no tiene asignaturas registradas.
                    </p>
                  } @else {
                    <ul class="px-4 pb-4 grid gap-3 sm:grid-cols-2">
                      @for (asignatura of semestre.asignaturas; track asignatura.idAsignatura) {
                        <li class="p-3 rounded-xl bg-warm-50 border border-warm-200" data-testid="asignatura-plan">
                          <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                              @if (asignatura.codigo) {
                                <p class="text-xs font-mono text-warm-500">{{ asignatura.codigo }}</p>
                              }
                              <p class="text-sm font-bold text-warm-900">{{ asignatura.nombre }}</p>
                            </div>
                            @if (asignatura.cursando) {
                              <app-badge variant="success" size="sm" data-testid="insignia-cursando">Cursando</app-badge>
                            }
                          </div>
                          <p class="text-xs text-warm-600 mt-1" data-testid="asignatura-detalle">{{ detalle(asignatura) }}</p>
                          @if (asignatura.cursando && asignatura.nombreGrupoCursando) {
                            <p class="text-xs text-warm-500 mt-0.5">Grupo: {{ asignatura.nombreGrupoCursando }}</p>
                          }
                        </li>
                      }
                    </ul>
                  }
                }
              </details>
            }
          </section>
        }
      }
    </div>
  `
})
export class StudentStudyPlanComponent implements OnInit {
  private readonly planService = inject(PlanEstudioEstudianteService);

  readonly planes = signal<PlanEstudioEstudiante[]>([]);
  /** Semestres cuyo contenido está montado: evita crear las tarjetas de asignaturas que siguen cerradas. */
  readonly semestresAbiertos = signal<ReadonlySet<string>>(new Set());
  readonly cargando = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.planService
      .consultar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (res) => {
          const planes = res.datos ?? [];
          this.planes.set(planes);
          this.semestresAbiertos.set(
            new Set(
              planes.flatMap((plan) =>
                plan.semestres
                  .filter((semestre) =>
                    semestre.asignaturas.some((asignatura) => asignatura.cursando) || plan.semestres.length === 1
                  )
                  .map((semestre) => this.claveSemestre(plan, semestre))
              )
            )
          );
        },
        error: (error: unknown) => {
          this.planes.set([]);
          this.semestresAbiertos.set(new Set());
          this.error.set(getApiErrorMessage(error));
        },
      });
  }

  /** Asignaturas del semestre que el estudiante cursa hoy. */
  cursandoEn(semestre: SemestrePlanEstudiante): number {
    return semestre.asignaturas.filter((asignatura) => asignatura.cursando).length;
  }

  /** Se abre solo lo que le interesa de entrada: los semestres donde cursa algo, o el único semestre del plan. */
  abierto(plan: PlanEstudioEstudiante, semestre: SemestrePlanEstudiante): boolean {
    return this.semestresAbiertos().has(this.claveSemestre(plan, semestre));
  }

  alternarSemestre(plan: PlanEstudioEstudiante, semestre: SemestrePlanEstudiante, evento: MouseEvent): void {
    evento.preventDefault();
    const clave = this.claveSemestre(plan, semestre);
    this.semestresAbiertos.update((actuales) => {
      const siguientes = new Set(actuales);
      if (actuales.has(clave)) siguientes.delete(clave);
      else siguientes.add(clave);
      return siguientes;
    });
  }

  private claveSemestre(plan: PlanEstudioEstudiante, semestre: SemestrePlanEstudiante): string {
    return `${plan.idPlanEstudio}:${semestre.idSemestrePlanEstudio}`;
  }

  plural(cantidad: number, singular: string, plural: string): string {
    return `${cantidad} ${cantidad === 1 ? singular : plural}`;
  }

  /** "3 créditos · Obligatoria · Específica", omitiendo lo que el backend no informa. */
  detalle(asignatura: { creditos: number | null; nombreCaracter: string | null; tipoAsignatura: string | null }): string {
    const partes: string[] = [];
    if (asignatura.creditos !== null && asignatura.creditos !== undefined) {
      partes.push(this.plural(asignatura.creditos, 'crédito', 'créditos'));
    }
    if (asignatura.nombreCaracter) {
      partes.push(asignatura.nombreCaracter);
    }
    const tipo = asignatura.tipoAsignatura ? TIPOS_ASIGNATURA[asignatura.tipoAsignatura] : undefined;
    if (tipo) {
      partes.push(tipo);
    }
    return partes.length > 0 ? partes.join(' · ') : 'Sin información de créditos';
  }
}
